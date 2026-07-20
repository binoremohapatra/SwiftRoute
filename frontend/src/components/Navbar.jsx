import { Zap, ArrowRight, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Navbar({ scrolled }) {
  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Dashboards', href: '#dashboards' },
    { label: 'Tech', href: '#tech' },
    { label: 'Roadmap', href: '#roadmap' },
  ]

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="top">
      <div className="container">
        <div className="navbar-inner">
          <a href="#top" className="navbar-logo">
            <div className="logo-icon">
              <Zap size={18} strokeWidth={2.5} color="#fff" />
            </div>
            SwiftRoute
          </a>
          <ul className="navbar-nav">
            {navLinks.map(link => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
          <div className="navbar-cta">
            <Link to="/login" className="btn-ghost" style={{ fontSize: '13px', padding: '10px 20px' }}>
              <LogIn size={14} />
              Login
            </Link>
            <Link to="/signup" className="btn-primary" style={{ fontSize: '13px', padding: '10px 20px' }}>
              Get Started
              <ArrowRight size={14} />
            </Link>
          </div>
          <button className="hamburger" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </nav>
  )
}
