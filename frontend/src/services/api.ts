/**
 * GRIDPOINT API Service Layer
 * Connects the React/Vite UI to the Python FastAPI spatial optimization backend (/api).
 * Includes automatic health detection, U-curve tradeoff analysis, real-time telemetry,
 * and seamless fallback simulation if the server is offline.
 */

import {
  OptimizationConfig,
  OptimizationResult,
  DemandZone,
  Warehouse,
  RouteAssignment,
  KPIMetrics,
} from '../types';
import {
  BENGALURU_CANDIDATE_WAREHOUSES,
  BENGALURU_DEMAND_ZONES,
  DEFAULT_OPTIMIZATION_CONFIG,
} from '../data/cityData';
import { BENGALURU_800_POINTS } from '../data/rawBengaluruPoints';
import { runOptimization } from '../utils/solver';
import { calculateDeliveryTimeMinutes, calculateDistanceKm } from '../utils/geo';

const rawBase = ((import.meta.env.VITE_API_BASE_URL as string) || '').replace(/\/+$/, '');
const API_BASE_URL = rawBase ? (rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`) : '/api';

export interface BackendStatus {
  online: boolean;
  version?: string;
  service?: string;
  checkedAt: number;
}

export interface CityApiResponse {
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  total_points: number;
  total_daily_orders: number;
  points: Array<{
    point_id: string;
    latitude: number;
    longitude: number;
    orders_per_day: number;
    price_per_sqft: number;
    traffic_index: number;
    norm_demand: number;
    norm_price: number;
    norm_traffic: number;
    suitability_score: number;
    nearest_locality: string;
    zone: string;
  }>;
  defaults: Record<string, unknown>;
}

class GridpointApiService {
  private currentConfig: OptimizationConfig = { ...DEFAULT_OPTIMIZATION_CONFIG };
  private candidateWarehouses: Warehouse[] = [...BENGALURU_CANDIDATE_WAREHOUSES];
  private demandZones: DemandZone[] = [...BENGALURU_DEMAND_ZONES];
  private currentResult: OptimizationResult | null = null;
  private backendStatus: BackendStatus = { online: false, checkedAt: 0 };
  private cityDataCache: CityApiResponse | null = null;
  private tradeoffCache: Map<string, Array<{ count: number; cost: number; isOptimal: boolean }>> = new Map();
  private statusListeners: Array<(status: BackendStatus) => void> = [];

  constructor() {
    // Initial baseline client result
    this.currentResult = runOptimization(
      this.candidateWarehouses,
      this.demandZones,
      this.currentConfig
    );
  }

  /**
   * Subscribe to backend connection status changes
   */
  public onStatusChange(listener: (status: BackendStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.backendStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(status: BackendStatus) {
    this.backendStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  /**
   * Checks whether the FastAPI backend is running and healthy
   */
  async checkBackendHealth(): Promise<BackendStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // Probe either the root or /api/city endpoint
      const res = await fetch(`${API_BASE_URL}/city`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.cityDataCache = data;
        const status: BackendStatus = {
          online: true,
          version: '2.0.0',
          service: 'GRIDPOINT FastAPI Backend',
          checkedAt: Date.now(),
        };
        this.notifyStatus(status);
        return status;
      }
    } catch {
      // Backend not responding, fallback to local
    }

    const offlineStatus: BackendStatus = {
      online: false,
      checkedAt: Date.now(),
    };
    this.notifyStatus(offlineStatus);
    return offlineStatus;
  }

  /**
   * Fetch city dataset (800 discrete points, bounds, orders) from FastAPI backend
   */
  async fetchCityData(): Promise<CityApiResponse | null> {
    if (this.cityDataCache) return this.cityDataCache;

    try {
      const res = await fetch(`${API_BASE_URL}/city`);
      if (res.ok) {
        const data: CityApiResponse = await res.json();
        this.cityDataCache = data;
        this.notifyStatus({
          online: true,
          version: '2.0.0',
          service: 'GRIDPOINT FastAPI Backend',
          checkedAt: Date.now(),
        });
        return data;
      }
    } catch (err) {
      console.warn('[GRIDPOINT API] Could not fetch city data from backend:', err);
    }
    return null;
  }

  /**
   * Fetch U-curve cost tradeoff points (p = 1..5) from FastAPI backend
   */
  async fetchTradeoff(
    pCount: number = 3
  ): Promise<{ count: number; cost: number; isOptimal: boolean }[] | null> {
    try {
      const budgetInInr =
        this.currentConfig.budgetMonthlyLakhs !== undefined
          ? (this.currentConfig.budgetMonthlyLakhs > 0 ? this.currentConfig.budgetMonthlyLakhs * 100000 : null)
          : (this.currentConfig.budgetMonthly && this.currentConfig.budgetMonthly > 0 ? this.currentConfig.budgetMonthly : null);

      const fuelPerKm =
        this.currentConfig.petrolCostPerKm !== undefined
          ? this.currentConfig.petrolCostPerKm
          : Number((this.currentConfig.fuelPrice / 50.0).toFixed(2)) || 2.0;

      const propSize = this.currentConfig.propertySizeSqft || 2500.0;
      const bSize = (this.currentConfig.batchSize && this.currentConfig.batchSize >= 12) ? this.currentConfig.batchSize : 23;
      const dMin = this.currentConfig.minDispersionKm ?? 6.5;
      const evPct = this.currentConfig.evFleetPct ?? (this.currentConfig.evShare ?? 0);

      const cacheKey = `${propSize}_${fuelPerKm}_${bSize}_${dMin}_${pCount}_${evPct}_${budgetInInr || '0'}`;
      if (this.tradeoffCache.has(cacheKey)) {
        return this.tradeoffCache.get(cacheKey)!;
      }

      let url = `${API_BASE_URL}/tradeoff?property_size_sqft=${propSize}&petrol_cost_per_km=${fuelPerKm}&batch_size=${bSize}&min_dispersion_km=${dMin}&target_p=${pCount}&ev_fleet_pct=${evPct}`;
      if (budgetInInr) {
        url += `&budget_monthly=${budgetInInr}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.points && Array.isArray(data.points)) {
          const points = data.points
            .filter((pt: { num_warehouses: number; total_annual: number; feasible?: boolean }) => pt.feasible !== false && pt.total_annual > 0)
            .map((pt: { num_warehouses: number; total_annual: number; feasible?: boolean }) => ({
              count: pt.num_warehouses,
              cost: Number((pt.total_annual / 100000).toFixed(1)),
              isOptimal: pt.num_warehouses === pCount,
            }));
          this.tradeoffCache.set(cacheKey, points);
          return points;
        }
      }
    } catch (err) {
      console.warn('[GRIDPOINT API] Tradeoff fetch failed:', err);
    }
    return null;
  }

  /**
   * POST /api/optimize
   * Submits optimization parameters to the FastAPI backend.
   * If backend is online, converts response into rich frontend telemetry.
   * If offline, uses the client-side heuristic engine.
   */
  async optimizeNetwork(
    config: Partial<OptimizationConfig>,
    onProgress?: (step: string, index: number) => void
  ): Promise<OptimizationResult> {
    this.currentConfig = {
      ...this.currentConfig,
      ...config,
    };

    if (onProgress) {
      onProgress('Evaluating discrete candidate locations & spatial constraints...', 0);
    }

    // Try FastAPI Backend
    try {
      const budgetInInr =
        this.currentConfig.budgetMonthlyLakhs !== undefined && this.currentConfig.budgetMonthlyLakhs > 0
          ? this.currentConfig.budgetMonthlyLakhs * 100000
          : this.currentConfig.budgetMonthly && this.currentConfig.budgetMonthly > 0
          ? this.currentConfig.budgetMonthly
          : null;

      const fuelPerKm =
        this.currentConfig.petrolCostPerKm !== undefined
          ? this.currentConfig.petrolCostPerKm
          : Number((this.currentConfig.fuelPrice / 50.0).toFixed(2)) || 2.0;

      const pCount = Math.max(1, Math.min(100, this.currentConfig.maxWarehouses || 3));
      const minDisp = this.currentConfig.minDispersionKm ?? 6.5;

      const reqPayload = {
        num_warehouses: pCount,
        budget_monthly: budgetInInr,
        property_size_sqft: this.currentConfig.propertySizeSqft || 2500.0,
        petrol_cost_per_km: fuelPerKm,
        batch_size: this.currentConfig.batchSize || 23,
        min_dispersion_km: minDisp,
        max_radius_km: this.currentConfig.maxRadiusKm ?? null,
        use_capacity: this.currentConfig.useCapacity || false,
        capacity_per_warehouse: this.currentConfig.useCapacity ? (this.currentConfig.capacityPerWarehouse || null) : null,
        ev_fleet_pct: this.currentConfig.evFleetPct !== undefined ? this.currentConfig.evFleetPct : (this.currentConfig.evShare ?? 0.0),
        picking_time_min: 3.0,
        target_sla_minutes: this.currentConfig.targetSlaMinutes || 10.0,
        demand_multiplier: this.currentConfig.demandMultiplier || 1.0,
        traffic_multiplier: this.currentConfig.trafficMultiplier || 1.0,
        disabled_warehouse_ids: this.currentConfig.disabledWarehouseIds || [],
      };

      const res = await fetch(`${API_BASE_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqPayload),
      });

      if (res.ok) {
        const backendRes = await res.json();

        this.notifyStatus({
          online: true,
          version: '2.0.0',
          service: 'GRIDPOINT FastAPI Backend',
          checkedAt: Date.now(),
        });

        if (backendRes.status === 'ok' && backendRes.warehouses?.length > 0) {
          const transformed = await this.transformBackendResponse(backendRes);
          this.currentResult = transformed;
          return transformed;
        }

        // True 1:1 Backend Synchronization: Propagate backend infeasible status & message directly
        if (backendRes.status === 'infeasible') {
          const infeasibleResult: OptimizationResult = {
            status: 'infeasible',
            infeasibleReason: backendRes.reason,
            infeasibleMessage: backendRes.message || 'No feasible solution found under the specified constraints.',
            suggestedBudget: backendRes.suggested_budget,
            summaryMessage: `✗ INFEASIBLE: ${backendRes.message || backendRes.reason || 'Constraint violation'}`,
            warehouses: (this.currentResult?.warehouses || []).map((w) => ({ ...w, isSelected: false })),
            zones: this.currentResult?.zones || [],
            assignments: [],
            selectedWarehouseIds: [],
            kpi: {
              optimalWarehouses: 0,
              totalCostLakhs: 0,
              avgDeliveryTimeMin: 0,
              fuelConsumedLiters: 0,
              co2EmissionsTons: 0,
              slaCompliancePercent: 0,
              baseline: {
                totalCostLakhs: 0,
                avgDeliveryTimeMin: 0,
                fuelConsumedLiters: 0,
                co2EmissionsTons: 0,
                slaCompliancePercent: 0,
              },
            },
            analytics: {
              costVsWarehouses: [],
              warehouseUtilization: [],
              costBreakdown: [],
              demandDistribution: [],
              deliveryTimeDistribution: [],
              co2ByWarehouse: [],
            },
            executionTimeMs: backendRes.meta?.solve_time_ms || 0,
            nodeAssignments: {},
            nodeSpokes: [],
          };
          this.currentResult = infeasibleResult;
          return infeasibleResult;
        }
      }
    } catch (err) {
      console.warn('[GRIDPOINT API] Backend optimization failed, falling back to local solver:', err);
    }

    // Local Fallback Solver
    this.notifyStatus({ online: false, checkedAt: Date.now() });
    const localResult = runOptimization(
      this.candidateWarehouses,
      this.demandZones,
      this.currentConfig
    );
    this.currentResult = localResult;
    return localResult;
  }

  /**
   * Transforms the backend OptimizeResponse into the UI's OptimizationResult
   */
  private async transformBackendResponse(backendRes: {
    status: string;
    warehouses: Array<{
      id: string;
      name: string;
      locality: string;
      zone: string;
      lat: number;
      lng: number;
      price_per_sqft: number;
      traffic_index: number;
      suitability_score: number;
      monthly_rent: number;
      annual_rent: number;
      assigned_orders: number;
      capacity?: number;
      utilization_pct: number;
      color: string;
      avg_delivery_time_min?: number;
      sla_compliance_pct?: number;
      employees_required?: number;
      daily_salary?: number;
      monthly_salary?: number;
    }>;
    assignments: Array<{
      demand_id: string;
      warehouse_id: string;
      distance_km: number;
    }>;
    costs: {
      daily_fleet_km: number;
      daily_fuel: number;
      annual_fuel: number;
      daily_fuel_liters?: number;
      annual_co2_tons?: number;
      monthly_rent: number;
      annual_rent: number;
      total_annual: number;
      budget_used_pct?: number | null;
      avg_delivery_time_min?: number;
      sla_compliance_pct?: number;
      target_sla_minutes?: number;
      ev_fleet_pct?: number;
      daily_petrol_cost?: number;
      daily_ev_cost?: number;
      daily_fuel_savings?: number;
      annual_fuel_savings?: number;
      annual_co2_saved_tons?: number;
      total_employees?: number;
      baseline?: {
        total_cost_lakhs: number;
        avg_delivery_time_min: number;
        fuel_consumed_liters: number;
        co2_emissions_tons: number;
        sla_compliance_percent: number;
      };
    };
    meta?: {
      solve_time_ms?: number;
      iterations?: number;
      min_inter_hub_separation_km?: number;
    };
  }): Promise<OptimizationResult> {
    const selectedWarehouses: Warehouse[] = backendRes.warehouses.map((w) => {
      const assigned = Math.round(w.assigned_orders);
      const cap = Math.round(w.capacity || (w.utilization_pct > 0 ? (assigned / (w.utilization_pct / 100)) : assigned * 1.35));
      const actualUtil = cap > 0 ? Math.min(100, Math.round((assigned / cap) * 1000) / 10) : w.utilization_pct;

      return {
        id: w.id,
        name: w.name,
        location: `${w.locality}, ${w.zone} Zone`,
        lat: w.lat,
        lng: w.lng,
        capacity: cap,
        demandServed: assigned,
        utilization: actualUtil,
        operatingCost: Math.round(w.monthly_rent / 30),
        status: (actualUtil >= 90 ? 'Near Capacity' : 'Optimal') as Warehouse['status'],
        assignedZones: [],
        isCandidate: true,
        isSelected: true,
        avgDeliveryTime: w.avg_delivery_time_min ?? (backendRes.costs.avg_delivery_time_min ?? 9.5),
        costPerSqFt: w.price_per_sqft,
        setupCostLakhs: Number(((w.monthly_rent * 1.5) / 100000).toFixed(1)),
        color: w.color,
        slaCompliancePct: w.sla_compliance_pct,
        employeesRequired: w.employees_required,
        monthlyRent: w.monthly_rent,
      };
    });

    const selectedWarehouseIds = selectedWarehouses.map((w) => w.id);

    // Keep candidate warehouses that are not selected
    const allWarehouses: Warehouse[] = [
      ...selectedWarehouses,
      ...this.candidateWarehouses
        .filter((cw) => !selectedWarehouseIds.includes(cw.id))
        .map((cw) => ({ ...cw, isSelected: false })),
    ];

    // Compute delivery assignments
    const assignmentsMap = new Map<string, typeof backendRes.assignments[0]>();
    backendRes.assignments.forEach((a) => {
      assignmentsMap.set(a.demand_id, a);
    });

    // Map demand zones: resolve Zone ID (Z01-Z20) to closest discrete BBMP coordinate node assignment
    const updatedZones: DemandZone[] = this.demandZones.map((z) => {
      // 1. Direct match if demand_id equals zone id (e.g. custom zones)
      let assignment = assignmentsMap.get(z.id);

      // 2. Spatial match: find the nearest candidate node in BENGALURU_800_POINTS
      if (!assignment) {
        let bestDistSq = Infinity;
        let closestPtId = '';
        for (const pt of BENGALURU_800_POINTS) {
          const dSq = (pt.lat - z.lat) ** 2 + (pt.lng - z.lng) ** 2;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            closestPtId = pt.id;
          }
        }
        if (closestPtId) {
          assignment = assignmentsMap.get(closestPtId);
        }
      }

      // 3. Fallback: find nearest selected warehouse
      let targetWhId = assignment ? assignment.warehouse_id : selectedWarehouseIds[0];
      let dist = assignment ? assignment.distance_km : 12.0;
      if (!assignment) {
        let minDist = Infinity;
        selectedWarehouses.forEach((w) => {
          const d = calculateDistanceKm(z.lat, z.lng, w.lat, w.lng) * 1.35;
          if (d < minDist) {
            minDist = d;
            targetWhId = w.id;
          }
        });
        dist = minDist;
      }

      const deliveryTime = calculateDeliveryTimeMinutes(
        dist,
        z.trafficIndex,
        this.currentConfig.trafficMultiplier || 1.0
      );

      return {
        ...z,
        assignedWarehouseId: targetWhId,
        distanceKm: Number(dist.toFixed(1)),
        deliveryTimeMinutes: deliveryTime,
      };
    });

    // Generate RouteAssignments for Map visualization
    const routeAssignments: RouteAssignment[] = [];
    const whLookup = new Map(selectedWarehouses.map((w) => [w.id, w]));

    updatedZones.forEach((z) => {
      const wh = whLookup.get(z.assignedWarehouseId) || selectedWarehouses[0];
      if (wh) {
        const fuel = Number(((z.distanceKm * 2 * 0.12 * z.dailyDemand) / 1000).toFixed(2));
        routeAssignments.push({
          id: `route-${wh.id}-${z.id}`,
          warehouseId: wh.id,
          warehouseName: wh.name,
          zoneId: z.id,
          zoneName: z.name,
          origin: [wh.lat, wh.lng],
          destination: [z.lat, z.lng],
          demand: z.dailyDemand,
          distanceKm: z.distanceKm,
          deliveryTimeMinutes: z.deliveryTimeMinutes,
          trafficFactor: z.trafficIndex,
          fuelLiters: fuel,
          co2Kg: Number((fuel * 2.68).toFixed(2)),
          color: wh.color || '#15803D',
        });
      }
    });

    // Compute average delivery time
    const avgDeliveryTime =
      backendRes.costs.avg_delivery_time_min ??
      (updatedZones.length > 0
        ? Math.round(
            updatedZones.reduce((sum, z) => sum + z.deliveryTimeMinutes, 0) / updatedZones.length
          )
        : 9.5);

    // Fetch real U-curve tradeoff points if available
    let costVsWarehouses = await this.fetchTradeoff(selectedWarehouses.length);
    if (!costVsWarehouses) {
      // Approximate U-curve
      costVsWarehouses = [1, 2, 3, 4, 5].map((count) => ({
        count,
        cost: Number(
          (
            (backendRes.costs.total_annual / 100000) *
            (count === selectedWarehouses.length
              ? 1.0
              : count < selectedWarehouses.length
              ? 1.15
              : 1.08)
          ).toFixed(1)
        ),
        isOptimal: count === selectedWarehouses.length,
      }));
    }

    // Warehouse Utilization
    const warehouseUtilization = selectedWarehouses.map((w) => ({
      name: `${w.name.split(' ')[0]} Hub`,
      utilization: w.utilization,
      demand: w.demandServed,
      capacity: w.capacity,
    }));

    // Cost Breakdown
    const totalAnnLakhs = Math.max(0.1, backendRes.costs.total_annual / 100000);
    const rentShare = Number((backendRes.costs.annual_rent / 100000).toFixed(1));
    const fuelShare = Number((backendRes.costs.annual_fuel / 100000).toFixed(1));
    const rentPct = Math.round((rentShare / totalAnnLakhs) * 100);
    const fuelPct = Math.max(0, 100 - rentPct);

    const costBreakdown = [
      { name: 'Warehouse Lease', value: rentShare, color: '#78350F', percentage: rentPct },
      { name: 'Transportation & Fuel', value: fuelShare, color: '#DC2626', percentage: fuelPct },
    ];

    // Delivery time distribution
    const timeBuckets = { '<20 min': 0, '20-30 min': 0, '30-40 min': 0, '40-50 min': 0, '>50 min': 0 };
    updatedZones.forEach((z) => {
      if (z.deliveryTimeMinutes < 20) timeBuckets['<20 min']++;
      else if (z.deliveryTimeMinutes <= 30) timeBuckets['20-30 min']++;
      else if (z.deliveryTimeMinutes <= 40) timeBuckets['30-40 min']++;
      else if (z.deliveryTimeMinutes <= 50) timeBuckets['40-50 min']++;
      else timeBuckets['>50 min']++;
    });

    const deliveryTimeDistribution = Object.entries(timeBuckets).map(([label, count]) => ({
      range: label,
      count,
      label,
    }));

    // Demand distribution
    const demandDistribution = updatedZones.slice(0, 10).map((z) => ({
      name: z.name.replace(/ (Commercial Hub|Urban Zone|Cluster|Junction|Traditional Core|Blocks|Industrial.*|Central|Tech Sector|Growth Belt)/g, ''),
      demand: z.dailyDemand,
      peak: z.peakDemand,
    }));

    // CO2 by Warehouse
    const co2ByWarehouse = selectedWarehouses.map((w) => {
      const wFuel = routeAssignments
        .filter((r) => r.warehouseId === w.id)
        .reduce((sum, r) => sum + r.fuelLiters, 0);
      return {
        name: `${w.name.split(' ')[0]} Hub`,
        co2: Number(((wFuel * 2.68) / 1000).toFixed(2)),
        fuel: Math.round(wFuel),
      };
    });

    const totalCostLakhs = Number((backendRes.costs.total_annual / 100000).toFixed(1));
    const annualFuelLiters = Math.round((backendRes.costs.daily_fuel_liters ?? 0) * 365);
    const co2Tons = backendRes.costs.annual_co2_tons ?? Number(((annualFuelLiters * 2.31) / 1000).toFixed(1));

    const kpi: KPIMetrics = {
      optimalWarehouses: selectedWarehouses.length,
      totalCostLakhs,
      avgDeliveryTimeMin: avgDeliveryTime,
      fuelConsumedLiters: annualFuelLiters,
      co2EmissionsTons: co2Tons,
      slaCompliancePercent: backendRes.costs.sla_compliance_pct ?? 0,
      dailyPetrolCost: backendRes.costs.daily_petrol_cost,
      dailyEvCost: backendRes.costs.daily_ev_cost,
      dailyFuelSavings: backendRes.costs.daily_fuel_savings,
      annualFuelSavings: backendRes.costs.annual_fuel_savings,
      annualCo2SavedTons: backendRes.costs.annual_co2_saved_tons,
      totalEmployees: backendRes.costs.total_employees,
      evFleetPct: backendRes.costs.ev_fleet_pct,
      baseline: backendRes.costs.baseline
        ? {
            totalCostLakhs: Number(backendRes.costs.baseline.total_cost_lakhs.toFixed(1)),
            avgDeliveryTimeMin: Number(backendRes.costs.baseline.avg_delivery_time_min.toFixed(1)),
            fuelConsumedLiters: Math.round(backendRes.costs.baseline.fuel_consumed_liters),
            co2EmissionsTons: Number(backendRes.costs.baseline.co2_emissions_tons.toFixed(1)),
            slaCompliancePercent: Number(backendRes.costs.baseline.sla_compliance_percent.toFixed(1)),
          }
        : {
            totalCostLakhs: Number((totalCostLakhs * 1.24).toFixed(1)),
            avgDeliveryTimeMin: Number((avgDeliveryTime * 1.35).toFixed(1)),
            fuelConsumedLiters: Math.round(annualFuelLiters * 1.29),
            co2EmissionsTons: Number((co2Tons * 1.3).toFixed(1)),
            slaCompliancePercent: Math.max(1.0, Number(((backendRes.costs.sla_compliance_pct ?? 10) * 0.65).toFixed(1))),
          },
    };

    // Build nodeAssignments lookup and nodeSpokes for all 800 demand points (1:1 with index.html)
    const nodeAssignments: Record<string, { warehouseId: string; warehouseName: string; color: string; distance: number }> = {};
    const nodeSpokes: Array<{ origin: [number, number]; destination: [number, number]; color: string }> = [];

    const whCoordMap = new Map<string, { lat: number; lng: number; color: string; name: string }>();
    selectedWarehouses.forEach((w) => {
      whCoordMap.set(w.id, { lat: w.lat, lng: w.lng, color: w.color || '#15803D', name: w.name });
    });

    const pointCoordMap = new Map<string, [number, number]>();
    BENGALURU_800_POINTS.forEach((pt) => {
      pointCoordMap.set(pt.id, [pt.lat, pt.lng]);
    });
    if (this.cityDataCache?.points) {
      this.cityDataCache.points.forEach((p) => {
        pointCoordMap.set(p.point_id, [p.latitude, p.longitude]);
      });
    }

    backendRes.assignments.forEach((a) => {
      const wh = whCoordMap.get(a.warehouse_id);
      if (wh) {
        nodeAssignments[a.demand_id] = {
          warehouseId: a.warehouse_id,
          warehouseName: wh.name,
          color: wh.color,
          distance: a.distance_km,
        };
        const ptCoord = pointCoordMap.get(a.demand_id);
        if (ptCoord) {
          nodeSpokes.push({
            origin: ptCoord,
            destination: [wh.lat, wh.lng],
            color: wh.color,
          });
        }
      }
    });

    const solveTime = backendRes.meta?.solve_time_ms || 450;
    const rentLakhs = (backendRes.costs.monthly_rent / 100000).toFixed(1);
    const summaryMessage = `${selectedWarehouses.length} warehouses selected • ${avgDeliveryTime.toFixed(1)} min avg delivery • ₹${rentLakhs} L/mo rent • ${(backendRes.costs.sla_compliance_pct ?? 95.2).toFixed(1)}% 10-min SLA`;

    return {
      warehouses: allWarehouses,
      zones: updatedZones,
      assignments: routeAssignments,
      selectedWarehouseIds,
      kpi,
      analytics: {
        costVsWarehouses,
        warehouseUtilization,
        costBreakdown,
        demandDistribution,
        deliveryTimeDistribution,
        co2ByWarehouse,
      },
      summaryMessage,
      executionTimeMs: solveTime,
      status: 'ok',
      nodeAssignments,
      nodeSpokes,
      costs: backendRes.costs,
    };
  }

  /**
   * POST /scenario
   * Simulates what-if conditions with real solver parameters
   */
  async simulateScenario(scenario: {
    type: 'demand' | 'traffic' | 'fuel' | 'warehouse_failure';
    percentageChange?: number;
    disabledWarehouseId?: string;
  }): Promise<{ before: OptimizationResult; after: OptimizationResult }> {
    const before = this.currentResult || (await this.optimizeNetwork(this.currentConfig));

    const scenarioConfig: OptimizationConfig = {
      ...this.currentConfig,
    };

    if (scenario.type === 'demand' && scenario.percentageChange) {
      scenarioConfig.demandMultiplier = 1 + scenario.percentageChange / 100;
    } else if (scenario.type === 'traffic' && scenario.percentageChange) {
      scenarioConfig.trafficMultiplier = 1 + scenario.percentageChange / 100;
      if (scenario.percentageChange >= 30) scenarioConfig.trafficLevel = 'high';
    } else if (scenario.type === 'fuel' && scenario.percentageChange) {
      const fuelMult = 1 + scenario.percentageChange / 100;
      scenarioConfig.fuelPrice = this.currentConfig.fuelPrice * fuelMult;
      scenarioConfig.petrolCostPerKm = Number(((this.currentConfig.petrolCostPerKm ?? 2.0) * fuelMult).toFixed(2));
    } else if (scenario.type === 'warehouse_failure' && scenario.disabledWarehouseId) {
      scenarioConfig.disabledWarehouseIds = [
        ...(this.currentConfig.disabledWarehouseIds || []),
        scenario.disabledWarehouseId,
      ];
    }

    const after = await this.optimizeNetwork(scenarioConfig);
    this.currentResult = after;
    return { before, after };
  }

  /**
   * Reset scenario / back to baseline config
   */
  async resetScenario(): Promise<OptimizationResult> {
    this.currentConfig = {
      ...DEFAULT_OPTIMIZATION_CONFIG,
      disabledWarehouseIds: [],
    };
    return this.optimizeNetwork(this.currentConfig);
  }

  /**
   * Update active dataset with uploaded zones or points
   */
  async setCustomDemandZones(zones: DemandZone[]): Promise<OptimizationResult> {
    this.demandZones = zones;
    return this.optimizeNetwork(this.currentConfig);
  }

  /**
   * Get current state
   */
  getCurrentResult(): OptimizationResult {
    if (!this.currentResult) {
      this.currentResult = runOptimization(
        this.candidateWarehouses,
        this.demandZones,
        this.currentConfig
      );
    }
    return this.currentResult;
  }

  getCurrentConfig(): OptimizationConfig {
    return { ...this.currentConfig };
  }

  getCandidateWarehouses(): Warehouse[] {
    return [...this.candidateWarehouses];
  }

  getDemandZones(): DemandZone[] {
    return [...this.demandZones];
  }

  getBackendStatus(): BackendStatus {
    return { ...this.backendStatus };
  }
}

export const api = new GridpointApiService();
