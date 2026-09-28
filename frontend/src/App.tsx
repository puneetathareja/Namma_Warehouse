import React, { useState, useEffect } from 'react';
import { TopHeader, AppNotification, FEATURES } from './components/TopHeader';
import { HeroBanner } from './components/HeroBanner';
import { LogisticsTransitBanner } from './components/LogisticsTransitBanner';
import { FeaturesDrawer } from './components/FeaturesDrawer';
import { EnquiryModal } from './components/EnquiryModal';
import { TourModal } from './components/TourModal';
import { DashboardPage, ActivityItem } from './pages/DashboardPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DataPage } from './pages/DataPage';
import { SettingsPage } from './pages/SettingsPage';
import { CITIES, DEFAULT_OPTIMIZATION_CONFIG } from './data/cityData';
import {
  CityOption,
  OptimizationConfig,
  OptimizationResult,
  GridPoint,
} from './types';
import { api } from './services/api';
import { formatINR } from './utils/formatters';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    time: '10m ago',
    title: 'Optimal Configuration Ready',
    detail: '3 candidate hubs selected with 94.2% SLA compliance in Bengaluru.',
    read: false,
    type: 'success',
  },
  {
    id: '2',
    time: '1h ago',
    title: 'Peak Traffic Alert',
    detail: 'Outer Ring Road traffic index reached 0.92 during peak morning hours.',
    read: false,
    type: 'warning',
  },
  {
    id: '3',
    time: '2h ago',
    title: 'BBMP Spatial Data Synced',
    detail: '800 coordinate grid nodes updated with Census density weighting.',
    read: true,
    type: 'info',
  },
];

export function App() {
  const [selectedCity] = useState<CityOption>(CITIES[0]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [config, setConfig] = useState<OptimizationConfig>({
    ...DEFAULT_OPTIMIZATION_CONFIG,
  });

  const [result, setResult] = useState<OptimizationResult>(() =>
    api.getCurrentResult()
  );

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [customPoints, setCustomPoints] = useState<GridPoint[] | undefined>(undefined);

  // Modals & Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'optimization',
      msg: 'Optimization completed • 3 warehouses selected • 24.5 min avg delivery',
      time: '10:22 AM',
    },
    {
      id: '2',
      type: 'capacity',
      msg: 'Scenario "High Demand" simulated (+40% demand • New cost: ₹8.4L)',
      time: '09:15 AM',
    },
    {
      id: '3',
      type: 'traffic',
      msg: 'Outer Ring Road corridor index calibrated to 0.92',
      time: 'Yesterday',
    },
    {
      id: '4',
      type: 'demand',
      msg: 'BBMP 800 grid nodes synchronized with real land price data',
      time: 'Yesterday',
    },
  ]);

  // Initial backend health probe & live optimization fetch
  useEffect(() => {
    let isMounted = true;
    async function initBackend() {
      try {
        const status = await api.checkBackendHealth();
        if (status.online && isMounted) {
          const cityData = await api.fetchCityData();
          if (cityData?.points && isMounted) {
            const mappedPoints: GridPoint[] = cityData.points.map((p) => ({
              id: p.point_id,
              lat: p.latitude,
              lng: p.longitude,
              orders: p.orders_per_day,
              price: p.price_per_sqft,
              traffic: p.traffic_index,
              zoneName: p.zone,
            }));
            setCustomPoints(mappedPoints);
          }
          const freshResult = await api.optimizeNetwork(config);
          if (isMounted) {
            setResult(freshResult);
          }
        }
      } catch (err) {
        console.warn('Backend auto-connection error:', err);
      }
    }
    initBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Execute optimization
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setStepIndex(0);

    try {
      const newResult = await api.optimizeNetwork(config, (step, idx) => {
        setCurrentStep(step);
        setStepIndex(idx);
      });

      setResult(newResult);

      // Add to activity feed
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: 'optimization',
        msg: `Solver completed • ${newResult.selectedWarehouseIds.length} hubs active • ${newResult.kpi.avgDeliveryTimeMin.toFixed(1)} min avg delivery`,
        time: 'Just now',
      };
      setActivities((prev) => [newActivity, ...prev.slice(0, 7)]);

      // Add to notifications
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        time: 'Just now',
        title: 'Network Optimized',
        detail: `${newResult.selectedWarehouseIds.length} hubs selected with ${formatINR(newResult.kpi.totalCostLakhs)} annual cost.`,
        read: false,
        type: 'success',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleChangeConfig = (newConfig: Partial<OptimizationConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleReset = async () => {
    const defaultRes = await api.resetScenario();
    setConfig({ ...DEFAULT_OPTIMIZATION_CONFIG });
    setResult(defaultRes);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-[#FAF5E8] text-[#261B14] flex flex-col font-sans antialiased">
      {/* ── Top Header ── */}
      <TopHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* ── Hero Banner (Executive Command Hub - Main Dashboard) ── */}
      {activeTab === 'dashboard' && (
        <HeroBanner
          activeHubsCount={result.selectedWarehouseIds.length}
          totalCostLakhs={result.kpi.totalCostLakhs}
          avgDeliveryTime={result.kpi.avgDeliveryTimeMin}
          co2Pct={Math.round(
            result.kpi.baseline?.co2EmissionsTons
              ? Math.max(
                  5,
                  ((result.kpi.baseline.co2EmissionsTons - result.kpi.co2EmissionsTons) /
                    result.kpi.baseline.co2EmissionsTons) *
                    100
                )
              : 23
          )}
          isOptimizing={isOptimizing}
          onRunOptimization={handleRunOptimization}
          onOpenTour={() => setIsTourOpen(true)}
          onOpenEnquiry={() => setIsEnquiryOpen(true)}
        />
      )}

      {/* ── Logistics Transit Telemetry Banner ── */}
      {activeTab === 'dashboard' && <LogisticsTransitBanner />}

      {/* ── Main Content Area ── */}
      <main className="main-content flex-1">

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardPage
            city={selectedCity}
            warehouses={result.warehouses}
            zones={result.zones}
            assignments={result.assignments}
            result={result}
            config={config}
            onChangeConfig={handleChangeConfig}
            onRunOptimization={handleRunOptimization}
            isOptimizing={isOptimizing}
            currentStep={currentStep}
            stepIndex={stepIndex}
            customPoints={customPoints}
            onReset={handleReset}
            activities={activities}
          />
        )}

        {/* Tab 2: Scenarios */}
        {activeTab === 'scenarios' && (
          <ScenariosPage
            config={config}
            result={result}
            onUpdateResult={(newRes) => {
              setResult(newRes);
              setActivities((prev) => [
                {
                  id: Date.now().toString(),
                  type: 'capacity',
                  msg: `Scenario recalculated: ${formatINR(newRes.kpi.totalCostLakhs)} annual cost • ${newRes.kpi.avgDeliveryTimeMin.toFixed(1)} min SLA`,
                  time: 'Just now',
                },
                ...prev,
              ]);
            }}
          />
        )}

        {/* Tab 3: Analytics */}
        {activeTab === 'analytics' && (
          <AnalyticsPage result={result} />
        )}

        {/* Tab 4: Data */}
        {activeTab === 'data' && (
          <DataPage />
        )}

        {/* Tab 5: Settings */}
        {activeTab === 'settings' && (
          <SettingsPage
            config={config}
            onChangeConfig={handleChangeConfig}
            onRunOptimization={handleRunOptimization}
            onReset={handleReset}
          />
        )}
      </main>

      {/* ── Drawers & Modals ── */}
      <FeaturesDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(id) => {
          setActiveTab(id);
          setIsDrawerOpen(false);
        }}
      />

      <EnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />

      <TourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setIsTourOpen(false);
        }}
      />
    </div>
  );
}

export default App;
