import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Search, CreditCard } from 'lucide-react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import DashboardLayout from '../../components/DashboardLayout'
import AnimatedVehicleMarker from '../../components/ui/AnimatedVehicleMarker'
import DestinationPin from '../../components/ui/DestinationPin'
import ETABadge from '../../components/ui/ETABadge'
import DeliveryStatusSheet from '../../components/ui/DeliveryStatusSheet'
import OrderTimeline from '../../components/ui/OrderTimeline'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { orderAPI, paymentAPI } from '../../services/api'
import { connectSocket, disconnectSocket, joinOrderRoom, leaveOrderRoom } from '../../services/socket'
import { useToast } from '../../components/ui/Toast'
import RatingModal from '../../components/RatingModal'

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

export default function TrackOrder() {
  const { token } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  
  const [orderId, setOrderId] = useState(params.get('id') || '')
  const [inputId, setInputId] = useState(params.get('id') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  
  const [showRating, setShowRating] = useState(false)

  const fetchTracking = async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const trackRes = await orderAPI.track(id, token)
      if (trackRes.success) {
        setData(trackRes.data)
        if (trackRes.data.status === 'Delivered' && !trackRes.data.rating) {
          setShowRating(true)
        }
        if (trackRes.data.pickup && trackRes.data.drop) {
          fetchRoute(trackRes.data.pickup, trackRes.data.drop)
        }
      } else {
        toast.error('Tracking Failed', trackRes.message)
      }
    } catch {
      toast.error('Connection Error', 'Failed to fetch tracking data')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoute = async (pickup, drop) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`)
      if (!res.ok) throw new Error('OSRM API Error')
      const json = await res.json()
      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0]
        
        // Add exact pickup and drop coordinates to connect the road route to the exact pins
        if (route.geometry && route.geometry.coordinates) {
          route.geometry.coordinates.unshift([pickup.lng, pickup.lat])
          route.geometry.coordinates.push([drop.lng, drop.lat])
        }

        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.ceil(route.duration / 60)
        })
        setRouteGeoJSON({ type: 'Feature', geometry: route.geometry })
      } else {
        throw new Error('No route found')
      }
    } catch (e) {
      console.warn("OSRM routing failed", e)
      setRouteGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[pickup.lng, pickup.lat], [drop.lng, drop.lat]] } })
    }
  }

  useEffect(() => {
    if (orderId) fetchTracking(orderId)
  }, [orderId])

  useEffect(() => {
    if (!orderId || !token) return
    const socket = connectSocket(token)
    joinOrderRoom(orderId)

    socket.on('agent:locationUpdate', (update) => {
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          agentLocation: { lat: update.lat, lng: update.lng, updatedAt: update.timestamp },
        }
      })
    })

    socket.on('order:statusChanged', ({ status }) => {
      setData(prev => {
        if (!prev) return prev
        if (status === 'Delivered' && !prev.rating) {
          setShowRating(true)
        }
        return { ...prev, status }
      })
      fetchTracking(orderId)
      toast.info('Status Updated', `Order is now ${status}`)
    })

    return () => {
      socket.off('agent:locationUpdate')
      socket.off('order:statusChanged')
      leaveOrderRoom(orderId)
    }
  }, [orderId, token, toast])

  const initialViewState = useMemo(() => {
    if (data?.pickup) {
      return { longitude: data.pickup.lng, latitude: data.pickup.lat, zoom: 12 }
    }
    return { longitude: 77.2090, latitude: 28.6139, zoom: 10 } // Delhi fallback
  }, [data?.pickup])

  const handleRateSubmit = async (orderId, rating, review) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, review })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Rating submitted successfully')
        setData(prev => ({ ...prev, rating }))
        setShowRating(false)
      } else {
        toast.error(json.message || 'Failed to submit rating')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setShowRating(false)
    }
  }

  const handleRetryPayment = async () => {
    try {
      setLoading(true);
      const paymentAmount = Math.max(data.amount || 0, 1); // Razorpay requires at least ₹1
      const rpRes = await paymentAPI.createOrder({ amount: paymentAmount }, token);
      if (!rpRes.success) throw new Error('Failed to init payment');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TFfm2nIhhR1QeB',
        amount: rpRes.data.amount,
        currency: 'INR',
        name: 'SwiftRoute',
        description: `Payment for Order ${data.orderNumber}`,
        order_id: rpRes.data.id,
        handler: async function (response) {
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              internal_order_id: orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }, token);
            if (verifyRes.success) {
              toast.success('Payment Successful!');
              fetchTracking(orderId);
            } else {
              toast.error('Payment Verification Failed');
            }
          } catch (e) {
            toast.error('Payment Verification Error');
          }
        },
        theme: { color: '#00d4ff' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
         toast.error('Payment Failed', response.error.description);
      });
      rzp.open();
    } catch (e) {
      toast.error('Payment Gateway Error');
    } finally {
      setLoading(false);
    }
  };

  const { activeRouteGeoJSON, activeETA } = useMemo(() => {
    let remainingMins = routeInfo?.duration ?? '--';
    if (!routeGeoJSON || !routeGeoJSON.geometry || !routeGeoJSON.geometry.coordinates) {
      return { activeRouteGeoJSON: routeGeoJSON, activeETA: remainingMins };
    }
    const coords = routeGeoJSON.geometry.coordinates;
    const agentLoc = data?.agentLocation;

    // If no agent location or order is not In-Transit yet, show full route
    if (!agentLoc || !agentLoc.lat || !agentLoc.lng || data?.status !== 'In-Transit') {
      return { activeRouteGeoJSON: routeGeoJSON, activeETA: remainingMins }; 
    }

    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < coords.length; i++) {
      const dist = Math.pow(coords[i][0] - agentLoc.lng, 2) + Math.pow(coords[i][1] - agentLoc.lat, 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const remainingCoords = coords.slice(closestIndex);
    // Insert exact agent location at the beginning to connect cleanly
    remainingCoords.unshift([agentLoc.lng, agentLoc.lat]);
    
    if (routeInfo?.duration && coords.length > 0) {
      // Estimate remaining time based on remaining path points
      const newMins = Math.ceil((remainingCoords.length / coords.length) * routeInfo.duration);
      remainingMins = Math.max(1, newMins); // at least 1 min if still in transit
    }

    return { 
      activeRouteGeoJSON: { type: 'Feature', geometry: { type: 'LineString', coordinates: remainingCoords } },
      activeETA: remainingMins
    };
  }, [routeGeoJSON, data?.agentLocation?.lat, data?.agentLocation?.lng, data?.status, routeInfo]);

  return (
    <DashboardLayout>
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Live Tracking</h2>
            <p className="dash-page-sub">Monitor your delivery in real-time via OpenStreetMap</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 20, marginBottom: '1.5rem', maxWidth: 500 }}>
          <form style={{ display: 'flex', gap: '0.75rem' }} onSubmit={(e) => { e.preventDefault(); setOrderId(inputId) }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.3)' }} />
              <input
                className="dash-input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Enter Order ID to track..."
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                required
              />
            </div>
            <button className="btn-primary" type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: 12, height: '100%' }}>
              Track
            </button>
          </form>
        </div>

        {loading && (
          <div className="dash-loading">
            <span className="dash-loading-spinner" /> Fetching live data...
          </div>
        )}

        {data && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Map Area */}
            <div className="glass-card" style={{ padding: 0, width: '100%', height: 480, borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <StatusBadge status={data.status} size="lg" />
              </div>
              <Map
                initialViewState={initialViewState}
                mapStyle={mapStyle}
                style={{ width: '100%', height: '100%' }}
                mapLib={maplibregl}
              >
                {data.pickup && (
                  <Marker longitude={data.pickup.lng} latitude={data.pickup.lat} anchor="bottom">
                    <div style={{ background: '#a78bfa', color: '#fff', padding: '4px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>Pickup</div>
                  </Marker>
                )}
                {data.drop && (
                  <Marker longitude={data.drop.lng} latitude={data.drop.lat} anchor="bottom">
                    <DestinationPin />
                  </Marker>
                )}
                {(data.agentLocation?.lat ? data.agentLocation : (data.pickup?.lat ? data.pickup : null)) && (
                  <>
                    <AnimatedVehicleMarker
                      position={{ 
                        lat: data.agentLocation?.lat || data.pickup?.lat, 
                        lng: data.agentLocation?.lng || data.pickup?.lng 
                      }}
                      vehicleType={data.agent?.vehicleType}
                      glideDuration={3000}
                    />
                    <Marker longitude={data.agentLocation?.lng || data.pickup?.lng} latitude={data.agentLocation?.lat || data.pickup?.lat} anchor="left" offset={[28, -10]}>
                      <ETABadge minutes={activeETA} />
                    </Marker>
                  </>
                )}

                {activeRouteGeoJSON && (
                  <Source id="route" type="geojson" data={activeRouteGeoJSON}>
                    <Layer
                      id="route-layer"
                      type="line"
                      layout={{
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                      paint={{
                        'line-color': '#00d4ff',
                        'line-width': 5,
                        'line-opacity': 0.8
                      }}
                    />
                  </Source>
                )}
              </Map>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Timeline */}
              <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Delivery Progress</h3>
                <OrderTimeline status={data.status} timestamps={{ Placed: data.createdAt, 'Delivered': data.updatedAt }} />
              </div>

              {/* Order Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Order Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <InfoRow label="Order ID" value={data.orderNumber} accent />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.4)', fontWeight: 600 }}>Payment</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>₹{data.amount}</span>
                         {data.paymentStatus === 'PAID' ? (
                           <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>PAID</span>
                         ) : data.paymentMethod === 'COD' ? (
                           <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>COD PENDING</span>
                         ) : (
                           <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>FAILED</span>
                         )}
                      </div>
                    </div>
                    {data.fulfillmentType === '3PL' && (
                      <>
                        <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <InfoRow label="Fulfillment" value="Third-Party Logistics (3PL)" />
                          <InfoRow label="Courier" value={data.thirdPartyCourier || 'N/A'} />
                          <InfoRow label="Tracking ID" value={data.thirdPartyTrackingId || 'N/A'} />
                        </div>
                      </>
                    )}
                    <InfoRow label="Pickup" value={data.pickup?.address || 'N/A'} />
                    <InfoRow label="Drop" value={data.drop?.address || 'N/A'} />
                    {routeInfo && data.fulfillmentType !== '3PL' && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <InfoRow label="Total Distance" value={`${routeInfo.distance} km`} />
                        <InfoRow label="Est. Travel Time" value={`${routeInfo.duration} mins`} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent Info */}
                {data.agent && (
                  <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Delivery Agent</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #00d4ff, #0077ff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#fff', boxShadow: '0 8px 24px rgba(0,212,255,0.3)' }}>
                        {data.agent.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 2 }}>{data.agent.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.5)' }}>{data.agent.vehicleType} • {data.agent.phone}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Card */}
                {data.paymentStatus !== 'PAID' && (
                  <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24, border: '1px solid rgba(0, 212, 255, 0.2)', background: 'linear-gradient(180deg, rgba(20,20,30,0.8) 0%, rgba(0, 212, 255, 0.05) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{ padding: '8px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '50%' }}>
                        <CreditCard size={20} color="#00d4ff" />
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Complete Payment</h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.6)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      You can securely pay via UPI, Credit/Debit Cards, or Netbanking.
                    </p>
                    <button onClick={handleRetryPayment} className="btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: 16, fontSize: '1rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                      Pay ₹{data.amount} Now
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Delivery Status Sheet */}
            <DeliveryStatusSheet
              status={data.status}
              agent={data.agent}
              onCall={() => window.location.href = `tel:${data.agent?.phone}`}
              delayNote={data.status === 'In-Transit' ? 'Expecting a slight delay due to traffic' : null}
            />
          </div>
        )}
      </div>

      <RatingModal 
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        orderId={data?.orderId}
        onSubmit={handleRateSubmit}
      />
    </DashboardLayout>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
      <span style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.4)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: accent ? 700 : 500, color: accent ? '#00d4ff' : 'var(--text-primary)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}
