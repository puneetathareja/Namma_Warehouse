import React, { useState } from 'react';
import { GitFork, Zap, CloudRain, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle } from 'lucide-react';
import { OptimizationConfig, OptimizationResult } from '../types';
import { api } from '../services/api';

interface ScenariosPageProps {
  config: OptimizationConfig;
  result: OptimizationResult;
  onUpdateResult: (newResult: OptimizationResult) => void;
}

export const ScenariosPage: React.FC<ScenariosPageProps> = ({ config, result, onUpdateResult }) => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [deltaMetrics, setDeltaMetrics] = useState<{
    deliveryTimeDelta: number;
    costDelta: number;
    slaDelta: number;
  } | null>(null);

  const scenarios = [
    {
      id: 'demand',
      title: 'High Festive Demand Surge (+40%)',
      desc: 'Simulates festive peak shopping seasons like Diwali or Big Billion Days across all 800 Bengaluru wards.',
      icon: <Zap size={20} color="#EA580C" />,
      badge: 'Demand Shock',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      action: async () => {
        setIsSimulating(true);
        setActiveScenario('demand');
        try {
          const { before, after } = await api.simulateScenario({ type: 'demand', percentageChange: 40 });
          setDeltaMetrics({
            deliveryTimeDelta: Number((after.kpi.avgDeliveryTimeMin - before.kpi.avgDeliveryTimeMin).toFixed(1)),
            costDelta: Number((after.kpi.totalCostLakhs - before.kpi.totalCostLakhs).toFixed(1)),
            slaDelta: Number((after.kpi.slaCompliancePercent - before.kpi.slaCompliancePercent).toFixed(1)),
          });
          onUpdateResult(after);
        } finally {
          setIsSimulating(false);
        }
      },
    },
    {
      id: 'traffic',
      title: 'Peak ORR Congestion (+30% Traffic Delay)',
      desc: 'Simulates severe bottlenecks on Outer Ring Road (Silk Board to Marathahalli) with higher transit impedance.',
      icon: <AlertTriangle size={20} color="#D97706" />,
      badge: 'Traffic Jam',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      action: async () => {
        setIsSimulating(true);
        setActiveScenario('traffic');
        try {
          const { before, after } = await api.simulateScenario({ type: 'traffic', percentageChange: 30 });
          setDeltaMetrics({
            deliveryTimeDelta: Number((after.kpi.avgDeliveryTimeMin - before.kpi.avgDeliveryTimeMin).toFixed(1)),
            costDelta: Number((after.kpi.totalCostLakhs - before.kpi.totalCostLakhs).toFixed(1)),
            slaDelta: Number((after.kpi.slaCompliancePercent - before.kpi.slaCompliancePercent).toFixed(1)),
          });
          onUpdateResult(after);
        } finally {
          setIsSimulating(false);
        }
      },
    },
    {
      id: 'monsoon',
      title: 'Monsoon Inundation (+50% Fuel Burn)',
      desc: 'Simulates waterlogging and rerouting overhead during heavy rainfall across low-lying eastern corridors.',
      icon: <CloudRain size={20} color="#2563EB" />,
      badge: 'Weather Disruption',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      action: async () => {
        setIsSimulating(true);
        setActiveScenario('monsoon');
        try {
          const { before, after } = await api.simulateScenario({ type: 'fuel', percentageChange: 50 });
          setDeltaMetrics({
            deliveryTimeDelta: Number((after.kpi.avgDeliveryTimeMin - before.kpi.avgDeliveryTimeMin).toFixed(1)),
            costDelta: Number((after.kpi.totalCostLakhs - before.kpi.totalCostLakhs).toFixed(1)),
            slaDelta: Number((after.kpi.slaCompliancePercent - before.kpi.slaCompliancePercent).toFixed(1)),
          });
          onUpdateResult(after);
        } finally {
          setIsSimulating(false);
        }
      },
    },
    {
      id: 'outage',
      title: 'Dark Store / Primary Hub Outage',
      desc: 'Simulates an unplanned shutdown at an active primary hub, triggering dynamic failover across surviving facilities.',
      icon: <XCircle size={20} color="#DC2626" />,
      badge: 'Facility Outage',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      action: async () => {
        setIsSimulating(true);
        setActiveScenario('outage');
        try {
          const targetHubId = result.selectedWarehouseIds[0] || 'p405';
          const { before, after } = await api.simulateScenario({
            type: 'warehouse_failure',
            disabledWarehouseId: targetHubId,
          });
          setDeltaMetrics({
            deliveryTimeDelta: Number((after.kpi.avgDeliveryTimeMin - before.kpi.avgDeliveryTimeMin).toFixed(1)),
            costDelta: Number((after.kpi.totalCostLakhs - before.kpi.totalCostLakhs).toFixed(1)),
            slaDelta: Number((after.kpi.slaCompliancePercent - before.kpi.slaCompliancePercent).toFixed(1)),
          });
          onUpdateResult(after);
        } finally {
          setIsSimulating(false);
        }
      },
    },
  ];

  const handleReset = async () => {
    setIsSimulating(true);
    try {
      const fresh = await api.resetScenario();
      setActiveScenario(null);
      setDeltaMetrics(null);
      onUpdateResult(fresh);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FFF8EE] border border-[#E9CDB0] text-[#9E471A]">
              <GitFork size={20} />
            </span>
            <h2 className="text-xl font-bold text-[#261B14] font-['Space_Grotesk']">
              Corridor Stress &amp; Disruption Scenarios
            </h2>
          </div>
          <p className="text-xs text-[#7A7168] mt-1 max-w-2xl">
            Test how your Bengaluru warehouse network holds up under peak traffic spikes, sudden demand surges, and weather disruptions.
          </p>
        </div>

        {activeScenario && (
          <button
            onClick={handleReset}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#9E471A] hover:bg-[#FAF7EF] transition-colors"
          >
            <RefreshCw size={13} className={isSimulating ? 'animate-spin' : ''} />
            Reset to Baseline
          </button>
        )}
      </div>

      {/* Delta Metrics Alert if scenario is simulated */}
      {deltaMetrics && (
        <div className="bg-[#FFF8EE] border border-[#E9CDB0] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#EA580C]">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-[#261B14]">Scenario Applied: {activeScenario?.toUpperCase()}</div>
              <div className="text-xs text-[#7A7168]">Telemetry updated across map &amp; operations panels</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-[#7A7168] uppercase font-semibold">Delivery Time</div>
              <div className={`text-base font-bold flex items-center justify-center gap-0.5 ${deltaMetrics.deliveryTimeDelta > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {deltaMetrics.deliveryTimeDelta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {deltaMetrics.deliveryTimeDelta > 0 ? `+${deltaMetrics.deliveryTimeDelta}` : deltaMetrics.deliveryTimeDelta} min
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-[#7A7168] uppercase font-semibold">Annual Cost</div>
              <div className={`text-base font-bold flex items-center justify-center gap-0.5 ${deltaMetrics.costDelta > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {deltaMetrics.costDelta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {deltaMetrics.costDelta > 0 ? `+₹${deltaMetrics.costDelta} L` : `₹${deltaMetrics.costDelta} L`}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-[#7A7168] uppercase font-semibold">SLA Compliance</div>
              <div className={`text-base font-bold flex items-center justify-center gap-0.5 ${deltaMetrics.slaDelta < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {deltaMetrics.slaDelta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {deltaMetrics.slaDelta > 0 ? `+${deltaMetrics.slaDelta}%` : `${deltaMetrics.slaDelta}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenario cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {scenarios.map((sc) => {
          const isSelected = activeScenario === sc.id;
          return (
            <div
              key={sc.id}
              className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                isSelected ? 'border-[#9E471A] ring-2 ring-[#9E471A]/20' : 'border-[#E8DFC9]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-[#FAF7EF] border border-[#E8DFC9]">
                    {sc.icon}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#261B14] mb-2">{sc.title}</h3>
                <p className="text-xs text-[#7A7168] leading-relaxed mb-6">{sc.desc}</p>
              </div>

              <button
                onClick={sc.action}
                disabled={isSimulating}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-[#9E471A] text-white shadow-md'
                    : 'bg-[#FAF7EF] hover:bg-[#FFF8EE] text-[#9E471A] border border-[#E8DFC9]'
                }`}
              >
                {isSimulating && activeScenario === sc.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                {isSelected ? 'Scenario Active' : 'Run Simulation'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
