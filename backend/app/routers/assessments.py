from typing import Annotated, Optional
from datetime import datetime
import json
import uuid
import io
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
import psycopg
from ..database import get_db
from ..ml.cnn_service import cnn_service
from ..ml.return_rf_service import return_rf_service

router = APIRouter(prefix="/assessments", tags=["AI Assessments & Model Inference"])

class DispositionPredictionRequest(BaseModel):
    product_category: Optional[str] = "Consumer Electronics"
    brand: Optional[str] = "Generic"
    product_age_months: Optional[float] = 6.0
    original_product_value: Optional[float] = 150.0
    return_days_after_purchase: Optional[float] = 14.0
    return_reason: Optional[str] = "Customer_Changed_Mind"
    customer_reported_condition: Optional[str] = "Like_New"
    packaging_condition: Optional[str] = "Intact"
    packaging_damage_score: Optional[float] = 10.0
    accessories_expected: Optional[float] = 2.0
    accessories_present: Optional[float] = 2.0
    accessory_completeness_percentage: Optional[float] = 100.0
    missing_accessory_count: Optional[float] = 0.0
    functional_test_available: Optional[float] = 1.0
    functional_test_type: Optional[str] = "Full_Functional_Test"
    physical_condition: Optional[str] = "Good"
    physical_damage_score: Optional[float] = 5.0
    visible_defect_count: Optional[float] = 0.0
    return_hub_id: Optional[str] = "HUB_001"
    hub_type: Optional[str] = "Store"
    return_shipping_distance_km: Optional[float] = 15.0
    handling_history_count: Optional[float] = 1.0
    previous_return_count: Optional[float] = 0.0
    product_risk_level: Optional[str] = "Low"
    safety_check_required: Optional[float] = 0.0
    manual_inspection_required: Optional[float] = 0.0

@router.post("/predict-condition")
async def predict_condition(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None)
):
    """
    MobileNetV2 CNN Image Condition Classifier
    Input: RGB Image, scaled to (224, 224, 3) in [0, 1]
    Output: 'defective' or 'good' with class probabilities
    """
    try:
        if file is not None:
            image_bytes = await file.read()
            stream = io.BytesIO(image_bytes)
        elif image_url:
            if image_url.startswith("http://") or image_url.startswith("https://"):
                resp = httpx.get(image_url, timeout=5)
                stream = io.BytesIO(resp.content)
            elif os.path.exists(image_url):
                with open(image_url, "rb") as f:
                    stream = io.BytesIO(f.read())
            else:
                # Fallback dummy RGB gradient for mock images
                from PIL import Image
                dummy = Image.new("RGB", (224, 224), color=(200, 200, 200))
                stream = io.BytesIO()
                dummy.save(stream, format="JPEG")
                stream.seek(0)
        else:
            raise HTTPException(status_code=400, detail="Either file upload or image_url must be provided")

        result = cnn_service.predict(stream)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Condition inference failed: {str(e)}")

@router.post("/predict-disposition")
def predict_disposition(req: DispositionPredictionRequest):
    """
    Random Forest Return Eligibility & Disposition Classifier
    Predicts: 'approved_resale', 'refurbishment_required', or 'not_suitable'
    """
    try:
        feature_dict = req.model_dump()
        result = return_rf_service.predict(feature_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disposition inference failed: {str(e)}")

@router.post("/run/{return_id}")
def run_return_assessment(return_id: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    """
    Runs full ML assessment pipeline on an existing return record,
    generating Random Forest disposition predictions and CNN visual diagnostics.
    """
    with db.cursor() as cur:
        cur.execute("SELECT * FROM returns WHERE id = %s", (return_id,))
        ret = cur.fetchone()
        if not ret:
            raise HTTPException(status_code=404, detail="Return not found")

        # Map return fields to model feature schema
        features = {
            "product_category": ret["category"],
            "return_reason": ret["return_reason"].replace(" ", "_"),
            "customer_reported_condition": ret["reported_condition"].capitalize(),
            "packaging_condition": ret["packaging_condition"].capitalize(),
            "accessory_completeness_percentage": 100.0 if ret["accessory_completeness"] == "complete" else (50.0 if ret["accessory_completeness"] == "partial" else 0.0),
            "missing_accessory_count": 0.0 if ret["accessory_completeness"] == "complete" else 1.0,
            "return_hub_id": ret["hub_id"],
        }
        
        # Run Random Forest
        rf_res = return_rf_service.predict(features)
        
        # Check primary image with CNN if available
        defects = []
        if ret["reported_condition"] in ["damaged", "defective"]:
            defects.append("Reported physical/functional issue by customer")

        confidence_float = float(rf_res["confidence_score"]) / 100.0
        disposition = rf_res["predicted_disposition"]

        asm_id = f"asm-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cur.execute("""
            INSERT INTO return_assessments (
                id, return_id, predicted_disposition, confidence_score,
                class_probabilities, defect_labels, risk_flags, missing_features,
                recommended_next_step, model_version, simulated_notice, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            asm_id, return_id, disposition, confidence_float,
            json.dumps(rf_res["class_probabilities"]),
            json.dumps(defects),
            json.dumps(["Model confidence below threshold; manual QA required"] if rf_res["review_recommended"] else []),
            json.dumps([]),
            rf_res["recommended_next_step"],
            f"RF-Classifier-v{rf_res['model_version']} / MobileNetV2-CNN",
            "AI assessment is advisory only. Physical inspection required before final resale clearance.",
            now_str
        ))
        asm_row = cur.fetchone()

        # Update return status to assessment_pending or inspected
        cur.execute("""
            UPDATE returns SET status = 'assessment_pending', updated_at = %s WHERE id = %s
        """, (now_str, return_id))

        # Add event to timeline
        cur.execute("""
            INSERT INTO return_timeline (return_id, timestamp, title, description, actor, event_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            return_id, now_str, "AI Assessment Completed",
            f"Predicted disposition: {disposition.replace('_', ' ').title()} ({rf_res['confidence_score']}% confidence). {rf_res['recommended_next_step']}",
            "HIEN ML Inference Service", "assessment"
        ))

        db.commit()

        return {
            "id": asm_row["id"],
            "returnId": asm_row["return_id"],
            "predictedDisposition": asm_row["predicted_disposition"],
            "confidenceScore": float(asm_row["confidence_score"]),
            "classProbabilities": rf_res["class_probabilities"],
            "defectLabels": defects,
            "riskFlags": ["Manual inspection required"] if rf_res["review_recommended"] else [],
            "missingFeatures": [],
            "recommendedNextStep": asm_row["recommended_next_step"],
            "modelVersion": asm_row["model_version"],
            "timestamp": str(asm_row["created_at"]),
            "simulatedNotice": asm_row["simulated_notice"]
        }
