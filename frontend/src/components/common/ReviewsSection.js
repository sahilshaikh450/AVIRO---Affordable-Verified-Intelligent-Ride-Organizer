import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Spinner } from './UIComponents';

export default function ReviewsSection({ userId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    api.get(`/reviews/user/${userId}`).then(res => {
      setReviews(res.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
        ⭐ Reviews ({reviews.length})
      </h3>

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-aviro-muted text-sm">
          <div className="text-3xl mb-2">⭐</div>
          No reviews yet
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-aviro-border">
            <div className="text-center flex-shrink-0">
              <p className="text-4xl font-display font-bold">{avgRating}</p>
              <p className="text-aviro-orange text-sm">{'⭐'.repeat(Math.round(avgRating))}</p>
              <p className="text-xs text-aviro-muted mt-1">{reviews.length} reviews</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {distribution.map(d => (
                <div key={d.star} className="flex items-center gap-2 text-xs">
                  <span className="text-aviro-muted w-3">{d.star}</span>
                  <span>⭐</span>
                  <div className="flex-1 h-1.5 bg-aviro-card2 rounded-full overflow-hidden">
                    <div className="h-full bg-aviro-orange rounded-full" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-aviro-muted w-4">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual reviews */}
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {reviews.map((r, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-aviro-card2 border border-aviro-border flex items-center justify-center text-sm flex-shrink-0">
                  {r.reviewer?.gender === 'FEMALE' ? '👩' : '👨'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{r.reviewer?.fullName || 'Anonymous'}</p>
                    <span className="text-xs text-aviro-muted flex-shrink-0">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
                    </span>
                  </div>
                  <p className="text-aviro-orange text-xs mb-1">{'⭐'.repeat(r.rating)}</p>
                  {r.comment && <p className="text-sm text-aviro-muted">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}