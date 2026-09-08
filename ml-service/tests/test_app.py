from __future__ import annotations

import unittest

import numpy as np

from app import create_app


class Encoder:
    classes_ = np.array(["unknown", "plumber"])

    def transform(self, values):
        return np.array([0 if value == "unknown" else 1 for value in values])


class Scaler:
    def transform(self, values):
        return values


class Model:
    def predict_proba(self, _values):
        return np.array([[0.2, 0.8]])

    def predict(self, _values):
        return np.array([1])


def model_package():
    return {
        "model": Model(),
        "scaler": Scaler(),
        "features": ["trade", "completed_jobs"],
        "label_encoders": {"trade": Encoder()},
    }


def make_client(packages=None):
    configured = packages or {"artisan": model_package(), "customer": model_package()}
    application = create_app(configured, load_models=False)
    application.config["TESTING"] = True
    return application.test_client()


class InferenceApiTests(unittest.TestCase):
    def test_artisan_prediction(self):
        response = make_client().post(
            "/predict/artisan",
            json={"trade": " Plumber ", "completed_jobs": 5},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {
                "confidence": 0.8,
                "recommended_action": "Fast-track onboarding",
                "segment": "HIGH",
                "will_pay_for_leads": True,
            },
        )
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_rejects_unknown_or_complex_features(self):
        unknown = make_client().post("/predict/customer", json={"unexpected": "value"})
        complex_value = make_client().post("/predict/customer", json={"trade": ["plumber"]})

        self.assertEqual(unknown.status_code, 400)
        self.assertEqual(complex_value.status_code, 400)

    def test_requires_json_and_limits_body_size(self):
        wrong_type = make_client().post("/predict/customer", data="trade=plumber")
        oversized = make_client().post(
            "/predict/customer",
            data=b"{" + b'"trade":"' + (b"a" * (33 * 1024)) + b'"}',
            content_type="application/json",
        )

        self.assertEqual(wrong_type.status_code, 415)
        self.assertEqual(oversized.status_code, 413)

    def test_readiness_fails_closed_without_models(self):
        unavailable = make_client({"artisan": None, "customer": None})

        self.assertEqual(unavailable.get("/health").status_code, 200)
        self.assertEqual(unavailable.get("/ready").status_code, 503)
        self.assertEqual(unavailable.post("/predict/artisan", json={"trade": "plumber"}).status_code, 503)

    def test_prediction_errors_do_not_leak_exception_details(self):
        class BrokenModel(Model):
            def predict_proba(self, _values):
                raise ValueError("sensitive implementation detail")

        package = model_package()
        package["model"] = BrokenModel()
        response = make_client({"artisan": package, "customer": package}).post(
            "/predict/artisan", json={"trade": "plumber"}
        )

        self.assertEqual(response.status_code, 422)
        self.assertNotIn("sensitive", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
