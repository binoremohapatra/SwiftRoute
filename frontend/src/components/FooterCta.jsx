import { ArrowRight, ShieldCheck, Zap, Globe, Headphones } from 'lucide-react'

// Simple inline SVG particle component
function Particles() {
  return (
    <div className="particles-container" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 20 }, (_, i) => {
        const size = Math.random() * 4 + 1
        const left = Math.random() * 100
        const dur = Math.random() * 8 + 4
        const delay = Math.random() * 6
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              left: `${left}%`,
              top: `${80 + Math.random() * 20}%`,
              opacity: 0,
              animation: `particleAnim ${dur}s ease-out ${delay}s infinite`,
            }}
          />
        )
      })}
    </div>
  )
}

const trustSignals = [
  { Icon: ShieldCheck, label: 'SOC 2 Compliant' },
  { Icon: Zap, label: '99.8% Uptime SLA' },
  { Icon: Globe, label: 'GDPR Ready' },
  { Icon: Headphones, label: '24/7 Support' },
]

export default function FooterCta() {
  return (
    <>
      <section className="footer-cta" id="footer-cta">
        <div className="container">
          <div className="footer-cta-inner reveal">
            <div className="footer-cta-bg" />
            <Particles />

            <div className="section-label" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              Get Started Today
            </div>

            <h2>
              Your Deliveries Deserve<br />
              <span className="gradient-text">Real-Time Intelligence</span>
            </h2>

            <p>
              Join 500+ logistics companies using SwiftRoute to track, manage,
              and deliver with confidence — from first mile to last.
            </p>

            <div className="footer-cta-btns">
              <a href="#" className="btn-primary" id="cta-start-free">
                Start Free — No Credit Card
                <ArrowRight size={16} />
              </a>
              <a href="#" className="btn-ghost" id="cta-demo">
                Book a Demo
              </a>
            </div>

            {/* Trust signals with icons */}
            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              {trustSignals.map(({ Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <Icon size={14} color="var(--accent-primary)" strokeWidth={2} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>
                <div style={{
                  width: '28px', height: '28px',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={14} color="#fff" strokeWidth={2.5} />
                </div>
                SwiftRoute
              </div>
              <div className="footer-copy">
                © 2025 SwiftRoute Technologies. All rights reserved.
              </div>
            </div>

            <div className="footer-links">
              {['Privacy', 'Terms', 'Status', 'Docs', 'Blog', 'Careers'].map(link => (
                <a key={link} href="#">{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
