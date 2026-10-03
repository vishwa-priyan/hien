import json
import os
import sys
import psycopg
from psycopg.rows import dict_row

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/hien_db")
DEFAULT_HASH = "$2b$12$lK6vGkC0N0q8m7v1d7egeOzjZkV74lK9h2H7LkVr8fG0vM5H6Zl.S" # bcrypt hash for "password123"

def seed():
    data_path = os.path.join(os.path.dirname(__file__), "seed_data.json")
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found.")
        sys.exit(1)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Connecting to database...")
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # 1. Config
            cfg = data.get("config", {})
            cur.execute("""
                INSERT INTO network_config (
                    planning_horizon_days, min_expected_transfer_benefit,
                    transport_cost_per_km, emissions_factor_kg_per_km,
                    hub_capacity_threshold_alert, ai_confidence_threshold,
                    baseline_central_cost_per_unit, baseline_central_distance_km
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                cfg.get("planningHorizonDays", 14),
                cfg.get("minExpectedTransferBenefit", 35.0),
                cfg.get("transportCostPerKm", 1.25),
                cfg.get("emissionsFactorKgPerKm", 0.192),
                cfg.get("hubCapacityThresholdAlert", 85),
                cfg.get("aiConfidenceThreshold", 75),
                cfg.get("baselineCentralCostPerUnit", 48.5),
                cfg.get("baselineCentralDistanceKm", 420.0),
            ))
            print("Config seeded.")

            # 2. Users
            for u in data.get("users", []):
                cur.execute("""
                    INSERT INTO users (
                        id, name, email, password_hash, role, assigned_hub_id,
                        assigned_hub_name, status, last_active, avatar_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role
                """, (
                    u["id"], u["name"], u["email"], DEFAULT_HASH,
                    u["role"], u.get("assignedHubId"), u.get("assignedHubName"),
                    u.get("status", "active"), u.get("lastActive", "Just now"),
                    u.get("avatarUrl")
                ))
            print(f"Users seeded: {len(data.get('users', []))}")

            # 3. Hubs
            for h in data.get("hubs", []):
                cur.execute("""
                    INSERT INTO hubs (
                        id, name, type, address, city, state, zip, lat, lng,
                        capacity, current_occupancy, operating_status,
                        supported_categories, handling_capabilities,
                        contact_person, contact_phone, contact_email
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    h["id"], h["name"], h["type"], h["address"], h["city"],
                    h["state"], h["zip"], h["lat"], h["lng"],
                    h["capacity"], h["currentOccupancy"], h["operatingStatus"],
                    json.dumps(h.get("supportedCategories", [])),
                    json.dumps(h.get("handlingCapabilities", [])),
                    h["contactPerson"], h["contactPhone"], h["contactEmail"]
                ))
            print(f"Hubs seeded: {len(data.get('hubs', []))}")

            # 4. Products
            for p in data.get("products", []):
                cur.execute("""
                    INSERT INTO products (
                        sku, name, category, brand, variant, selling_price, original_price,
                        inspection_requirements, return_eligibility_policy, active, image_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sku) DO NOTHING
                """, (
                    p["sku"], p["name"], p["category"], p["brand"], p.get("variant", "Standard"),
                    p["sellingPrice"], p["originalPrice"],
                    json.dumps(p.get("inspectionRequirements", [])),
                    p.get("returnEligibilityPolicy", ""),
                    p.get("active", True), p.get("imageUrl", "")
                ))
            print(f"Products seeded: {len(data.get('products', []))}")

            # 5. Returns
            for r in data.get("returns", []):
                cur.execute("""
                    INSERT INTO returns (
                        id, rma_number, order_reference, sku, product_name, category,
                        quantity, hub_id, hub_name, return_reason, reported_condition,
                        packaging_condition, accessory_completeness, status, primary_image,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    r["id"], r["rmaNumber"], r["orderReference"], r["sku"],
                    r["productName"], r["category"], r.get("quantity", 1),
                    r["hubId"], r["hubName"], r["returnReason"], r["reportedCondition"],
                    r["packagingCondition"], r["accessoryCompleteness"],
                    r["status"], r.get("primaryImage", ""),
                    r.get("createdAt"), r.get("updatedAt")
                ))

                # Return Images
                for img in r.get("images", []):
                    cur.execute("""
                        INSERT INTO return_images (id, return_id, url, caption, is_primary, detections)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        img["id"], r["id"], img["url"], img.get("caption", ""),
                        img.get("isPrimary", False), json.dumps(img.get("detections", []))
                    ))

                # Return Assessment
                if r.get("assessment"):
                    a = r["assessment"]
                    cur.execute("""
                        INSERT INTO return_assessments (
                            id, return_id, predicted_disposition, confidence_score,
                            class_probabilities, defect_labels, risk_flags, missing_features,
                            recommended_next_step, model_version, simulated_notice, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        a["id"], r["id"], a["predictedDisposition"], a["confidenceScore"],
                        json.dumps(a.get("classProbabilities", {})),
                        json.dumps(a.get("defectLabels", [])),
                        json.dumps(a.get("riskFlags", [])),
                        json.dumps(a.get("missingFeatures", [])),
                        a.get("recommendedNextStep", ""), a.get("modelVersion", "RF-Disp-v1.0"),
                        a.get("simulatedNotice", ""), a.get("timestamp")
                    ))

                # Physical Inspection
                if r.get("inspection"):
                    pi = r["inspection"]
                    cur.execute("""
                        INSERT INTO physical_inspections (
                            id, return_id, inspector_id, inspector_name, completed_at,
                            checks, final_disposition, inspector_notes, evidence_image_url
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        pi["id"], r["id"], pi["inspectorId"], pi["inspectorName"],
                        pi.get("completedAt"), json.dumps(pi.get("checks", [])),
                        pi["finalDisposition"], pi.get("inspectorNotes", ""),
                        pi.get("evidenceImageUrl")
                    ))

                # Timeline
                for event in r.get("historyTimeline", []):
                    cur.execute("""
                        INSERT INTO return_timeline (return_id, timestamp, title, description, actor, event_type)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        r["id"], event.get("timestamp"), event.get("title"),
                        event.get("description"), event.get("actor"), event.get("type", "creation")
                    ))
            print(f"Returns seeded: {len(data.get('returns', []))}")

            # 6. Inventory Items
            for inv in data.get("inventory", []):
                cur.execute("""
                    INSERT INTO inventory_items (
                        id, sku, product_name, category, variant, hub_id, hub_name,
                        total_quantity, available_quantity, reserved_quantity,
                        incoming_quantity, target_stock, forecast_demand, disposition,
                        storage_location, unit_cost, selling_price, last_updated
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    inv["id"], inv["sku"], inv["productName"], inv["category"],
                    inv.get("variant", "Standard"), inv["hubId"], inv["hubName"],
                    inv["totalQuantity"], inv["availableQuantity"], inv["reservedQuantity"],
                    inv["incomingQuantity"], inv["targetStock"], inv["forecastDemand"],
                    inv["disposition"], inv.get("storageLocation", "Shelf A1"),
                    inv.get("unitCost", 0.0), inv.get("sellingPrice", 0.0),
                    inv.get("lastUpdated")
                ))
            print(f"Inventory items seeded: {len(data.get('inventory', []))}")

            # 7. Forecasts
            for fc in data.get("forecasts", []):
                cur.execute("""
                    INSERT INTO demand_forecasts (
                        id, sku, product_name, hub_id, hub_name, forecast_horizon_days,
                        model_name, model_version, last_forecast_timestamp, mape, rmse,
                        available_stock, expected_shortage_or_surplus
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    fc["id"], fc["sku"], fc["productName"], fc["hubId"], fc["hubName"],
                    fc["forecastHorizonDays"], fc["modelName"], fc["modelVersion"],
                    fc.get("lastForecastTimestamp"), fc["mape"], fc["rmse"],
                    fc["availableStock"], fc["expectedShortageOrSurplus"]
                ))

                # Historical Points
                for hp in fc.get("historicalPoints", []):
                    cur.execute("""
                        INSERT INTO historical_demand_points (forecast_id, date, demand)
                        VALUES (%s, %s, %s)
                    """, (fc["id"], hp["date"], hp["demand"]))

                # Forecast Points
                for fp in fc.get("forecastPoints", []):
                    cur.execute("""
                        INSERT INTO forecast_points (forecast_id, date, predicted_demand, lower_bound, upper_bound)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (fc["id"], fp["date"], fp["predictedDemand"], fp["lowerBound"], fp["upperBound"]))
            print(f"Forecasts seeded: {len(data.get('forecasts', []))}")

            # 8. Transfer Recommendations
            for rec in data.get("recommendations", []):
                cur.execute("""
                    INSERT INTO transfer_recommendations (
                        id, source_hub_id, source_hub_name, dest_hub_id, dest_hub_name,
                        sku, product_name, quantity, source_surplus, dest_shortage,
                        distance_km, est_transfer_hours, est_transport_cost, handling_cost,
                        est_emissions_kg, expected_benefit, net_benefit, rationale,
                        constraint_checks, status, rejection_reason, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    rec["id"], rec["sourceHubId"], rec["sourceHubName"],
                    rec["destHubId"], rec["destHubName"], rec["sku"], rec["productName"],
                    rec["quantity"], rec["sourceSurplus"], rec["destShortage"],
                    rec["distanceKm"], rec["estTransferHours"], rec["estTransportCost"],
                    rec["handlingCost"], rec["estEmissionsKg"], rec["expectedBenefit"],
                    rec["netBenefit"], rec["rationale"], json.dumps(rec.get("constraintChecks", [])),
                    rec["status"], rec.get("rejectionReason"), rec.get("createdAt")
                ))
            print(f"Recommendations seeded: {len(data.get('recommendations', []))}")

            # 9. Transfers
            for tr in data.get("transfers", []):
                cur.execute("""
                    INSERT INTO transfers (
                        id, transfer_code, source_hub_id, source_hub_name, dest_hub_id,
                        dest_hub_name, sku, product_name, quantity, status, transport_method,
                        carrier_name, tracking_number, planned_departure, actual_departure,
                        estimated_arrival, actual_arrival, receipt_details, distance_km,
                        transport_cost, emissions_kg, exception_reason, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    tr["id"], tr["transferCode"], tr["sourceHubId"], tr["sourceHubName"],
                    tr["destHubId"], tr["destHubName"], tr["sku"], tr["productName"],
                    tr["quantity"], tr["status"], tr.get("transportMethod", "Dedicated EV Courier"),
                    tr.get("carrierName"), tr.get("trackingNumber"), tr.get("plannedDeparture"),
                    tr.get("actualDeparture"), tr.get("estimatedArrival"), tr.get("actualArrival"),
                    json.dumps(tr.get("receiptDetails")) if tr.get("receiptDetails") else None,
                    tr.get("distanceKm", 0), tr.get("transportCost", 0),
                    tr.get("emissionsKg", 0), tr.get("exceptionReason"),
                    tr.get("createdAt"), tr.get("createdAt")
                ))

                for ev in tr.get("events", []):
                    cur.execute("""
                        INSERT INTO transfer_events (id, transfer_id, timestamp, status, location, description, actor)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        ev["id"], tr["id"], ev.get("timestamp"), ev["status"],
                        ev["location"], ev["description"], ev["actor"]
                    ))
            print(f"Transfers seeded: {len(data.get('transfers', []))}")

            # 10. Orders
            for ord in data.get("orders", []):
                cur.execute("""
                    INSERT INTO local_orders (
                        id, order_number, customer_name, sku, product_name, quantity,
                        assigned_hub_id, hub_name, status, delivery_type,
                        promised_delivery, reserved_stock_id, created_at, completed_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    ord["id"], ord["orderNumber"], ord["customerName"], ord["sku"],
                    ord["productName"], ord["quantity"], ord["assignedHubId"],
                    ord["hubName"], ord["status"], ord["deliveryType"],
                    ord.get("promisedDelivery"), ord.get("reservedStockId"),
                    ord.get("createdAt"), ord.get("completedAt")
                ))
            print(f"Orders seeded: {len(data.get('orders', []))}")

            # 11. Notifications
            for n in data.get("notifications", []):
                cur.execute("""
                    INSERT INTO notifications (
                        id, title, message, type, timestamp, read, link, entity_type, entity_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    n["id"], n["title"], n["message"], n["type"],
                    n.get("timestamp"), n.get("read", False), n.get("link"),
                    n.get("entityType"), n.get("entityId")
                ))
            print(f"Notifications seeded: {len(data.get('notifications', []))}")

            # 12. Audit Logs
            for al in data.get("auditLogs", []):
                cur.execute("""
                    INSERT INTO audit_logs (
                        id, timestamp, actor, role, action, entity_type, entity_id,
                        previous_state, newState, result
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    al["id"], al.get("timestamp"), al["actor"], al["role"],
                    al["action"], al["entityType"], al["entityId"],
                    al.get("previousState"), al.get("newState"), al["result"]
                ))
            print(f"Audit logs seeded: {len(data.get('auditLogs', []))}")

        conn.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
