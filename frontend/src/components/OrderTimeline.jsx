import { useEffect, useRef } from 'react'
import { ClipboardList, CheckCheck, Package, Truck, Home } from 'lucide-react'

const timelineSteps = [
  { Icon: ClipboardList, label: 'Order\nPlaced', time: '09:14 AM' },
  { Icon: CheckCheck, label: 'Agent\nAssigned', time: '09:15 AM' },
  { Icon: Package, label: 'Picked\nUp', time: '10:02 AM' },
  { Icon: Truck, label: 'In\nTransit', time: '10:45 AM' },
  { Icon: Home, label: 'Delivered', time: '11:28 AM' },
]

export default function OrderTimeline() {
  const sectionRef = useRef(null)
  const progressRef = useRef(null)
  const dotsRef = useRef([])
  const labelsRef = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) animateTimeline()
      },
      { threshold: 0.4 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const animateTimeline = () => {
    const totalSteps = timelineSteps.length
    timelineSteps.forEach((_, i) => {
      setTimeout(() => {
        if (progressRef.current) {
          const pct = `${(i / (totalSteps - 1)) * 100}%`
          progressRef.current.style.width = pct
          progressRef.current.style.setProperty('--progress', pct)
        }
        if (dotsRef.current[i]) dotsRef.current[i].classList.add('filled')
        if (labelsRef.current[i]) labelsRef.current[i].classList.add('filled')
      }, i * 600)
    })
  }

  return (
    <section className="timeline-section" id="timeline" ref={sectionRef}>
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Order Status</div>
          <h2>Track Every <span className="gradient-text">Milestone</span></h2>
          <p>A living timeline that updates in real-time as your order progresses through each stage.</p>
        </div>

        <div className="reveal" style={{ transitionDelay: '0.2s' }}>
          <div className="glass-card" style={{ padding: '60px 80px' }}>
            <div className="order-timeline">
              <div className="timeline-connector">
                <div className="timeline-progress" ref={progressRef} />
              </div>

              {timelineSteps.map((step, i) => {
                const StepIcon = step.Icon
                return (
                  <div key={i} className="timeline-step">
                    <div className="timeline-dot" ref={el => dotsRef.current[i] = el}>
                      <StepIcon size={22} strokeWidth={1.75} />
                    </div>
                    <div className="timeline-content">
                      <div
                        className="timeline-label"
                        ref={el => labelsRef.current[i] = el}
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {step.label}
                      </div>
                      <div className="timeline-time">{step.time}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{
              marginTop: '40px',
              paddingTop: '32px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: '40px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Order ID', value: '#SW-29471' },
                { label: 'Customer', value: 'Arjun Mehta' },
                { label: 'Agent', value: 'Rajan K. · 4.9★' },
                { label: 'Distance', value: '8.4 km' },
                { label: 'Total Time', value: '2h 14m' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
