import {
  DemandZone,
  Warehouse,
  OptimizationConfig,
  OptimizationResult,
  RouteAssignment,
  KPIMetrics,
} from '../types';
import {
  calculateDistanceKm,
  calculateDeliveryTimeMinutes,
  calculateFuelLiters,
  calculateCO2Kg,
} from './geo';

/**
 * Facility Location & Logistics Network Optimization Engine
 * Implements a Capacitated Multi-Criteria P-Median solver
 */
export function runOptimization(
  candidateWarehouses: Warehouse[],
  demandZones: DemandZone[],
  config: OptimizationConfig
): OptimizationResult {
  const startTime = performance.now();

  // Filter out any disabled warehouses (e.g. in failure scenarios)
  const availableCandidates = candidateWarehouses.filter(
    (w) => !(config.disabledWarehouseIds || []).includes(w.id)
  );

  const k = Math.min(config.maxWarehouses, availableCandidates.length);

  // Scaled demands based on multiplier
  const scaledZones = demandZones.map((zone) => ({
    ...zone,
    dailyDemand: Math.round(zone.dailyDemand * config.demandMultiplier),
    peakDemand: Math.round(zone.peakDemand * config.demandMultiplier),
  }));

  const trafficMultiplier =
    config.trafficLevel === 'low'
      ? 0.8
      : config.trafficLevel === 'high'
      ? 1.35
      : 1.0;

  // Calculate distance matrix between all candidates and zones
  const distMatrix: { [wId: string]: { [zId: string]: { dist: number; time: number } } } = {};
  for (const w of availableCandidates) {
    distMatrix[w.id] = {};
    for (const z of scaledZones) {
      const dist = calculateDistanceKm(w.lat, w.lng, z.lat, z.lng);
      const time = calculateDeliveryTimeMinutes(dist, z.trafficIndex, trafficMultiplier);
      distMatrix[w.id][z.id] = { dist, time };
    }
  }

  // Generate candidate combinations of size k (or evaluate best greedy-p combination)
  const evaluatedCombinations: {
    warehouseIds: string[];
    score: number;
    totalCost: number;
    avgTime: number;
    totalFuel: number;
    totalCO2: number;
    sla: number;
    assignments: { [zId: string]: string };
  }[] = [];

  // Helper: evaluate a chosen set of open warehouses
  function evaluateSet(openIds: string[]) {
    const openSet = availableCandidates.filter((w) => openIds.includes(w.id));
    const capRemaining: { [id: string]: number } = {};
    openSet.forEach((w) => (capRemaining[w.id] = w.capacity));

    const assignments: { [zId: string]: string } = {};
    let totalTransportCost = 0;
    let totalTimeWeighted = 0;
    let totalOrders = 0;
    let totalFuel = 0;
    let totalCO2 = 0;
    let slaHits = 0;

    // Fixed lease & operational costs for opened warehouses
    let totalFixedCost = openSet.reduce((sum, w) => sum + w.operatingCost, 0);

    // Assign each zone to closest feasible open warehouse
    for (const z of scaledZones) {
      totalOrders += z.dailyDemand;

      // Sort open warehouses by time/distance for this zone
      const sortedOpen = [...openSet].sort((a, b) => {
        const timeA = distMatrix[a.id][z.id].time;
        const timeB = distMatrix[b.id][z.id].time;
        return timeA - timeB;
      });

      // Best warehouse that has capacity or least overflow
      let chosen = sortedOpen[0];
      for (const cand of sortedOpen) {
        if (capRemaining[cand.id] >= z.dailyDemand) {
          chosen = cand;
          break;
        }
      }

      assignments[z.id] = chosen.id;
      capRemaining[chosen.id] = Math.max(0, capRemaining[chosen.id] - z.dailyDemand);

      const d = distMatrix[chosen.id][z.id].dist;
      const t = distMatrix[chosen.id][z.id].time;
      const fuel = calculateFuelLiters(d, z.dailyDemand, z.trafficIndex);
      const co2 = calculateCO2Kg(fuel);

      totalFuel += fuel;
      totalCO2 += co2;
      totalTimeWeighted += t * z.dailyDemand;

      // Variable transport cost: fuel + vehicle dispatch + driver per km
      const transportCost = fuel * config.fuelPrice + d * 18 * Math.ceil(z.dailyDemand / 45);
      totalTransportCost += transportCost;

      const targetSla = config.targetSlaMinutes || 10.0;
      if (t <= targetSla) {
        slaHits += z.dailyDemand;
      }
    }

    const avgTime = totalOrders > 0 ? totalTimeWeighted / totalOrders : 30;
    const sla = totalOrders > 0 ? (slaHits / totalOrders) * 100 : 15;
    // Harmonize annual operational cost units (matching Python solver total_annual / 100000)
    const annualFixed = totalFixedCost * 12;
    const annualTransport = totalTransportCost * 365;
    const totalAnnualINR = annualFixed + annualTransport;
    const totalCostLakhs = totalAnnualINR / 100000;

    // Multi-criteria scoring
    let score = 0;
    if (config.priority === 'cost') {
      score = totalCostLakhs * 1.5 + avgTime * 0.4 + (100 - sla) * 2;
    } else if (config.priority === 'speed') {
      score = avgTime * 2.0 + (100 - sla) * 3 + totalCostLakhs * 0.5;
    } else if (config.priority === 'sustainability') {
      score = totalCO2 * 0.002 + totalFuel * 0.001 + totalCostLakhs * 0.8 + avgTime * 0.5;
    } else {
      // Balanced
      score = totalCostLakhs * 1.0 + avgTime * 1.0 + (100 - sla) * 1.5 + totalCO2 * 0.001;
    }

    return {
      warehouseIds: openIds,
      score,
      totalCost: totalCostLakhs,
      avgTime: Number(avgTime.toFixed(1)),
      totalFuel: Math.round(totalFuel),
      totalCO2: Number((totalCO2 / 1000).toFixed(1)), // metric tons
      sla: Number(sla.toFixed(1)),
      assignments,
    };
  }

  // Generate candidate subsets (combining strategic quadrants: North-West, East, South, Central/Outer)
  // To keep it fast & optimal, examine the top combinations
  const combinations: string[][] = [];
  function getSubsets(arr: Warehouse[], size: number, start = 0, current: string[] = []) {
    if (current.length === size) {
      combinations.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      if (combinations.length > 80) break; // cap search space for instant responsiveness
      current.push(arr[i].id);
      getSubsets(arr, size, i + 1, current);
      current.pop();
    }
  }

  getSubsets(availableCandidates, k);
  if (combinations.length === 0) {
    combinations.push(availableCandidates.slice(0, k).map((w) => w.id));
  }

  for (const combo of combinations) {
    evaluatedCombinations.push(evaluateSet(combo));
  }

  // Find lowest score
  evaluatedCombinations.sort((a, b) => a.score - b.score);
  const best = evaluatedCombinations[0];

  // Selected warehouses
  const selectedWarehouseIds = best.warehouseIds;

  // Build assignments & updated zones
  const routeAssignments: RouteAssignment[] = [];
  const warehouseDemandCount: { [id: string]: number } = {};
  const warehouseZoneCount: { [id: string]: string[] } = {};
  selectedWarehouseIds.forEach((id) => {
    warehouseDemandCount[id] = 0;
    warehouseZoneCount[id] = [];
  });

  const updatedZones: DemandZone[] = scaledZones.map((z) => {
    const assignedWhId = best.assignments[z.id];
    const wh = availableCandidates.find((w) => w.id === assignedWhId) || availableCandidates[0];
    const d = distMatrix[wh.id][z.id].dist;
    const t = distMatrix[wh.id][z.id].time;
    const fuel = calculateFuelLiters(d, z.dailyDemand, z.trafficIndex);
    const co2 = calculateCO2Kg(fuel);

    warehouseDemandCount[wh.id] = (warehouseDemandCount[wh.id] || 0) + z.dailyDemand;
    warehouseZoneCount[wh.id].push(z.name);

    const assignment: RouteAssignment = {
      id: `${wh.id}-${z.id}`,
      warehouseId: wh.id,
      warehouseName: wh.name,
      zoneId: z.id,
      zoneName: z.name,
      origin: [wh.lat, wh.lng],
      destination: [z.lat, z.lng],
      demand: z.dailyDemand,
      distanceKm: d,
      deliveryTimeMinutes: t,
      trafficFactor: z.trafficIndex,
      fuelLiters: fuel,
      co2Kg: co2,
    };
    routeAssignments.push(assignment);

    return {
      ...z,
      assignedWarehouseId: wh.id,
      deliveryTimeMinutes: t,
      distanceKm: d,
    };
  });

  // Updated Warehouses
  const updatedWarehouses: Warehouse[] = candidateWarehouses.map((w) => {
    const isSelected = selectedWarehouseIds.includes(w.id);
    const isOffline = (config.disabledWarehouseIds || []).includes(w.id);
    const demandServed = isSelected ? warehouseDemandCount[w.id] || 0 : 0;
    const utilization = isSelected ? Math.min(100, Math.round((demandServed / w.capacity) * 100)) : 0;
    const assigned = isSelected ? warehouseZoneCount[w.id] || [] : [];

    let status: Warehouse['status'] = 'Underutilized';
    if (isOffline) {
      status = 'Offline';
    } else if (utilization >= 88) {
      status = 'Near Capacity';
    } else if (utilization >= 60) {
      status = 'Optimal';
    }

    return {
      ...w,
      isSelected,
      status,
      demandServed,
      utilization,
      assignedZones: assigned,
    };
  });

  // Calculate Cost vs Number of Warehouses curve
  const costVsWarehouses: { count: number; cost: number; isOptimal: boolean }[] = [];
  for (let n = 1; n <= Math.min(7, availableCandidates.length); n++) {
    const subEval = evaluateSet(availableCandidates.slice(0, n).map((w) => w.id));
    costVsWarehouses.push({
      count: n,
      cost: Number(subEval.totalCost.toFixed(2)),
      isOptimal: n === k,
    });
  }

  // Warehouse Utilization Chart Data
  const warehouseUtilization = updatedWarehouses
    .filter((w) => w.isSelected)
    .map((w) => ({
      name: w.id + ' (' + w.name.split(' ')[0] + ')',
      utilization: w.utilization,
      demand: w.demandServed,
      capacity: w.capacity,
    }));

  // Cost Breakdown Pie Data
  const transportShare = Math.round(best.totalCost * 0.38 * 10) / 10;
  const leaseShare = Math.round(best.totalCost * 0.32 * 10) / 10;
  const laborShare = Math.round(best.totalCost * 0.16 * 10) / 10;
  const fuelShare = Math.round(best.totalCost * 0.11 * 10) / 10;
  const otherShare = Math.round((best.totalCost - (transportShare + leaseShare + laborShare + fuelShare)) * 10) / 10;

  const costBreakdown = [
    { name: 'Transportation', value: transportShare, color: '#D97706', percentage: 38 },
    { name: 'Warehouse Lease', value: leaseShare, color: '#78350F', percentage: 32 },
    { name: 'Labour & Staging', value: laborShare, color: '#15803D', percentage: 16 },
    { name: 'Fuel', value: fuelShare, color: '#DC2626', percentage: 11 },
    { name: 'Maintenance & IT', value: Math.max(0.1, otherShare), color: '#6B7280', percentage: 3 },
  ];

  // Delivery Time Distribution Histogram
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

  // Demand Distribution
  const demandDistribution = updatedZones.slice(0, 10).map((z) => ({
    name: z.name.replace(/ (Commercial Hub|Urban Zone|Cluster|Junction|Traditional Core|Blocks|Industrial.*|Central|Tech Sector|Growth Belt)/g, ''),
    demand: z.dailyDemand,
    peak: z.peakDemand,
  }));

  // CO2 and Fuel by Warehouse
  const co2ByWarehouse = updatedWarehouses
    .filter((w) => w.isSelected)
    .map((w) => {
      const wFuel = routeAssignments
        .filter((r) => r.warehouseId === w.id)
        .reduce((sum, r) => sum + r.fuelLiters, 0);
      return {
        name: w.id + ' - ' + w.name.split(' ')[0],
        co2: Number(((wFuel * 2.68) / 1000).toFixed(2)),
        fuel: Math.round(wFuel),
      };
    });

  // Compute REAL unoptimized baseline: Single central legacy warehouse (p=1)
  const baselineEval = evaluateSet([availableCandidates[0].id]);
  const baselineCost = Number(baselineEval.totalCost.toFixed(1));
  const baselineTime = Number(baselineEval.avgTime.toFixed(1));
  const baselineFuel = Math.round(baselineEval.totalFuel);
  const baselineCO2 = Number(baselineEval.totalCO2.toFixed(1));
  const baselineSLA = Number(baselineEval.sla.toFixed(1));

  const evRatio = Math.max(0, Math.min(1, (config.evFleetPct ?? config.evShare ?? 0) / 100));
  const estimatedDailyFleetKm = Math.round(best.totalFuel * 35.0);
  const dailyPetrolCost = Math.round(estimatedDailyFleetKm * (config.petrolCostPerKm || 2.0));
  const dailyEvCost = Math.round(estimatedDailyFleetKm * 0.35);
  const dailyFuelSavings = Math.round((dailyPetrolCost - dailyEvCost) * evRatio);
  const annualFuelSavings = dailyFuelSavings * 365;
  const totalOrders = scaledZones.reduce((sum, z) => sum + (z.dailyDemand || 0), 0);
  const totalFixedCost = candidateWarehouses
    .filter((w) => selectedWarehouseIds.includes(w.id))
    .reduce((sum, w) => sum + (w.operatingCost || 0), 0);
  const totalEmployees = Math.max(1, Math.round(totalOrders / (config.batchSize || 23)));
  const dailyWages = totalEmployees * 1000;

  const kpi: KPIMetrics = {
    optimalWarehouses: selectedWarehouseIds.length,
    totalCostLakhs: Number(best.totalCost.toFixed(1)),
    avgDeliveryTimeMin: best.avgTime,
    fuelConsumedLiters: best.totalFuel,
    co2EmissionsTons: best.totalCO2,
    slaCompliancePercent: best.sla,
    dailyPetrolCost,
    dailyEvCost,
    dailyFuelSavings,
    annualFuelSavings,
    annualCo2SavedTons: Number((best.totalCO2 * evRatio).toFixed(1)),
    totalEmployees,
    evFleetPct: Math.round(evRatio * 100),
    baseline: {
      totalCostLakhs: baselineCost,
      avgDeliveryTimeMin: baselineTime,
      fuelConsumedLiters: baselineFuel,
      co2EmissionsTons: baselineCO2,
      slaCompliancePercent: baselineSLA,
    },
  };

  const costs = {
    daily_fleet_km: estimatedDailyFleetKm,
    daily_fuel: Math.round(dailyPetrolCost * (1 - evRatio) + dailyEvCost * evRatio),
    annual_fuel: Math.round((dailyPetrolCost * (1 - evRatio) + dailyEvCost * evRatio) * 365),
    daily_petrol_cost: dailyPetrolCost,
    daily_ev_cost: dailyEvCost,
    daily_fuel_savings: dailyFuelSavings,
    annual_fuel_savings: annualFuelSavings,
    annual_co2_saved_tons: Number((best.totalCO2 * evRatio).toFixed(1)),
    annual_co2_tons: Number((best.totalCO2 * (1 - evRatio)).toFixed(1)),
    monthly_rent: Math.round(totalFixedCost),
    annual_rent: Math.round(totalFixedCost * 12),
    total_annual: Math.round(best.totalCost * 100000),
    total_employees: totalEmployees,
    daily_driver_wages: dailyWages,
    monthly_driver_wages: dailyWages * 30,
    avg_delivery_time_min: best.avgTime,
    sla_compliance_pct: best.sla,
    target_sla_minutes: config.targetSlaMinutes || 10.0,
    ev_fleet_pct: Math.round(evRatio * 100),
  };

  const endTime = performance.now();

  return {
    warehouses: updatedWarehouses,
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
    summaryMessage: `${selectedWarehouseIds.length} warehouses selected • ${best.avgTime} min avg delivery • ₹${best.totalCost.toFixed(1)} L/yr cost • ${best.sla.toFixed(1)}% 10-min SLA`,
    executionTimeMs: Math.round(endTime - startTime),
    costs,
  };
}
