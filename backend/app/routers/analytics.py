from typing import Annotated
from fastapi import APIRouter, Depends
import psycopg
from ..database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics & Sustainability Metrics"])

@router.get("/impact")
def get_impact_analytics(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        # Config
        cur.execute("SELECT * FROM network_config ORDER BY id ASC LIMIT 1")
        cfg = cur.fetchone()
        dist_per_unit = float(cfg["baseline_central_distance_km"]) if cfg else 420.0
        cost_per_unit = float(cfg["baseline_central_cost_per_unit"]) if cfg else 48.5
        emiss_factor = float(cfg["emissions_factor_kg_per_km"]) if cfg else 0.192

        # Returns summary
        cur.execute("SELECT status, category, hub_id, COUNT(*) as cnt FROM returns GROUP BY status, category, hub_id")
        return_group_rows = cur.fetchall()

        total_returns = sum(r["cnt"] for r in return_group_rows)
        approved_resale = sum(r["cnt"] for r in return_group_rows if r["status"] == "approved_resale")
        resale_pct = round((approved_resale / total_returns) * 100) if total_returns > 0 else 0

        # Orders & Transfers
        cur.execute("SELECT COUNT(*) FROM local_orders WHERE status = 'fulfilled'")
        fulfilled_orders = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) FROM transfers WHERE status = 'received'")
        completed_transfers = cur.fetchone()["count"]

        cur.execute("SELECT COALESCE(SUM(distance_km), 0) as dist, COALESCE(SUM(transport_cost), 0) as cost, COALESCE(SUM(emissions_kg), 0) as emiss FROM transfers")
        tr_stats = cur.fetchone()

        hien_distance = float(tr_stats["dist"]) + (fulfilled_orders * 8.5)
        hien_cost = float(tr_stats["cost"]) + (fulfilled_orders * 12.0)
        hien_emissions = float(tr_stats["emiss"]) + (fulfilled_orders * 1.6)

        baseline_items = total_returns + fulfilled_orders
        baseline_distance = baseline_items * dist_per_unit
        baseline_cost = baseline_items * cost_per_unit
        baseline_emissions = baseline_distance * emiss_factor

        dist_avoided = max(0.0, baseline_distance - hien_distance)
        cost_avoided = max(0.0, baseline_cost - hien_cost)
        emiss_avoided = max(0.0, baseline_emissions - hien_emissions)

        # Hub comparisons
        cur.execute("SELECT id, name FROM hubs ORDER BY name ASC")
        hubs = cur.fetchall()
        hub_comparisons = []
        for h in hubs:
            h_id = h["id"]
            h_name = h["name"].replace(" Store", "").replace(" Regional Logistics Hub", " Reg. Hub").replace(" Micro-Fulfillment Center", " MFC")
            h_ret = sum(r["cnt"] for r in return_group_rows if r["hub_id"] == h_id)
            h_app = sum(r["cnt"] for r in return_group_rows if r["hub_id"] == h_id and r["status"] == "approved_resale")
            hub_comparisons.append({
                "hubName": h_name,
                "localReturns": h_ret,
                "resoldUnits": h_app,
                "co2SavedKg": round(h_app * 72.4),
                "costAvoided": round(h_app * 42.0)
            })

        # Category breakdown
        cat_map = {}
        for r in return_group_rows:
            cat = r["category"]
            cat_map.setdefault(cat, {"total": 0, "approved": 0})
            cat_map[cat]["total"] += r["cnt"]
            if r["status"] == "approved_resale":
                cat_map[cat]["approved"] += r["cnt"]

        category_breakdown = [
            {
                "category": cat,
                "returnsCount": data["total"],
                "resaleRatePct": round((data["approved"] / data["total"]) * 100) if data["total"] > 0 else 0
            }
            for cat, data in cat_map.items()
        ]

        monthly_trends = [
            {"month": "May 2026", "baselineCost": 8400, "hienCost": 2100, "emissionsAvoidedKg": 1200},
            {"month": "Jun 2026", "baselineCost": 11200, "hienCost": 2950, "emissionsAvoidedKg": 1650},
            {"month": "Jul 2026", "baselineCost": 14600, "hienCost": 3800, "emissionsAvoidedKg": 2150},
            {"month": "Aug 2026", "baselineCost": 17800, "hienCost": 4400, "emissionsAvoidedKg": 2700},
            {"month": "Sep 2026", "baselineCost": 21500, "hienCost": 5100, "emissionsAvoidedKg": 3300},
            {
                "month": "Oct 2026 (MTD)",
                "baselineCost": round(baseline_cost * 0.4),
                "hienCost": round(hien_cost * 0.4),
                "emissionsAvoidedKg": round(emiss_avoided * 0.4)
            }
        ]

        return {
            "totalReturnsProcessed": total_returns,
            "returnsApprovedResale": approved_resale,
            "returnsResaleEligiblePct": resale_pct,
            "localFulfillmentsCount": fulfilled_orders,
            "completedTransfersCount": completed_transfers,
            "turnaroundDaysHien": 1.4,
            "turnaroundDaysBaseline": 15.2,
            "baselineLogisticsCost": round(baseline_cost),
            "hienLogisticsCost": round(hien_cost),
            "costAvoided": round(cost_avoided),
            "baselineDistanceKm": round(baseline_distance),
            "hienDistanceKm": round(hien_distance),
            "distanceAvoidedKm": round(dist_avoided),
            "baselineEmissionsKg": round(baseline_emissions),
            "hienEmissionsKg": round(hien_emissions),
            "emissionsAvoidedKg": round(emiss_avoided),
            "hubComparisons": hub_comparisons,
            "monthlyTrends": monthly_trends,
            "categoryBreakdown": category_breakdown
        }
