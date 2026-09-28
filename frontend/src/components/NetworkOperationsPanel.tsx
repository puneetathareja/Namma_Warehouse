import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  OptimizationConfig,
  OptimizationResult,
} from '../types';
import { formatRupeesRaw, formatNumber } from '../utils/formatters';

interface NetworkOperationsPanelProps {
  config: OptimizationConfig;
  result: OptimizationResult;
}

export const NetworkOperationsPanel: React.FC<NetworkOperationsPanelProps> = React.memo(({
  config,
  result,
}) => {
  const evPct = config.evFleetPct ?? (config.evShare ?? 0);
  const petrolRate = config.petrolCostPerKm ?? 2.0;
  const batchSize = config.batchSize && config.batchSize >= 12 ? config.batchSize : 23;

  // Read backend costs or calculate from results
  const c = result.costs || {};
  const totalOrders = result.warehouses.reduce((sum, w) => sum + (w.demandServed || 0), 0);
  
  // SLA metrics
  const sla = c.sla_compliance_pct ?? result.kpi.slaCompliancePercent ?? 0;
  const avgTime = c.avg_delivery_time_min ?? result.kpi.avgDeliveryTimeMin ?? 0;

  // SLA status
  let slaColor = '#DC2626';
  let slaLabel = 'Below Target';
  if (sla >= 85) {
    slaColor = '#059669';
    slaLabel = '10-Min SLA Achieved';
  } else if (sla >= 40) {
    slaColor = '#D97706';
    slaLabel = 'Partial Coverage';
  }

  // Fleet & fuel
  const dailyFleetKm = c.daily_fleet_km || Math.round(totalOrders * 0.42);
  const petrolDaily = c.daily_petrol_cost ?? (dailyFleetKm * petrolRate);
  const evDaily = c.daily_ev_cost ?? (dailyFleetKm * 0.35);
  const evRatio = Math.max(0, Math.min(1, evPct / 100.0));

  // Dynamic EV fuel savings (responds live to slider or matches backend result)
  const isEvLive = c.ev_fleet_pct === undefined || Math.abs(c.ev_fleet_pct - evPct) > 0.01;
  const dailyFuelSavings = isEvLive ? (petrolDaily - evDaily) * evRatio : (c.daily_fuel_savings ?? ((petrolDaily - evDaily) * evRatio));
  const annualSavings = isEvLive ? dailyFuelSavings * 365.0 : (c.annual_fuel_savings ?? (dailyFuelSavings * 365.0));
  const maxPotentialAnnualSavings = (petrolDaily - evDaily) * 365.0;

  const baselineCo2Tons = (dailyFleetKm / 35.0 * 2.31 * 365.0) / 1000.0;
  const co2Avoided = isEvLive ? Math.round(baselineCo2Tons * evRatio) : (c.annual_co2_saved_tons ?? Math.round(baselineCo2Tons * evRatio));
  const remainingCo2Tons = isEvLive ? Math.round(baselineCo2Tons * (1.0 - evRatio)) : (c.annual_co2_tons ?? Math.round(baselineCo2Tons * (1.0 - evRatio)));

  // Facility rent
  const monthlyRent = c.monthly_rent || result.warehouses.reduce((sum, w) => sum + (w.monthlyRent || 0), 0);
  const annualRent = c.annual_rent || (monthlyRent * 12);
  const budgetUtilization = c.budget_used_pct ?? (config.budgetMonthly ? Math.min(100, (monthlyRent / config.budgetMonthly) * 100) : null);

  // Workforce
  const totalEmployees = c.total_employees || Math.round(totalOrders / batchSize);
  const dailyWages = c.daily_driver_wages || (totalEmployees * 1000);
  const monthlyPayroll = c.monthly_driver_wages || (dailyWages * 30);
  const avgKmPerDriver = c.avg_km_per_driver || (dailyFleetKm / Math.max(1, totalEmployees));
  const effectiveDailyFuel = (petrolDaily * (1 - evRatio)) + (evDaily * evRatio);
  const effectiveAnnualFuel = isEvLive ? effectiveDailyFuel * 365.0 : (c.annual_fuel ?? (effectiveDailyFuel * 365.0));
  const totalAnnualCost = annualRent + effectiveAnnualFuel;

  return (
    <div className="bg-white rounded-xl border border-[#E8DFC9] shadow-sm p-4 w-full h-full xl:h-[740px] overflow-y-auto text-xs select-none space-y-4">
      {/* Header */}
      <h2 className="text-sm font-bold text-[#261B14] font-['Space_Grotesk'] pb-2 border-b border-[#F3EFE6]">
        Network &amp; Operations
      </h2>

      {/* Infeasible Network Banner */}
      {result?.status === 'infeasible' && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>Network Infeasible: {result.infeasibleReason || 'Constraint Violation'}</span>
          </div>
          <p className="text-[11px] text-red-600 leading-tight">
            {result.infeasibleMessage || 'Constraints cannot be met without severe clustering and deadlock for other regions.'}
          </p>
          {result.suggestedBudget !== undefined && (
            <div className="pt-1.5 text-[11px] font-medium border-t border-red-200 flex justify-between">
              <span>Suggested Budget:</span>
              <span className="font-mono">₹{(result.suggestedBudget / 100000).toFixed(1)} L/mo</span>
            </div>
          )}
        </div>
      )}

      {/* 10-Minute SLA Section */}
      <div className="bg-[#FAF7EF] border border-[#E8DFC9] rounded-xl p-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-[#261B14] text-xs">
            10-Min Quick-Commerce SLA
          </span>
          <span className="text-[11px] font-semibold text-[#7A7168]">
            Target: ≤ 10 min
          </span>
        </div>

        <div className="flex justify-between items-baseline">
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-extrabold tabular-nums font-['Space_Grotesk']"
              style={{ color: slaColor }}
            >
              {sla.toFixed(1)}%
            </span>
            <span className="text-[11px] text-[#7A7168] font-medium">{slaLabel}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#7A7168]">Avg Delivery</div>
            <div
              className="text-base font-bold tabular-nums"
              style={{ color: avgTime <= 10 ? '#059669' : '#9E471A' }}
            >
              {avgTime.toFixed(1)} min
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-[#E8DFC9] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(3, sla))}%`,
              backgroundColor: slaColor,
            }}
          />
        </div>
      </div>

      {/* EV Transition Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-[#261B14] text-xs">EV Fleet Economics</span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {evPct.toFixed(0)}% EV Fleet
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#FAF7EF] border border-[#E8DFC9] rounded-xl p-2.5">
            <div className="text-[10px] text-[#7A7168] uppercase font-semibold">Petrol Fleet Cost</div>
            <div className="text-sm font-bold text-[#261B14] tabular-nums mt-0.5">{formatRupeesRaw(petrolDaily * (1 - evRatio))}/day</div>
            <div className="text-[10px] text-[#A89F91] mt-0.5">{((1 - evRatio) * 100).toFixed(0)}% Petrol @ ₹{petrolRate.toFixed(2)}/km</div>
          </div>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-2.5">
            <div className="text-[10px] text-emerald-700 uppercase font-semibold">EV Fleet Cost</div>
            <div className="text-sm font-bold text-emerald-800 tabular-nums mt-0.5">{formatRupeesRaw(evDaily * evRatio)}/day</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">{evPct.toFixed(0)}% EV @ ₹0.35/km</div>
          </div>
        </div>

        {/* Annual savings */}
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">Annual Fleet Fuel Savings</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums font-['Space_Grotesk']">
            {evPct > 0 ? `${formatRupeesRaw(annualSavings)}/yr` : '₹0/yr'}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            {evPct > 0
              ? `Saving ${formatRupeesRaw(dailyFuelSavings)}/day with ${evPct.toFixed(0)}% EV fleet`
              : `Potential: ${formatRupeesRaw(maxPotentialAnnualSavings)}/yr with 100% EV`}
          </div>
        </div>

        {/* CO2 */}
        <div className="space-y-1 text-xs border-t border-[#F3EFE6] pt-2">
          <MetricRow
            label="CO₂ Eliminated"
            value={evPct > 0 ? `${formatNumber(co2Avoided)} tons/yr` : `0 tons/yr (Potential: ${formatNumber(baselineCo2Tons)} tons/yr)`}
            valueColor="#047857"
          />
          <MetricRow
            label={evPct > 0 ? 'Remaining Emissions' : 'Baseline Emissions'}
            value={`${formatNumber(remainingCo2Tons)} tons CO₂/yr`}
          />
        </div>
      </div>

      {/* Facility Rent */}
      <div className="space-y-1 border-t border-[#F3EFE6] pt-3">
        <h3 className="text-xs font-bold text-[#261B14] mb-1.5">Facility Costs</h3>
        <MetricRow label="Monthly Rent" value={formatRupeesRaw(monthlyRent)} />
        <MetricRow label="Annual Rent" value={formatRupeesRaw(annualRent)} />
        {budgetUtilization !== null && (
          <MetricRow
            label="Budget Used"
            value={`${budgetUtilization.toFixed(1)}%`}
            valueColor={budgetUtilization > 90 ? '#DC2626' : '#059669'}
          />
        )}
      </div>

      {/* Workforce */}
      <div className="space-y-1 border-t border-[#F3EFE6] pt-3">
        <h3 className="text-xs font-bold text-[#261B14] mb-1.5">Delivery Workforce</h3>
        <MetricRow label="Total Drivers" value={`${formatNumber(totalEmployees)}`} />
        <MetricRow label="Daily Wages (₹1,000/d)" value={formatRupeesRaw(dailyWages)} />
        <MetricRow label="Monthly Payroll" value={formatRupeesRaw(monthlyPayroll)} />
        <MetricRow label="Avg Route / Driver" value={`${avgKmPerDriver.toFixed(1)} km/day`} />
      </div>

      {/* Total */}
      <div className="border-t-2 border-[#E8DFC9] pt-2.5 flex justify-between items-center text-sm font-bold">
        <div>
          <span className="text-[#261B14] block">Total Logistics Cost</span>
          <span className="text-[10px] text-[#7A7168] font-normal">Facility Rent + Fleet Fuel</span>
        </div>
        <span className="text-[#9E471A] tabular-nums font-['Space_Grotesk'] text-base">{formatRupeesRaw(totalAnnualCost)}/yr</span>
      </div>
    </div>
  );
});

function MetricRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center py-0.5 text-xs">
      <span className="text-[#7A7168]">{label}</span>
      <span className="font-semibold tabular-nums text-[#261B14]" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}
