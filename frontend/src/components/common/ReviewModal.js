import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ReviewModal({ booking, revieweeId, revieweeName, revieweeGender, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!booking?.id || !revieweeId) {
      toast.error('Missing booking or user info');
      console.error('Missing data:', { bookingId: booking?.id, revieweeId });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bookingId: Number(booking.id),
        revieweeId: Number(revieweeId),
        rating: Number(rating), // ensure it's a proper number, not string
        comment: comment.trim() || null,
      };
      console.log('Submitting review payload:', payload);

      await api.post('/reviews', payload);
      toast.success('Review submitted! Thank you 🙏');
      onSubmitted && onSubmitted();
      onClose();
    } catch (err) {
      console.error('Review submit error:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-up">
      <div className="bg-aviro-card border border-aviro-border rounded-2xl p-6 max-w-sm w-full">

        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-aviro-card2 border-2 border-aviro-border flex items-center justify-center text-3xl mx-auto mb-3">
            {revieweeGender === 'FEMALE' ? '👩' : '👨'}
          </div>
          <h3 className="font-bold text-lg">Rate {revieweeName}</h3>
          <p className="text-xs text-aviro-muted mt-1">
            {booking?.fromLocation} → {booking?.toLocation}
          </p>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-4xl transition-transform hover:scale-110"
            >
              {(hoverRating || rating) >= star ? '⭐' : '☆'}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-aviro-orange font-medium mb-5 h-5">
          {labels[hoverRating || rating]}
        </p>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience (optional)..."
          rows={3}
          className="input-field resize-none mb-5"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-aviro-card2 border border-aviro-border text-white font-semibold py-2.5 rounded-xl text-sm hover:border-aviro-orange/40 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 btn-primary py-2.5 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}