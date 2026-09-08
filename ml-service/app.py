"""Inference API for Artiva's artisan and customer classifiers.

Model artifacts are joblib/pickle payloads and can execute code while loading.
Production deployments therefore require a SHA-256 digest for each artifact and
verify it before deserialization.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import math
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Mapping

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from google.cloud import storage
from werkzeug.exceptions import BadRequest, RequestEntityTooLarge, UnsupportedMediaType


MAX_REQUEST_BYTES = 32 * 1024
MAX_FEATURES = 64
MAX_STRING_LENGTH = 128
FEATURE_NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")
SHA256_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")
MODEL_SPECS = {
    "artisan": ("artisan_lead_payment_model.pkl", "ARTISAN_MODEL_SHA256"),
    "customer": ("customer_premium_model.pkl", "CUSTOMER_MODEL_SHA256"),
}


class ModelConfigurationError(RuntimeError):
    """Raised when a model artifact or its package shape is invalid."""


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as model_file:
        for chunk in iter(lambda: model_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validate_package(package: Any) -> Mapping[str, Any]:
    if not isinstance(package, Mapping):
        raise ModelConfigurationError("model package must be a mapping")

    required = {"model", "scaler", "features", "label_encoders"}
    if not required.issubset(package):
        raise ModelConfigurationError("model package is missing required entries")

    features = package["features"]
    if (
        not isinstance(features, (list, tuple))
        or not 1 <= len(features) <= MAX_FEATURES
        or len(set(features)) != len(features)
        or any(not isinstance(item, str) or not FEATURE_NAME_PATTERN.fullmatch(item) for item in features)
    ):
        raise ModelConfigurationError("model feature list is invalid")

    encoders = package["label_encoders"]
    if not isinstance(encoders, Mapping) or any(name not in features for name in encoders):
        raise ModelConfigurationError("model encoders are invalid")
    for encoder in encoders.values():
        classes = getattr(encoder, "classes_", None)
        if classes is None or len(classes) == 0 or not callable(getattr(encoder, "transform", None)):
            raise ModelConfigurationError("model encoder is invalid")

    model = package["model"]
    scaler = package["scaler"]
    if not callable(getattr(model, "predict", None)) or not callable(getattr(model, "predict_proba", None)):
        raise ModelConfigurationError("model estimator is invalid")
    if not callable(getattr(scaler, "transform", None)):
        raise ModelConfigurationError("model scaler is invalid")
    return package


def _download_model(bucket_name: str, model_name: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    client = storage.Client()
    blob = client.bucket(bucket_name).blob(model_name)

    with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as temporary_file:
        temporary_path = Path(temporary_file.name)
    try:
        blob.download_to_filename(str(temporary_path))
        os.replace(temporary_path, destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def _load_model(model_name: str, checksum_variable: str, model_directory: Path) -> Mapping[str, Any]:
    expected_checksum = os.environ.get(checksum_variable, "").strip()
    if not SHA256_PATTERN.fullmatch(expected_checksum):
        raise ModelConfigurationError(f"{checksum_variable} is not configured")

    model_path = model_directory / model_name
    if not model_path.is_file():
        bucket_name = os.environ.get("MODEL_BUCKET_NAME", "").strip()
        if not bucket_name:
            raise ModelConfigurationError("MODEL_BUCKET_NAME is not configured")
        _download_model(bucket_name, model_name, model_path)

    actual_checksum = _sha256(model_path)
    if not hmac.compare_digest(actual_checksum.lower(), expected_checksum.lower()):
        model_path.unlink(missing_ok=True)
        raise ModelConfigurationError("model checksum does not match")

    return _validate_package(joblib.load(model_path))


def _load_packages(logger: logging.Logger) -> dict[str, Mapping[str, Any] | None]:
    configured_directory = os.environ.get("MODEL_DIRECTORY", "/tmp/artiva-models")
    model_directory = Path(configured_directory).resolve()
    packages: dict[str, Mapping[str, Any] | None] = {}

    for model_kind, (model_name, checksum_variable) in MODEL_SPECS.items():
        try:
            packages[model_kind] = _load_model(model_name, checksum_variable, model_directory)
            logger.info("Model loaded", extra={"model_kind": model_kind})
        except Exception as error:
            packages[model_kind] = None
            logger.error(
                "Model unavailable",
                extra={"model_kind": model_kind, "error_type": type(error).__name__},
            )
    return packages


def _validated_input(data: Any, package: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(data, dict) or not data:
        raise ValueError("Request body must be a non-empty JSON object")

    features = set(package["features"])
    if set(data) - features:
        raise ValueError("Request contains unsupported features")

    validated: dict[str, Any] = {}
    for name, value in data.items():
        if value is None:
            validated[name] = "unknown"
        elif isinstance(value, bool):
            validated[name] = value
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            if not math.isfinite(float(value)):
                raise ValueError("Numeric features must be finite")
            validated[name] = value
        elif isinstance(value, str):
            normalized = value.strip().lower()
            if not normalized or len(normalized) > MAX_STRING_LENGTH:
                raise ValueError("String features must be between 1 and 128 characters")
            validated[name] = normalized
        else:
            raise ValueError("Feature values must be scalar JSON values")
    return validated


def _encode_input(data: dict[str, Any], package: Mapping[str, Any]) -> Any:
    frame = pd.DataFrame([data])
    for column, encoder in package["label_encoders"].items():
        if column not in frame.columns:
            frame[column] = "unknown"
        classes = [str(value) for value in encoder.classes_]
        fallback = classes[0]
        frame[column] = frame[column].map(lambda value: str(value) if str(value) in classes else fallback)
        frame[column] = encoder.transform(frame[column].astype(str))

    for feature in package["features"]:
        if feature not in frame.columns:
            frame[feature] = 0
    return package["scaler"].transform(frame[list(package["features"])].values)


def _predict(package: Mapping[str, Any], data: dict[str, Any]) -> tuple[bool, float]:
    encoded = _encode_input(data, package)
    probabilities = package["model"].predict_proba(encoded)
    predictions = package["model"].predict(encoded)
    probability = float(probabilities[0][1])
    prediction = int(predictions[0])
    if prediction not in (0, 1) or not math.isfinite(probability) or not 0 <= probability <= 1:
        raise ModelConfigurationError("model returned an invalid prediction")
    return bool(prediction), probability


def create_app(
    model_packages: Mapping[str, Mapping[str, Any] | None] | None = None,
    *,
    load_models: bool = True,
) -> Flask:
    application = Flask(__name__)
    application.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES
    application.config["MODEL_PACKAGES"] = (
        dict(model_packages)
        if model_packages is not None
        else _load_packages(application.logger) if load_models
        else {"artisan": None, "customer": None}
    )

    @application.after_request
    def secure_response(response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @application.errorhandler(RequestEntityTooLarge)
    def request_too_large(_error):
        return jsonify({"error": "Request body is too large"}), 413

    @application.errorhandler(BadRequest)
    @application.errorhandler(UnsupportedMediaType)
    def malformed_request(_error):
        return jsonify({"error": "Request body must be valid JSON"}), 400

    def inference_request(model_kind: str):
        package = application.config["MODEL_PACKAGES"].get(model_kind)
        if package is None:
            return jsonify({"error": "Prediction service is temporarily unavailable"}), 503
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 415

        try:
            data = _validated_input(request.get_json(silent=False), package)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        try:
            prediction, probability = _predict(package, data)
        except Exception as error:
            application.logger.error(
                "Prediction failed",
                extra={"model_kind": model_kind, "error_type": type(error).__name__},
            )
            return jsonify({"error": "Prediction could not be completed"}), 422

        if model_kind == "artisan":
            return jsonify(
                {
                    "will_pay_for_leads": prediction,
                    "confidence": round(probability, 3),
                    "segment": "HIGH" if probability > 0.7 else "MEDIUM" if probability > 0.4 else "LOW",
                    "recommended_action": (
                        "Fast-track onboarding"
                        if probability > 0.7
                        else "Trial period" if probability > 0.4 else "Free tier first"
                    ),
                }
            )
        return jsonify(
            {
                "will_pay_premium": prediction,
                "confidence": round(probability, 3),
                "ltv_segment": "HIGH" if probability > 0.7 else "MEDIUM" if probability > 0.4 else "LOW",
                "pricing_tier": "Premium" if probability > 0.7 else "Standard" if probability > 0.4 else "Freemium",
            }
        )

    @application.post("/predict/artisan")
    def predict_artisan():
        return inference_request("artisan")

    @application.post("/predict/customer")
    def predict_customer():
        return inference_request("customer")

    @application.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @application.get("/ready")
    def ready():
        is_ready = all(application.config["MODEL_PACKAGES"].get(name) is not None for name in MODEL_SPECS)
        return jsonify({"status": "ready" if is_ready else "unavailable"}), 200 if is_ready else 503

    return application


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=False, use_reloader=False)
