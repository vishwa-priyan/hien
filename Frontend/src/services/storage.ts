import {
  User,
  Hub,
  Product,
  ReturnItem,
  ReturnStatus,
  InventoryItem,
  DemandForecast,
  TransferRecommendation,
  Transfer,
  LocalOrder,
  NotificationItem,
  AuditEvent,
  NetworkConfig,
} from '../types';

export interface AppState {
  users: User[];
  currentUser: User;
  hubs: Hub[];
  products: Product[];
  returns: ReturnItem[];
  inventory: InventoryItem[];
  forecasts: DemandForecast[];
  recommendations: TransferRecommendation[];
  transfers: Transfer[];
  orders: LocalOrder[];
  notifications: NotificationItem[];
  auditLogs: AuditEvent[];
  config: NetworkConfig;
}

const STORAGE_KEY = 'hien_system_state_v1';

export const INITIAL_CONFIG: NetworkConfig = {
  planningHorizonDays: 14,
  minExpectedTransferBenefit: 35.0, // Minimum $ net benefit
  transportCostPerKm: 1.25, // $ / km
  emissionsFactorKgPerKm: 0.192, // kg CO2e / km for van
  hubCapacityThresholdAlert: 85, // 85%
  aiConfidenceThreshold: 75, // 75%
  baselineCentralCostPerUnit: 48.5, // Return via Central Warehouse average cost
  baselineCentralDistanceKm: 420.0, // Central reverse logistics round-trip
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@hien-network.io',
    role: 'admin',
    status: 'active',
    lastActive: 'Just now',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@hien-network.io',
    role: 'inspector',
    assignedHubId: 'hub-sea-01',
    assignedHubName: 'Seattle Central Hub & QA',
    status: 'active',
    lastActive: '5 mins ago',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-3',
    name: 'Elena Rostova',
    email: 'elena.rostova@hien-network.io',
    role: 'hub_manager',
    assignedHubId: 'hub-bel-02',
    assignedHubName: 'Bellevue Tech Exchange Store',
    status: 'active',
    lastActive: '12 mins ago',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-4',
    name: 'David Kim',
    email: 'david.kim@hien-network.io',
    role: 'logistics',
    assignedHubId: 'hub-tac-04',
    assignedHubName: 'Tacoma Regional Logistics Hub',
    status: 'active',
    lastActive: '2 mins ago',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-5',
    name: 'Dr. Arthur Pendelton',
    email: 'arthur.p@hien-network.io',
    role: 'analytics_viewer',
    status: 'active',
    lastActive: '1 hour ago',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_HUBS: Hub[] = [
  {
    id: 'hub-sea-01',
    name: 'Seattle Central QA Hub',
    type: 'store',
    address: '412 Westlake Ave N',
    city: 'Seattle',
    state: 'WA',
    zip: '98109',
    lat: 47.6231,
    lng: -122.3382,
    capacity: 2500,
    currentOccupancy: 1840,
    operatingStatus: 'active',
    supportedCategories: ['Consumer Electronics', 'Audio & Sound', 'Wearables', 'Computing'],
    handlingCapabilities: ['ESD Safe Workstation', 'Optical Microscope', 'Battery Diagnostic Chamber', 'Repackaging Cell'],
    contactPerson: 'Marcus Vance',
    contactPhone: '+1 (206) 555-0192',
    contactEmail: 'marcus.vance@hien-network.io',
  },
  {
    id: 'hub-bel-02',
    name: 'Bellevue Tech Exchange Store',
    type: 'store',
    address: '10500 NE 8th St',
    city: 'Bellevue',
    state: 'WA',
    zip: '98004',
    lat: 47.6186,
    lng: -122.2001,
    capacity: 1800,
    currentOccupancy: 1320,
    operatingStatus: 'active',
    supportedCategories: ['Consumer Electronics', 'Computing', 'Smart Home', 'Wearables'],
    handlingCapabilities: ['Rapid Diagnostic Pod', 'Express Resale Display', 'Certified Sanitization Station'],
    contactPerson: 'Elena Rostova',
    contactPhone: '+1 (425) 555-0144',
    contactEmail: 'elena.rostova@hien-network.io',
  },
  {
    id: 'hub-red-03',
    name: 'Redmond Micro-Fulfillment Center',
    type: 'access_point',
    address: '15400 NE 90th St',
    city: 'Redmond',
    state: 'WA',
    zip: '98052',
    lat: 47.6834,
    lng: -122.1293,
    capacity: 3200,
    currentOccupancy: 2750,
    operatingStatus: 'active',
    supportedCategories: ['Consumer Electronics', 'Audio & Sound', 'Smart Home', 'Kitchen Appliances'],
    handlingCapabilities: ['Automated Tote Retrieval', 'Same-Day Courier Bay', 'Packaging Testing'],
    contactPerson: 'Jordan Hayes',
    contactPhone: '+1 (425) 555-0178',
    contactEmail: 'jordan.hayes@hien-network.io',
  },
  {
    id: 'hub-tac-04',
    name: 'Tacoma Regional Logistics Hub',
    type: 'warehouse',
    address: '2101 Port of Tacoma Rd',
    city: 'Tacoma',
    state: 'WA',
    zip: '98421',
    lat: 47.2529,
    lng: -122.4093,
    capacity: 6500,
    currentOccupancy: 4200,
    operatingStatus: 'active',
    supportedCategories: ['Consumer Electronics', 'Audio & Sound', 'Wearables', 'Computing', 'Smart Home', 'Kitchen Appliances'],
    handlingCapabilities: ['Heavy Freight Dock', 'Component Refurbishment Lab', 'Long-term Quarantine Staging', 'Bulk Packaging'],
    contactPerson: 'David Kim',
    contactPhone: '+1 (253) 555-0121',
    contactEmail: 'david.kim@hien-network.io',
  },
  {
    id: 'hub-eve-05',
    name: 'Everett North Interchange Store',
    type: 'store',
    address: '1302 SE Everett Mall Way',
    city: 'Everett',
    state: 'WA',
    zip: '98208',
    lat: 47.9174,
    lng: -122.2227,
    capacity: 1500,
    currentOccupancy: 640,
    operatingStatus: 'active',
    supportedCategories: ['Consumer Electronics', 'Wearables', 'Smart Home'],
    handlingCapabilities: ['Customer Returns Dropoff Pod', 'Quick Visual Inspection Bay'],
    contactPerson: 'Amara Okafor',
    contactPhone: '+1 (425) 555-0163',
    contactEmail: 'amara.okafor@hien-network.io',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    sku: 'SKU-AUD-801',
    name: 'AcoustiPro ANC Wireless Headphones',
    category: 'Audio & Sound',
    brand: 'SonicCore',
    variant: 'Midnight Black',
    sellingPrice: 199.99,
    originalPrice: 279.99,
    inspectionRequirements: ['Physical casing integrity check', 'Bluetooth pairing test', 'Active noise cancellation verification', 'Ear cushion hygiene & sanitization', 'Battery charge & hold test'],
    returnEligibilityPolicy: 'Standard 30-day return. Must pass sanitization & functional test for resale.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-CMP-204',
    name: 'SwiftBook Air Ultralight 14"',
    category: 'Computing',
    brand: 'AeroTech',
    variant: 'Space Gray / 16GB / 512GB SSD',
    sellingPrice: 849.0,
    originalPrice: 1099.0,
    inspectionRequirements: ['Display pixel & backlight check', 'Keyboard & trackpad response', 'Hinge torque test', 'Thermal throttling diagnostic', 'Secure cryptographic SSD wipe verification', 'Chassis cosmetic rating'],
    returnEligibilityPolicy: '14-day tech policy. Mandatory full cryptographic storage sanitization.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-WR-405',
    name: 'PulseTrack Pro Smart Fitness Watch',
    category: 'Wearables',
    brand: 'Vitalsync',
    variant: 'Titanium Graphite / 44mm',
    sellingPrice: 169.5,
    originalPrice: 229.0,
    inspectionRequirements: ['Optical heart-rate sensor calibration', 'OLED touchscreen responsiveness', 'Water-resistance gasket inspection', 'Band latch mechanism check', 'Factory firmware reset check'],
    returnEligibilityPolicy: '30-day return. Hygiene check required before restocking.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-CAM-902',
    name: 'LumixView 4K Creator Mirrorless Body',
    category: 'Consumer Electronics',
    brand: 'OptiGlass',
    variant: 'Matte Obsidian',
    sellingPrice: 620.0,
    originalPrice: 799.0,
    inspectionRequirements: ['CMOS sensor dust & scratch inspection', 'Mechanical shutter cycle count validation', 'HDMI & USB-C port physical test', 'Autofocus actuator motor test'],
    returnEligibilityPolicy: '14-day policy. Shutter count must be under 500 activations.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-SMH-108',
    name: 'OmniBeam Smart Mesh Wi-Fi 6 Router',
    category: 'Smart Home',
    brand: 'NetSphere',
    variant: 'Pack of 2 Nodes / Frost White',
    sellingPrice: 145.0,
    originalPrice: 189.99,
    inspectionRequirements: ['WAN & Gigabit LAN throughput check', 'Factory credential wipe', 'Power adapter ripple test', 'Antenna joint integrity'],
    returnEligibilityPolicy: '30-day return. Full factory reset mandatory.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-AUD-302',
    name: 'SoundBar Neo Dolby Atmos Home Theatre',
    category: 'Audio & Sound',
    brand: 'SonicCore',
    variant: 'Carbon Mesh',
    sellingPrice: 249.0,
    originalPrice: 329.99,
    inspectionRequirements: ['Subwoofer bass resonance test', 'eARC HDMI handshake', 'Optical audio input', 'Grille fabric inspection'],
    returnEligibilityPolicy: '30-day return. All original interconnect cables required.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-APP-703',
    name: 'BaristaTouch Precision Espresso Machine',
    category: 'Kitchen Appliances',
    brand: 'CafféMaestro',
    variant: 'Brushed Stainless Steel',
    sellingPrice: 420.0,
    originalPrice: 599.0,
    inspectionRequirements: ['15-bar pump pressure gauge check', 'Thermoblock heating temperature verification', 'Descaling cycle validation', 'Portafilter silicone seal test'],
    returnEligibilityPolicy: '14-day return. Must be thoroughly food-grade sanitized.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-CMP-611',
    name: 'PrecisionPro 27" 4K Colorist Monitor',
    category: 'Computing',
    brand: 'PixelTrue',
    variant: 'IPS 100% sRGB / USB-C 90W PD',
    sellingPrice: 380.0,
    originalPrice: 499.0,
    inspectionRequirements: ['Colorimeter delta-E uniformity', 'Dead / stuck subpixel scan', 'USB-C Power Delivery load test', 'Stand pivot balance'],
    returnEligibilityPolicy: '30-day return. Zero acceptable dead subpixels in central zone.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-GAM-501',
    name: 'VortexEdge Wireless Pro Gamepad',
    category: 'Computing',
    brand: 'ApexGear',
    variant: 'Glacier White',
    sellingPrice: 59.99,
    originalPrice: 79.99,
    inspectionRequirements: ['Hall-effect analog stick drift test', 'Trigger haptic feedback test', 'Battery retention check', 'Button membrane response'],
    returnEligibilityPolicy: '30-day return.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-SMH-404',
    name: 'PureAir HEPA Smart Carbon Purifier',
    category: 'Smart Home',
    brand: 'AuraClean',
    variant: 'Medium Room 400 sq ft',
    sellingPrice: 119.0,
    originalPrice: 159.0,
    inspectionRequirements: ['Fan motor bearing noise test', 'PM2.5 laser sensor calibration', 'Filter replacement bay check', 'App Wi-Fi connectivity'],
    returnEligibilityPolicy: '30-day return. Requires new sealed filter installation for resale.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-WR-209',
    name: 'AeroBuds True Wireless Earphones with Wireless Case',
    category: 'Audio & Sound',
    brand: 'SonicCore',
    variant: 'Ceramic White',
    sellingPrice: 89.99,
    originalPrice: 129.99,
    inspectionRequirements: ['UV sanitization chamber processing', 'Dual beamforming microphone check', 'Case magnetic retention and induction charging', 'Sound balance 1kHz/10kHz'],
    returnEligibilityPolicy: 'Strict hygiene check before inventory restocking.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
  },
  {
    sku: 'SKU-CMP-882',
    name: 'ErgoType Split Mechanical Wireless Keyboard',
    category: 'Computing',
    brand: 'KeySmith',
    variant: 'Gateron Brown Switches / RGB',
    sellingPrice: 125.0,
    originalPrice: 169.0,
    inspectionRequirements: ['All switch actuation matrix test', 'Bluetooth / 2.4Ghz multi-device toggle', 'Keycap wear evaluation', 'Wrist rest cleanliness'],
    returnEligibilityPolicy: '30-day return policy.',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80',
  },
];

// Helper to generate seed returns
export function generateSeedReturns(): ReturnItem[] {
  const returns: ReturnItem[] = [
    {
      id: 'ret-1001',
      rmaNumber: 'RMA-2026-9081',
      orderReference: 'ORD-WA-81923',
      sku: 'SKU-AUD-801',
      productName: 'AcoustiPro ANC Wireless Headphones',
      category: 'Audio & Sound',
      quantity: 1,
      hubId: 'hub-sea-01',
      hubName: 'Seattle Central QA Hub',
      returnReason: 'Customer felt fit was too tight around ears',
      reportedCondition: 'like_new',
      packagingCondition: 'opened_good',
      accessoryCompleteness: 'complete',
      status: 'assessment_pending',
      primaryImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
      images: [
        {
          id: 'img-1',
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
          caption: 'Headphones angled front profile',
          isPrimary: true,
          detections: [
            {
              id: 'det-1',
              defectClass: 'No Visible Flaw',
              confidence: 0.94,
              bbox: { x: 25, y: 20, width: 50, height: 60 },
            },
          ],
        },
        {
          id: 'img-2',
          url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=700&auto=format&fit=crop&q=80',
          caption: 'Ear cup cushion close-up',
          isPrimary: false,
          detections: [
            {
              id: 'det-2',
              defectClass: 'Minor Cushion Crease',
              confidence: 0.81,
              bbox: { x: 35, y: 30, width: 30, height: 40 },
            },
          ],
        },
      ],
      assessment: {
        id: 'asm-1001',
        returnId: 'ret-1001',
        predictedDisposition: 'approved_resale',
        confidenceScore: 0.88,
        classProbabilities: {
          approved_resale: 0.88,
          refurbishment_required: 0.08,
          quarantined: 0.03,
          not_suitable: 0.01,
        },
        defectLabels: ['Minor Cushion Crease (Cosmetic Only)'],
        riskFlags: ['High resale value item - requires manual audio sweep verification'],
        missingFeatures: ['Serial number barcode scan verified'],
        recommendedNextStep: 'Proceed with physical acoustic sweep and ear-pad sanitization checklist.',
        modelVersion: 'RandomForest-Disp-v2.4 / MobileNetV2-CNN-v1.0',
        timestamp: '2026-10-03 09:14:00',
        simulatedNotice: 'Simulated AI assessment. Business rule: Requires physical inspector sign-off before entering sellable stock.',
      },
      createdAt: '2026-10-03 08:30:00',
      updatedAt: '2026-10-03 09:14:00',
      historyTimeline: [
        {
          timestamp: '2026-10-03 08:30:00',
          title: 'Return Registered',
          description: 'Customer dropped off at Seattle Central QA Hub. RMA-2026-9081 issued.',
          actor: 'Customer Service Portal',
          type: 'creation',
        },
        {
          timestamp: '2026-10-03 09:14:00',
          title: 'Simulated AI Pre-Assessment Run',
          description: 'Random Forest predicted: Approved for Resale (88% confidence). CNN classifier detected zero structural defects.',
          actor: 'HIEN AI Inference Service',
          type: 'assessment',
        },
      ],
    },
    {
      id: 'ret-1002',
      rmaNumber: 'RMA-2026-9082',
      orderReference: 'ORD-WA-81490',
      sku: 'SKU-CMP-204',
      productName: 'SwiftBook Air Ultralight 14"',
      category: 'Computing',
      quantity: 1,
      hubId: 'hub-sea-01',
      hubName: 'Seattle Central QA Hub',
      returnReason: 'Customer reported small scratch on bottom casing',
      reportedCondition: 'minor_wear',
      packagingCondition: 'intact',
      accessoryCompleteness: 'complete',
      status: 'inspected',
      primaryImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80',
      images: [
        {
          id: 'img-3',
          url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80',
          caption: 'Top lid and display view',
          isPrimary: true,
          detections: [
            {
              id: 'det-3',
              defectClass: 'Hairline Casing Scratch',
              confidence: 0.89,
              bbox: { x: 60, y: 70, width: 22, height: 18 },
            },
          ],
        },
      ],
      assessment: {
        id: 'asm-1002',
        returnId: 'ret-1002',
        predictedDisposition: 'approved_resale',
        confidenceScore: 0.82,
        classProbabilities: {
          approved_resale: 0.82,
          refurbishment_required: 0.14,
          quarantined: 0.03,
          not_suitable: 0.01,
        },
        defectLabels: ['Hairline Casing Scratch'],
        riskFlags: ['High unit price ($849.00)'],
        missingFeatures: [],
        recommendedNextStep: 'Execute NIST 800-88 sanitization verification and battery test.',
        modelVersion: 'RandomForest-Disp-v2.4 / MobileNetV2-CNN-v1.0',
        timestamp: '2026-10-02 14:15:00',
        simulatedNotice: 'Simulated AI assessment. Physical verification required.',
      },
      inspection: {
        id: 'insp-1002',
        returnId: 'ret-1002',
        inspectorId: 'u-2',
        inspectorName: 'Marcus Vance',
        completedAt: '2026-10-02 16:45:00',
        checks: [
          { id: 'chk-1', label: 'Display pixel & backlight check', isMandatory: true, passed: true, notes: 'Zero dead pixels. Backlight even.' },
          { id: 'chk-2', label: 'Keyboard & trackpad response', isMandatory: true, passed: true, notes: 'All keys tactile.' },
          { id: 'chk-3', label: 'Hinge torque test', isMandatory: true, passed: true },
          { id: 'chk-4', label: 'Thermal throttling diagnostic', isMandatory: true, passed: true },
          { id: 'chk-5', label: 'Secure cryptographic SSD wipe verification', isMandatory: true, passed: true, notes: 'Certificate #WIPE-9941 generated.' },
          { id: 'chk-6', label: 'Chassis cosmetic rating', isMandatory: false, passed: true, notes: 'Hairline 4mm scratch on bottom lip. B-Grade cosmetic.' },
        ],
        finalDisposition: 'approved_resale',
        inspectorNotes: 'Device passed all functional diagnostics with 100% battery health. Classified as Grade-B Certified Resale.',
      },
      createdAt: '2026-10-02 11:20:00',
      updatedAt: '2026-10-02 16:45:00',
      historyTimeline: [
        {
          timestamp: '2026-10-02 11:20:00',
          title: 'Return Registered',
          description: 'Registered at Seattle Hub. Order #ORD-WA-81490.',
          actor: 'Store Clerk',
          type: 'creation',
        },
        {
          timestamp: '2026-10-02 14:15:00',
          title: 'AI Assessment Run',
          description: 'Classified Grade B Resale Candidate.',
          actor: 'HIEN AI Inference Service',
          type: 'assessment',
        },
        {
          timestamp: '2026-10-02 16:45:00',
          title: 'Physical QA Inspection Approved',
          description: 'Marcus Vance signed off all 6 inspection checkpoints. Added to Sellable local stock.',
          actor: 'Marcus Vance',
          type: 'inspection',
        },
      ],
    },
    {
      id: 'ret-1003',
      rmaNumber: 'RMA-2026-9083',
      orderReference: 'ORD-WA-80021',
      sku: 'SKU-WR-405',
      productName: 'PulseTrack Pro Smart Fitness Watch',
      category: 'Wearables',
      quantity: 1,
      hubId: 'hub-bel-02',
      hubName: 'Bellevue Tech Exchange Store',
      returnReason: 'Watch does not charge when plugged into USB dock',
      reportedCondition: 'defective',
      packagingCondition: 'damaged',
      accessoryCompleteness: 'missing',
      status: 'refurbishment_required',
      primaryImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80',
      images: [
        {
          id: 'img-4',
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80',
          caption: 'Back charging pins corrosion',
          isPrimary: true,
          detections: [
            {
              id: 'det-4',
              defectClass: 'Charging Pin Oxidation',
              confidence: 0.92,
              bbox: { x: 42, y: 38, width: 16, height: 18 },
            },
          ],
        },
      ],
      assessment: {
        id: 'asm-1003',
        returnId: 'ret-1003',
        predictedDisposition: 'refurbishment_required',
        confidenceScore: 0.91,
        classProbabilities: {
          approved_resale: 0.04,
          refurbishment_required: 0.91,
          quarantined: 0.03,
          not_suitable: 0.02,
        },
        defectLabels: ['Charging Pin Oxidation', 'Missing Charging Cable'],
        riskFlags: ['Customer reported electrical failure'],
        missingFeatures: ['Original magnetic dock not present in box'],
        recommendedNextStep: 'Transfer to Tacoma Regional Refurbishment Lab for pin recoating and power IC check.',
        modelVersion: 'RandomForest-Disp-v2.4 / MobileNetV2-CNN-v1.0',
        timestamp: '2026-10-01 10:20:00',
        simulatedNotice: 'Simulated AI assessment. Physical verification required.',
      },
      inspection: {
        id: 'insp-1003',
        returnId: 'ret-1003',
        inspectorId: 'u-3',
        inspectorName: 'Elena Rostova',
        completedAt: '2026-10-01 13:10:00',
        checks: [
          { id: 'chk-1', label: 'Optical heart-rate sensor calibration', isMandatory: true, passed: true },
          { id: 'chk-2', label: 'OLED touchscreen responsiveness', isMandatory: true, passed: true },
          { id: 'chk-3', label: 'Water-resistance gasket inspection', isMandatory: true, passed: true },
          { id: 'chk-4', label: 'Band latch mechanism check', isMandatory: true, passed: true },
          { id: 'chk-5', label: 'Factory firmware reset check', isMandatory: true, passed: false, notes: 'Device cannot hold charge to finish firmware flash.' },
        ],
        finalDisposition: 'refurbishment_required',
        inspectorNotes: 'Pin 3 corroded. Requires pin module swap at Tacoma facility. Not sellable locally.',
      },
      createdAt: '2026-10-01 09:40:00',
      updatedAt: '2026-10-01 13:10:00',
      historyTimeline: [
        {
          timestamp: '2026-10-01 09:40:00',
          title: 'Return Registered',
          description: 'Registered at Bellevue Tech Exchange.',
          actor: 'Elena Rostova',
          type: 'creation',
        },
        {
          timestamp: '2026-10-01 10:20:00',
          title: 'AI Assessment Run',
          description: 'CNN classifier detected severe pin oxidation. RF predicted Refurbishment.',
          actor: 'HIEN AI Inference Service',
          type: 'assessment',
        },
        {
          timestamp: '2026-10-01 13:10:00',
          title: 'Inspection Completed - Refurbishment Assigned',
          description: 'Sent to Tacoma lab staging area. Disallowed from local sale.',
          actor: 'Elena Rostova',
          type: 'inspection',
        },
      ],
    },
    {
      id: 'ret-1004',
      rmaNumber: 'RMA-2026-9084',
      orderReference: 'ORD-WA-79401',
      sku: 'SKU-CAM-902',
      productName: 'LumixView 4K Creator Mirrorless Body',
      category: 'Consumer Electronics',
      quantity: 1,
      hubId: 'hub-tac-04',
      hubName: 'Tacoma Regional Logistics Hub',
      returnReason: 'Customer claims autofocus fails in low light',
      reportedCondition: 'minor_wear',
      packagingCondition: 'opened_good',
      accessoryCompleteness: 'complete',
      status: 'registered',
      primaryImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80',
      images: [
        {
          id: 'img-5',
          url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80',
          caption: 'Camera front mount and sensor glass',
          isPrimary: true,
        },
      ],
      createdAt: '2026-10-03 10:00:00',
      updatedAt: '2026-10-03 10:00:00',
      historyTimeline: [
        {
          timestamp: '2026-10-03 10:00:00',
          title: 'Return Registered',
          description: 'Awaiting initial simulated AI assessment and QA allocation.',
          actor: 'Tacoma Depot Clerk',
          type: 'creation',
        },
      ],
    },
    {
      id: 'ret-1005',
      rmaNumber: 'RMA-2026-9085',
      orderReference: 'ORD-WA-77890',
      sku: 'SKU-APP-703',
      productName: 'BaristaTouch Precision Espresso Machine',
      category: 'Kitchen Appliances',
      quantity: 1,
      hubId: 'hub-red-03',
      hubName: 'Redmond Micro-Fulfillment Center',
      returnReason: 'Water reservoir leaks from lower O-ring seal',
      reportedCondition: 'damaged',
      packagingCondition: 'damaged',
      accessoryCompleteness: 'partial',
      status: 'quarantined',
      primaryImage: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=700&auto=format&fit=crop&q=80',
      images: [
        {
          id: 'img-6',
          url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=700&auto=format&fit=crop&q=80',
          caption: 'Base water reservoir connector leak',
          isPrimary: true,
          detections: [
            {
              id: 'det-6',
              defectClass: 'Fluid Seepage Trace',
              confidence: 0.95,
              bbox: { x: 30, y: 70, width: 40, height: 25 },
            },
          ],
        },
      ],
      assessment: {
        id: 'asm-1005',
        returnId: 'ret-1005',
        predictedDisposition: 'quarantined',
        confidenceScore: 0.94,
        classProbabilities: {
          approved_resale: 0.01,
          refurbishment_required: 0.12,
          quarantined: 0.85,
          not_suitable: 0.02,
        },
        defectLabels: ['Fluid Leakage', 'Missing Drip Tray Inlay'],
        riskFlags: ['Water/electrical hazard risk', 'Potential internal pump seal breach'],
        missingFeatures: ['Sanitization history'],
        recommendedNextStep: 'Place in isolation quarantine bay. Do not power on until pressure tested.',
        modelVersion: 'RandomForest-Disp-v2.4 / MobileNetV2-CNN-v1.0',
        timestamp: '2026-10-02 12:00:00',
        simulatedNotice: 'Simulated AI assessment. Hazard flag detected.',
      },
      createdAt: '2026-10-02 11:30:00',
      updatedAt: '2026-10-02 12:00:00',
      historyTimeline: [
        {
          timestamp: '2026-10-02 11:30:00',
          title: 'Return Registered',
          description: 'Client reported water leak.',
          actor: 'Redmond Service Desk',
          type: 'creation',
        },
        {
          timestamp: '2026-10-02 12:00:00',
          title: 'Hazard Flag Quarantined',
          description: 'AI model triggered safety protocol. Item isolated.',
          actor: 'HIEN AI Inference Service',
          type: 'assessment',
        },
      ],
    },
  ];

  // Generate 45 additional realistic returns to fulfill the >= 50 returns requirement!
  const productSkus = INITIAL_PRODUCTS.map(p => p.sku);
  const hubIds = INITIAL_HUBS.map(h => h.id);
  const reasons = [
    'Changed mind, color did not match room',
    'Customer ordered wrong variant',
    'Slight packaging tear upon arrival',
    'Unopened gift, customer had duplicate',
    'User found setup too difficult',
    'Battery life didn’t match expectations',
    'Upgraded to higher spec model',
    'Minor cosmetic blemish on corner',
    'Customer switched to different ecosystem',
  ];
  const conditions: ('like_new' | 'minor_wear' | 'damaged' | 'unopened')[] = ['like_new', 'minor_wear', 'unopened', 'damaged'];
  const statuses: ReturnStatus[] = ['registered', 'assessment_pending', 'inspected', 'approved_resale', 'refurbishment_required'];

  for (let i = 6; i <= 52; i++) {
    const p = INITIAL_PRODUCTS[i % INITIAL_PRODUCTS.length];
    const h = INITIAL_HUBS[i % INITIAL_HUBS.length];
    const status = statuses[i % statuses.length];
    const cond = conditions[i % conditions.length];
    const rId = `ret-${1000 + i}`;
    const day = (i % 28) + 1;
    const dateStr = `2026-09-${day < 10 ? '0' + day : day} 14:${(i * 3) % 60 < 10 ? '0' + ((i * 3) % 60) : (i * 3) % 60}:00`;

    returns.push({
      id: rId,
      rmaNumber: `RMA-2026-${9100 + i}`,
      orderReference: `ORD-WA-${70000 + i * 13}`,
      sku: p.sku,
      productName: p.name,
      category: p.category,
      quantity: 1,
      hubId: h.id,
      hubName: h.name,
      returnReason: reasons[i % reasons.length],
      reportedCondition: cond,
      packagingCondition: i % 2 === 0 ? 'opened_good' : 'intact',
      accessoryCompleteness: i % 5 === 0 ? 'partial' : 'complete',
      status: status,
      primaryImage: p.imageUrl,
      images: [
        {
          id: `img-${rId}-1`,
          url: p.imageUrl,
          caption: `${p.name} inspection view`,
          isPrimary: true,
          detections: [
            {
              id: `det-${rId}-1`,
              defectClass: cond === 'damaged' ? 'Scuff Mark' : 'Clean Surface',
              confidence: 0.85 + (i % 10) * 0.01,
              bbox: { x: 30, y: 25, width: 40, height: 50 },
            },
          ],
        },
      ],
      assessment: {
        id: `asm-${rId}`,
        returnId: rId,
        predictedDisposition: status === 'approved_resale' ? 'approved_resale' : 'approved_resale',
        confidenceScore: 0.84 + (i % 12) * 0.01,
        classProbabilities: {
          approved_resale: 0.82,
          refurbishment_required: 0.12,
          quarantined: 0.04,
          not_suitable: 0.02,
        },
        defectLabels: cond === 'damaged' ? ['Minor Cosmetic Scuff'] : ['Nominal Surface'],
        riskFlags: i % 4 === 0 ? ['Verify packaging hygiene before resale'] : [],
        missingFeatures: [],
        recommendedNextStep: 'Complete standard inspection checklist.',
        modelVersion: 'RandomForest-Disp-v2.4 / MobileNetV2-CNN-v1.0',
        timestamp: dateStr,
        simulatedNotice: 'Simulated AI assessment. Physical verification required.',
      },
      createdAt: dateStr,
      updatedAt: dateStr,
      historyTimeline: [
        {
          timestamp: dateStr,
          title: 'Return Registered',
          description: `Logged at ${h.name}. Reason: ${reasons[i % reasons.length]}`,
          actor: 'Intake Associate',
          type: 'creation',
        },
      ],
    });
  }

  return returns;
}

export function generateSeedInventory(): InventoryItem[] {
  const items: InventoryItem[] = [];
  let idCounter = 1;

  for (const hub of INITIAL_HUBS) {
    for (const prod of INITIAL_PRODUCTS) {
      // Deterministic inventory counts
      const seed = (hub.id.length * 7 + prod.sku.length * 13 + idCounter) % 25;
      const total = 5 + seed;
      const reserved = Math.min(2, Math.floor(total * 0.15));
      const incoming = (idCounter % 3 === 0) ? 4 : 0;
      const available = Math.max(0, total - reserved);

      items.push({
        id: `inv-${idCounter++}`,
        sku: prod.sku,
        productName: prod.name,
        category: prod.category,
        variant: prod.variant,
        hubId: hub.id,
        hubName: hub.name,
        totalQuantity: total,
        availableQuantity: available,
        reservedQuantity: reserved,
        incomingQuantity: incoming,
        targetStock: 12,
        forecastDemand: 8 + (seed % 10),
        disposition: 'sellable',
        storageLocation: `Bay ${String.fromCharCode(65 + (idCounter % 4))}-${(idCounter % 12) + 1}`,
        unitCost: Math.round(prod.sellingPrice * 0.6),
        sellingPrice: prod.sellingPrice,
        lastUpdated: '2026-10-03 08:00:00',
      });
    }
  }

  return items;
}

export function generateSeedForecasts(): DemandForecast[] {
  const forecasts: DemandForecast[] = [];
  let id = 1;

  for (const prod of INITIAL_PRODUCTS.slice(0, 6)) {
    for (const hub of INITIAL_HUBS.slice(0, 3)) {
      const historicalPoints = [];
      for (let day = 1; day <= 14; day++) {
        const base = 8 + (id % 5);
        const noise = ((day * 7 + id) % 5) - 2;
        historicalPoints.push({
          date: `2026-09-${day < 10 ? '0' + day : day}`,
          demand: Math.max(2, base + noise),
        });
      }

      const forecastPoints = [];
      for (let day = 15; day <= 28; day++) {
        const predicted = Math.round(9 + (id % 4) + Math.sin(day) * 3);
        forecastPoints.push({
          date: `2026-09-${day}`,
          predictedDemand: predicted,
          lowerBound: Math.max(1, predicted - 2),
          upperBound: predicted + 3,
        });
      }

      forecasts.push({
        id: `fc-${id++}`,
        sku: prod.sku,
        productName: prod.name,
        hubId: hub.id,
        hubName: hub.name,
        forecastHorizonDays: 14,
        historicalPoints,
        forecastPoints,
        modelName: 'HistGradientBoostingRegressor',
        modelVersion: 'v3.2.1-prod',
        lastForecastTimestamp: '2026-10-03 00:00:00',
        mape: 7.4 + (id % 3) * 0.8,
        rmse: 1.8 + (id % 2) * 0.4,
        availableStock: 6 + (id % 8),
        expectedShortageOrSurplus: (id % 2 === 0 ? 5 : -4),
      });
    }
  }

  return forecasts;
}

export function generateSeedTransfers(): Transfer[] {
  return [
    {
      id: 'tr-301',
      transferCode: 'TR-2026-0301',
      sourceHubId: 'hub-tac-04',
      sourceHubName: 'Tacoma Regional Logistics Hub',
      destHubId: 'hub-sea-01',
      destHubName: 'Seattle Central QA Hub',
      sku: 'SKU-AUD-801',
      productName: 'AcoustiPro ANC Wireless Headphones',
      quantity: 6,
      status: 'in_transit',
      transportMethod: 'Electric Delivery Van (GreenRoute)',
      carrierName: 'EcoExpress Pacific',
      trackingNumber: 'TRK-WA-99214',
      plannedDeparture: '2026-10-03 08:30:00',
      actualDeparture: '2026-10-03 08:42:00',
      estimatedArrival: '2026-10-03 10:15:00',
      distanceKm: 52.4,
      transportCost: 65.5,
      emissionsKg: 4.8,
      createdAt: '2026-10-03 07:15:00',
      events: [
        {
          id: 'ev-1',
          timestamp: '2026-10-03 07:15:00',
          status: 'Transfer Created',
          location: 'Tacoma Regional Hub',
          description: 'Transfer recommendation approved by Hub Manager.',
          actor: 'Elena Rostova',
        },
        {
          id: 'ev-2',
          timestamp: '2026-10-03 08:42:00',
          status: 'Dispatched',
          location: 'Tacoma Regional Hub - Bay 4',
          description: 'Loaded onto EcoExpress Van #12. Scanned 6 units.',
          actor: 'David Kim',
        },
      ],
    },
    {
      id: 'tr-302',
      transferCode: 'TR-2026-0302',
      sourceHubId: 'hub-bel-02',
      sourceHubName: 'Bellevue Tech Exchange Store',
      destHubId: 'hub-red-03',
      destHubName: 'Redmond Micro-Fulfillment Center',
      sku: 'SKU-CMP-204',
      productName: 'SwiftBook Air Ultralight 14"',
      quantity: 4,
      status: 'awaiting_approval',
      transportMethod: 'Local Courier Partner',
      plannedDeparture: '2026-10-03 14:00:00',
      estimatedArrival: '2026-10-03 15:30:00',
      distanceKm: 9.8,
      transportCost: 22.0,
      emissionsKg: 1.2,
      createdAt: '2026-10-03 09:00:00',
      events: [
        {
          id: 'ev-3',
          timestamp: '2026-10-03 09:00:00',
          status: 'Proposed',
          location: 'HIEN Decision Engine',
          description: 'Generated to rebalance high Redmond demand from Bellevue surplus.',
          actor: 'System Automated Rule Engine',
        },
      ],
    },
    {
      id: 'tr-303',
      transferCode: 'TR-2026-0303',
      sourceHubId: 'hub-sea-01',
      sourceHubName: 'Seattle Central QA Hub',
      destHubId: 'hub-bel-02',
      destHubName: 'Bellevue Tech Exchange Store',
      sku: 'SKU-WR-405',
      productName: 'PulseTrack Pro Smart Fitness Watch',
      quantity: 5,
      status: 'approved',
      transportMethod: 'Local Courier Partner',
      distanceKm: 16.2,
      transportCost: 28.5,
      emissionsKg: 1.9,
      createdAt: '2026-10-03 06:30:00',
      plannedDeparture: '2026-10-03 11:00:00',
      estimatedArrival: '2026-10-03 12:15:00',
      events: [
        {
          id: 'ev-4',
          timestamp: '2026-10-03 06:30:00',
          status: 'Approved',
          location: 'Seattle Central Hub',
          description: 'Transfer approved. Units reserved at source.',
          actor: 'Marcus Vance',
        },
      ],
    },
    {
      id: 'tr-304',
      transferCode: 'TR-2026-0304',
      sourceHubId: 'hub-tac-04',
      sourceHubName: 'Tacoma Regional Logistics Hub',
      destHubId: 'hub-eve-05',
      destHubName: 'Everett North Interchange Store',
      sku: 'SKU-SMH-108',
      productName: 'OmniBeam Smart Mesh Wi-Fi 6 Router',
      quantity: 8,
      status: 'received',
      transportMethod: 'Regional Dedicated Shuttles',
      carrierName: 'SoundTransit Logistics',
      trackingNumber: 'TRK-WA-88190',
      plannedDeparture: '2026-10-02 09:00:00',
      actualDeparture: '2026-10-02 09:15:00',
      estimatedArrival: '2026-10-02 11:30:00',
      actualArrival: '2026-10-02 11:22:00',
      receiptDetails: {
        receivedQty: 8,
        damagedQty: 0,
        missingQty: 0,
        notes: 'All units received in mint sealed condition.',
        receivedAt: '2026-10-02 11:35:00',
        inspectorName: 'Amara Okafor',
      },
      distanceKm: 104.5,
      transportCost: 130.0,
      emissionsKg: 11.2,
      createdAt: '2026-10-02 08:00:00',
      events: [
        {
          id: 'ev-5',
          timestamp: '2026-10-02 11:35:00',
          status: 'Received and Checked-In',
          location: 'Everett North Store',
          description: 'Receipt confirmed. Stock admitted into Everett inventory.',
          actor: 'Amara Okafor',
        },
      ],
    },
    {
      id: 'tr-305',
      transferCode: 'TR-2026-0305',
      sourceHubId: 'hub-red-03',
      sourceHubName: 'Redmond Micro-Fulfillment Center',
      destHubId: 'hub-sea-01',
      destHubName: 'Seattle Central QA Hub',
      sku: 'SKU-AUD-302',
      productName: 'SoundBar Neo Dolby Atmos Home Theatre',
      quantity: 3,
      status: 'exception',
      transportMethod: 'Local Courier Partner',
      plannedDeparture: '2026-10-02 14:30:00',
      estimatedArrival: '2026-10-02 16:00:00',
      distanceKm: 24.1,
      transportCost: 35.0,
      emissionsKg: 2.8,
      createdAt: '2026-10-02 14:00:00',
      exceptionReason: 'Receipt Discrepancy: 1 unit damaged during handling transit. Exception file #EX-9921 raised.',
      receiptDetails: {
        receivedQty: 2,
        damagedQty: 1,
        missingQty: 0,
        notes: 'Outer box crushed on 1 unit; acoustic grille punctured. 2 units admitted, 1 quarantined.',
        receivedAt: '2026-10-02 17:10:00',
        inspectorName: 'Marcus Vance',
      },
      events: [
        {
          id: 'ev-6',
          timestamp: '2026-10-02 17:10:00',
          status: 'Receipt Discrepancy Exception',
          location: 'Seattle Central Hub',
          description: 'Discrepancy logged: 1 unit damaged. Audit event triggered.',
          actor: 'Marcus Vance',
        },
      ],
    },
  ];
}

export function generateSeedRecommendations(): TransferRecommendation[] {
  return [
    {
      id: 'rec-201',
      sourceHubId: 'hub-tac-04',
      sourceHubName: 'Tacoma Regional Logistics Hub',
      destHubId: 'hub-sea-01',
      destHubName: 'Seattle Central QA Hub',
      sku: 'SKU-AUD-801',
      productName: 'AcoustiPro ANC Wireless Headphones',
      quantity: 5,
      sourceSurplus: 14,
      destShortage: 7,
      distanceKm: 52.4,
      estTransferHours: 1.5,
      estTransportCost: 65.5,
      handlingCost: 15.0,
      estEmissionsKg: 6.8,
      expectedBenefit: 285.0, // avoid central warehouse return and restock sales
      netBenefit: 204.5,
      rationale: 'Seattle projected to stock out in 48 hours. Tacoma holds 14 surplus units from regional returns. Hyperlocal transfer avoids 368 km round trip to central depot.',
      constraintChecks: [
        { constraint: 'Source Stock Feasibility', passed: true, details: 'Tacoma available stock (14) exceeds transfer qty (5) with 9 reserve buffer remaining.' },
        { constraint: 'Destination Capacity Check', passed: true, details: 'Seattle Central QA Hub at 73.6% capacity; has space for 660 units.' },
        { constraint: 'Net Benefit Threshold Check', passed: true, details: 'Net benefit ($204.50) exceeds configured hurdle ($35.00).' },
        { constraint: 'Product Compatibility Check', passed: true, details: 'Destination supports Consumer Audio category and ESD testing.' },
      ],
      status: 'proposed',
      createdAt: '2026-10-03 08:30:00',
    },
    {
      id: 'rec-202',
      sourceHubId: 'hub-bel-02',
      sourceHubName: 'Bellevue Tech Exchange Store',
      destHubId: 'hub-red-03',
      destHubName: 'Redmond Micro-Fulfillment Center',
      sku: 'SKU-CMP-204',
      productName: 'SwiftBook Air Ultralight 14"',
      quantity: 3,
      sourceSurplus: 6,
      destShortage: 5,
      distanceKm: 9.8,
      estTransferHours: 0.6,
      estTransportCost: 18.0,
      handlingCost: 12.0,
      estEmissionsKg: 1.4,
      expectedBenefit: 390.0,
      netBenefit: 360.0,
      rationale: 'Redmond enterprise customers have 4 pending local pickup orders. Bellevue holds 6 certified inspected units.',
      constraintChecks: [
        { constraint: 'Source Stock Feasibility', passed: true, details: 'Bellevue available: 6 units, transfer: 3 units.' },
        { constraint: 'Destination Capacity Check', passed: true, details: 'Redmond occupancy at 85.9%, has available capacity for 450 units.' },
        { constraint: 'Net Benefit Threshold Check', passed: true, details: 'Net benefit ($360.00) well above minimum hurdle.' },
        { constraint: 'Product Compatibility Check', passed: true, details: 'Compliant with electronics handling.' },
      ],
      status: 'proposed',
      createdAt: '2026-10-03 09:15:00',
    },
    {
      id: 'rec-203',
      sourceHubId: 'hub-eve-05',
      sourceHubName: 'Everett North Interchange Store',
      destHubId: 'hub-sea-01',
      destHubName: 'Seattle Central QA Hub',
      sku: 'SKU-SMH-404',
      productName: 'PureAir HEPA Smart Carbon Purifier',
      quantity: 4,
      sourceSurplus: 8,
      destShortage: 6,
      distanceKm: 44.2,
      estTransferHours: 1.1,
      estTransportCost: 55.25,
      handlingCost: 16.0,
      estEmissionsKg: 5.7,
      expectedBenefit: 180.0,
      netBenefit: 108.75,
      rationale: 'Urban particulate surge in Seattle driving air purifier sales. Everett has slow moving surplus stock.',
      constraintChecks: [
        { constraint: 'Source Stock Feasibility', passed: true, details: 'Everett available: 8 units.' },
        { constraint: 'Destination Capacity Check', passed: true, details: 'Capacity verified.' },
        { constraint: 'Net Benefit Threshold Check', passed: true, details: 'Net benefit ($108.75) exceeds $35.00 minimum.' },
      ],
      status: 'proposed',
      createdAt: '2026-10-03 09:40:00',
    },
  ];
}

export function generateSeedOrders(): LocalOrder[] {
  return [
    {
      id: 'ord-8101',
      orderNumber: 'ORD-WA-90411',
      customerName: 'Maya Lin',
      sku: 'SKU-AUD-801',
      productName: 'AcoustiPro ANC Wireless Headphones',
      quantity: 1,
      assignedHubId: 'hub-sea-01',
      hubName: 'Seattle Central QA Hub',
      status: 'pending',
      deliveryType: 'store_pickup',
      promisedDelivery: '2026-10-03 16:00:00',
      createdAt: '2026-10-03 08:45:00',
    },
    {
      id: 'ord-8102',
      orderNumber: 'ORD-WA-90412',
      customerName: 'Thomas Thorne',
      sku: 'SKU-CMP-204',
      productName: 'SwiftBook Air Ultralight 14"',
      quantity: 1,
      assignedHubId: 'hub-bel-02',
      hubName: 'Bellevue Tech Exchange Store',
      status: 'reserved',
      deliveryType: 'local_courier',
      promisedDelivery: '2026-10-03 14:30:00',
      createdAt: '2026-10-03 07:30:00',
      reservedStockId: 'inv-14',
    },
    {
      id: 'ord-8103',
      orderNumber: 'ORD-WA-90413',
      customerName: 'Priya Sharma',
      sku: 'SKU-WR-405',
      productName: 'PulseTrack Pro Smart Fitness Watch',
      quantity: 1,
      assignedHubId: 'hub-sea-01',
      hubName: 'Seattle Central QA Hub',
      status: 'prepared',
      deliveryType: 'store_pickup',
      promisedDelivery: '2026-10-03 13:00:00',
      createdAt: '2026-10-03 06:15:00',
    },
    {
      id: 'ord-8104',
      orderNumber: 'ORD-WA-90414',
      customerName: 'Liam O’Connor',
      sku: 'SKU-SMH-108',
      productName: 'OmniBeam Smart Mesh Wi-Fi 6 Router',
      quantity: 1,
      assignedHubId: 'hub-red-03',
      hubName: 'Redmond Micro-Fulfillment Center',
      status: 'ready_for_pickup',
      deliveryType: 'store_pickup',
      promisedDelivery: '2026-10-03 12:00:00',
      createdAt: '2026-10-02 18:00:00',
    },
    {
      id: 'ord-8105',
      orderNumber: 'ORD-WA-90415',
      customerName: 'Zoe Katsaros',
      sku: 'SKU-GAM-501',
      productName: 'VortexEdge Wireless Pro Gamepad',
      quantity: 2,
      assignedHubId: 'hub-tac-04',
      hubName: 'Tacoma Regional Logistics Hub',
      status: 'fulfilled',
      deliveryType: 'local_courier',
      promisedDelivery: '2026-10-02 15:00:00',
      createdAt: '2026-10-02 10:00:00',
      completedAt: '2026-10-02 14:10:00',
    },
  ];
}

export function generateSeedNotifications(): NotificationItem[] {
  return [
    {
      id: 'notif-1',
      title: 'High-Value Return Awaiting Inspection',
      message: 'SwiftBook Air Ultralight (RMA-2026-9082) passed AI screen and is waiting in Seattle QA Bay.',
      type: 'warning',
      timestamp: '15 mins ago',
      read: false,
      entityType: 'return',
      entityId: 'ret-1002',
    },
    {
      id: 'notif-2',
      title: 'Transfer In-Transit Update',
      message: 'TR-2026-0301 (6 Headphones) dispatched from Tacoma en-route to Seattle Central.',
      type: 'info',
      timestamp: '42 mins ago',
      read: false,
      entityType: 'transfer',
      entityId: 'tr-301',
    },
    {
      id: 'notif-3',
      title: 'Transfer Exception Logged',
      message: 'TR-2026-0305 reported 1 transit-damaged unit at Seattle Central Hub. File #EX-9921 created.',
      type: 'error',
      timestamp: '3 hours ago',
      read: false,
      entityType: 'transfer',
      entityId: 'tr-305',
    },
    {
      id: 'notif-4',
      title: 'Redmond Micro-Fulfillment Alert',
      message: 'Redmond hub has reached 85.9% capacity threshold. Outbound balancing recommended.',
      type: 'warning',
      timestamp: '5 hours ago',
      read: true,
      entityType: 'hub',
      entityId: 'hub-red-03',
    },
    {
      id: 'notif-5',
      title: 'Sustainable Fulfillment Milestone',
      message: 'HIEN network crossed 14,200 kg CO2e emissions avoided this month!',
      type: 'success',
      timestamp: '1 day ago',
      read: true,
    },
  ];
}

export function generateSeedAuditLogs(): AuditEvent[] {
  return [
    {
      id: 'aud-1',
      timestamp: '2026-10-03 09:14:00',
      actor: 'HIEN AI Inference Service',
      role: 'System AI Engine',
      action: 'RUN_AI_ASSESSMENT',
      entityType: 'ReturnItem',
      entityId: 'ret-1001',
      previousState: 'STATUS: registered',
      newState: 'STATUS: assessment_pending (RF Prob: 0.88 resale)',
      result: 'SUCCESS',
    },
    {
      id: 'aud-2',
      timestamp: '2026-10-03 08:42:00',
      actor: 'David Kim',
      role: 'logistics',
      action: 'DISPATCH_TRANSFER',
      entityType: 'Transfer',
      entityId: 'tr-301',
      previousState: 'STATUS: approved',
      newState: 'STATUS: in_transit (Carrier: EcoExpress Van #12)',
      result: 'SUCCESS',
    },
    {
      id: 'aud-3',
      timestamp: '2026-10-02 17:10:00',
      actor: 'Marcus Vance',
      role: 'inspector',
      action: 'RECORD_RECEIPT_DISCREPANCY',
      entityType: 'Transfer',
      entityId: 'tr-305',
      previousState: 'STATUS: in_transit',
      newState: 'STATUS: exception (1 Damaged, 2 Received)',
      result: 'BLOCKED',
    },
    {
      id: 'aud-4',
      timestamp: '2026-10-02 16:45:00',
      actor: 'Marcus Vance',
      role: 'inspector',
      action: 'APPROVE_PHYSICAL_INSPECTION',
      entityType: 'ReturnItem',
      entityId: 'ret-1002',
      previousState: 'STATUS: assessment_pending',
      newState: 'STATUS: approved_resale -> ADMITTED_TO_INVENTORY (SKU-CMP-204)',
      result: 'SUCCESS',
    },
    {
      id: 'aud-5',
      timestamp: '2026-10-02 12:00:00',
      actor: 'HIEN AI Inference Service',
      role: 'System AI Engine',
      action: 'ENFORCE_SAFETY_QUARANTINE',
      entityType: 'ReturnItem',
      entityId: 'ret-1005',
      previousState: 'STATUS: registered',
      newState: 'STATUS: quarantined (Leak Hazard)',
      result: 'SUCCESS',
    },
  ];
}

export function getInitialState(): AppState {
  return {
    users: INITIAL_USERS,
    currentUser: INITIAL_USERS[0], // Default Sarah Chen (admin)
    hubs: INITIAL_HUBS,
    products: INITIAL_PRODUCTS,
    returns: generateSeedReturns(),
    inventory: generateSeedInventory(),
    forecasts: generateSeedForecasts(),
    recommendations: generateSeedRecommendations(),
    transfers: generateSeedTransfers(),
    orders: generateSeedOrders(),
    notifications: generateSeedNotifications(),
    auditLogs: generateSeedAuditLogs(),
    config: INITIAL_CONFIG,
  };
}

export class StorageService {
  private static state: AppState | null = null;
  private static listeners: (() => void)[] = [];

  static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify() {
    this.listeners.forEach(l => l());
  }

  static getState(): AppState {
    if (this.state) {
      return this.state;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
        return this.state!;
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage, using initial dataset', e);
    }

    this.state = getInitialState();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.saveState(this.state);
    }
    return this.state;
  }

  static saveState(newState: AppState): void {
    this.state = newState;
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      }
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
    this.notify();
  }

  static updateState(updater: (prev: AppState) => AppState): AppState {
    const current = this.getState();
    const updated = updater(current);
    this.saveState(updated);
    return updated;
  }

  static resetToDefaults(): AppState {
    const fresh = getInitialState();
    this.saveState(fresh);
    return fresh;
  }
}
