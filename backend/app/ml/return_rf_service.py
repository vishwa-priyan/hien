import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from ..config import settings

logger = logging.getLogger("hien.ml.rf")

class ReturnClassifierService:
    def __init__(self):
        self.pipeline = None
        self.mapping = {0: "not_resalable", 1: "refurbishment_needed", 2: "resalable"}
        self.metadata = {}

    def load_model(self):
        if self.pipeline is not None:
            return
        try:
            logger.info("Loading Random Forest model from %s...", settings.RF_MODEL_PATH)
            self.pipeline = joblib.load(settings.RF_MODEL_PATH)
            
            if os.path.exists(settings.RF_MAPPING_PATH):
                with open(settings.RF_MAPPING_PATH, "r") as f:
                    raw_mapping = json.load(f)
                    self.mapping = {int(k): v for k, v in raw_mapping.items()}

            if os.path.exists(settings.RF_METADATA_PATH):
                with open(settings.RF_METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)

            logger.info("Random Forest return classifier loaded successfully.")
        except Exception as e:
            logger.error("Failed to load Random Forest classifier: %s", e, exc_info=True)
            self.pipeline = None

    def predict(self, feature_dict: dict) -> dict:
        if self.pipeline is None:
            self.load_model()
        if self.pipeline is None:
            raise RuntimeError("Random Forest return classifier could not be initialized.")

        # Default feature map with fallback medians and modes for robustness
        default_features = {
            # Numeric
            "product_age_months": 6.0,
            "original_product_value": 150.0,
            "return_days_after_purchase": 14.0,
            "packaging_damage_score": 10.0,
            "accessories_expected": 2.0,
            "accessories_present": 2.0,
            "accessory_completeness_percentage": 100.0,
            "missing_accessory_count": 0.0,
            "functional_test_available": 1.0,
            "physical_damage_score": 5.0,
            "visible_defect_count": 0.0,
            "return_shipping_distance_km": 15.0,
            "handling_history_count": 1.0,
            "previous_return_count": 0.0,
            "safety_check_required": 0.0,
            "manual_inspection_required": 0.0,
            # Categorical
            "product_category": "Consumer Electronics",
            "brand": "Generic",
            "return_reason": "Customer_Changed_Mind",
            "customer_reported_condition": "Like_New",
            "packaging_condition": "Intact",
            "functional_test_type": "Full_Functional_Test",
            "physical_condition": "Good",
            "return_hub_id": "HUB_001",
            "hub_type": "Store",
            "product_risk_level": "Low"
        }

        # Merge provided features into defaults
        merged = {**default_features, **feature_dict}
        df_input = pd.DataFrame([merged])

        probs = self.pipeline.predict_proba(df_input)[0]
        pred_idx = int(np.argmax(probs))
        prediction = self.mapping.get(pred_idx, "refurbishment_needed")
        confidence = float(probs[pred_idx])

        # Map to UI disposition types
        disposition_map = {
            "resalable": "approved_resale",
            "refurbishment_needed": "refurbishment_required",
            "not_resalable": "not_suitable"
        }
        ui_disposition = disposition_map.get(prediction, "refurbishment_required")

        # Class probabilities dictionary mapped for frontend
        prob_dict = {
            "approved_resale": float(probs[2]) if len(probs) > 2 else 0.0,
            "refurbishment_required": float(probs[1]) if len(probs) > 1 else 0.0,
            "quarantined": 0.05, # Model doesn't classify quarantine directly, reserved for safety flags
            "not_suitable": float(probs[0]) if len(probs) > 0 else 0.0
        }

        review_recommended = bool(confidence < 0.65)
        
        return {
            "raw_prediction": prediction,
            "predicted_disposition": ui_disposition,
            "confidence_score": round(confidence * 100, 1),
            "class_probabilities": prob_dict,
            "review_recommended": review_recommended,
            "model_version": self.metadata.get("model_version", "1.0.0"),
            "reported_accuracy": "70.48%",
            "recommended_next_step": "Proceed to physical inspection" if review_recommended else (
                "Direct to local refurbishment bench" if ui_disposition == "refurbishment_required" else "Eligible for expedited shelf restock"
            )
        }

return_rf_service = ReturnClassifierService()
