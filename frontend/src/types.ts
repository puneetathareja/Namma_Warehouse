export type OptimizationPriority = 'cost' | 'speed' | 'sustainability' | 'balanced';

export type TrafficLevel = 'low' | 'medium' | 'high';

export interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  orders: number;
  sqft?: number;
  traffic?: number;
  price?: number;
  zoneName?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'optimization' | 'traffic' | 'demand' | 'capacity' | 'system';
  message: string;
  timestamp: string;
}

export interface DemandZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dailyDemand: number;
  peakDemand: number;
  priority: 'High' | 'Medium' | 'Low';
  assignedWarehouseId: string;
  deliveryTimeMinutes: number;
  distanceKm: number;
  trafficIndex: number;
  pointCount: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  capacity: number;
  demandServed: number;
  utilization: number; // 0 - 100 percentage
  operatingCost: number; // in INR / day
  status: 'Optimal' | 'Near Capacity' | 'Underutilized' | 'Offline';
  assignedZones: string[];
  isCandidate: boolean;
  isSelected: boolean;
  avgDeliveryTime: number; // minutes
  costPerSqFt?: number;
  setupCostLakhs?: number;
  color?: string;
  slaCompliancePct?: number;
  employeesRequired?: number;
  monthlyRent?: number;
}

export interface RouteAssignment {
  id: string;
  warehouseId: string;
  warehouseName: string;
  zoneId: string;
  zoneName: string;
  origin: [number, number];
  destination: [number, number];
  demand: number;
  distanceKm: number;
  deliveryTimeMinutes: number;
  trafficFactor: number;
  fuelLiters: number;
  co2Kg: number;
  color?: string;
}

export interface OptimizationConfig {
  city: string;
  demandMultiplier: number; // 1.0 = 100%
  trafficMultiplier: number; // 1.0 = normal
  fuelPrice: number; // INR per Liter
  maxWarehouses: number;
  maxDeliveryTime: number; // minutes
  priority: OptimizationPriority;
  trafficLevel: TrafficLevel;
  disabledWarehouseIds?: string[];
  budgetMonthly?: number;
  budgetMonthlyLakhs?: number;
  propertySizeSqft?: number;
  petrolCostPerKm?: number;
  batchSize?: number;
  minDispersionKm?: number;
  maxRadiusKm?: number;
  useCapacity?: boolean;
  capacityPerWarehouse?: number;
  evShare?: number;
  evFleetPct?: number;
  targetSlaMinutes?: number;
}

export interface KPIMetrics {
  optimalWarehouses: number;
  totalCostLakhs: number;
  avgDeliveryTimeMin: number;
  fuelConsumedLiters: number;
  co2EmissionsTons: number;
  slaCompliancePercent: number;
  dailyPetrolCost?: number;
  dailyEvCost?: number;
  dailyFuelSavings?: number;
  annualFuelSavings?: number;
  annualCo2SavedTons?: number;
  totalEmployees?: number;
  evFleetPct?: number;
  baseline: {
    totalCostLakhs: number;
    avgDeliveryTimeMin: number;
    fuelConsumedLiters: number;
    co2EmissionsTons: number;
    slaCompliancePercent: number;
  };
}

export interface OptimizationResult {
  warehouses: Warehouse[];
  zones: DemandZone[];
  assignments: RouteAssignment[];
  selectedWarehouseIds: string[];
  kpi: KPIMetrics;
  analytics: {
    costVsWarehouses: { count: number; cost: number; isOptimal: boolean }[];
    warehouseUtilization: { name: string; utilization: number; demand: number; capacity: number }[];
    costBreakdown: { name: string; value: number; color: string; percentage: number }[];
    demandDistribution: { name: string; demand: number; peak: number }[];
    deliveryTimeDistribution: { range: string; count: number; label: string }[];
    co2ByWarehouse: { name: string; co2: number; fuel: number }[];
  };
  summaryMessage: string;
  executionTimeMs: number;
  status?: 'ok' | 'infeasible' | string;
  infeasibleReason?: string;
  infeasibleMessage?: string;
  suggestedBudget?: number;
  nodeAssignments?: Record<string, { warehouseId: string; warehouseName: string; color: string; distance: number }>;
  nodeSpokes?: Array<{ origin: [number, number]; destination: [number, number]; color: string }>;
  budgetNotice?: string;
  costs?: any;
}

export interface CityOption {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  hasRealDataset: boolean;
  totalPoints: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'optimization' | 'scenario' | 'upload' | 'alert' | 'system';
}

export interface UserNotification {
  id: string;
  time: string;
  title: string;
  detail: string;
  read: boolean;
  type: 'success' | 'warning' | 'info';
}
