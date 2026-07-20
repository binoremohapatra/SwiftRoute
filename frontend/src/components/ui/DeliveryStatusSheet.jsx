import { Phone, Package } from 'lucide-react'

const statusMessages = {
  'Placed': { title: 'Order Placed', msg: 'Your order has been placed successfully.' },
  'Assigned': { title: 'Agent Assigned', msg: 'A delivery partner has been assigned to your order.' },
  'Picked-up': { title: 'Order Picked Up', msg: '{name} has picked up your order. Tasty food is en route!' },
  'In-Transit': { title: 'Out for Delivery', msg: '{name} is on the way to your location.' },
  'Delivered': { title: 'Order Delivered', msg: 'Your order has been delivered. Enjoy!' },
}

export default function DeliveryStatusSheet({ status, agent, onCall, delayNote }) {
  const info = statusMessages[status] || statusMessages['Placed']
  const message = info.msg.replace('{name}', agent?.name || 'Your delivery partner')

  return (
    <div
      style={{
        background: 'var(--color-surface, #12121c)',
        borderRadius: '20px 20px 0 0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Drag handle */}
      <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '0 auto 1.25rem' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flex: 1 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(226,55,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Package size={20} color="#e23744" />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366f1', background: 'rgba(0,212,255,0.12)', display: 'inline-block', padding: '2px 8px', borderRadius: 4, marginBottom: 6 }}>
              NOW
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 4 }}>
              {info.title}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.6)', lineHeight: 1.5 }}>
              {message}
            </div>
          </div>
        </div>

        {agent && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--color-surface)' }}>
              {agent.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={onCall}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#fc8019', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(252,128,25,0.4)',
              }}
            >
              <Phone size={15} color="#fff" fill="#fff" />
            </button>
          </div>
        )}
      </div>

      {delayNote && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.7)' }}>{delayNote}</span>
        </div>
      )}
    </div>
  )
}
