import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  GitFork,
  BarChart3,
  Database,
  Settings,
  Bell,
  Check,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export interface FeatureItem {
  id: string;
  label: string;
  shortDesc: string;
  tagline: string;
  description: string;
  iconName: string;
  badge?: string;
}

export const FEATURES: FeatureItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortDesc: 'Live spatial simulation & hub mapping',
    tagline: 'Spatial Network & Hub Mapping',
    description: 'Interactive map simulator, optimal micro-hub cluster assignments, and real-time transit telemetry.',
    iconName: 'layout-dashboard',
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    shortDesc: 'Congestion & multi-hub SLA simulation',
    tagline: 'Congestion & Stress Simulation',
    description: 'Simulate peak traffic conditions, monsoon disruptions, and compare multi-hub SLA benchmarks.',
    iconName: 'git-fork',
    badge: 'Sim',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortDesc: 'SLA, emissions & cost benchmarks',
    tagline: 'Performance & ESG Benchmarks',
    description: 'Deep-dive metrics on 15-minute SLA fulfillment, green route emissions, and logistics cost savings.',
    iconName: 'bar-chart-3',
  },
  {
    id: 'data',
    label: 'Data',
    shortDesc: 'BBMP grid density & demand coordinates',
    tagline: 'BBMP Grid & Coordinates',
    description: 'Ward population density matrices, custom CSV coordinates, and industrial demand points.',
    iconName: 'database',
    badge: '800 pts',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortDesc: 'Network parameters & penalty weights',
    tagline: 'Parameters & Penalty Weights',
    description: 'Tuning candidate search radius, penalty factors, solver iterations, and cloud sync credentials.',
    iconName: 'settings',
  },
];

export interface AppNotification {
  id: string;
  time: string;
  title: string;
  detail: string;
  read: boolean;
  type: 'success' | 'warning' | 'info';
}

interface TopHeaderProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenDrawer: () => void;
  onOpenTour: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenDrawer,
  onOpenTour,
  notifications,
  onMarkAllRead,
}) => {
  const [showHonk, setShowHonk] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const ddTimerRef = useRef<NodeJS.Timeout | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentFeature = FEATURES.find((f) => f.id === activeTab) || FEATURES[0];

  const handleTruckClick = () => {
    setShowHonk(true);
    setTimeout(() => setShowHonk(false), 2200);
  };

  const handleMouseEnterDD = () => {
    if (ddTimerRef.current) clearTimeout(ddTimerRef.current);
    setShowDropdown(true);
  };

  const handleMouseLeaveDD = () => {
    ddTimerRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  const renderIcon = (name: string, size = 16) => {
    switch (name) {
      case 'layout-dashboard':
        return <LayoutDashboard size={size} />;
      case 'git-fork':
        return <GitFork size={size} />;
      case 'bar-chart-3':
        return <BarChart3 size={size} />;
      case 'database':
        return <Database size={size} />;
      case 'settings':
        return <Settings size={size} />;
      default:
        return <LayoutDashboard size={size} />;
    }
  };

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#bell-btn') && !target.closest('#notif-panel')) {
        setShowNotif(false);
      }
      if (!target.closest('#features-trigger-wrap')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header id="top-header">
      {/* Row 1: Branding & Profile */}
      <div className="header-row1">
        <div className="brand">
          {/* Warehouse Icon */}
          <div className="brand-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10L12 3L21 10V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10Z" />
              <path d="M9 21V14H15V21" />
              <path d="M7 10H17" />
              <path d="M12 7V8" />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexWrap: 'wrap' }}>
              <span className="brand-name">Namma Warehouse</span>

              {/* Animated Truck */}
              <div
                className="truck-wrap"
                onClick={handleTruckClick}
                title="Click for beep beep!"
              >
                {showHonk && <div className="honk-bubble">Beep beep! ❤️</div>}
                <div className="truck-bounce">
                  <div className="headlight-beam" />
                  <div className="leaf">🌱</div>
                  <svg
                    width="44"
                    height="27"
                    viewBox="0 0 46 29"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.12))' }}
                  >
                    <ellipse cx="23" cy="27" rx="19" ry="2" fill="#1C1917" opacity=".2" />
                    <rect x="2" y="6" width="25" height="17" rx="3.5" fill="#F59E0B" />
                    <rect x="2" y="6" width="25" height="3.5" rx="1.5" fill="#FBBF24" />
                    <rect x="8" y="10.5" width="13" height="8" rx="1.5" fill="#FEF3C7" stroke="#D97706" strokeWidth=".75" />
                    <line x1="14.5" y1="10.5" x2="14.5" y2="18.5" stroke="#EA580C" strokeWidth=".9" />
                    <line x1="8" y1="14.5" x2="21" y2="14.5" stroke="#EA580C" strokeWidth=".9" />
                    <circle cx="14.5" cy="14.5" r="1" fill="#B45309" />
                    <path d="M26 8.5C26 7.5 27 6.5 28 6.5H34C37.5 6.5 41 9 42 13L43.2 18C43.7 19.8 42.2 21.5 40 21.5H26V8.5Z" fill="#FBBF24" />
                    <path d="M28 8H33.5C35.8 8 38 9.5 38.8 12L39.5 14.5H28V8Z" fill="#BAE6FD" />
                    <line x1="31" y1="9" x2="36" y2="13.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".85" />
                    <rect x="41.5" y="19.5" width="3.5" height="3" rx="1.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth=".5" />
                    <circle cx="41.5" cy="15.5" r="2.2" fill="#FEF08A" stroke="#F59E0B" strokeWidth=".75" />
                    <circle cx="41.5" cy="15.5" r="1" fill="#fff" />
                    <rect x="1" y="12.5" width="1.5" height="3" rx=".75" fill="#EF4444" />
                    <circle cx="10" cy="23.5" r="4.5" fill="#292524" />
                    <circle cx="10" cy="23.5" r="2.4" fill="#F8FAFC" />
                    <circle cx="10" cy="23.5" r="1" fill="#F59E0B" />
                    <circle cx="34" cy="23.5" r="4.5" fill="#292524" />
                    <circle cx="34" cy="23.5" r="2.4" fill="#F8FAFC" />
                    <circle cx="34" cy="23.5" r="1" fill="#F59E0B" />
                  </svg>
                  <div className="exhaust" />
                </div>
              </div>

              {/* Bengaluru Pill */}
              <span className="blr-pill">
                <span className="blr-dot" />
                Bengaluru Central
              </span>
            </div>

            <p className="brand-subtitle">Premium Storage &amp; 3PL Logistics Operations</p>
          </div>
        </div>

        {/* Right: Bell + BLR */}
        <div className="header-actions">
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="bell-btn"
              onClick={() => setShowNotif((prev) => !prev)}
              id="bell-btn"
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="bell-dot" id="bell-dot" />}
            </button>

            {showNotif && (
              <div className="notif-panel" id="notif-panel">
                <div className="notif-header">
                  <div className="notif-title">
                    <Bell size={14} color="#9E471A" />
                    Namma Alerts
                  </div>
                  <button className="mark-read" onClick={onMarkAllRead}>
                    Mark all read
                  </button>
                </div>
                <div className="notif-list" id="notif-list">
                  {notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                      <div className="notif-icon-wrap">
                        {n.type === 'success' && <CheckCircle2 size={14} color="#059669" />}
                        {n.type === 'warning' && <AlertTriangle size={14} color="#D97706" />}
                        {n.type === 'info' && <Info size={14} color="#2563EB" />}
                      </div>
                      <div className="notif-body">
                        <div className="notif-row">
                          <span className="notif-name">{n.title}</span>
                          <span className="notif-time">{n.time}</span>
                        </div>
                        <div className="notif-detail">{n.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="notif-footer">BBMP 800 grid nodes synchronized</div>
              </div>
            )}
          </div>

          {/* BLR Badge */}
          <div className="blr-badge" title="Bengaluru Logistics Region" onClick={onOpenDrawer}>
            BLR
          </div>
        </div>
      </div>

      {/* Row 2: Direct Primary Navigation & Telemetry */}
      <div className="header-row2">
        <div className="header-row2-inner">
          {/* Main Navigation Tabs */}
          <nav className="header-nav-tabs" aria-label="Main Navigation">
            {FEATURES.map((f) => {
              const isActive = f.id === activeTab;
              return (
                <button
                  key={f.id}
                  className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(f.id)}
                  id={`nav-tab-${f.id}`}
                >
                  <span className="nav-tab-icon">{renderIcon(f.iconName, 14)}</span>
                  <span className="nav-tab-label">{f.label}</span>
                  {f.badge && <span className="nav-tab-badge">{f.badge}</span>}
                </button>
              );
            })}
          </nav>

          {/* Right: Engine Telemetry & Tour */}
          <div className="header-row2-right">
            <div
              className="engine-telemetry-pill"
              title="Spatial solver loaded with 800 BBMP coordinate nodes"
            >
              <span className="engine-pulse" />
              <span className="engine-text">BBMP 800 Nodes Synced</span>
            </div>

            <button
              className="modules-drawer-btn"
              onClick={onOpenDrawer}
              title="View all module descriptions"
            >
              <div className="bento-icon-small">
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2.5" y="2.5" width="6" height="6" rx="1.8" />
                  <rect x="11.5" y="2.5" width="6" height="6" rx="1.8" />
                  <rect x="2.5" y="11.5" width="6" height="6" rx="1.8" />
                  <rect x="11.5" y="11.5" width="6" height="6" rx="1.8" />
                </svg>
              </div>
              <span className="hidden sm:inline">Overview</span>
            </button>

            <button className="tour-btn" onClick={onOpenTour}>
              <Sparkles size={13} color="#92400E" />
              <span>Interactive Tour</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
