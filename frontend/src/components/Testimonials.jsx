import { Star } from 'lucide-react'

const testimonials = [
  {
    rating: 5,
    text: 'SwiftRoute cut our customer complaint tickets by 68% in the first month. The real-time visibility completely changed how we handle escalations.',
    name: 'Priya Nair',
    role: 'VP Operations, ZeptoMart',
    initials: 'PN',
    color: '#00d4ff',
  },
  {
    rating: 5,
    text: "We handle 3,000+ daily deliveries across 12 cities. SwiftRoute is the only platform that hasn't buckled under our load. Remarkable uptime.",
    name: 'Rohan Sharma',
    role: 'CTO, QuickBasket',
    initials: 'RS',
    color: '#00ffaa',
  },
  {
    rating: 5,
    text: 'The agent app is incredible. My riders love it — clear route guidance, one-tap delivery confirmation. Pickup efficiency went up 40%.',
    name: 'Anjali Desai',
    role: 'Fleet Manager, CityRunner',
    initials: 'AD',
    color: '#ff6b35',
  },
  {
    rating: 4,
    text: 'The admin dashboard gives me everything. Revenue, agent performance, delay heatmaps — all in real time. I cancelled three other tools.',
    name: 'Vikram Malhotra',
    role: 'Head of Logistics, FreshFirst',
    initials: 'VM',
    color: '#8c3cff',
  },
  {
    rating: 5,
    text: 'Implementation took 4 days. Support team was phenomenal. Our on-time delivery rate jumped from 84% to 97% within 6 weeks.',
    name: 'Sanya Kapoor',
    role: 'COO, MedDeliveries',
    initials: 'SK',
    color: '#00d4ff',
  },
  {
    rating: 5,
    text: 'The WebSocket tracking is genuinely impressive. Watching orders move on the map in real time — customers love it and so do we.',
    name: 'Arjun Reddy',
    role: 'Founder, SpeedBox',
    initials: 'AR',
    color: '#00ffaa',
  },
]

const allTestimonials = [...testimonials, ...testimonials]

function StarRating({ count, max = 5 }) {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={14}
          color="#ffc83c"
          fill={i < count ? '#ffc83c' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )
}

export default function Testimonials() {
  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Testimonials</div>
          <h2>Trusted by Logistics <span className="gradient-text">Leaders</span></h2>
          <p>Teams running at scale tell us what changed after switching to SwiftRoute.</p>
        </div>
      </div>

      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '120px',
          background: 'linear-gradient(to right, var(--color-bg), transparent)',
          zIndex: 10, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '120px',
          background: 'linear-gradient(to left, var(--color-bg), transparent)',
          zIndex: 10, pointerEvents: 'none',
        }} />

        <div className="testimonials-marquee">
          {allTestimonials.map((t, i) => (
            <div key={i} className="testimonial-card">
              <StarRating count={t.rating} />
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="author-avatar" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}>
                  {t.initials}
                </div>
                <div>
                  <div className="author-name">{t.name}</div>
                  <div className="author-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
