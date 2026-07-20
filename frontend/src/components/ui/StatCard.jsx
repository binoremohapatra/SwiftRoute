import AnimatedCounter from './AnimatedCounter'

const trendColor = (val) => {
  if (!val && val !== 0) return 'var(--text-muted)'
  return val >= 0 ? '#34d399' : '#f87171'
}

/**
 * StatCard — KPI card with icon, animated count-up, optional trend arrow.
 * Icons are neutral/monochrome by default. Pass `primary` to give the single
 * most important metric per screen the accent treatment.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  primary = false,   // only the key metric per screen should set this
  trend,             // e.g. +12.5 or -3
  suffix = '',
  prefix = '',
  loading = false,
  style = {},
  // `color` kept for backward compatibility but no longer tints every card
  color,
}) {
  const iconStyle = primary
    ? { background: 'rgba(99,102,241,0.14)', color: 'var(--accent-primary)' }
    : undefined // falls back to neutral .dash-stat-icon styling

  return (
    <div className="glass-card dash-stat-card" style={style}>
      {loading ? (
        <>
          <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '55%', height: 12, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '70%', height: 26 }} />
          </div>
        </>
      ) : (
        <>
          <div className="dash-stat-icon" style={iconStyle}>
            {Icon && <Icon size={20} strokeWidth={2} />}
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
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs last week</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * StatCard — KPI card with icon, animated count-up, optional trend arrow
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  color = '#6366f1',
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
            style={{ background: `${color}18`, color }}
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
                <span style={{ color: 'rgba(245,245,247,0.3)', fontWeight: 400 }}>vs last week</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
