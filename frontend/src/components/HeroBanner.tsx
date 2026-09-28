import React, { useState } from 'react';
import {
  Sparkles,
  Share2,
  Check,
  Play,
  ChevronUp,
  ChevronDown,
  Navigation,
  Layers,
  Leaf,
  Clock,
  Loader2,
} from 'lucide-react';

interface HeroBannerProps {
  activeHubsCount?: number;
  totalCostLakhs?: number;
  avgDeliveryTime?: number;
  co2Pct?: number;
  isOptimizing?: boolean;
  onRunOptimization?: () => void;
  onOpenTour?: () => void;
  onOpenEnquiry?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  activeHubsCount = 3,
  totalCostLakhs = 7.2,
  avgDeliveryTime = 24.5,
  co2Pct = 23,
  isOptimizing = false,
  onRunOptimization,
  onOpenTour,
  onOpenEnquiry,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  if (isCollapsed) {
    return (
      <div className="hero-wrap">
        <div className="hero-collapsed-bar" id="hero-card-collapsed">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="pill pill-emerald py-1 px-2.5 text-xs">
              <span className="pulse-dot pulse-green" />
              {activeHubsCount} Hubs Active
            </span>
            <span className="text-xs font-semibold text-[#3A2B20]">
              Bengaluru Urban Logistics Network
            </span>
            <span className="text-xs text-[#7A7168] hidden md:inline">
              · 800 BBMP Nodes · Avg SLA: {avgDeliveryTime.toFixed(1)}m
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRunOptimization && (
              <button
                className="hero-opt-btn-sm"
                onClick={onRunOptimization}
                disabled={isOptimizing}
              >
                {isOptimizing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                <span>{isOptimizing ? 'Solving...' : 'Optimize'}</span>
              </button>
            )}
            <button
              className="hero-toggle-btn"
              onClick={() => setIsCollapsed(false)}
              title="Expand Overview"
            >
              <ChevronDown size={14} />
              <span className="text-xs hidden sm:inline">Expand</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-wrap">
      <div className="hero-card" id="hero-card">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-glow" />

        {/* Top Badges & Status */}
        <div className="hero-top">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill pill-dark">
              <span className="pulse-dot pulse-orange" />
              Bengaluru Autonomous Network · 198 BBMP Wards
            </span>
            <span className="pill pill-teal">
              <Navigation size={12} />
              ORR Traffic Calibrated
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="hero-toggle-btn"
              onClick={() => setIsCollapsed(true)}
              title="Collapse to compact bar"
            >
              <ChevronUp size={14} />
              <span className="text-xs hidden sm:inline">Compact View</span>
            </button>
          </div>
        </div>

        {/* Middle Content: Executive Logistics Operations Hub */}
        <div className="hero-mid">
          <div className="hero-sub-badges">
            <span className="badge-orange">SPATIAL OPTIMIZATION PLATFORM</span>
            <span className="badge-dark">MIP Facility Location &amp; Green Routing</span>
          </div>

          <h1 className="hero-h1">
            Autonomous Urban Micro-Hub &amp; Route Optimizer
          </h1>

          <p className="hero-p">
            High-density spatial clustering and dynamic dispatch solver calibrated for Bengaluru's
            traffic bottlenecks. Placing micro-fulfillment hubs across BBMP wards to achieve
            10-minute quick-commerce SLAs, minimize fuel expenditure, and slash fleet CO₂ emissions.
          </p>

          {/* Operational Highlights Pill Row */}
          <div className="hero-highlights-row">
            <div className="highlight-pill">
              <Layers size={13} className="text-amber-400" />
              <span><strong>800</strong> Spatial BBMP Nodes</span>
            </div>
            <div className="highlight-pill">
              <Clock size={13} className="text-emerald-400" />
              <span><strong>{avgDeliveryTime.toFixed(1)}m</strong> Avg Transit Latency</span>
            </div>
            <div className="highlight-pill">
              <Leaf size={13} className="text-emerald-400" />
              <span><strong>{co2Pct}%</strong> Fleet CO₂ Abatement</span>
            </div>
            <div className="highlight-pill">
              <span className="text-amber-400 font-bold">₹</span>
              <span><strong>{activeHubsCount}</strong> Active Micro-Hubs</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="hero-bot">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="pill pill-emerald">
              <span className="pulse-dot pulse-green" />
              {activeHubsCount} Bengaluru Micro-Hubs Active
            </span>
            <span className="pill pill-dark">
              <Leaf size={12} color="#34D399" />
              Zero-Emission Route Optimization
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRunOptimization && (
              <button
                className="hero-enquire"
                onClick={onRunOptimization}
                disabled={isOptimizing}
                title="Trigger mixed-integer spatial optimization"
              >
                {isOptimizing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} fill="currentColor" />
                )}
                <span>{isOptimizing ? 'Optimizing Network...' : 'Run Optimization'}</span>
              </button>
            )}

            {onOpenTour && (
              <button
                className="hero-tour-btn"
                onClick={onOpenTour}
                title="Launch guided interactive tour"
              >
                <Sparkles size={14} />
                <span>Walkthrough</span>
              </button>
            )}

            <button
              className="hero-share"
              onClick={handleShare}
              title="Share / Copy Dashboard Link"
            >
              <Share2 size={14} />
            </button>
          </div>
        </div>

        {/* Share Toast */}
        {showToast && (
          <div className="share-toast" id="share-toast">
            <Check size={12} strokeWidth={2.5} color="#34D399" />
            Network link copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
};
