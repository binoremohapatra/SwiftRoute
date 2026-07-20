import { useState } from 'react'
import { Star, X } from 'lucide-react'

export default function RatingModal({ isOpen, onClose, onSubmit, orderId }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)
    await onSubmit(orderId, rating, review)
    setSubmitting(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 5, 10, 0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, opacity: isOpen ? 1 : 0, transition: '0.3s'
    }}>
      <div style={{
        background: 'rgba(20, 20, 30, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '2rem', borderRadius: 24, width: '90%', maxWidth: 450,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem', textAlign: 'center' }}>Rate your delivery</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
          How was your experience with the delivery agent?
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer',
                transition: '0.2s transform'
              }}
              className="star-btn"
            >
              <Star 
                size={36} 
                fill={(hoverRating || rating) >= star ? '#fbbf24' : 'transparent'}
                color={(hoverRating || rating) >= star ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
                style={{ transform: (hoverRating || rating) >= star ? 'scale(1.1)' : 'scale(1)', transition: '0.2s' }}
              />
            </button>
          ))}
        </div>

        <textarea
          placeholder="Leave an optional review..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
          style={{
            width: '100%', minHeight: 100, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '1rem', color: '#fff', fontSize: '0.9rem', resize: 'vertical', marginBottom: '1.5rem',
            outline: 'none', fontFamily: 'inherit'
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="btn-primary"
          style={{ width: '100%', opacity: (rating === 0 || submitting) ? 0.5 : 1, padding: '1rem', borderRadius: 12, fontSize: '1rem', fontWeight: 600 }}
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  )
}
