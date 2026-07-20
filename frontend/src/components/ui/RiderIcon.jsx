import React from 'react'

function BikeTopDown() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.4))' }}>
      {/* Front Tire */}
      <rect x="18" y="2" width="4" height="8" rx="2" fill="#1a1a1a" />
      {/* Back Tire */}
      <rect x="18" y="30" width="4" height="8" rx="2" fill="#1a1a1a" />
      
      {/* Handlebars */}
      <path d="M12 12 Q20 10 28 12" stroke="#2b2b2b" strokeWidth="3" strokeLinecap="round" />
      
      {/* Delivery Bag (Red) */}
      <rect x="11" y="24" width="18" height="12" rx="2" fill="#e23744" />
      {/* Bag details */}
      <path d="M13 26 L27 26 M15 28 L25 28" stroke="#fff" strokeWidth="1" opacity="0.4" />

      {/* Main Body/Gas Tank */}
      <rect x="16" y="8" width="8" height="16" rx="4" fill="#fc8019" />
      
      {/* RIDER (User baitha hua dikhna chahiye!) */}
      {/* Shoulders & Arms */}
      <path d="M14 15 Q20 12 26 15" stroke="#2b2b2b" strokeWidth="5" strokeLinecap="round" />
      {/* Helmet (Big, clear, bright color) */}
      <circle cx="20" cy="15" r="5" fill="#facc15" />
      {/* Helmet Visor (Looking forward) */}
      <path d="M16 13 Q20 10 24 13" stroke="#1a1a1a" strokeWidth="2.5" fill="none" />
    </svg>
  )
}

function ScootyTopDown() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.4))' }}>
      {/* Front Panel/Headlight */}
      <path d="M14 8 Q20 4 26 8 L27 12 L13 12 Z" fill="#6366f1" />
      
      {/* Handlebars */}
      <path d="M10 12 Q20 10 30 12" stroke="#2b2b2b" strokeWidth="3" strokeLinecap="round" />
      
      {/* Floorboard/Body */}
      <rect x="13" y="12" width="14" height="18" rx="2" fill="#333" />
      
      {/* Delivery Bag (Red) */}
      <rect x="10" y="24" width="20" height="14" rx="2" fill="#e23744" />
      <path d="M13 27 L27 27" stroke="#fff" strokeWidth="1.5" opacity="0.4" />
      
      {/* RIDER */}
      {/* Shoulders & Arms */}
      <path d="M13 16 Q20 13 27 16" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" />
      {/* Helmet */}
      <circle cx="20" cy="16" r="5.5" fill="#facc15" />
      {/* Helmet Visor */}
      <path d="M16 14 Q20 11 24 14" stroke="#1a1a1a" strokeWidth="2.5" fill="none" />
    </svg>
  )
}

function TruckTopDown() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))' }}>
      {/* Cabin */}
      <rect x="11" y="4" width="18" height="12" rx="3" fill="#1e2a3a" />
      {/* Windshield */}
      <rect x="12" y="6" width="16" height="5" rx="1.5" fill="#6366f1" opacity="0.8" />
      {/* Cargo Box */}
      <rect x="8" y="15" width="24" height="23" rx="2" fill="#0077ff" />
      {/* Cargo Roof Details */}
      <rect x="10" y="17" width="20" height="19" rx="1" fill="none" stroke="#0056c7" strokeWidth="1.5" />
      <line x1="14" y1="15" x2="14" y2="38" stroke="#0056c7" strokeWidth="1" />
      <line x1="20" y1="15" x2="20" y2="38" stroke="#0056c7" strokeWidth="1" />
      <line x1="26" y1="15" x2="26" y2="38" stroke="#0056c7" strokeWidth="1" />
    </svg>
  )
}

export default function RiderIcon({ vehicleType = 'bike', size = 52 }) {
  const type = (vehicleType || 'bike').toLowerCase()
  
  let IconComponent = BikeTopDown
  if (type === 'scooty' || type === 'scooter') IconComponent = ScootyTopDown
  if (type === 'truck' || type === 'van') IconComponent = TruckTopDown

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconComponent />
    </div>
  )
}
