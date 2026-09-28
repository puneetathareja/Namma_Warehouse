import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Tooltip,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Warehouse as WarehouseIcon,
  Layers,
  Maximize2,
  Users,
  Zap,
} from 'lucide-react';
import { DemandZone, Warehouse, RouteAssignment, CityOption, GridPoint } from '../types';
import { BENGALURU_800_POINTS } from '../data/rawBengaluruPoints';
import {
  formatINR,
  formatNumber,
  formatMinutes,
  formatDistance,
} from '../utils/formatters';

interface LogisticsMapProps {
  city: CityOption;
  warehouses: Warehouse[];
  zones: DemandZone[];
  assignments: RouteAssignment[];
  customPoints?: GridPoint[];
  nodeAssignments?: Record<string, { warehouseId: string; warehouseName: string; color: string; distance: number }>;
  nodeSpokes?: Array<{ origin: [number, number]; destination: [number, number]; color: string }>;
}

// Controller component to reset view or auto-fit camera to all active warehouse hubs
function MapViewController({
  center,
  zoom,
  warehouses,
  resetTrigger,
}: {
  center: [number, number];
  zoom: number;
  warehouses?: Warehouse[];
  resetTrigger?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // Update view only when city changes
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  // Auto-fit camera to active warehouse hubs ONLY when user explicitly clicks "Fit Hubs"
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      const selected = warehouses?.filter((w) => w.isSelected && w.lat && w.lng);
      if (selected && selected.length > 0) {
        const bounds = L.latLngBounds(selected.map((w) => [w.lat, w.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
      } else {
        map.setView(center, zoom, { animate: true });
      }
    }
  }, [resetTrigger, map, warehouses, center, zoom]);

  return null;
}

// Helper to convert hex to rgba
function hexToRGBA(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 158;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 71;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 26;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const LogisticsMap: React.FC<LogisticsMapProps> = React.memo(({
  city,
  warehouses,
  zones,
  assignments,
  customPoints,
  nodeAssignments,
  nodeSpokes,
}) => {
  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSelected, setShowSelected] = useState(true);
  const [showCandidates, setShowCandidates] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [focusWarehousesOnly, setFocusWarehousesOnly] = useState(false);

  // Raw coordinate dataset for demand nodes
  const rawPoints = customPoints && customPoints.length > 0 ? customPoints : BENGALURU_800_POINTS;

  const selectedWarehouses = useMemo(
    () => warehouses.filter((w) => w.isSelected),
    [warehouses]
  );
  const candidateWarehouses = useMemo(
    () => warehouses.filter((w) => !w.isSelected),
    [warehouses]
  );

  const numWh = selectedWarehouses.length;

  // Sizing of Warehouse Hubs:
  // In "All Nodes" mode: Warehouses are BIG target/halo markers (matching reference image)
  // with a prominent outer colored ring and solid white-bordered core, so they can be pinpointed instantly amid 800 colored demand nodes.
  // In "Hubs Only (Grey Nodes)" mode: Demand nodes are muted grey, so warehouses are already colorful and distinct.
  // They don't need to be huge, just enough to be cleanly visible.
  const coreRadius = focusWarehousesOnly
    ? (numWh > 50 ? 6.5 : (numWh > 20 ? 8 : 9.5))
    : (numWh > 50 ? 10 : (numWh > 20 ? 12 : 14));

  const haloRadius = focusWarehousesOnly
    ? (numWh > 50 ? 11 : (numWh > 20 ? 13.5 : 16))
    : (numWh > 50 ? 21 : (numWh > 20 ? 24 : 28));

  const haloFillOpacity = focusWarehousesOnly ? 0.20 : 0.25;
  const haloWeight = focusWarehousesOnly ? 1.5 : 2.8;
  const haloBorderOpacity = focusWarehousesOnly ? 0.55 : 0.95;
  const coreBorderWeight = focusWarehousesOnly ? 2.0 : 3.0;

  const spokeOpacity = numWh > 30 ? 0.14 : (numWh > 10 ? 0.22 : 0.28);

  // Heatmap fallback color interpolation
  const getDemandColor = (orders: number) => {
    if (orders >= 450) return '#DC2626'; // High demand
    if (orders >= 250) return '#EA580C'; // Orange
    if (orders >= 120) return '#F59E0B'; // Amber
    return '#FCD34D'; // Yellow - low demand
  };

  return (
    <div className="relative w-full h-full min-h-[680px] xl:h-[740px] rounded-xl overflow-hidden border border-[#E8DFC9] bg-white shadow-sm flex flex-col">
      {/* Map Header / Toolbar */}
      <div className="bg-white border-b border-[#E8DFC9] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#261B14] font-['Space_Grotesk']">
                Bengaluru Hub Network — Spatial Simulation
              </h2>
              <span className="text-[10px] font-semibold text-[#9E471A] bg-[#FFF8EE] px-2.5 py-0.5 rounded-full border border-[#E9CDB0]">
                800 BBMP nodes
              </span>
            </div>
            <p className="text-[11px] text-[#7A7168] mt-0.5">
              {rawPoints.length} demand nodes · <span className="font-semibold text-emerald-700">{selectedWarehouses.length} active hubs</span>
            </p>
          </div>
        </div>

        {/* Map Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Node Display Mode Toggle (Calculated Hubs vs All Nodes) */}
          <div className="flex items-center bg-[#FAF7EF] border border-[#E8DFC9] rounded-lg p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFocusWarehousesOnly(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                !focusWarehousesOnly
                  ? 'bg-white text-[#9E471A] shadow-sm font-bold'
                  : 'text-[#7A7168] hover:text-[#261B14]'
              }`}
              title="Show warehouse locations alongside other nodes (colored by catchment)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All Nodes</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusWarehousesOnly(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                focusWarehousesOnly
                  ? 'bg-[#9E471A] text-white shadow-sm font-semibold'
                  : 'text-[#7A7168] hover:text-[#261B14]'
              }`}
              title="Show only calculated warehouse locations (other nodes grey)"
            >
              <WarehouseIcon className="w-3.5 h-3.5" />
              <span>Hubs Only</span>
            </button>
          </div>

          {/* Fit Hubs Button */}
          <button
            onClick={() => setFocusTrigger((prev) => prev + 1)}
            title="Auto-fit camera to all active warehouse hubs"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FFF8EE] hover:bg-[#FAF3E3] border border-[#E9CDB0] rounded-lg text-xs font-semibold text-[#9E471A] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#9E471A]" />
            <span className="hidden sm:inline">Fit Hubs</span>
          </button>

          {/* Layer Toggle Dropdown */}
          <div className="relative">
            <button
              id="map-layers-toggle-btn"
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFF8EE] hover:bg-[#FAF3E3] border border-[#E9CDB0] rounded-lg text-xs font-semibold text-[#9E471A] transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#9E471A]" />
              <span>Layers</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E7E2D4] rounded-xl shadow-lg p-2.5 z-50 text-xs space-y-1.5">
                <div className="font-bold text-[#1C1917] pb-1 border-b border-[#F5F0E4] text-[11px] uppercase tracking-wider">
                  Map Overlays
                </div>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="font-medium text-[#292524]">
                    800 Demand Nodes {nodeAssignments ? '(Territory Coloured)' : ''}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showSelected}
                    onChange={(e) => setShowSelected(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-medium text-[#292524]">
                    Active Hubs ({selectedWarehouses.length})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="font-medium text-[#292524]">
                    Spoke Routes {nodeSpokes ? `(${nodeSpokes.length})` : ''}
                  </span>
                </label>
                {candidateWarehouses.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-[#FAF7EF] p-1 rounded">
                    <input
                      type="checkbox"
                      checked={showCandidates}
                      onChange={(e) => setShowCandidates(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="font-medium text-[#292524]">
                      Candidate Nodes ({candidateWarehouses.length})
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet Map Body */}
      <div className="relative flex-1 w-full h-full">
        <MapContainer
          center={city.center}
          zoom={city.zoom}
          scrollWheelZoom={true}
          className="w-full h-full"
          zoomControl={true}
        >
          {/* Controller to update view on city switch and auto-fit hubs */}
          <MapViewController
            center={city.center}
            zoom={city.zoom}
            warehouses={selectedWarehouses}
            resetTrigger={focusTrigger}
          />

          {/* Direct Leaflet Tile Layer (CARTO Voyager with API key matching index.html) */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_3qno_1_71275e10b239db3df0db0093"
            maxZoom={19}
          />

          {/* 1. Demand Grid Nodes (800 Points): Colored by Catchment or Greyed Out when in Hubs Focus mode */}
          {showHeatmap &&
            rawPoints.map((pt) => {
              const assigned = nodeAssignments ? nodeAssignments[pt.id] : null;

              // Hubs Only Focus: demand nodes are muted grey; All Nodes Mode: colored by assigned warehouse color
              const fillColor = focusWarehousesOnly
                ? '#94A3B8'
                : assigned
                ? assigned.color
                : getDemandColor(pt.orders);

              const strokeColor = focusWarehousesOnly
                ? '#CBD5E1'
                : assigned
                ? fillColor
                : 'transparent';

              const nodeRadius = focusWarehousesOnly
                ? 2.5
                : assigned
                ? 4
                : (pt.orders > 400 ? 5 : 3.5);

              const fillOpacity = focusWarehousesOnly
                ? 0.28
                : assigned
                ? 0.60
                : 0.45;

              const weight = focusWarehousesOnly
                ? 0.4
                : assigned
                ? 0.5
                : 0;

              return (
                <CircleMarker
                  key={pt.id}
                  center={[pt.lat, pt.lng]}
                  radius={nodeRadius}
                  pathOptions={{
                    color: strokeColor,
                    fillColor: fillColor,
                    fillOpacity: fillOpacity,
                    weight: weight,
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1 font-sans min-w-[180px]">
                      <div className="font-bold text-[#1C1917] flex justify-between items-center">
                        <span>{pt.zoneName || pt.id}</span>
                        <span className="font-mono text-[10px] text-[#7A7168]">{pt.id}</span>
                      </div>
                      <div className="text-[#5C5248]">
                        Orders: <strong className="text-[#1F1A16]">{formatNumber(pt.orders)} / day</strong>
                      </div>
                      {pt.traffic !== undefined && (
                        <div className="text-[#5C5248]">
                          Traffic index: <strong>{pt.traffic.toFixed(2)}</strong>
                        </div>
                      )}
                      {pt.price !== undefined && (
                        <div className="text-[#5C5248]">
                          Rent benchmark: <strong>₹{pt.price.toFixed(0)}/sqft</strong>
                        </div>
                      )}
                      {assigned && (
                        <div className="mt-1 pt-1 border-t border-dashed border-[#E8E0CE]">
                          <div className="text-emerald-800 font-semibold flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ background: focusWarehousesOnly ? '#94A3B8' : assigned.color }}
                            />
                            <span>Assigned: {assigned.warehouseName}</span>
                          </div>
                          <div className="text-[#7A7168] text-[10px]">
                            Distance: {assigned.distance.toFixed(1)} km
                            {focusWarehousesOnly && <span className="ml-1 text-purple-600 font-medium">(Hubs-Only mode active)</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* 2. Spoke Lines: Connecting 800 demand points directly to assigned warehouse (Hidden in Hubs Only mode) */}
          {showRoutes && !focusWarehousesOnly && nodeSpokes && nodeSpokes.length > 0 &&
            nodeSpokes.map((spoke, idx) => (
              <Polyline
                key={`spoke-${idx}`}
                positions={[spoke.origin, spoke.destination]}
                pathOptions={{
                  color: hexToRGBA(spoke.color, spokeOpacity),
                  weight: 1.0,
                  dashArray: '4 6',
                  opacity: 0.9,
                }}
              />
            ))}

          {/* Fallback legacy routes if nodeSpokes not yet initialized */}
          {showRoutes && !focusWarehousesOnly && (!nodeSpokes || nodeSpokes.length === 0) &&
            assignments.map((route) => (
              <Polyline
                key={route.id}
                positions={[route.origin, route.destination]}
                pathOptions={{
                  color: route.color || '#15803D',
                  weight: 2.0,
                  dashArray: '5 5',
                  opacity: 0.7,
                }}
              />
            ))}

          {/* 3. Candidate Warehouses (if enabled) */}
          {showCandidates &&
            candidateWarehouses.map((wh) => (
              <CircleMarker
                key={wh.id}
                center={[wh.lat, wh.lng]}
                radius={8}
                pathOptions={{
                  fillColor: '#6B7280',
                  fillOpacity: 0.7,
                  color: '#FFFFFF',
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top">
                  <span className="text-xs font-medium">{wh.name} (Candidate)</span>
                </Tooltip>
              </CircleMarker>
            ))}

          {/* 4. Active Selected Warehouses: Distinct Color Circle Markers + Prominent Target Halos + Popups */}
          {showSelected &&
            selectedWarehouses.map((wh, i) => {
              const whColor = wh.color || '#15803D';

              return (
                <React.Fragment key={wh.id}>
                  {/* Outer Halo Ring (Target/Bullseye Style matching reference image) */}
                  <CircleMarker
                    center={[wh.lat, wh.lng]}
                    radius={haloRadius}
                    pathOptions={{
                      fillColor: whColor,
                      fillOpacity: haloFillOpacity,
                      color: whColor,
                      weight: haloWeight,
                      opacity: haloBorderOpacity,
                    }}
                  />

                  {/* Main Warehouse Inner Core Marker */}
                  <CircleMarker
                    center={[wh.lat, wh.lng]}
                    radius={coreRadius}
                    pathOptions={{
                      fillColor: whColor,
                      fillOpacity: 1.0,
                      color: '#FFFFFF',
                      weight: coreBorderWeight,
                      opacity: 1.0,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -coreRadius - 4]} opacity={0.95}>
                      <span className="font-bold text-xs" style={{ color: whColor }}>
                        W{i + 1}: {wh.name}
                      </span>
                    </Tooltip>
                    <Popup>
                      <div className="p-1 space-y-2 min-w-[250px] text-xs font-sans">
                        <div className="border-b border-[#E7E2D4] pb-1.5">
                          <div
                            className="font-extrabold text-sm"
                            style={{ color: whColor }}
                          >
                            W{i + 1}: {wh.name}
                          </div>
                          <p className="text-[11px] text-[#78716C] mt-0.5">{wh.location}</p>
                        </div>

                        {/* 10-Minute SLA & Delivery Time */}
                        {wh.slaCompliancePct !== undefined && (
                          <div className="flex items-center justify-between p-1.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
                            <span className="font-semibold text-[11px] flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-emerald-700" />
                              <span>10-Min SLA:</span>
                            </span>
                            <span className="font-extrabold text-xs">
                              {wh.slaCompliancePct.toFixed(1)}%
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                          <span>⏱️ Avg Delivery Time:</span>
                          <span className="font-bold text-[#1C1917]">
                            {(wh.avgDeliveryTime || 0).toFixed(1)} min
                          </span>
                        </div>

                        {wh.employeesRequired !== undefined && wh.employeesRequired > 0 && (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-[#9E471A]" />
                                <span>Delivery Workforce:</span>
                              </span>
                              <span className="font-bold text-[#9E471A]">
                                {formatNumber(wh.employeesRequired)} drivers
                              </span>
                            </div>
                            <div className="text-[10px] text-[#7A7168]">
                              Wages: ₹1,000/d ({formatINR(wh.employeesRequired * 1000)}/day)
                            </div>
                          </div>
                        )}

                        {wh.monthlyRent !== undefined && (
                          <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                            <span>🏢 Facility Rent:</span>
                            <span className="font-bold text-[#1C1917]">
                              {formatINR(wh.monthlyRent)}/mo
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                          <span>📦 Daily Orders Served:</span>
                          <span className="font-semibold text-[#1C1917]">
                            {formatNumber(wh.demandServed)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                          <span>⚡ Capacity Util:</span>
                          <span className="font-semibold text-[#1C1917]">
                            {wh.utilization.toFixed(1)}%
                          </span>
                        </div>

                        {wh.costPerSqFt !== undefined && (
                          <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                            <span>🏷️ Real Estate Rate:</span>
                            <span className="font-semibold text-[#1C1917]">
                              ₹{wh.costPerSqFt.toFixed(0)}/sqft
                            </span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>

                  {/* Warehouse Label Tag (only when p <= 25 to prevent clutter) */}
                  {numWh <= 25 && (
                    <Marker
                      position={[wh.lat, wh.lng]}
                      icon={L.divIcon({
                        className: 'warehouse-label-marker',
                        html: `
                          <div style="
                            font-family: 'Plus Jakarta Sans', sans-serif;
                            font-size: 10px;
                            font-weight: 700;
                            color: #1a1a2e;
                            text-align: center;
                            text-shadow: 0 1px 3px rgba(255,255,255,0.95);
                            white-space: nowrap;
                            pointer-events: none;
                            position: relative;
                            top: 14px;
                            left: 0;
                            transform: translateX(-50%);
                          ">W${i + 1}: ${wh.name} (${wh.employeesRequired || 0}👥 · ${(wh.avgDeliveryTime || 0).toFixed(0)}m)</div>
                        `,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                      })}
                    />
                  )}
                </React.Fragment>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
});
