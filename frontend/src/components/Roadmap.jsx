import { Smartphone, BrainCircuit, CreditCard, BarChart3, Plug, Globe, CheckCircle2 } from 'lucide-react'

const roadmapItems = [
  {
    phase: 'Q2 2025',
    Icon: CheckCircle2,
    title: 'Core Platform',
    desc: 'Live tracking, order management, 3 dashboards',
    done: true,
  },
  {
    phase: 'Q3 2025',
    Icon: Smartphone,
    title: 'Mobile Apps',
    desc: 'Native iOS & Android apps for agents and customers',
    done: false,
  },
  {
    phase: 'Q4 2025',
    Icon: BrainCircuit,
    title: 'AI Route Optimization',
    desc: 'ML-powered routing that reduces fuel cost by 18%',
    done: false,
  },
  {
    phase: 'Q1 2026',
    Icon: CreditCard,
    title: 'Integrated Payments',
    desc: 'COD collection, digital wallets, split billing',
    done: false,
  },
  {
    phase: 'Q2 2026',
    Icon: BarChart3,
    title: 'Advanced Analytics',
    desc: 'Predictive ETA, demand forecasting, agent scoring',
    done: false,
  },
  {
    phase: 'Q3 2026',
    Icon: Plug,
    title: '3rd-Party Integrations',
    desc: 'Shopify, WooCommerce, SAP, Salesforce connectors',
    done: false,
  },
  {
    phase: 'Q4 2026',
    Icon: Globe,
    title: 'Global Scale',
    desc: 'Multi-region deployment, multi-language, multi-currency',
    done: false,
  },
]

export default function Roadmap() {
  return (
    <section className="roadmap" id="roadmap">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Roadmap</div>
          <h2>Where We're <span className="gradient-text">Headed</span></h2>
          <p>A bold product vision — shipping features as fast as our couriers ship packages.</p>
        </div>
      </div>

      <div className="roadmap-scroll">
        <div className="roadmap-track">
          {roadmapItems.map((item, i) => {
            const ItemIcon = item.Icon
            return (
              <div key={i} className="roadmap-item">
                <div
                  className="roadmap-dot"
                  style={item.done ? {
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    borderColor: 'var(--accent-primary)',
                    boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                  } : {}}
                >
                  <ItemIcon
                    size={22}
                    strokeWidth={1.75}
                    color={item.done ? '#fff' : 'var(--text-muted)'}
                  />
                </div>
                <div className="roadmap-content">
                  <div className="roadmap-phase">{item.phase}</div>
                  <div className="roadmap-title">{item.title}</div>
                  <div className="roadmap-desc">{item.desc}</div>
                  {item.done && (
                    <div style={{
                      marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
                      background: 'rgba(0,255,170,0.12)', color: 'var(--accent-tertiary)',
                      border: '1px solid rgba(0,255,170,0.2)',
                    }}>
                      <CheckCircle2 size={10} strokeWidth={2.5} />
                      Launched
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
        Scroll to explore →
      </div>
    </section>
  )
}
