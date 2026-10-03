export type UserRole = 
  | 'admin' 
  | 'inspector' 
  | 'hub_manager' 
  | 'logistics' 
  | 'analytics_viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedHubId?: string;
  assignedHubName?: string;
  status: 'active' | 'inactive';
  lastActive: string;
  avatarUrl?: string;
}

export type HubType = 'store' | 'access_point' | 'warehouse';
export type HubStatus = 'active' | 'inactive' | 'maintenance';

export interface Hub {
  id: string;
  name: string;
  type: HubType;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  capacity: number; // max units
  currentOccupancy: number; // current units
  operatingStatus: HubStatus;
  supportedCategories: string[];
  handlingCapabilities: string[];
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  brand: string;
  variant: string;
  sellingPrice: number;
  originalPrice: number;
  inspectionRequirements: string[]; // required check IDs/labels
  returnEligibilityPolicy: string;
  active: boolean;
  imageUrl: string;
}

export type ReturnStatus = 
  | 'registered'
  | 'assessment_pending'
  | 'inspected'
  | 'approved_resale'
  | 'refurbishment_required'
  | 'quarantined'
  | 'not_suitable'
  | 'rejected';

export interface BoundingBox {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number;
  height: number;
}

export interface DefectDetection {
  id: string;
  defectClass: string; // e.g. 'Scratched Casing', 'Cracked Glass', 'Stain', 'Missing Seal'
  confidence: number; // 0 to 1
  bbox: BoundingBox;
}

export interface ReturnImage {
  id: string;
  url: string;
  caption: string;
  isPrimary: boolean;
  detections?: DefectDetection[];
}

export interface ReturnAssessment {
  id: string;
  returnId: string;
  predictedDisposition: 'approved_resale' | 'refurbishment_required' | 'not_suitable' | 'quarantined';
  confidenceScore: number;
  classProbabilities: {
    approved_resale: number;
    refurbishment_required: number;
    quarantined: number;
    not_suitable: number;
  };
  defectLabels: string[];
  riskFlags: string[];
  missingFeatures: string[];
  recommendedNextStep: string;
  modelVersion: string; // e.g. "RF-Disp-v2.4 / MobileNetV2-CNN-v1.0"
  timestamp: string;
  simulatedNotice: string;
}

export interface InspectionCheckItem {
  id: string;
  label: string;
  isMandatory: boolean;
  passed: boolean | null; // null if uninspected
  notes?: string;
}

export interface PhysicalInspection {
  id: string;
  returnId: string;
  inspectorId: string;
  inspectorName: string;
  completedAt: string;
  checks: InspectionCheckItem[];
  finalDisposition: 'approved_resale' | 'refurbishment_required' | 'not_suitable' | 'quarantined';
  inspectorNotes: string;
  evidenceImageUrl?: string;
}

export interface ReturnItem {
  id: string;
  rmaNumber: string;
  orderReference: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  hubId: string;
  hubName: string;
  returnReason: string;
  reportedCondition: 'like_new' | 'minor_wear' | 'damaged' | 'defective' | 'unopened';
  packagingCondition: 'intact' | 'opened_good' | 'damaged' | 'missing';
  accessoryCompleteness: 'complete' | 'partial' | 'missing';
  status: ReturnStatus;
  primaryImage: string;
  images: ReturnImage[];
  assessment?: ReturnAssessment;
  inspection?: PhysicalInspection;
  createdAt: string;
  updatedAt: string;
  historyTimeline: {
    timestamp: string;
    title: string;
    description: string;
    actor: string;
    type: 'creation' | 'assessment' | 'inspection' | 'disposition' | 'transfer' | 'fulfillment';
  }[];
}

export type InventoryDisposition = 'sellable' | 'quarantined' | 'refurbishment';

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  variant: string;
  hubId: string;
  hubName: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  targetStock: number;
  forecastDemand: number;
  disposition: InventoryDisposition;
  storageLocation: string; // aisle/shelf e.g. "Aisle 3, Shelf B2"
  unitCost: number;
  sellingPrice: number;
  lastUpdated: string;
}

export interface HistoricalDemandPoint {
  date: string;
  demand: number;
}

export interface ForecastPoint {
  date: string;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
}

export interface DemandForecast {
  id: string;
  sku: string;
  productName: string;
  hubId: string;
  hubName: string;
  forecastHorizonDays: number;
  historicalPoints: HistoricalDemandPoint[];
  forecastPoints: ForecastPoint[];
  modelName: string; // "HistGradientBoostingRegressor"
  modelVersion: string;
  lastForecastTimestamp: string;
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  availableStock: number;
  expectedShortageOrSurplus: number;
}

export type TransferStatus = 
  | 'proposed' 
  | 'awaiting_approval' 
  | 'approved' 
  | 'dispatched' 
  | 'in_transit' 
  | 'received' 
  | 'exception' 
  | 'cancelled';

export interface ConstraintCheck {
  constraint: string;
  passed: boolean;
  details: string;
}

export interface TransferRecommendation {
  id: string;
  sourceHubId: string;
  sourceHubName: string;
  destHubId: string;
  destHubName: string;
  sku: string;
  productName: string;
  quantity: number;
  sourceSurplus: number;
  destShortage: number;
  distanceKm: number;
  estTransferHours: number;
  estTransportCost: number;
  handlingCost: number;
  estEmissionsKg: number;
  expectedBenefit: number;
  netBenefit: number;
  rationale: string;
  constraintChecks: ConstraintCheck[];
  status: 'proposed' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface TransferEvent {
  id: string;
  timestamp: string;
  status: string;
  location: string;
  description: string;
  actor: string;
}

export interface Transfer {
  id: string;
  transferCode: string;
  sourceHubId: string;
  sourceHubName: string;
  destHubId: string;
  destHubName: string;
  sku: string;
  productName: string;
  quantity: number;
  status: TransferStatus;
  transportMethod: string;
  carrierName?: string;
  trackingNumber?: string;
  plannedDeparture: string;
  actualDeparture?: string;
  estimatedArrival: string;
  actualArrival?: string;
  receiptDetails?: {
    receivedQty: number;
    damagedQty: number;
    missingQty: number;
    notes?: string;
    receivedAt: string;
    inspectorName: string;
  };
  distanceKm: number;
  transportCost: number;
  emissionsKg: number;
  createdAt: string;
  events: TransferEvent[];
  exceptionReason?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'reserved' 
  | 'prepared' 
  | 'ready_for_pickup' 
  | 'dispatched' 
  | 'fulfilled' 
  | 'cancelled';

export interface LocalOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  sku: string;
  productName: string;
  quantity: number;
  assignedHubId: string;
  hubName: string;
  status: OrderStatus;
  deliveryType: 'store_pickup' | 'local_courier';
  promisedDelivery: string;
  createdAt: string;
  completedAt?: string;
  reservedStockId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  link?: string;
  entityType?: 'return' | 'transfer' | 'hub' | 'order' | 'assessment';
  entityId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: string;
  newState?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
}

export interface NetworkConfig {
  planningHorizonDays: number;
  minExpectedTransferBenefit: number;
  transportCostPerKm: number;
  emissionsFactorKgPerKm: number; // kg CO2e per km
  hubCapacityThresholdAlert: number; // %
  aiConfidenceThreshold: number; // %
  baselineCentralCostPerUnit: number; // $ average for central warehouse round-trip
  baselineCentralDistanceKm: number; // km average central routing
}
