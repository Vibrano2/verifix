import os
from flask import Flask, request, jsonify
import joblib
import pandas as pd
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Load models if they exist, otherwise set to None
ARTISAN_MODEL_PATH = 'artisan_lead_payment_model.pkl'
CUSTOMER_MODEL_PATH = 'customer_premium_model.pkl'

artisan_pkg = None
customer_pkg = None

if os.path.exists(ARTISAN_MODEL_PATH):
    try:
        artisan_pkg = joblib.load(ARTISAN_MODEL_PATH)
        app.logger.info(f"Loaded {ARTISAN_MODEL_PATH}")
    except Exception as e:
        app.logger.error(f"Error loading {ARTISAN_MODEL_PATH}: {e}")
else:
    app.logger.warning(f"Model file {ARTISAN_MODEL_PATH} not found. Artisan predictions will fail.")

if os.path.exists(CUSTOMER_MODEL_PATH):
    try:
        customer_pkg = joblib.load(CUSTOMER_MODEL_PATH)
        app.logger.info(f"Loaded {CUSTOMER_MODEL_PATH}")
    except Exception as e:
        app.logger.error(f"Error loading {CUSTOMER_MODEL_PATH}: {e}")
else:
    app.logger.warning(f"Model file {CUSTOMER_MODEL_PATH} not found. Customer predictions will fail.")

def encode_input(df, package):
    for col, le in package['label_encoders'].items():
        if col in df.columns:
            df[col]=df[col].apply(lambda x: x if x in le.classes_ else le.classes_[0])
            df[col]=le.transform(df[col].astype(str))
    for feat in package['features']:
        if feat not in df.columns:
            df[feat]=0
    X=df[package['features']].values
    return package['scaler'].transform(X)

@app.route('/predict/artisan', methods=['POST'])
def predict_artisan():
    if not artisan_pkg:
        return jsonify({'error': 'Artisan model not loaded'}), 503
        
    data=request.get_json()
    df=pd.DataFrame([data])
    for col in df.columns:
        df[col]=df[col].apply(lambda x:str(x).strip().lower() if pd.notna(x) else 'unknown')
    
    try:
        X=encode_input(df,artisan_pkg)
        prob=artisan_pkg['model'].predict_proba(X)[0,1]
        pred=int(artisan_pkg['model'].predict(X)[0])
        return jsonify({
            'will_pay_for_leads': bool(pred),
            'confidence': round(float(prob),3),
            'segment':'HIGH' if prob>0.7 else 'MEDIUM' if prob>0.4 else 'LOW',
            'recommended_action':'Fast-track onboarding' if prob>0.7 else 'Trial period' if prob>0.4 else 'Free tier first'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/customer', methods=['POST'])
def predict_customer():
    if not customer_pkg:
        return jsonify({'error': 'Customer model not loaded'}), 503
        
    data=request.get_json()
    df=pd.DataFrame([data])
    for col in df.columns:
        df[col]=df[col].apply(lambda x:str(x).strip().lower() if pd.notna(x) else 'unknown')
        
    try:
        X=encode_input(df,customer_pkg)
        prob=customer_pkg['model'].predict_proba(X)[0,1]
        pred=int(customer_pkg['model'].predict(X)[0])
        return jsonify({
            'will_pay_premium': bool(pred),
            'confidence': round(float(prob),3),
            'ltv_segment':'HIGH' if prob>0.7 else 'MEDIUM' if prob>0.4 else 'LOW',
            'pricing_tier':'Premium' if prob>0.7 else 'Standard' if prob>0.4 else 'Freemium'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':'ok',
        'artisan_model_loaded': artisan_pkg is not None,
        'customer_model_loaded': customer_pkg is not None
    })

if __name__=='__main__':
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5000)
