import React, { useEffect, useState } from 'react'
import { Filter, Search, MoreHorizontal } from '../components/Icons'
import { useNavigate } from 'react-router-dom'
import './AdminCommon.css'

export default function Reviews() {
  const [reviews, setReviews] = useState([
     { id: 1, author_name: 'John Doe', stars: 5, has_reply: true, review_created_at: '2025-10-24T10:00:00Z', review_text: 'Excellent service! Highly recommended.' },
     { id: 2, author_name: 'Jane Smith', stars: 4, has_reply: false, review_created_at: '2025-10-23T15:30:00Z', review_text: 'Good but could be faster.' },
     { id: 3, author_name: 'Alice Johnson', stars: 2, has_reply: true, review_created_at: '2025-10-22T09:15:00Z', review_text: 'Not satisfied with the outcome.' },
     { id: 4, author_name: 'Robert Brown', stars: 5, has_reply: false, review_created_at: '2025-10-21T11:45:00Z', review_text: 'Simply the best in town!' },
     { id: 5, author_name: 'Emily Davis', stars: 3, has_reply: false, review_created_at: '2025-10-20T14:00:00Z', review_text: 'Average experience.' },
  ])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // API fetch removed for dummy data request
  /* 
  useEffect(() => { ... } 
  */

  const getStatusColor = (status) => {
    switch(status) {
        case 'replied': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'flagged': return 'bg-red-50 text-red-600 border-red-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  return (
    <div className="space-y-6 admin-page-container">
      {/* <div className="admin-page-header">
        <div className="admin-header-content">
          <h1 className="text-2xl font-bold text-slate-800">Review Management</h1>
          <p className="text-slate-500 mt-1">Monitor and respond to customer reviews.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden admin-card">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center gap-4 flex-wrap bg-white">
            <div className="admin-search-wrapper">
                <Search size={18} className="admin-search-icon" />
                <input type="text" placeholder="Search reviews..." className="admin-search-input" />
            </div>
            <div className="flex gap-3">
                <button className="admin-action-btn">
                    <Filter size={18} />
                    <span>Filter</span>
                </button>
            </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
             <div className="p-10 text-center text-slate-500">Loading reviews...</div>
          ) : reviews.length > 0 ? (
             reviews.map((review, idx) => (
            <div key={idx} className="review-item group cursor-pointer" onClick={() => navigate(`/admin/reviews/${review.id}`)}>
              <div className="review-header">
                <div className="review-user-block">
                  <div className="review-avatar">
                   {review.author_name ? review.author_name.charAt(0) : 'U'}
                  </div>
                  <div className="review-meta">
                    <h3>{review.author_name || 'Anonymous User'}</h3>
                    <span>via Google Reviews</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(review.has_reply ? 'replied' : 'pending')}`}>
                      {review.has_reply ? 'Replied' : 'Pending'}
                   </span>
                   <span className="review-date">{new Date(review.review_created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="ml-[52px]">
                <div className="review-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < (review.stars || 5) ? 'text-amber-400 fill-current' : 'text-slate-200'}`} viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ))}
                </div>
                <p className="review-text line-clamp-2">
                    {review.review_text || "No text provided."}
                </p>
                
                <div className="review-actions mt-4 flex gap-3">
                  <button className="btn-reviews btn-reviews-primary" onClick={(e) => { e.stopPropagation(); navigate(`/admin/reviews/${review.id}`) }}>View Details</button>
                  <button className="btn-reviews btn-reviews-secondary">Reply</button>
                  <button className="btn-reviews btn-reviews-danger ml-auto">Flag Review</button>
                </div>
              </div>
            </div>
          ))
          ) : (
             <div className="p-10 text-center text-slate-500">No reviews found.</div>
          )}
        </div>

        <div className="admin-pagination">
          <span className="text-sm font-medium text-slate-500">Showing {reviews.length} reviews</span>
          <div className="flex gap-2">
            <button className="admin-action-btn py-2 px-4" disabled>Previous</button>
            <button className="admin-action-btn py-2 px-4" disabled>Next</button>
          </div>
        </div>
      </div> */}
      <div className='item-center'>
<h1> review page</h1>
      </div>
    </div>
  )
}
