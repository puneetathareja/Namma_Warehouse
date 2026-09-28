import React from 'react';

export const LogisticsTransitBanner: React.FC = () => {
  return (
    <div className="logistics-banner">
      <div className="lb-inner">
        <div className="lb-left">
          <div className="live-pill">
            <div className="live-ring">
              <span />
              <span />
            </div>
            Live Dispatch
          </div>
          <div className="lb-pipeline">
            <strong>198 BBMP Wards</strong>
            <span>→</span>
            <strong>Urban Micro-Hubs</strong>
            <span>→</span>
            <span style={{ color: '#047857', fontWeight: 700 }}>Eco Dispatch 🌱</span>
            <span className="hidden xl:inline text-[#7A7168] text-xs font-medium pl-2 border-l border-[#E8DFC9]">
              ORR Congestion Index: <strong style={{ color: '#9E471A' }}>0.92</strong>
            </span>
          </div>
        </div>

        <div className="lb-road">
          <div className="road-icon" title="Regional Warehouse Hub">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9E471A" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>

          <div className="road-strip">
            <div className="road-dash" />
            <div className="road-truck">
              <div className="road-bounce">
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '38px',
                      top: '14px',
                      width: '36px',
                      height: '14px',
                      background: 'linear-gradient(to right, rgba(251,191,36,.7), rgba(253,230,138,.3), transparent)',
                      borderRadius: '0 9999px 9999px 0',
                      pointerEvents: 'none',
                      filter: 'blur(.5px)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '13px',
                      zIndex: 10,
                      fontSize: '.58rem',
                      animation: 'leafWave 1.1s ease-in-out infinite',
                    }}
                  >
                    🌱
                  </div>
                  <svg
                    width="46"
                    height="29"
                    viewBox="0 0 46 29"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.15))' }}
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
                </div>
              </div>
            </div>
          </div>

          <div className="road-icon" title="Urban Demand Centers">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5C5248" strokeWidth="2">
              <rect x="3" y="9" width="18" height="11" rx="1" />
              <path d="M3 9V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1" />
              <path d="M9 9v11M15 9v11" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
