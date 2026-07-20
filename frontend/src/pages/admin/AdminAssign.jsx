import { useState, useEffect } from 'react'
import { Package, Truck, Navigation, Bike, Zap } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { adminAPI, orderAPI } from '../../services/api'

export default function AdminAssign() {
  const { token } = useAuth()
  const toast = useToast()
  
  const [orders, setOrders] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    Promise.all([adminAPI.getOrders(token, { limit: 200 }), adminAPI.getAgents(token, { limit: 100 })]).then(([oRes, aRes]) => {
      if (oRes.success) setOrders((oRes.data.data || []).filter(o => ['Placed', 'Assigned', 'Picked-up', 'In-Transit'].includes(o.status)))
      if (aRes.success) setAgents((aRes.data.data || []).filter(a => a.isAvailable))
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load assignment data')
      setLoading(false)
    })
  }, [token, toast])

  const handleAssign = async () => {
    if (!selectedOrder || !selectedAgent) return
    setAssigning(true)
    try {
      const res = await adminAPI.assignOrder({ orderId: selectedOrder, agentId: selectedAgent }, token)
      if (res.success) {
        if (selectedOrderObj?.status !== 'Placed') {
          // If reassigned, just remove or keep it in the list (but we should probably clear selection to let them pick another)
          setOrders(prev => prev.map(o => o.id === selectedOrder ? { ...o, status: 'Assigned', assignedAgentId: selectedAgent } : o))
        } else {
          setOrders((prev) => prev.filter(o => o.id !== selectedOrder))
        }
        setSelectedOrder('')
        setSelectedAgent('')
        toast.success(selectedOrderObj?.status !== 'Placed' ? 'Reassignment Successful' : 'Assignment Successful', res.message)
      } else {
        toast.error('Action Failed', res.message)
      }
    } catch {
      toast.error('Connection Error', 'Could not assign order')
    }
  }

  const handleSmartAssign = async () => {
    if (!selectedOrder) {
      toast.error('Validation Error', 'Please select an order first')
      return;
    }
    setAssigning(true)
    try {
      const res = await adminAPI.smartAssign(selectedOrder, token)
      if (res.success) {
        if (selectedOrderObj?.status !== 'Placed') {
          setOrders(prev => prev.map(o => o.id === selectedOrder ? { ...o, status: 'Assigned', assignedAgentId: res.data.assignedAgentId } : o))
        } else {
          setOrders((prev) => prev.filter(o => o.id !== selectedOrder))
        }
        setSelectedOrder('')
        setSelectedAgent('')
        toast.success('Smart Assignment Successful', res.message)
      } else {
        toast.error('Action Failed', res.message)
      }
    } catch {
      toast.error('Connection Error', 'Could not smart assign order')
    }
    setAssigning(false)
  }

  const handleAssign3PL = async () => {
    if (!selectedOrder) {
      toast.error('Validation Error', 'Please select an order first')
      return;
    }
    setAssigning(true)
    try {
      const res = await orderAPI.assign3PL(selectedOrder, token)
      if (res.success) {
        setOrders((prev) => prev.filter(o => o.id !== selectedOrder))
        setSelectedOrder('')
        setSelectedAgent('')
        toast.success('3PL Assignment Successful', `Assigned to ${res.data.thirdPartyCourier}`)
      } else {
        toast.error('Action Failed', res.message)
      }
    } catch {
      toast.error('Connection Error', 'Could not assign to 3PL')
    }
    setAssigning(false)
  }

  const selectedOrderObj = orders.find(o => o.id === selectedOrder)
  const selectedAgentObj = agents.find(a => a.id === selectedAgent)

  return (
    <DashboardLayout role="admin">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Manual Assignment & Reassignment</h2>
            <p className="dash-page-sub">Assign pending orders or reassign active deliveries</p>
          </div>
        </div>

        <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <SkeletonCard lines={6} />
          ) : (
            <div className="glass-card stagger-list" style={{ padding: '2rem', borderRadius: 24, animation: 'staggerUp 0.3s both' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Order Selection */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={14} color="#6366f1" /> 
                    </div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      1. Select Pending or Active Order
                    </h3>
                  </div>
                  
                  {orders.length === 0 ? (
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 16, fontSize: '0.875rem', color: 'rgba(240,240,255,0.5)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      No active or unassigned orders available at the moment.
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <select 
                        className="dash-input" 
                        value={selectedOrder} 
                        onChange={(e) => setSelectedOrder(e.target.value)}
                        style={{ width: '100%', padding: '1rem', fontSize: '0.95rem' }}
                      >
                        <option value="" style={{ background: '#0a0a12' }}>-- Choose an order --</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.id} style={{ background: '#0a0a12' }}>
                            {o.orderNumber} — {o.customer?.name || 'Unknown'} ({o.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Order Preview */}
                  {selectedOrderObj && (
                    <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.3s' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <Navigation size={14} color="rgba(240,240,255,0.4)" style={{ marginTop: 2 }} />
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.75rem', marginBottom: 2 }}>Pickup</div>
                          <div style={{ color: 'var(--text-primary)' }}>{selectedOrderObj.pickupAddress}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <Navigation size={14} color="rgba(240,240,255,0.4)" style={{ marginTop: 2 }} />
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.75rem', marginBottom: 2 }}>Drop</div>
                          <div style={{ color: 'var(--text-primary)' }}>{selectedOrderObj.dropAddress}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Selection */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bike size={14} color="#8b5cf6" /> 
                    </div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      2. Select Available Agent
                    </h3>
                  </div>

                  {agents.length === 0 ? (
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 16, fontSize: '0.875rem', color: 'rgba(240,240,255,0.5)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      No available agents online right now.
                    </div>
                  ) : (
                    <select 
                      className="dash-input" 
                      value={selectedAgent} 
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      style={{ width: '100%', padding: '1rem', fontSize: '0.95rem' }}
                    >
                      <option value="" style={{ background: '#0a0a12' }}>-- Choose an agent --</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id} style={{ background: '#0a0a12' }}>
                          {a.name} — {a.vehicleType} (★ {a.rating || 'N/A'})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Agent Preview */}
                  {selectedAgentObj && (
                    <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(167,139,250,0.05)', borderRadius: 16, border: '1px solid rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'fadeIn 0.3s' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface)' }}>
                        {selectedAgentObj.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedAgentObj.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.5)' }}>{selectedAgentObj.phone} • {selectedAgentObj.vehicleType}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '1rem' }}>
                  <button 
                    className={`btn-primary ${selectedOrder && selectedAgent ? 'btn-glow' : ''}`}
                    onClick={handleAssign} 
                    disabled={!selectedOrder || !selectedAgent || assigning}
                    style={{ 
                      flex: 1, 
                      padding: '1rem', 
                      fontSize: '1rem', 
                      borderRadius: 14,
                      justifyContent: 'center',
                      opacity: (!selectedOrder || !selectedAgent || assigning) ? 0.4 : 1 
                    }}
                  >
                    {assigning ? (
                      <><span className="dash-loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {selectedOrderObj?.status !== 'Placed' ? 'Reassigning...' : 'Dispatching...'} </>
                    ) : (
                      <><Truck size={18} /> {selectedOrderObj?.status !== 'Placed' ? 'Manual Reassign' : 'Manual Assign'}</>
                    )}
                  </button>

                  <button 
                    className="btn-primary"
                    onClick={handleAssign3PL} 
                    disabled={!selectedOrder || assigning}
                    style={{ 
                      flex: 1, 
                      padding: '1rem', 
                      fontSize: '1rem', 
                      borderRadius: 14,
                      justifyContent: 'center',
                      background: 'var(--color-surface)',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                      opacity: (!selectedOrder || assigning) ? 0.4 : 1 
                    }}
                  >
                    <Package size={18} /> Assign to 3PL
                  </button>
                </div>
                
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
