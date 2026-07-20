import { EyeOff, ClipboardList, Users, Bell } from 'lucide-react'
import { CheckCircle2, Radio, Zap, GitBranch } from 'lucide-react'

const problems = [
  {
    Icon: EyeOff,
    cls: 'red',
    color: '#ff3c3c',
    title: 'Zero Visibility',
    desc: 'Customers call, agents go dark, and managers stare at spreadsheets. Nobody knows where the order actually is.',
  },
  {
    Icon: ClipboardList,
    cls: 'orange',
    color: '#ff6b35',
    title: 'Manual Tracking',
    desc: 'Pen-and-paper handoffs, WhatsApp updates, and fragile Excel sheets — falling apart at scale.',
  },
  {
    Icon: Users,
    cls: 'yellow',
    color: '#ffc83c',
    title: 'Poor Coordination',
    desc: 'Dispatch teams, delivery agents, and customers operate in separate silos with no shared context.',
  },
  {
    Icon: Bell,
    cls: 'pink',
    color: '#ff3c78',
    title: 'Delayed Updates',
    desc: 'Status changes hours late. Customers complain, trust erodes, and returns spike.',
  },
]

const solutions = [
  {
    Icon: Radio,
    color: '#00d4ff',
    title: 'Live GPS Streams',
    desc: 'Every delivery agent broadcasts real-time location via WebSocket — updated every 2 seconds.',
  },
  {
    Icon: Zap,
    color: '#00d4ff',
    title: 'Automated Workflows',
    desc: 'Order lifecycle managed end-to-end: placed, assigned, picked, in-transit, delivered — zero manual input.',
  },
  {
    Icon: GitBranch,
    color: '#00d4ff',
    title: 'Unified Command Layer',
    desc: 'One platform. Three roles. Customer, agent, and admin all in sync with the same live data.',
  },
  {
    Icon: CheckCircle2,
    color: '#00d4ff',
    title: 'Instant Notifications',
    desc: 'Push, SMS, and email alerts fire in milliseconds when any status changes. No polling needed.',
  },
]

export default function ProblemSolution() {
  return (
    <section className="problem-solution" id="problem-solution">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">The Problem</div>
          <h2>Logistics Is <span className="gradient-text-warm">Broken</span>.<br />We Fixed It.</h2>
          <p>Most delivery operations run on hope, not data. SwiftRoute replaces chaos with certainty.</p>
        </div>

        <div className="ps-grid">
          <div className="ps-side problem reveal">
            <h3>Without SwiftRoute</h3>
            {problems.map((p, i) => (
              <div className="pain-point" key={i}>
                <div className={`pain-icon ${p.cls}`} style={{ animationDelay: `${i * 0.5}s` }}>
                  <p.Icon size={20} color={p.color} strokeWidth={2} />
                </div>
                <div>
                  <h4>{p.title}</h4>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="ps-side solution reveal" style={{ transitionDelay: '0.2s' }}>
            <h3>With SwiftRoute</h3>
            {solutions.map((s, i) => (
              <div className="pain-point" key={i}>
                <div className="pain-icon" style={{
                  background: 'rgba(0,212,255,0.12)',
                  animationDelay: `${i * 0.3}s`
                }}>
                  <s.Icon size={20} color={s.color} strokeWidth={2} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--accent-tertiary)' }}>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
