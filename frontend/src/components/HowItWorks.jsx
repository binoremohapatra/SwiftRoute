import { useEffect, useRef, useState } from 'react'
import { ClipboardEdit, UserCheck, PackageOpen, Truck, Home } from 'lucide-react'

const steps = [
  {
    num: '01',
    Icon: ClipboardEdit,
    title: 'Order Placed',
    desc: 'Customer places an order via the app or web. Order details are instantly captured, validated, and assigned a unique tracking ID. Real-time confirmation sent immediately.',
    badge: 'Customer',
    badgeColor: '#00d4ff',
    time: '0:00',
  },
  {
    num: '02',
    Icon: UserCheck,
    title: 'Agent Assigned',
    desc: 'The intelligent dispatch engine matches the nearest available delivery agent based on location, load, and priority. Assignment confirmed in under 5 seconds.',
    badge: 'System',
    badgeColor: '#8c3cff',
    time: '0:05',
  },
  {
    num: '03',
    Icon: PackageOpen,
    title: 'Picked Up',
    desc: 'Agent scans the package at the warehouse. Pickup timestamp locked. Customer and admin get a push notification. Agent route calculated and optimized on-the-fly.',
    badge: 'Agent',
    badgeColor: '#ff6b35',
    time: '0:45',
  },
  {
    num: '04',
    Icon: Truck,
    title: 'Live Tracking',
    desc: 'GPS location broadcasts every 2 seconds via WebSocket. Customer watches the agent move on a live map. ETA dynamically recalculates based on traffic data.',
    badge: 'Live',
    badgeColor: '#00ffaa',
    time: '1:20',
  },
  {
    num: '05',
    Icon: Home,
    title: 'Delivered',
    desc: 'Agent marks delivery complete with photo proof and digital signature. Rating prompt sent immediately. Admin analytics updated in real time. Order closed.',
    badge: 'Complete',
    badgeColor: '#00ffaa',
    time: '2:15',
  },
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)
  const sectionRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let current = 0
          setActiveStep(0)
          intervalRef.current = setInterval(() => {
            current = (current + 1) % steps.length
            setActiveStep(current)
          }, 1800)
        } else {
          clearInterval(intervalRef.current)
        }
      },
      { threshold: 0.3 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => {
      observer.disconnect()
      clearInterval(intervalRef.current)
    }
  }, [])

  const handleStepClick = (i) => {
    clearInterval(intervalRef.current)
    setActiveStep(i)
  }

  const ActiveIcon = steps[activeStep].Icon

  return (
    <section className="how-it-works" id="how-it-works" ref={sectionRef}>
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">How It Works</div>
          <h2>5 Steps. <span className="gradient-text">One Seamless</span> Flow.</h2>
          <p>From order creation to doorstep delivery — every step tracked, automated, and verifiable.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'start' }}>
          <div className="hiw-steps reveal">
            {steps.map((step, i) => {
              const StepIcon = step.Icon
              return (
                <div
                  key={i}
                  className={`hiw-step ${i <= activeStep ? 'active' : ''}`}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                  onClick={() => handleStepClick(i)}
                >
                  <div className="hiw-step-num">{step.num}</div>
                  <div className="hiw-step-content">
                    <div className="hiw-step-badge" style={{
                      background: `${step.badgeColor}18`,
                      color: step.badgeColor,
                      border: `1px solid ${step.badgeColor}30`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <StepIcon size={12} />
                      {step.badge}
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="reveal" style={{ transitionDelay: '0.2s', position: 'sticky', top: '120px' }}>
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 24px',
                borderRadius: '24px',
                background: `linear-gradient(135deg, ${steps[activeStep].badgeColor}20, ${steps[activeStep].badgeColor}08)`,
                border: `1px solid ${steps[activeStep].badgeColor}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'stepIconIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <ActiveIcon size={36} color={steps[activeStep].badgeColor} strokeWidth={1.5} />
              </div>

              <div style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: `${steps[activeStep].badgeColor}18`,
                color: steps[activeStep].badgeColor,
                border: `1px solid ${steps[activeStep].badgeColor}30`,
                marginBottom: '20px',
              }}>
                Step {steps[activeStep].num} · T+{steps[activeStep].time}
              </div>
              <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>{steps[activeStep].title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '15px' }}>
                {steps[activeStep].desc}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleStepClick(i)}
                    style={{
                      width: i === activeStep ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: i <= activeStep ? 'var(--accent-primary)' : 'var(--color-border)',
                      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes stepIconIn {
          0% { transform: scale(0.6) rotate(-15deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
