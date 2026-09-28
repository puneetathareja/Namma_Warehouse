import React from 'react';
import { X, ChevronRight, LayoutDashboard, GitFork, BarChart3, Database, Settings } from 'lucide-react';
import { FEATURES } from './TopHeader';

interface FeaturesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (id: string) => void;
}

export const FeaturesDrawer: React.FC<FeaturesDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  const renderIcon = (name: string, size = 20) => {
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

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-row">
            <div className="drawer-bento">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" color="#FAF5E8">
                <rect x="2" y="2" width="6.5" height="6.5" rx="2" />
                <rect x="11.5" y="2" width="6.5" height="6.5" rx="2" />
                <rect x="2" y="11.5" width="6.5" height="6.5" rx="2" />
                <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="2" />
              </svg>
            </div>
            <div>
              <div className="drawer-title">Namma Features</div>
              <div className="drawer-sub">Tap any feature to navigate &amp; display</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          <div className="drawer-section-label">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />
            Select Feature For Display
          </div>

          <div>
            {FEATURES.map((f) => {
              const isActive = f.id === activeTab;
              return (
                <button
                  key={f.id}
                  className={`drawer-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectTab(f.id);
                    onClose();
                  }}
                >
                  <div className="di-left">
                    <div className="di-icon">{renderIcon(f.iconName, 20)}</div>
                    <div>
                      <div className="di-name">
                        {f.label}
                        {f.badge && <span className="dd-badge">{f.badge}</span>}
                        {isActive && <span className="dd-active-badge">Active Display</span>}
                      </div>
                      <div className="di-tagline">{f.tagline}</div>
                      <div className="di-desc">{f.description}</div>
                    </div>
                  </div>
                  <div className="di-arrow">
                    <ChevronRight size={13} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <div className="df-live">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#34D399',
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            24-Hour Logistics Ready
          </div>
          <span className="df-version">Bengaluru Spatial v2.4</span>
        </div>
      </div>
    </div>
  );
};
