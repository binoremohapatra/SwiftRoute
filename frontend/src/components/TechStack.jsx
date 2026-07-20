import { Atom, Server, Cpu, Database, Zap, Map, Bell, Smartphone, Network } from 'lucide-react'

const techItems = [
  { logo: <Atom size={32} color="#00d4ff" />, name: 'React', desc: 'UI Framework' },
  { logo: <Server size={32} color="#00ff88" />, name: 'Node.js', desc: 'Runtime' },
  { logo: <Cpu size={32} color="#aaaaaa" />, name: 'Express', desc: 'API Layer' },
  { logo: <Database size={32} color="#00ed64" />, name: 'MongoDB', desc: 'Primary DB' },
  { logo: <Database size={32} color="#336791" />, name: 'PostgreSQL', desc: 'Analytics DB' },
  { logo: <Zap size={32} color="#f7df1e" />, name: 'WebSockets', desc: 'Real-time IO' },
  { logo: <Map size={32} color="#34a853" />, name: 'Maps API', desc: 'Navigation' },
  { logo: <Bell size={32} color="#ff9800" />, name: 'Firebase', desc: 'Push Notifications' },
]

const archFlow = [
  { label: 'Client Apps', desc: 'React · Mobile', icon: <Smartphone size={28} color="#f0f0ff" /> },
  { label: 'API Gateway', desc: 'Express · REST', icon: <Network size={28} color="#f0f0ff" /> },
  { label: 'WebSocket Hub', desc: 'Socket.io · Live', icon: <Zap size={28} color="#f0f0ff" /> },
  { label: 'Data Layer', desc: 'MongoDB · PG', icon: <Database size={28} color="#f0f0ff" /> },
]

export default function TechStack() {
  return (
    <section className="tech-stack" id="tech">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Architecture</div>
          <h2>Built on <span className="gradient-text">Battle-Tested</span> Tech</h2>
          <p>A modern, scalable stack designed for thousands of concurrent deliveries with sub-second reliability.</p>
        </div>

        {/* Architecture Flow Diagram */}
        <div className="reveal" style={{ transitionDelay: '0.1s', marginBottom: '60px' }}>
          <div className="glass-card" style={{ padding: '40px 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
              {/* Animated connection line */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '60px',
                right: '60px',
                height: '2px',
                background: 'linear-gradient(to right, var(--accent-primary), var(--accent-tertiary))',
                opacity: 0.15,
                transform: 'translateY(-50%)',
              }} />

              {archFlow.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '20px 24px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    minWidth: '120px',
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
                      e.currentTarget.style.background = 'rgba(0,212,255,0.06)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.background = 'var(--color-surface)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px' }}>{item.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{item.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</span>
                  </div>

                  {i < archFlow.length - 1 && (
                    <div style={{
                      fontSize: '20px',
                      color: 'var(--accent-primary)',
                      opacity: 0.4,
                      animation: 'arrowPulse 2s ease-in-out infinite',
                      animationDelay: `${i * 0.3}s`,
                      flexShrink: 0,
                    }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="tech-grid">
          {techItems.map((tech, i) => (
            <div
              key={i}
              className="tech-card reveal"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <span className="tech-logo">{tech.logo}</span>
              <div className="tech-name">{tech.name}</div>
              <div className="tech-desc">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes arrowPulse {
          0%, 100% { opacity: 0.3; transform: translateX(0); }
          50% { opacity: 0.8; transform: translateX(3px); }
        }
      `}</style>
    </section>
  )
}
