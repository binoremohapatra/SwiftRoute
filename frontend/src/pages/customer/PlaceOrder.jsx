import { useState, useEffect, useRef } from 'react'
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
  
  const [form, setForm] = useState({
    pickupName: '', pickupPhone: '', pickupFlat: '', pickupAddress: '', pickupPincode: '', pickupLandmark: '', pickupLat: '', pickupLng: '',
    dropName: '', dropPhone: '', dropFlat: '', dropAddress: '', dropPincode: '', dropLandmark: '', dropLat: '', dropLng: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('ONLINE')
  // We'll hardcode an amount for demo purposes based on distance, but here just a fixed 150
  const orderAmount = 150
  
  const [userLoc, setUserLoc] = useState(null)
  const [locating, setLocating] = useState(false)
  const [activeMapZoom, setActiveMapZoom] = useState(null)
  
  const pickupMapRef = useRef(null)
  const dropMapRef = useRef(null)

  // Try to get user's location automatically on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserLoc({ lat, lng })
          
          // Optionally reverse geocode to get the address for pickup automatically
          try {
            const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&location=${lng},${lat}`)
            const data = await res.json()
            if (data && data.address && data.address.LongLabel) {
              setForm(prev => ({
                ...prev,
                pickupLat: lat,
                pickupLng: lng,
                pickupAddress: data.address.LongLabel,
                pickupPincode: data.address.Postal || prev.pickupPincode
              }))
              toast.info('Location Found', 'We automatically set your pickup location.')
              pickupMapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 })
            }
          } catch (e) {
            console.error("Reverse geocode failed", e)
          }
        },
        (err) => {
          console.warn("Geolocation blocked or failed", err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [toast])

  const handleMapClick = async (type, e) => {
    const lat = e.lngLat.lat
    const lng = e.lngLat.lng
    
    // Update coordinates immediately
    setForm(prev => ({
      ...prev,
      [`${type}Lat`]: lat.toFixed(5),
      [`${type}Lng`]: lng.toFixed(5)
    }))
    
    // Reverse geocode
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
        const mapRef = type === 'pickup' ? pickupMapRef : dropMapRef
        mapRef.current?.flyTo({ center: [x, y], zoom: 14, duration: 1500 })
      }
    } catch (err) {
      console.warn("Geocode failed", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.pickupLat || !form.dropLat) {
      toast.error('Location Missing', 'Please make sure to set the exact pin on the map for both Pickup and Drop, or wait for automatic location search.')
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

      // Step 1: Create internal order
      const res = await orderAPI.create(payload, token)
      
      if (res.statusCode !== 201) {
        toast.error('Failed to place order', res.message)
        setLoading(false)
        return
      }

      const internalOrder = res.data

      // Step 2: Handle Payment
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
              // Verify Payment
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
        // COD - Complete immediately
        setSuccess(internalOrder)
        toast.success('Order Placed!', `Order #${internalOrder.orderNumber} successfully created with COD.`)
        setLoading(false)
      }
      
    } catch {
      toast.error('Server error', 'Please try again later.')
      setLoading(false)
    }
  }

  const useDemoLocation = (type) => {
    if (type === 'pickup') {
      setForm(prev => ({ ...prev, pickupName: 'Rahul Kumar', pickupPhone: '9876543210', pickupFlat: 'A-42', pickupAddress: 'Connaught Place', pickupPincode: '110001', pickupLandmark: 'Rajiv Chowk Metro', pickupLat: '28.6304', pickupLng: '77.2177' }))
      pickupMapRef.current?.flyTo({ center: [77.2177, 28.6304], zoom: 14, duration: 1500 })
    } else {
      setForm(prev => ({ ...prev, dropName: 'Vikram Singh', dropPhone: '9123456780', dropFlat: 'Tower 4, 12th Floor', dropAddress: 'Cyber Hub', dropPincode: '122002', dropLandmark: 'DLF Phase 2', dropLat: '28.4950', dropLng: '77.0895' }))
      dropMapRef.current?.flyTo({ center: [77.0895, 28.4950], zoom: 14, duration: 1500 })
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
          const mapRef = type === 'pickup' ? pickupMapRef : dropMapRef
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 })
          toast.success('Location updated', `Successfully fetched your location for ${type}.`)
        } catch (e) {
          toast.error('Error', 'Failed to get address for your location.')
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        let msg = 'Failed to get your location.'
        if (err.code === 1) msg = 'Location permission denied. Please allow it in your browser settings (the lock icon near the URL bar).'
        else if (err.code === 2) msg = 'Location unavailable. Please make sure your device location/GPS is turned on.'
        else if (err.code === 3) msg = 'Location request timed out.'
        
        toast.error('Location Error', msg)
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
              <CheckCircle size={36} color="#34d399" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Order Placed!
            </h2>
            <p style={{ color: 'rgba(245,245,247,0.5)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              Your order <strong style={{ color: '#6366f1', fontFamily: 'monospace' }}>{success.orderNumber}</strong> has been successfully registered.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1rem', marginBottom: '1.75rem' }}>
              <p style={{ color: 'rgba(245,245,247,0.7)', fontSize: '0.85rem', fontWeight: 500 }}>
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

  // Helper to render map block
  const renderLocationBlock = (type, title, Icon, color) => {
    const isPickup = type === 'pickup'
    const lat = form[`${type}Lat`]
    const lng = form[`${type}Lng`]
    const address = form[`${type}Address`]
    
    // Default to New Delhi or user's location if fields are empty
    const mapLat = parseFloat(lat) || userLoc?.lat || 28.6139
    const mapLng = parseFloat(lng) || userLoc?.lng || 77.2090

    return (
      <div className="glass-card stagger-list" style={{ padding: '1.75rem', borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 40, height: 40, background: `${color}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(245,245,247,0.4)', margin: '2px 0 0 0' }}>Enter text or tap on the map to set location</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => fetchCurrentLocationFor(type)} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', gap: 6, borderRadius: 8 }} disabled={locating}>
              <Crosshair size={12} /> {locating ? 'Locating...' : 'Use My Location'}
            </button>
            <button type="button" onClick={() => useDemoLocation(type)} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', gap: 6, borderRadius: 8 }}>
              <Navigation size={12} /> Demo
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Map Area */}
          <div 
            style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}
            onMouseDownCapture={() => setActiveMapZoom(type)}
            onMouseLeave={() => setActiveMapZoom(null)}
          >
            <Map
              ref={isPickup ? pickupMapRef : dropMapRef}
              initialViewState={{ longitude: mapLng, latitude: mapLat, zoom: 13 }}
              mapStyle={mapStyle}
              style={{ width: '100%', height: '100%' }}
              mapLib={maplibregl}
              onClick={(e) => handleMapClick(type, e)}
              scrollZoom={activeMapZoom === type}
            >
              <NavigationControl position="bottom-right" />
              {lat && lng && (
                <Marker longitude={parseFloat(lng)} latitude={parseFloat(lat)} anchor="bottom">
                  <div style={{ background: color, color: '#0a0a12', padding: '4px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12, border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapIcon size={12} /> {isPickup ? 'Pickup' : 'Drop'}
                  </div>
                </Marker>
              )}
            </Map>
            {!activeMapZoom && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(10,10,18,0.8)', backdropFilter: 'blur(4px)', padding: '6px 10px', borderRadius: 6, fontSize: '0.7rem', color: 'rgba(245,245,247,0.8)', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                Click map to unlock scroll zoom
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(10,10,18,0.7)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', color: 'rgba(245,245,247,0.6)', pointerEvents: 'none' }}>
              Click anywhere on the map to place the pin
            </div>
          </div>

          {/* Contact Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.4)', marginBottom: '0.4rem' }}>{isPickup ? 'Sender Name' : 'Receiver Name'}</label>
              <input className="dash-input" placeholder="e.g. John Doe" value={form[`${type}Name`]} onChange={(e) => setForm({ ...form, [`${type}Name`]: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.4)', marginBottom: '0.4rem' }}>Phone Number</label>
              <input className="dash-input" placeholder="e.g. 9876543210" type="tel" maxLength={10} value={form[`${type}Phone`]} onChange={(e) => setForm({ ...form, [`${type}Phone`]: e.target.value.replace(/\D/g, '') })} required />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.4)', marginBottom: '0.4rem' }}>Flat, House no., Building, Company, Apartment</label>
            <input className="dash-input" placeholder="e.g. Flat 402, A-Wing" value={form[`${type}Flat`]} onChange={(e) => setForm({ ...form, [`${type}Flat`]: e.target.value })} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.4)', marginBottom: '0.4rem' }}>Area, Street, Sector, Village</label>
            <input 
              className="dash-input" 
              placeholder="e.g. 123 Main St, New Delhi" 
              value={address} 
              onChange={(e) => setForm({ ...form, [`${type}Address`]: e.target.value })} 
              onBlur={() => geocodeAddress(type)}
              required 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.4)', marginBottom: '0.4rem' }}>Pincode</label>
              <input className="dash-input" placeholder="e.g. 110001" type="number" maxLength={6} value={form[`${type}Pincode`]} onChange={(e) => setForm({ ...form, [`${type}Pincode`]: e.target.value })} onBlur={() => geocodeAddress(type)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.4)', marginBottom: '0.4rem' }}>Nearby Landmark</label>
              <input className="dash-input" placeholder="e.g. Near Metro Station" value={form[`${type}Landmark`]} onChange={(e) => setForm({ ...form, [`${type}Landmark`]: e.target.value })} onBlur={() => geocodeAddress(type)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Place New Order</h2>
            <p className="dash-page-sub">Select pickup and delivery locations from the map or enter them manually.</p>
          </div>
        </div>

        <div style={{ maxWidth: 800 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {renderLocationBlock('pickup', 'Pickup Location', MapPin, '#6366f1')}
            {renderLocationBlock('drop', 'Drop Location', Package, '#34d399')}

            {/* Payment Section */}
            <div className="glass-card stagger-list" style={{ padding: '1.75rem', borderRadius: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Payment Method</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div 
                  onClick={() => setPaymentMethod('ONLINE')}
                  style={{ padding: '1.25rem', borderRadius: 16, border: paymentMethod === 'ONLINE' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', background: paymentMethod === 'ONLINE' ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                >
                  <CreditCard size={24} color={paymentMethod === 'ONLINE' ? '#6366f1' : 'rgba(245,245,247,0.5)'} />
                  <span style={{ fontWeight: 600, color: paymentMethod === 'ONLINE' ? '#6366f1' : 'rgba(245,245,247,0.7)' }}>Pay Online</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,247,0.4)' }}>Cards, UPI, Netbanking</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('COD')}
                  style={{ padding: '1.25rem', borderRadius: 16, border: paymentMethod === 'COD' ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.1)', background: paymentMethod === 'COD' ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                >
                  <Banknote size={24} color={paymentMethod === 'COD' ? '#34d399' : 'rgba(245,245,247,0.5)'} />
                  <span style={{ fontWeight: 600, color: paymentMethod === 'COD' ? '#34d399' : 'rgba(245,245,247,0.7)' }}>Cash on Delivery</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,247,0.4)' }}>Pay when delivered</span>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(245,245,247,0.7)', fontWeight: 500 }}>Total Amount to Pay</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{orderAmount}</span>
              </div>
            </div>

            <button type="submit" className="btn-primary btn-glow stagger-list" disabled={loading} style={{ alignSelf: 'flex-start', padding: '0.875rem 2.5rem', borderRadius: 14, fontSize: '1rem' }}>
              {loading
                ? <><span className="dash-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Processing...</>
                : <><Package size={18} /> Place Order</>
              }
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
