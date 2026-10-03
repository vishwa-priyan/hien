from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/config", tags=["Network Configuration"])

def parse_config_row(row: dict) -> dict:
    d = dict(row)
    return {
        "planningHorizonDays": d["planning_horizon_days"],
        "minExpectedTransferBenefit": float(d["min_expected_transfer_benefit"]),
        "transportCostPerKm": float(d["transport_cost_per_km"]),
        "emissionsFactorKgPerKm": float(d["emissions_factor_kg_per_km"]),
        "hubCapacityThresholdAlert": d["hub_capacity_threshold_alert"],
        "aiConfidenceThreshold": d["ai_confidence_threshold"],
        "baselineCentralCostPerUnit": float(d["baseline_central_cost_per_unit"]),
        "baselineCentralDistanceKm": float(d["baseline_central_distance_km"])
    }

@router.get("")
def get_config(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM network_config ORDER BY id ASC LIMIT 1")
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return parse_config_row(row)

class ConfigUpdate(BaseModel):
    planningHorizonDays: int
    minExpectedTransferBenefit: float
    transportCostPerKm: float
    emissionsFactorKgPerKm: float
    hubCapacityThresholdAlert: int
    aiConfidenceThreshold: int
    baselineCentralCostPerUnit: float
    baselineCentralDistanceKm: float

@router.put("")
@router.patch("")
def update_config(req: ConfigUpdate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            UPDATE network_config
            SET planning_horizon_days = %s,
                min_expected_transfer_benefit = %s,
                transport_cost_per_km = %s,
                emissions_factor_kg_per_km = %s,
                hub_capacity_threshold_alert = %s,
                ai_confidence_threshold = %s,
                baseline_central_cost_per_unit = %s,
                baseline_central_distance_km = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            RETURNING *
        """, (
            req.planningHorizonDays, req.minExpectedTransferBenefit, req.transportCostPerKm,
            req.emissionsFactorKgPerKm, req.hubCapacityThresholdAlert, req.aiConfidenceThreshold,
            req.baselineCentralCostPerUnit, req.baselineCentralDistanceKm
        ))
        row = cur.fetchone()
        db.commit()
        return parse_config_row(row)
