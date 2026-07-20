/**
 * StatusBadge — color-coded with pulsing dot for In-Transit
 */

const STATUS_CONFIG = {
  Placed:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   border: 'rgba(96,165,250,0.25)' },
  Assigned:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.25)' },
  'Picked-up': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.25)' },
  'In-Transit':{ color: '#00d4ff', bg: 'rgba(0,212,255,0.12)',    border: 'rgba(0,212,255,0.3)', pulse: true },
  Delivered:   { color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.25)' },
  Cancelled:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.25)' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || {
    color: 'rgba(240,240,255,0.5)',
    bg: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.12)',
  }

  const fontSize = size === 'lg' ? '0.82rem' : '0.72rem'
  const padding = size === 'lg' ? '0.3rem 0.8rem' : '0.22rem 0.65rem'

  return (
    <span
      className={`dash-badge${cfg.pulse ? ' pulse' : ''}`}
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.border,
        fontSize,
        padding,
      }}
    >
      <span className="dash-badge-dot" />
      {status}
    </span>
  )
}

export { STATUS_CONFIG }
