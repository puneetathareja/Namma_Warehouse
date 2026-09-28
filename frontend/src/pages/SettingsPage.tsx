import React, { useState } from 'react';
import { Settings, Save, Check, RotateCcw } from 'lucide-react';
import { OptimizationConfig } from '../types';

interface SettingsPageProps {
  config: OptimizationConfig;
  onChangeConfig: (newConfig: Partial<OptimizationConfig>) => void;
  onRunOptimization: () => void;
  onReset: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  onChangeConfig,
  onRunOptimization,
  onReset,
}) => {
  const [saved, setSaved] = useState(false);

  const handleSaveAndOptimize = () => {
    setSaved(true);
    onRunOptimization();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-2 rounded-xl bg-[#FFF8EE] border border-[#E9CDB0] text-[#9E471A]">
            <Settings size={20} />
          </span>
          <h2 className="text-xl font-bold text-[#261B14] font-['Space_Grotesk']">
            Network Parameters &amp; Solver Physics
          </h2>
        </div>
        <p className="text-xs text-[#7A7168]">
          Tune the operational constraints, routing trip sizes, and spatial dispersion parameters used by the discrete facility location engine.
        </p>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-2xl border border-[#E8DFC9] p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-[#261B14] mb-1">
              Warehouse Footprint (sq.ft)
            </label>
            <input
              type="number"
              min="500"
              max="50000"
              step="100"
              value={config.propertySizeSqft || 2500}
              onChange={(e) => onChangeConfig({ propertySizeSqft: parseFloat(e.target.value) || 2500 })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#261B14] outline-none focus:border-[#EA580C]"
            />
            <p className="text-[11px] text-[#7A7168] mt-1">Standard dark store footprint benchmark (default: 2,500 sq.ft)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#261B14] mb-1">
              Petrol Cost Rate (₹/km)
            </label>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.1"
              value={config.petrolCostPerKm || 2.0}
              onChange={(e) => onChangeConfig({ petrolCostPerKm: parseFloat(e.target.value) || 2.0 })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#261B14] outline-none focus:border-[#EA580C]"
            />
            <p className="text-[11px] text-[#7A7168] mt-1">Two-wheeler fuel cost factor across Bengaluru traffic (default: ₹2.0/km)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#261B14] mb-1">
              Deliveries per Driver / Day (Batch Size)
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={config.batchSize || 23}
              onChange={(e) => onChangeConfig({ batchSize: parseInt(e.target.value) || 23 })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#261B14] outline-none focus:border-[#EA580C]"
            />
            <p className="text-[11px] text-[#7A7168] mt-1">Consolidated milk-run drop size per shift (industry average: 23 drops)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#261B14] mb-1">
              Minimum Hub Separation D_min (km)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={config.minDispersionKm ?? 6.5}
              onChange={(e) => onChangeConfig({ minDispersionKm: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#261B14] outline-none focus:border-[#EA580C]"
            />
            <p className="text-[11px] text-[#7A7168] mt-1">Enforces spatial dispersion so warehouses never cannibalize nearby zones</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#261B14] mb-1">
              Dark Store Picking Time (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="15"
              step="0.5"
              value={3.0}
              disabled
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-gray-500 bg-[#FAF7EF] cursor-not-allowed"
            />
            <p className="text-[11px] text-[#7A7168] mt-1">BOPIS / picking and bagging SLA overhead (fixed at 3.0 min)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#261B14] mb-1">
              Quick-Commerce Target SLA (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              step="1"
              value={config.targetSlaMinutes || 10.0}
              onChange={(e) => onChangeConfig({ targetSlaMinutes: parseFloat(e.target.value) || 10.0 })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#261B14] outline-none focus:border-[#EA580C]"
            />
            <p className="text-[11px] text-[#7A7168] mt-1">Target delivery SLA threshold (default: 10.0 min, bounded 5–60 min)</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E8DFC9] flex items-center justify-between">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl border border-[#E8DFC9] text-xs font-semibold text-[#7A7168] hover:bg-[#FAF7EF] transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            Reset Defaults
          </button>

          <button
            onClick={handleSaveAndOptimize}
            className="btn-submit"
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? 'Settings Saved!' : 'Save & Re-Run Solver'}
          </button>
        </div>
      </div>
    </div>
  );
};
