import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Package, ArrowRight, CheckCircle, Navigation, Crosshair, Map as MapIcon, CreditCard, Banknote } from 'lucide-react'
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { orderAPI, paymentAPI } from '../../services/api'
import { useToast } from '../../components/ui/Toast'

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

export default function PlaceOrder() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const mapRef = useRef(null)
  
  const [form, setForm] = useState({
    pickupName: '', pickupPhone: '', pickupFlat: '', pickupAddress: '', pickupPincode: '', pickupLandmark: '', pickupLat: '', pickupLng: '',
    dropName: '', dropPhone: '', dropFlat: '', dropAddress: '', dropPincode: '', dropLandmark: '', dropLat: '', dropLng: '',
  })
  
  const [activeLocationType, setActiveLocationType] = useState('pickup') // 'pickup' | 'drop'
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('ONLINE')
  
  // Calculate straight-line distance using Haversine formula
  const distanceKm = useMemo(() => {
    const lat1 = parseFloat(form.pickupLat)
    const lon1 = parseFloat(form.pickupLng)
    const lat2 = parseFloat(form.dropLat)
    const lon2 = parseFloat(form.dropLng)
    
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0
    
    const R = 6371 // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return parseFloat((R * c).toFixed(1))
  }, [form.pickupLat, form.pickupLng, form.dropLat, form.dropLng])

  // Pricing model
  const baseFare = 40
  const distanceFare = Math.round(distanceKm * 15)
  const taxes = distanceKm > 0 ? 10 : 0
  const orderAmount = distanceKm > 0 ? baseFare + distanceFare + taxes : 0
  
  const [userLoc, setUserLoc] = useState(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserLoc({ lat, lng })
        },
        (err) => {
          console.warn("Geolocation blocked or failed", err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [])

  // Auto-fit map when both pins exist
  useEffect(() => {
    if (mapRef.current && form.pickupLat && form.dropLat) {
       // A small delay ensures the map is fully loaded if it was just rendered
       setTimeout(() => {
          try {
             mapRef.current.getMap().fitBounds([
               [Math.min(form.pickupLng, form.dropLng), Math.min(form.pickupLat, form.dropLat)],
               [Math.max(form.pickupLng, form.dropLng), Math.max(form.pickupLat, form.dropLat)]
             ], { padding: 80, duration: 1000 })
          } catch(e) {}
       }, 500)
    }
  }, [form.pickupLat, form.dropLat, form.pickupLng, form.dropLng])

  const handleMapClick = async (e) => {
    const lat = e.lngLat.lat
    const lng = e.lngLat.lng
    const type = activeLocationType
    
    setForm(prev => ({
      ...prev,
      [`${type}Lat`]: lat.toFixed(5),
      [`${type}Lng`]: lng.toFixed(5)
    }))
    
    try {
      const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&location=${lng},${lat}`)
      const data = await res.json()
      if (data && data.address && data.address.LongLabel) {
        setForm(prev => ({
          ...prev,
          [`${type}Address`]: data.address.LongLabel,
          [`${type}Pincode`]: data.address.Postal || prev[`${type}Pincode`]
        }))
      }
    } catch (err) {
      console.warn("Reverse geocode failed", err)
    }
  }

  const geocodeAddress = async (type) => {
    const address = form[`${type}Address`]
    const pincode = form[`${type}Pincode`]
    const landmark = form[`${type}Landmark`]
    
    if (!address || address.trim().length < 3) return
    
    const query = [address, landmark, pincode].filter(Boolean).join(', ')
    
    try {
      const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=pjson&SingleLine=${encodeURIComponent(query)}&maxLocations=1`)
      const data = await res.json()
      if (data && data.candidates && data.candidates.length > 0) {
        const { x, y } = data.candidates[0].location
        setForm(prev => ({
          ...prev,
          [`${type}Lat`]: y.toFixed(5),
          [`${type}Lng`]: x.toFixed(5)
        }))
        mapRef.current?.flyTo({ center: [x, y], zoom: 14, duration: 1500 })
      }
    } catch (err) {
      console.warn("Geocode failed", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.pickupLat || !form.dropLat) {
      toast.error('Location Missing', 'Please make sure to set both Pickup and Drop locations on the map.')
      return
    }

    setLoading(true)
    try {
      const pAddress = `${form.pickupName} (${form.pickupPhone}) | ${form.pickupFlat ? form.pickupFlat + ', ' : ''}${form.pickupAddress}${form.pickupLandmark ? ', Near ' + form.pickupLandmark : ''}${form.pickupPincode ? ' - ' + form.pickupPincode : ''}`
      const dAddress = `${form.dropName} (${form.dropPhone}) | ${form.dropFlat ? form.dropFlat + ', ' : ''}${form.dropAddress}${form.dropLandmark ? ', Near ' + form.dropLandmark : ''}${form.dropPincode ? ' - ' + form.dropPincode : ''}`
      
      const payload = {
        pickupLocation: { address: pAddress, lat: parseFloat(form.pickupLat), lng: parseFloat(form.pickupLng) },
        dropLocation: { address: dAddress, lat: parseFloat(form.dropLat), lng: parseFloat(form.dropLng) },
        paymentMethod,
        amount: orderAmount
      }

      const res = await orderAPI.create(payload, token)
      
      if (res.statusCode !== 201) {
        toast.error('Failed to place order', res.message)
        setLoading(false)
        return
      }

      const internalOrder = res.data

      if (paymentMethod === 'ONLINE') {
        try {
          const rpRes = await paymentAPI.createOrder({ amount: orderAmount }, token)
          if (!rpRes.success) throw new Error('Failed to init payment')
          
          const options = {
            key: rpRes.data.key_id,
            amount: rpRes.data.amount,
            currency: rpRes.data.currency,
            name: "SwiftRoute Logistics",
            description: "Delivery Service Charge",
            order_id: rpRes.data.id,
            handler: async function (response) {
              try {
                const verifyRes = await paymentAPI.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  internal_order_id: internalOrder.id
                }, token)
                
                if (verifyRes.success) {
                  setSuccess(internalOrder)
                  toast.success('Payment Successful!', `Order #${internalOrder.orderNumber} placed.`)
                } else {
                  toast.error('Payment Verification Failed')
                }
              } catch (e) {
                toast.error('Payment Verification Error')
              }
            },
            prefill: { name: form.pickupName, contact: form.pickupPhone },
            theme: { color: "#6366f1" }
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
             toast.error('Payment Failed', response.error.description)
             setLoading(false)
          });
          rzp.open();
        } catch (e) {
          toast.error('Payment Gateway Error', 'Could not open Razorpay.')
          setLoading(false)
        }
      } else {
        setSuccess(internalOrder)
        toast.success('Order Placed!', `Order #${internalOrder.orderNumber} successfully created with COD.`)
        setLoading(false)
      }
      
    } catch {
      toast.error('Server error', 'Please try again later.')
      setLoading(false)
    }
  }

  const fetchCurrentLocationFor = (type) => {
    if (!navigator.geolocation) return toast.error('Error', 'Geolocation is not supported by your browser')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserLoc({ lat, lng })
        
        try {
          const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&location=${lng},${lat}`)
          const data = await res.json()
          setForm(prev => ({
            ...prev,
            [`${type}Lat`]: lat,
            [`${type}Lng`]: lng,
            [`${type}Address`]: data?.address?.LongLabel || '',
            [`${type}Pincode`]: data?.address?.Postal || prev[`${type}Pincode`]
          }))
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 })
          toast.success('Location updated', `Successfully fetched your location for ${type}.`)
        } catch (e) {
          toast.error('Error', 'Failed to get address for your location.')
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        toast.error('Location Error', 'Failed to get your location. Please check permissions.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="dash-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: 420, borderRadius: 24, animation: 'modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div className="success-checkmark">
              <CheckCircle size={36} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Order Placed!
            </h2>
            <p style={{ color: 'rgba(240,240,255,0.5)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              Your order <strong style={{ color: '#6366f1', fontFamily: 'monospace' }}>{success.orderNumber}</strong> has been successfully registered.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1rem', marginBottom: '1.75rem' }}>
              <p style={{ color: 'rgba(240,240,255,0.7)', fontSize: '0.85rem', fontWeight: 500 }}>
                {success.assignedAgentId ? 'An agent has been assigned to your order!' : 'We are currently assigning the best agent for your route.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/dashboard')} className="btn-ghost" style={{ padding: '0.75rem 1.25rem' }}>
                Dashboard
              </button>
              <button onClick={() => navigate(`/dashboard/track?id=${success._id}`)} className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
                Track Order <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const renderFormFields = (type, title, Icon, color) => {
    const isPickup = type === 'pickup'
    const address = form[`${type}Address`]
    const isActive = activeLocationType === type

    return (
      <div 
        onClick={() => setActiveLocationType(type)}
        style={{ 
          padding: '1.5rem', 
          borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
          background: isActive ? 'rgba(255,255,255,0.02)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          borderBottom: '1px solid rgba(255,255,255,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isActive ? '1.5rem' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 32, height: 32, background: `${color}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} color={color} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', margin: 0 }}>{title}</h3>
          </div>
          {isActive && (
            <button type="button" onClick={(e) => { e.stopPropagation(); fetchCurrentLocationFor(type); }} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', gap: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }} disabled={locating}>
              <Crosshair size={12} /> {locating ? 'Locating...' : 'My Location'}
            </button>
          )}
        </div>
        
        {isActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isPickup ? 'Sender Name' : 'Receiver Name'}</label>
                <input className="dash-input" placeholder="e.g. John Doe" value={form[`${type}Name`]} onChange={(e) => setForm({ ...form, [`${type}Name`]: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                <input className="dash-input" placeholder="e.g. 9876543210" type="tel" maxLength={10} value={form[`${type}Phone`]} onChange={(e) => setForm({ ...form, [`${type}Phone`]: e.target.value.replace(/\D/g, '') })} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flat, House no., Building</label>
              <input className="dash-input" placeholder="e.g. Flat 402, A-Wing" value={form[`${type}Flat`]} onChange={(e) => setForm({ ...form, [`${type}Flat`]: e.target.value })} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Area, Street, Sector</label>
              <input 
                className="dash-input" 
                placeholder="Tap map to set location or type here" 
                value={address} 
                onChange={(e) => setForm({ ...form, [`${type}Address`]: e.target.value })} 
                onBlur={() => geocodeAddress(type)}
                required 
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pincode</label>
                <input className="dash-input" placeholder="e.g. 110001" type="number" maxLength={6} value={form[`${type}Pincode`]} onChange={(e) => setForm({ ...form, [`${type}Pincode`]: e.target.value })} onBlur={() => geocodeAddress(type)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nearby Landmark</label>
                <input className="dash-input" placeholder="e.g. Near Metro Station" value={form[`${type}Landmark`]} onChange={(e) => setForm({ ...form, [`${type}Landmark`]: e.target.value })} onBlur={() => geocodeAddress(type)} />
              </div>
            </div>
          </div>
        )}
        
        {/* Condensed preview if not active */}
        {!isActive && address && (
           <div style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.5)', marginTop: '0.25rem', paddingLeft: '2.5rem' }}>
             {address}
           </div>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout title="New Delivery">
      <div className="place-order-layout">
        
        {/* Left Column: Form Sidebar */}
        <div className="place-order-form-container">
          
          <div style={{ padding: '2rem 1.5rem 1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>New Order</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select {activeLocationType} location on the map.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {renderFormFields('pickup', 'Pickup Details', MapPin, '#6366f1')}
            {renderFormFields('drop', 'Drop Details', Package, '#10b981')}

            {/* Order Summary & Payment Section */}
            <div style={{ padding: '1.5rem', marginTop: 'auto', background: 'rgba(0,0,0,0.15)' }}>
              
              {distanceKm > 0 && (
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Order Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>Distance</span>
                    <span>{distanceKm} km</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>Base Fare</span>
                    <span>₹{baseFare}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>Distance Fare</span>
                    <span>₹{distanceFare}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>Taxes & Fees</span>
                    <span>₹{taxes}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <CreditCard size={16} color="var(--text-primary)" />
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Payment Method</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div 
                  onClick={() => setPaymentMethod('ONLINE')}
                  style={{ padding: '0.75rem', borderRadius: 10, border: paymentMethod === 'ONLINE' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)', background: paymentMethod === 'ONLINE' ? 'rgba(99,102,241,0.05)' : 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {paymentMethod === 'ONLINE' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: paymentMethod === 'ONLINE' ? '#6366f1' : 'var(--text-secondary)' }}>Pay Online</div>
                </div>
                <div 
                  onClick={() => setPaymentMethod('COD')}
                  style={{ padding: '0.75rem', borderRadius: 10, border: paymentMethod === 'COD' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)', background: paymentMethod === 'COD' ? 'rgba(16,185,129,0.05)' : 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {paymentMethod === 'COD' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: paymentMethod === 'COD' ? '#10b981' : 'var(--text-secondary)' }}>COD</div>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '1rem', borderRadius: 12, fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 500 }}>Total to Pay</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{orderAmount}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  {loading ? 'Processing...' : 'Place Order'} <ArrowRight size={18} />
                </div>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Full-Bleed Single Map */}
        <div className="place-order-map-container">
          <Map
            ref={mapRef}
            initialViewState={{ longitude: userLoc?.lng || 77.2090, latitude: userLoc?.lat || 28.6139, zoom: 12 }}
            mapStyle={mapStyle}
            style={{ width: '100%', height: '100%' }}
            mapLib={maplibregl}
            onClick={handleMapClick}
            cursor="crosshair"
          >
            <NavigationControl position="bottom-right" />

            {/* Pickup Marker */}
            {form.pickupLat && form.pickupLng && (
              <Marker longitude={parseFloat(form.pickupLng)} latitude={parseFloat(form.pickupLat)} anchor="bottom">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#6366f1', color: '#fff', padding: '6px 12px', borderRadius: 12, fontWeight: 800, fontSize: '0.75rem', boxShadow: '0 4px 16px rgba(99,102,241,0.5)', border: '2px solid white' }}>
                    Pickup
                  </div>
                  <div style={{ width: 2, height: 12, background: '#6366f1' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', border: '2px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
                </div>
              </Marker>
            )}

            {/* Drop Marker */}
            {form.dropLat && form.dropLng && (
              <Marker longitude={parseFloat(form.dropLng)} latitude={parseFloat(form.dropLat)} anchor="bottom">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#10b981', color: '#000', padding: '6px 12px', borderRadius: 12, fontWeight: 800, fontSize: '0.75rem', boxShadow: '0 4px 16px rgba(16,185,129,0.5)', border: '2px solid white' }}>
                    Drop
                  </div>
                  <div style={{ width: 2, height: 12, background: '#10b981' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid white', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
                </div>
              </Marker>
            )}
          </Map>

          {/* Map instructions overlay */}
          <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,10,18,0.85)', backdropFilter: 'blur(8px)', padding: '10px 20px', borderRadius: 999, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Crosshair size={14} color={activeLocationType === 'pickup' ? '#6366f1' : '#10b981'} />
            Click anywhere on the map to set the <strong style={{ color: activeLocationType === 'pickup' ? '#6366f1' : '#10b981', textTransform: 'uppercase' }}>{activeLocationType}</strong> location
          </div>
        </div>
        
      </div>
    </DashboardLayout>
  )
}
