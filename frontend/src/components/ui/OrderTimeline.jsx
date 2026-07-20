import { CheckCircle, Package, Truck, MapPin, User } from 'lucide-react'

const STATUS_STEPS = [
  { key: 'Placed',       label: 'Order Placed',    color: '#60a5fa', rgb: '96,165,250',   Icon: Package },
  { key: 'Assigned',     label: 'Agent Assigned',  color: '#a78bfa', rgb: '167,139,250',  Icon: User },
  { key: 'Picked-up',    label: 'Picked Up',       color: '#f59e0b', rgb: '245,158,11',   Icon: MapPin },
  { key: 'In-Transit',   label: 'In Transit',      color: '#00d4ff', rgb: '0,212,255',    Icon: Truck },
  { key: 'Delivered',    label: 'Delivered',       color: '#34d399', rgb: '52,211,153',   Icon: CheckCircle },
]

/**
 * OrderTimeline — animated vertical stepper for order status
 */
export default function OrderTimeline({ status, timestamps = {} }) {
  if (status === 'Cancelled') {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(248,113,113,0.06)',
        borderRadius: 16,
        border: '1px solid rgba(248,113,113,0.15)',
      }}>
        <Package size={36} color="#f87171" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
        <p style={{ color: '#f87171', fontWeight: 700 }}>Order Cancelled</p>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status)

  return (
    <div className="status-timeline">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        const { Icon } = step

        return (
          <div key={step.key} className="status-timeline-step">
            <div className="status-timeline-left">
              <div
                className={`status-timeline-dot${done ? ' done' : ''}${active ? ' active' : ''}`}
                style={{
                  '--step-color': step.color,
                  '--step-rgb': step.rgb,
                }}
              >
                <Icon
                  size={14}
                  color={done ? step.color : 'rgba(240,240,255,0.2)'}
                />
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`status-timeline-line${done && i < currentIdx ? ' done' : ''}`}
                  style={{ '--step-rgb': step.rgb }}
                />
              )}
            </div>

            <div className="status-timeline-content">
              <div
                className={`status-timeline-label${done ? ' done' : ''}${active ? ' active' : ''}`}
                style={active ? { '--step-color': step.color } : {}}
              >
                {step.label}
                {active && (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    background: `rgba(${step.rgb},0.15)`,
                    color: step.color,
                    fontWeight: 700,
                  }}>
                    NOW
                  </span>
                )}
              </div>
              {timestamps[step.key] && (
                <div className="status-timeline-sublabel">
                  {new Date(timestamps[step.key]).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
