import React from 'react';
import { BarChart3, Leaf, Zap, Clock, ShieldCheck, Users, IndianRupee } from 'lucide-react';
import { OptimizationResult } from '../types';
import { DashboardCharts } from '../components/DashboardCharts';
import { formatRupeesRaw } from '../utils/formatters';

interface AnalyticsPageProps {
  result: OptimizationResult;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ result }) => {
  const kpi = result.kpi;
  const costs = result.costs;

  const evPct = kpi.evFleetPct || 0;
  const dailyPetrol = costs?.daily_petrol_cost || 0;
  const dailyEv = costs?.daily_ev_cost || 0;
  const dailySavings = costs?.daily_fuel_savings || 0;
  const annualSavings = costs?.annual_fuel_savings || (dailySavings * 365);
  const co2SavedTons = costs?.annual_co2_saved_tons || 0;
  const totalDrivers = kpi.totalEmployees || costs?.total_employees || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-2 rounded-xl bg-[#FFF8EE] border border-[#E9CDB0] text-[#9E471A]">
            <BarChart3 size={20} />
          </span>
          <h2 className="text-xl font-bold text-[#261B14] font-['Space_Grotesk']">
            Performance &amp; ESG Green Route Benchmarks
          </h2>
        </div>
        <p className="text-xs text-[#7A7168]">
          Deep-dive telemetry on fuel economics, electric vehicle transition, 10-minute SLA fulfillment, and driver workforce operations.
        </p>
      </div>

      {/* ESG & EV Economics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8DFC9] p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7168] mb-2 uppercase tracking-wide">
            <span>Electric Fleet Share</span>
            <Zap size={15} color="#EA580C" />
          </div>
          <div className="text-2xl font-extrabold text-[#261B14] font-['Space_Grotesk']">
            {evPct.toFixed(0)}%
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            EV 2-Wheelers Deployed
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8DFC9] p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7168] mb-2 uppercase tracking-wide">
            <span>Annual Fuel Savings</span>
            <IndianRupee size={15} color="#047857" />
          </div>
          <div className="text-2xl font-extrabold text-[#047857] font-['Space_Grotesk']">
            {formatRupeesRaw(annualSavings)}
          </div>
          <div className="text-xs text-[#7A7168] mt-1">
            vs 100% ICE Petrol Fleet
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8DFC9] p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7168] mb-2 uppercase tracking-wide">
            <span>CO₂ Avoided</span>
            <Leaf size={15} color="#047857" />
          </div>
          <div className="text-2xl font-extrabold text-[#047857] font-['Space_Grotesk']">
            {co2SavedTons.toFixed(1)} <span className="text-sm font-semibold">Tons/yr</span>
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            Certified Carbon Offset
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8DFC9] p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7168] mb-2 uppercase tracking-wide">
            <span>Driver Workforce</span>
            <Users size={15} color="#2563EB" />
          </div>
          <div className="text-2xl font-extrabold text-[#261B14] font-['Space_Grotesk']">
            {totalDrivers.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#7A7168] mt-1">
            Full-Time Fleet Couriers
          </div>
        </div>
      </div>

      {/* Fuel Cost Breakdown Table */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-6">
        <h3 className="text-sm font-bold text-[#261B14] mb-4">Daily Fleet Operational Fuel Run Rate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#FAF7EF] border border-[#E8DFC9]">
            <div className="text-xs text-[#7A7168]">Petrol Spend (ICE Drivers)</div>
            <div className="text-lg font-bold text-[#9E471A] mt-1">₹{Math.round(dailyPetrol).toLocaleString('en-IN')}/day</div>
            <div className="text-[11px] text-[#7A7168] mt-0.5">Rate: ₹2.00/km fuel burn</div>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF7EF] border border-[#E8DFC9]">
            <div className="text-xs text-[#7A7168]">EV Charging Spend</div>
            <div className="text-lg font-bold text-emerald-700 mt-1">₹{Math.round(dailyEv).toLocaleString('en-IN')}/day</div>
            <div className="text-[11px] text-[#7A7168] mt-0.5">Rate: ₹0.35/km tariff</div>
          </div>
          <div className="p-4 rounded-xl bg-[#FFF8EE] border border-[#E9CDB0]">
            <div className="text-xs text-[#9E471A] font-semibold">Net Daily Savings</div>
            <div className="text-lg font-bold text-[#EA580C] mt-1">₹{Math.round(dailySavings).toLocaleString('en-IN')}/day</div>
            <div className="text-[11px] text-[#7A7168] mt-0.5">Reinvested into micro-hub leasing</div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <DashboardCharts
        analytics={result.analytics}
        selectedCount={result.selectedWarehouseIds.length}
      />
    </div>
  );
};
