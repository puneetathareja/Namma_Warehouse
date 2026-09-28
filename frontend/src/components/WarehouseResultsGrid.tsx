import React from 'react';
import { Warehouse } from '../types';
import { formatNumber, formatRupeesRaw } from '../utils/formatters';

interface WarehouseResultsGridProps {
  warehouses: Warehouse[];
}

export const WarehouseResultsGrid: React.FC<WarehouseResultsGridProps> = ({
  warehouses,
}) => {
  const selected = warehouses.filter((w) => w.isSelected);

  if (selected.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Run optimization to see recommended warehouse locations.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg text-[#261B14] font-['Space_Grotesk']">
          Recommended Warehouse Locations
        </h2>
        <p className="text-xs text-[#7A7168] mt-0.5">
          {selected.length} location{selected.length !== 1 ? 's' : ''} selected by the optimization algorithm. Each warehouse serves a cluster of nearby demand nodes.
        </p>
      </div>

      {/* Responsive card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {selected.map((wh, i) => (
          <div
            key={wh.id}
            className="bg-white border border-[#E8DFC9] rounded-xl p-4.5 hover:shadow-md hover:border-[#E9CDB0] transition-all"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-[#F3EFE6]">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                style={{ backgroundColor: wh.color || '#9E471A' }}
              >
                W{i + 1}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-[#261B14] truncate">
                  {wh.name}
                </div>
                <div className="text-[11px] text-[#7A7168] truncate font-medium">
                  {wh.location}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-2 text-xs">
              <Row label="Coordinates" value={`${wh.lat.toFixed(4)}, ${wh.lng.toFixed(4)}`} />
              <Row label="Daily Orders Served" value={formatNumber(wh.demandServed)} />
              <Row
                label="Avg Delivery Time"
                value={`${(wh.avgDeliveryTime || 0).toFixed(1)} min`}
                highlight={wh.avgDeliveryTime <= 10}
              />
              <Row label="Capacity Utilization" value={`${wh.utilization.toFixed(1)}%`} />

              {wh.slaCompliancePct !== undefined && (
                <Row
                  label="10-Min SLA Compliance"
                  value={`${wh.slaCompliancePct.toFixed(1)}%`}
                  highlight={wh.slaCompliancePct >= 80}
                />
              )}

              {wh.monthlyRent !== undefined && (
                <Row label="Monthly Rent" value={formatRupeesRaw(wh.monthlyRent)} />
              )}

              {wh.costPerSqFt !== undefined && (
                <Row label="Cost per Sq.Ft" value={`₹${wh.costPerSqFt.toFixed(0)}/sqft`} />
              )}

              {wh.employeesRequired !== undefined && wh.employeesRequired > 0 && (
                <Row label="Delivery Workforce" value={`${formatNumber(wh.employeesRequired)} drivers`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/** Small key-value row for warehouse cards */
function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#7A7168] font-medium">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight ? 'text-emerald-700' : 'text-[#261B14]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
