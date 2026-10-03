from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import json
import psycopg
from ..database import get_db

router = APIRouter(prefix="/products", tags=["Products"])

def parse_product_row(row: dict) -> dict:
    d = dict(row)
    if "inspection_requirements" in d and isinstance(d["inspection_requirements"], str):
        try:
            d["inspection_requirements"] = json.loads(d["inspection_requirements"])
        except Exception:
            d["inspection_requirements"] = []

    return {
        "sku": d["sku"],
        "name": d["name"],
        "category": d["category"],
        "brand": d["brand"],
        "variant": d.get("variant", "Standard"),
        "sellingPrice": float(d["selling_price"]),
        "originalPrice": float(d["original_price"]),
        "inspectionRequirements": d.get("inspection_requirements", []),
        "returnEligibilityPolicy": d.get("return_eligibility_policy", ""),
        "active": d.get("active", True),
        "imageUrl": d.get("image_url", ""),
    }

@router.get("")
def list_products(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM products ORDER BY name ASC")
        rows = cur.fetchall()
        return [parse_product_row(r) for r in rows]

@router.get("/{sku}")
def get_product(sku: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM products WHERE sku = %s", (sku,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return parse_product_row(row)

class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str
    brand: str
    variant: str = "Standard"
    sellingPrice: float
    originalPrice: float
    inspectionRequirements: list[str] = []
    returnEligibilityPolicy: str = ""
    active: bool = True
    imageUrl: str = ""

@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(prod: ProductCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO products (
                sku, name, category, brand, variant, selling_price, original_price,
                inspection_requirements, return_eligibility_policy, active, image_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            prod.sku, prod.name, prod.category, prod.brand, prod.variant,
            prod.sellingPrice, prod.originalPrice, json.dumps(prod.inspectionRequirements),
            prod.returnEligibilityPolicy, prod.active, prod.imageUrl
        ))
        row = cur.fetchone()
        db.commit()
        return parse_product_row(row)

@router.patch("/{sku}")
@router.put("/{sku}")
def update_product(sku: str, updates: dict, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM products WHERE sku = %s", (sku,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Product not found")

        field_map = {
            "name": "name", "category": "category", "brand": "brand",
            "variant": "variant", "sellingPrice": "selling_price",
            "originalPrice": "original_price", "returnEligibilityPolicy": "return_eligibility_policy",
            "active": "active", "imageUrl": "image_url"
        }
        for k, col in field_map.items():
            if k in updates:
                cur.execute(f"UPDATE products SET {col} = %s WHERE sku = %s", (updates[k], sku))

        if "inspectionRequirements" in updates:
            cur.execute("UPDATE products SET inspection_requirements = %s WHERE sku = %s", (json.dumps(updates["inspectionRequirements"]), sku))

        cur.execute("UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE sku = %s RETURNING *", (sku,))
        row = cur.fetchone()
        db.commit()
        return parse_product_row(row)
