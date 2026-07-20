/**
 * SkeletonLoader — shimmer placeholders for loading states
 */

export function SkeletonStatCard() {
  return (
    <div className="glass-card dash-stat-card">
      <div className="skeleton skeleton-circle" style={{ width: 48, height: 48, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 28, width: '70%', borderRadius: 8 }} />
      </div>
    </div>
  )
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '0.875rem 1rem' }}>
          <div
            className="skeleton"
            style={{
              height: 14,
              width: `${60 + (i % 3) * 15}%`,
              borderRadius: 6,
            }}
          />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="order-card" style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.875rem' }}>
        <div className="skeleton skeleton-circle" style={{ width: 40, height: 40 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 13, width: '45%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 11, width: '65%', borderRadius: 6 }} />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 12, width: `${75 - i * 10}%`, borderRadius: 6, marginBottom: 8 }} />
      ))}
    </div>
  )
}

export function SkeletonText({ width = '100%', height = 14 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 6 }} />
}
