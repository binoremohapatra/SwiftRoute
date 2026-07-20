// v2 — layout pass
import AnimatedCounter from './AnimatedCounter'

const trendColor = (val) => {
  if (!val && val !== 0) return 'rgba(240,240,255,0.35)'
  return val >= 0 ? '#10b981' : '#ef4444'
}

/**
 * StatCard — KPI card with icon, animated count-up, optional trend arrow
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,        // e.g. +12.5 or -3
  suffix = '',
  prefix = '',
  loading = false,
  style = {}
}) {
  return (
    <div className="glass-card dash-stat-card" style={style}>
      {loading ? (
        <>
          <div className="skeleton skeleton-circle" style={{ width: 48, height: 48, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '55%', height: 12, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '70%', height: 28 }} />
          </div>
        </>
      ) : (
        <>
          <div
            className="dash-stat-icon"
            style={{ 
              background: color ? `${color}18` : 'var(--bg-elevated)', 
              color: color || 'var(--text-secondary)' 
            }}
          >
            {Icon && <Icon size={22} strokeWidth={2} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="dash-stat-label">{label}</div>
            <div className="dash-stat-value">
              <AnimatedCounter value={value ?? 0} suffix={suffix} prefix={prefix} />
            </div>
            {trend !== undefined && (
              <div
                className="dash-stat-trend"
                style={{ color: trendColor(trend) }}
              >
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                <span style={{ color: 'rgba(240,240,255,0.3)', fontWeight: 400 }}>vs last week</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
