import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './components.css'

// Landing
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProblemSolution from './components/ProblemSolution'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Dashboards from './components/Dashboards'
import KpiStrip from './components/KpiStrip'
import OrderTimeline from './components/OrderTimeline'
import TechStack from './components/TechStack'
import Testimonials from './components/Testimonials'
import Roadmap from './components/Roadmap'
import FooterCta from './components/FooterCta'

// Auth
import Login from './components/Login'
import Signup from './components/Signup'
import ProtectedRoute from './components/ProtectedRoute'
import Profile from './pages/Profile'

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard'
import MyOrders from './pages/customer/MyOrders'
import PlaceOrder from './pages/customer/PlaceOrder'
import TrackOrder from './pages/customer/TrackOrder'
import Notifications from './pages/customer/Notifications'

// Agent Pages
import AgentDashboard from './pages/agent/AgentDashboard'
import AgentDeliveries from './pages/agent/AgentDeliveries'
import AgentPerformance from './pages/agent/AgentPerformance'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAssign from './pages/admin/AdminAssign'
import AdminLiveTracking from './pages/admin/AdminLiveTracking'
import AdminAnalytics from './pages/admin/AdminAnalytics'

// Auth Context
import { AuthProvider } from './context/AuthContext'
import useFCM from './hooks/useFCM'
import { ToastProvider } from './components/ui/Toast'

function Landing({ scrolled }) {
  return (
    <div className="app">
      {/* Background elements */}
      <div className="noise-overlay" />

      <Navbar scrolled={scrolled} />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <OrderTimeline />
        <Testimonials />
        <FooterCta />
      </main>
    </div>
  )
}



function AppContent({ scrolled }) {
  useFCM(); // Initialize Firebase Cloud Messaging

  return (
    <>
      {/* Global Custom Cursor */}
      <div className="cursor-dot" id="cursor-dot" />
      <div className="cursor-ring" id="cursor-ring" />

      <Routes>
        {/* Landing */}
        <Route path="/" element={<Landing scrolled={scrolled} />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Customer Routes */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/orders" element={<ProtectedRoute allowedRoles={['customer']}><MyOrders /></ProtectedRoute>} />
        <Route path="/dashboard/orders/new" element={<ProtectedRoute allowedRoles={['customer']}><PlaceOrder /></ProtectedRoute>} />
        <Route path="/dashboard/track" element={<ProtectedRoute allowedRoles={['customer']}><TrackOrder /></ProtectedRoute>} />
        <Route path="/dashboard/notifications" element={<ProtectedRoute allowedRoles={['customer', 'agent']}><Notifications /></ProtectedRoute>} />

        {/* Agent Routes */}
        <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent']}><AgentDashboard /></ProtectedRoute>} />
        <Route path="/agent/deliveries" element={<ProtectedRoute allowedRoles={['agent']}><AgentDeliveries /></ProtectedRoute>} />
        <Route path="/agent/performance" element={<ProtectedRoute allowedRoles={['agent']}><AgentPerformance /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/tracking" element={<ProtectedRoute allowedRoles={['admin']}><AdminLiveTracking /></ProtectedRoute>} />
        <Route path="/admin/assign" element={<ProtectedRoute allowedRoles={['admin']}><AdminAssign /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />

        {/* Common Shared Routes */}
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'agent', 'customer']}><Profile /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function App() {
  const cursorDotRef = useRef(null)
  const cursorRingRef = useRef(null)
  const mousePos = useRef({ x: 0, y: 0 })
  const ringPos = useRef({ x: 0, y: 0 })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Custom cursor
    const onMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
      const dot = document.getElementById('cursor-dot')
      if (dot) {
        dot.style.left = e.clientX + 'px'
        dot.style.top = e.clientY + 'px'
      }
    }

    const animateRing = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12
      const ring = document.getElementById('cursor-ring')
      if (ring) {
        ring.style.left = ringPos.current.x + 'px'
        ring.style.top = ringPos.current.y + 'px'
      }
      requestAnimationFrame(animateRing)
    }
    animateRing()

    const onMouseEnter = () => {
      const ring = document.getElementById('cursor-ring')
      if (ring) ring.classList.add('hovering')
    }
    const onMouseLeave = () => {
      const ring = document.getElementById('cursor-ring')
      if (ring) ring.classList.remove('hovering')
    }

    const interactables = document.querySelectorAll('a, button, .glass-card, .feature-card, .tech-card')
    interactables.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter)
      el.addEventListener('mouseleave', onMouseLeave)
    })

    window.addEventListener('mousemove', onMouseMove)

    // Scroll detection
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll)

    // Lenis smooth scroll
    let lenis
    const initLenis = async () => {
      try {
        const { default: Lenis } = await import('lenis')
        lenis = new Lenis({
          lerp: 0.08,
          smoothWheel: true,
        })
        const raf = (time) => {
          lenis.raf(time)
          requestAnimationFrame(raf)
        }
        requestAnimationFrame(raf)
      } catch (e) {
        console.warn('Lenis not available, using native scroll')
      }
    }
    initLenis()

    // Scroll-triggered reveal
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('revealed')
            }, i * 80)
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el))
    }, 100)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      interactables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter)
        el.removeEventListener('mouseleave', onMouseLeave)
      })
      if (lenis) lenis.destroy()
    }
  }, [])

  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent scrolled={scrolled} />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App

