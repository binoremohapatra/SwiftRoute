export default function ETABadge({ minutes }) {
  return (
    <div
      style={{
        background: '#1e2a3a',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.03em',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      ETA : {minutes} MINS
    </div>
  )
}
