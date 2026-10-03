-- HIEN: Hyperlocal Inventory Exchange Network
-- Comprehensive Relational Database Schema (PostgreSQL 18)

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS local_orders CASCADE;
DROP TABLE IF EXISTS transfer_events CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS transfer_recommendations CASCADE;
DROP TABLE IF EXISTS forecast_points CASCADE;
DROP TABLE IF EXISTS historical_demand_points CASCADE;
DROP TABLE IF EXISTS demand_forecasts CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS physical_inspections CASCADE;
DROP TABLE IF EXISTS return_assessments CASCADE;
DROP TABLE IF EXISTS return_images CASCADE;
DROP TABLE IF EXISTS return_timeline CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS hubs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS network_config CASCADE;

-- 1. Network Configuration
CREATE TABLE network_config (
    id SERIAL PRIMARY KEY,
    planning_horizon_days INT NOT NULL DEFAULT 14,
    min_expected_transfer_benefit NUMERIC(10,2) NOT NULL DEFAULT 35.0,
    transport_cost_per_km NUMERIC(10,2) NOT NULL DEFAULT 1.25,
    emissions_factor_kg_per_km NUMERIC(10,4) NOT NULL DEFAULT 0.192,
    hub_capacity_threshold_alert INT NOT NULL DEFAULT 85,
    ai_confidence_threshold INT NOT NULL DEFAULT 75,
    baseline_central_cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 48.5,
    baseline_central_distance_km NUMERIC(10,2) NOT NULL DEFAULT 420.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users and Roles
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'inspector', 'hub_manager', 'logistics', 'analytics_viewer')),
    assigned_hub_id VARCHAR(64),
    assigned_hub_name VARCHAR(255),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_active VARCHAR(64) DEFAULT 'Just now',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Hubs
CREATE TABLE hubs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('store', 'access_point', 'warehouse')),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(64) NOT NULL,
    zip VARCHAR(32) NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    capacity INT NOT NULL DEFAULT 1000,
    current_occupancy INT NOT NULL DEFAULT 0,
    operating_status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (operating_status IN ('active', 'inactive', 'maintenance')),
    supported_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    handling_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    contact_person VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(64) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products and SKUs
CREATE TABLE products (
    sku VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    variant VARCHAR(128) DEFAULT 'Standard',
    selling_price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2) NOT NULL,
    inspection_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    return_eligibility_policy TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Returns
CREATE TABLE returns (
    id VARCHAR(64) PRIMARY KEY,
    rma_number VARCHAR(64) UNIQUE NOT NULL,
    order_reference VARCHAR(64) NOT NULL,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    hub_name VARCHAR(255) NOT NULL,
    return_reason VARCHAR(255) NOT NULL,
    reported_condition VARCHAR(32) NOT NULL CHECK (reported_condition IN ('like_new', 'minor_wear', 'damaged', 'defective', 'unopened')),
    packaging_condition VARCHAR(32) NOT NULL CHECK (packaging_condition IN ('intact', 'opened_good', 'damaged', 'missing')),
    accessory_completeness VARCHAR(32) NOT NULL CHECK (accessory_completeness IN ('complete', 'partial', 'missing')),
    status VARCHAR(32) NOT NULL DEFAULT 'registered' CHECK (status IN (
        'registered', 'assessment_pending', 'inspected', 'approved_resale',
        'refurbishment_required', 'quarantined', 'not_suitable', 'rejected'
    )),
    primary_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Return Images
CREATE TABLE return_images (
    id VARCHAR(64) PRIMARY KEY,
    return_id VARCHAR(64) NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption VARCHAR(255) DEFAULT '',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    detections JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Return Assessments (AI Model Outputs)
CREATE TABLE return_assessments (
    id VARCHAR(64) PRIMARY KEY,
    return_id VARCHAR(64) NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    predicted_disposition VARCHAR(32) NOT NULL,
    confidence_score NUMERIC(5,2) NOT NULL,
    class_probabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    defect_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_features JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_next_step TEXT NOT NULL,
    model_version VARCHAR(128) NOT NULL,
    simulated_notice TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Physical Inspections (Human-in-the-loop QA)
CREATE TABLE physical_inspections (
    id VARCHAR(64) PRIMARY KEY,
    return_id VARCHAR(64) NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    inspector_id VARCHAR(64) NOT NULL,
    inspector_name VARCHAR(255) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checks JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_disposition VARCHAR(32) NOT NULL CHECK (final_disposition IN ('approved_resale', 'refurbishment_required', 'not_suitable', 'quarantined')),
    inspector_notes TEXT DEFAULT '',
    evidence_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Return Timeline
CREATE TABLE return_timeline (
    id SERIAL PRIMARY KEY,
    return_id VARCHAR(64) NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    actor VARCHAR(255) NOT NULL,
    event_type VARCHAR(32) NOT NULL
);

-- 10. Hub Inventory Items
CREATE TABLE inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    variant VARCHAR(128) DEFAULT 'Standard',
    hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    hub_name VARCHAR(255) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    incoming_quantity INT NOT NULL DEFAULT 0 CHECK (incoming_quantity >= 0),
    target_stock INT NOT NULL DEFAULT 10,
    forecast_demand INT NOT NULL DEFAULT 0,
    disposition VARCHAR(32) NOT NULL DEFAULT 'sellable' CHECK (disposition IN ('sellable', 'quarantined', 'refurbishment')),
    storage_location VARCHAR(128) DEFAULT 'Shelf A1',
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_stock_consistency CHECK (available_quantity + reserved_quantity <= total_quantity)
);

-- 11. Inventory Movements
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    movement_type VARCHAR(32) NOT NULL, -- 'return_inward', 'transfer_out', 'transfer_in', 'order_reservation', 'order_fulfilled', 'adjustment'
    quantity INT NOT NULL,
    reference_type VARCHAR(32), -- 'return', 'transfer', 'order'
    reference_id VARCHAR(64),
    actor VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Demand Forecasts
CREATE TABLE demand_forecasts (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    hub_name VARCHAR(255) NOT NULL,
    forecast_horizon_days INT NOT NULL DEFAULT 7,
    model_name VARCHAR(128) NOT NULL DEFAULT 'HistGradientBoostingRegressor',
    model_version VARCHAR(64) NOT NULL DEFAULT 'v1.0.0',
    last_forecast_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mape NUMERIC(6,2) DEFAULT 8.5,
    rmse NUMERIC(6,2) DEFAULT 1.8,
    available_stock INT NOT NULL DEFAULT 0,
    expected_shortage_or_surplus INT NOT NULL DEFAULT 0
);

CREATE TABLE historical_demand_points (
    id SERIAL PRIMARY KEY,
    forecast_id VARCHAR(64) NOT NULL REFERENCES demand_forecasts(id) ON DELETE CASCADE,
    date VARCHAR(32) NOT NULL,
    demand NUMERIC(8,2) NOT NULL
);

CREATE TABLE forecast_points (
    id SERIAL PRIMARY KEY,
    forecast_id VARCHAR(64) NOT NULL REFERENCES demand_forecasts(id) ON DELETE CASCADE,
    date VARCHAR(32) NOT NULL,
    predicted_demand NUMERIC(8,2) NOT NULL,
    lower_bound NUMERIC(8,2) NOT NULL,
    upper_bound NUMERIC(8,2) NOT NULL
);

-- 13. Transfer Recommendations
CREATE TABLE transfer_recommendations (
    id VARCHAR(64) PRIMARY KEY,
    source_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    source_hub_name VARCHAR(255) NOT NULL,
    dest_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    dest_hub_name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    source_surplus INT NOT NULL DEFAULT 0,
    dest_shortage INT NOT NULL DEFAULT 0,
    distance_km NUMERIC(8,2) NOT NULL,
    est_transfer_hours NUMERIC(6,1) NOT NULL,
    est_transport_cost NUMERIC(10,2) NOT NULL,
    handling_cost NUMERIC(10,2) NOT NULL DEFAULT 5.0,
    est_emissions_kg NUMERIC(8,3) NOT NULL,
    expected_benefit NUMERIC(10,2) NOT NULL,
    net_benefit NUMERIC(10,2) NOT NULL,
    rationale TEXT NOT NULL,
    constraint_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Transfers
CREATE TABLE transfers (
    id VARCHAR(64) PRIMARY KEY,
    transfer_code VARCHAR(64) UNIQUE NOT NULL,
    source_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    source_hub_name VARCHAR(255) NOT NULL,
    dest_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    dest_hub_name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'proposed' CHECK (status IN (
        'proposed', 'awaiting_approval', 'approved', 'dispatched',
        'in_transit', 'received', 'exception', 'cancelled'
    )),
    transport_method VARCHAR(64) NOT NULL DEFAULT 'Dedicated EV Courier',
    carrier_name VARCHAR(128),
    tracking_number VARCHAR(128),
    planned_departure VARCHAR(128) NOT NULL,
    actual_departure VARCHAR(128),
    estimated_arrival VARCHAR(128) NOT NULL,
    actual_arrival VARCHAR(128),
    receipt_details JSONB,
    distance_km NUMERIC(8,2) NOT NULL DEFAULT 0,
    transport_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    emissions_kg NUMERIC(8,3) NOT NULL DEFAULT 0,
    exception_reason TEXT,
    created_at VARCHAR(128) NOT NULL,
    updated_at VARCHAR(128) NOT NULL
);

CREATE TABLE transfer_events (
    id VARCHAR(64) PRIMARY KEY,
    transfer_id VARCHAR(64) NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    timestamp VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    actor VARCHAR(255) NOT NULL
);

-- 15. Local Customer Orders
CREATE TABLE local_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(64) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL REFERENCES products(sku) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    assigned_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON UPDATE CASCADE,
    hub_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'reserved', 'prepared', 'ready_for_pickup', 'dispatched', 'fulfilled', 'cancelled'
    )),
    delivery_type VARCHAR(32) NOT NULL CHECK (delivery_type IN ('store_pickup', 'local_courier')),
    promised_delivery VARCHAR(128) NOT NULL,
    reserved_stock_id VARCHAR(64),
    created_at VARCHAR(128) NOT NULL,
    completed_at VARCHAR(128)
);

-- 16. Notifications
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    timestamp VARCHAR(128) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    entity_type VARCHAR(32),
    entity_id VARCHAR(64),
    user_id VARCHAR(64)
);

-- 17. Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp VARCHAR(128) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    previous_state TEXT,
    newState TEXT,
    result VARCHAR(16) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'BLOCKED'))
);

-- Indexes for high-performance querying
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_hub ON returns(hub_id);
CREATE INDEX idx_returns_sku ON returns(sku);
CREATE INDEX idx_inventory_hub_sku ON inventory_items(hub_id, sku);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_source ON transfers(source_hub_id);
CREATE INDEX idx_transfers_dest ON transfers(dest_hub_id);
CREATE INDEX idx_orders_hub_status ON local_orders(assigned_hub_id, status);
CREATE INDEX idx_notifications_read ON notifications(read, timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
