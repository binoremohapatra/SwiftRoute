import { Package, ShoppingBag, Users, Truck } from 'lucide-react'

const ILLUSTRATIONS = {
  orders:  Package,
  shopping: ShoppingBag,
  users:   Users,
  agent:   Truck,
  default: Package,
}

/**
 * EmptyState — illustrated empty state with optional CTA
 */
export default function EmptyState({ icon = 'default', title = 'Nothing here yet', subtitle, action }) {
  const Icon = ILLUSTRATIONS[icon] || ILLUSTRATIONS.default

  return (
    <div className="dash-empty" style={{ gap: '0.75rem' }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.25rem',
      }}>
        <Icon size={36} style={{ opacity: 0.25 }} />
      </div>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(240,240,255,0.5)' }}>{title}</div>
      {subtitle && (
        <p style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.3)', maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
      {action && (
        <div style={{ marginTop: '0.75rem' }}>
          {action}
        </div>
      )}
    </div>
  )
}
