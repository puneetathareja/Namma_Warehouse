import React from 'react';
import {
  RotateCcw,
  Play,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { OptimizationConfig, OptimizationResult } from '../types';
import { formatRupeesRaw, formatNumber } from '../utils/formatters';

interface OptimizationPanelProps {
  config: OptimizationConfig;
  onChangeConfig: (newConfig: Partial<OptimizationConfig>) => void;
  onRunOptimization: () => void;
  isOptimizing: boolean;
  currentStep: string;
  stepIndex: number;
  lastResult?: OptimizationResult | null;
  onReset: () => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = React.memo(({
  config,
  onChangeConfig,
  onRunOptimization,
  isOptimizing,
  stepIndex,
  lastResult,
  onReset,
}) => {
  const stepsList = [
    'Connecting to spatial solver...',
    'Evaluating 800 candidate nodes...',
    'Enforcing dispersion & budget constraints...',
    'Computing routes & fuel expenditure...',
    'Finalizing facility placements...',
  ];

  // Parameter derivations
  const numHubs = config.maxWarehouses ?? 3;
  const budgetLakhs =
    config.budgetMonthlyLakhs !== undefined
      ? Number(config.budgetMonthlyLakhs.toFixed(1))
      : config.budgetMonthly
      ? Number((config.budgetMonthly / 100000).toFixed(1))
      : 0;
  const propertySize = config.propertySizeSqft ?? 2500;
  const petrolCost = Number((config.petrolCostPerKm ?? 2.0).toFixed(1));
  const batchSize =
    config.batchSize && config.batchSize >= 12
      ? config.batchSize
      : 23;
  const minDispersion = Number((config.minDispersionKm ?? 6.5).toFixed(1));
  const evFleetPct = config.evFleetPct ?? (config.evShare ?? 0);

  // Auto-dispersion recommendation
  const handleHubChange = (val: number) => {
    const p = Math.max(1, Math.min(100, Math.round(val)));
    let recDisp = 0.8;
    if (p <= 4) recDisp = 6.5;
    else if (p <= 8) recDisp = 4.5;
    else if (p <= 15) recDisp = 3.0;
    else if (p <= 30) recDisp = 2.0;
    else if (p <= 60) recDisp = 1.2;

    onChangeConfig({
      maxWarehouses: p,
      minDispersionKm: recDisp,
    });
  };

  const slaPct = lastResult?.kpi?.slaCompliancePercent ?? 0;
  const avgTime = lastResult?.kpi?.avgDeliveryTimeMin ?? 0;
  const monthlyRent =
    lastResult?.costs?.monthly_rent ||
    (lastResult?.warehouses
      ? lastResult.warehouses.reduce((s, w) => s + (w.monthlyRent || 0), 0)
      : 0);
  const totalEmployees =
    lastResult?.kpi?.totalEmployees ||
    (lastResult?.warehouses
      ? Math.round(lastResult.warehouses.reduce((s, w) => s + (w.demandServed || 0), 0) / batchSize)
      : 0);

  return (
    <div className="bg-white rounded-xl border border-[#E8DFC9] shadow-sm p-4 flex flex-col justify-between w-full h-full xl:h-[740px] text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F3EFE6] shrink-0">
        <h2 className="font-bold text-sm text-[#261B14] font-['Space_Grotesk']">
          Optimization Parameters
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[#7A7168] hover:text-[#9E471A] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#FFF8EE] transition-colors cursor-pointer"
          title="Reset parameters to baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Form Controls */}
      <div className="space-y-3 flex-1 flex flex-col justify-between py-0.5">
        {/* 1. Number of Warehouses */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-semibold text-[#7A7168] uppercase tracking-wide">
              Number of Warehouses
            </label>
            <span className="font-bold text-[#9E471A] font-mono text-sm bg-[#FFF8EE] border border-[#E9CDB0] px-2 py-0.5 rounded-md">
              {numHubs}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={numHubs}
            onChange={(e) => handleHubChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#E8DFC9] rounded-lg appearance-none cursor-pointer accent-[#9E471A]"
          />
          <div className="flex justify-between text-[10px] text-[#A89F91] mt-0.5 font-medium">
            <span>1</span>
            <span>100</span>
          </div>
        </div>

        {/* 2. Monthly Budget */}
        <InputField
          label="Monthly Budget (₹ Lakhs)"
          sublabel="0 = unlimited"
          type="number"
          min={0}
          step={1}
          value={budgetLakhs}
          onChange={(val) => {
            const v = parseFloat(val) || 0;
            onChangeConfig({
              budgetMonthlyLakhs: v,
              budgetMonthly: v > 0 ? v * 100000 : 0,
            });
          }}
        />

        {/* 3. Property Size */}
        <InputField
          label="Property Size (sq.ft)"
          type="number"
          min={500}
          step={100}
          value={propertySize}
          onChange={(val) => onChangeConfig({ propertySizeSqft: parseFloat(val) || 2500 })}
        />

        {/* 4. Petrol Cost */}
        <InputField
          label="Petrol Cost (₹/km)"
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={petrolCost}
          onChange={(val) => onChangeConfig({ petrolCostPerKm: parseFloat(val) || 2.0 })}
        />

        {/* 5. Deliveries Per Driver / Day */}
        <InputField
          label="Deliveries Per Driver / Day"
          type="number"
          min={12}
          max={40}
          step={1}
          value={batchSize}
          onChange={(val) => onChangeConfig({ batchSize: parseInt(val) || 23 })}
        />

        {/* 6. Minimum Dispersion */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-semibold text-[#7A7168] uppercase tracking-wide">
              Min Hub Dispersion
            </label>
            <span className="font-semibold text-[#261B14] font-mono text-xs">
              {minDispersion} km
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={15.0}
            step={0.5}
            value={minDispersion}
            onChange={(e) => onChangeConfig({ minDispersionKm: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-[#E8DFC9] rounded-lg appearance-none cursor-pointer accent-[#9E471A]"
          />
        </div>

        {/* 7. EV Fleet Share */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-[#7A7168] uppercase tracking-wide">
              EV Fleet Share
            </label>
            <span className="font-semibold text-emerald-700 font-mono text-xs">
              {evFleetPct}%
            </span>
          </div>
          <div className="flex gap-1.5 mb-1.5">
            <button
              type="button"
              onClick={() => onChangeConfig({ evFleetPct: 0, evShare: 0 })}
              className={`flex-1 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                evFleetPct === 0
                  ? 'bg-[#9E471A] text-white border-[#9E471A]'
                  : 'bg-[#FFF8EE] text-[#7A7168] border-[#E8DFC9] hover:bg-[#FAF3E3]'
              }`}
            >
              100% Petrol
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ evFleetPct: 100, evShare: 100 })}
              className={`flex-1 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                evFleetPct === 100
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-[#FFF8EE] text-emerald-700 border-[#E8DFC9] hover:bg-emerald-50'
              }`}
            >
              100% EV
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={evFleetPct}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({ evFleetPct: val, evShare: val });
            }}
            className="w-full h-1.5 bg-[#E8DFC9] rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>
      </div>

      {/* Action Section */}
      <div className="pt-3 space-y-2 shrink-0">
        {isOptimizing ? (
          <div className="p-3 bg-[#FFF8EE] rounded-xl border border-[#E9CDB0] text-xs space-y-1.5 text-[#9E471A]">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-ping" />
                Optimizing Network...
              </span>
              <span className="font-mono">
                {Math.min(100, Math.round(((stepIndex + 1) / stepsList.length) * 100))}%
              </span>
            </div>
            <div className="w-full bg-[#E9CDB0] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#9E471A] transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, ((stepIndex + 1) / stepsList.length) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-[#9E471A] truncate font-medium">{stepsList[stepIndex]}</p>
          </div>
        ) : (
          <button
            type="button"
            id="btn-optimize-left"
            onClick={onRunOptimization}
            className="w-full py-2.5 px-4 bg-[#9E471A] hover:bg-[#863B13] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            <span>Run Optimization</span>
          </button>
        )}

        {/* Status */}
        {lastResult?.status === 'infeasible' ? (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Infeasible: {lastResult.infeasibleReason || 'Constraint violation'}</span>
            </div>
            <p className="text-[11px] text-red-600 leading-tight">
              {lastResult.infeasibleMessage || 'Constraints cannot be met.'}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-[#7A7168] px-1 pt-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Optimal (3 Hubs)</span>
            </span>
            <span className="font-semibold text-[#9E471A]">
              {avgTime > 0 ? `${avgTime.toFixed(1)}m avg` : '24.5m avg'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

/** Reusable input field */
function InputField({
  label,
  sublabel,
  type,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  type: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block mb-1 text-[11px] font-semibold text-[#7A7168] uppercase tracking-wide">
        {label}
        {sublabel && <span className="normal-case tracking-normal font-normal text-[#A89F91] ml-1">({sublabel})</span>}
      </label>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8DFC9] rounded-lg text-[#261B14] font-medium focus:outline-none focus:border-[#9E471A] focus:ring-1 focus:ring-[#9E471A] transition-colors"
      />
    </div>
  );
}
