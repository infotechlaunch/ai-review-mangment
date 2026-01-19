import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'

export default function Reviews() {
    const [selectedReview, setSelectedReview] = useState(null)
    const [filters, setFilters] = useState({
        platform: 'all',
        rating: 'all',
        sentiment: 'all'
    })
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Always fetch reviews when component mounts
        fetchReviews()
    }, [])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.data) {
                // Extract reviews from paginated response
                const reviewsData = result.data.reviews || result.data || []
                
                // Transform backend data to match component structure using normalized fields
                const transformedReviews = reviewsData.map((review, index) => ({
                    id: review.review_key || review.ReviewKey || index + 1,
                    reviewer: review.reviewer_name || review['Reviewer Name'] || 'Anonymous',
                    rating: parseInt(review.rating) || 0,
                    platform: 'Google',
                    date: review.Timestamp || review.timestamp || review.approved_at || new Date().toISOString(),
                    sentiment: review.sentiment || review.SentimentResult || 'Neutral',
                    comment: review.review_text || review.Review || '',
                    reply: review.final_caption || review.edited_reply || review.ai_generated_reply || null,
                    approvalStatus: review.approval_status || review['Approval Status'] || 'pending',
                    googleReviewId: review.google_review_id || review['Review ID'],
                }))
                setReviews(transformedReviews)
            }

            setLoading(false)
        } catch (err) {
            console.error('Error fetching reviews:', err)
            setError(err.message)
            setReviews([])
            setLoading(false)
        }
    }

    const filteredReviews = reviews.filter(review => {
        if (filters.platform !== 'all' && review.platform !== filters.platform) return false
        if (filters.rating !== 'all' && review.rating !== parseInt(filters.rating)) return false
        if (filters.sentiment !== 'all' && review.sentiment !== filters.sentiment) return false
        return true
    })

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Review Management</h1>
                    <p className="page-subtitle">Loading your reviews...</p>
                </div>
            </div>
        )
    }

    const getSentimentColor = (sentiment) => {
        switch (sentiment) {
            case 'Positive': return '#10b981'
            case 'Negative': return '#ef4444'
            case 'Neutral': return '#f59e0b'
            default: return '#6b7280'
        }
    }

    const getRatingStars = (rating) => {
        return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Review Management</h1>
                <p className="page-subtitle">Manage and respond to customer reviews across all platforms</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className={selectedReview ? "grid-col-8" : "grid-col-12"}>
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="widget-title">Review Inbox</h3>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                        {filteredReviews.length} reviews
                                    </span>
                                </div>
                            </div>

                            {/* Filters */}
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginBottom: '20px',
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ flex: '1', minWidth: '150px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '6px'
                                    }}>
                                        Platform
                                    </label>
                                    <select
                                        value={filters.platform}
                                        onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--card-bg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="all">All Platforms</option>
                                        <option value="Google">Google</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Yelp">Yelp</option>
                                    </select>
                                </div>
                                <div style={{ flex: '1', minWidth: '150px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '6px'
                                    }}>
                                        Rating
                                    </label>
                                    <select
                                        value={filters.rating}
                                        onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--card-bg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="all">All Ratings</option>
                                        <option value="5">5 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="2">2 Stars</option>
                                        <option value="1">1 Star</option>
                                    </select>
                                </div>
                                <div style={{ flex: '1', minWidth: '150px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '6px'
                                    }}>
                                        Sentiment
                                    </label>
                                    <select
                                        value={filters.sentiment}
                                        onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--card-bg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="all">All Sentiments</option>
                                        <option value="Positive">Positive</option>
                                        <option value="Neutral">Neutral</option>
                                        <option value="Negative">Negative</option>
                                    </select>
                                </div>
                            </div>

                            {/* Review Table */}
                            <div style={{ overflowX: 'auto' }}>
                                {filteredReviews.length === 0 ? (
                                    <div style={{ 
                                        textAlign: 'center', 
                                        padding: '60px 20px', 
                                        color: 'var(--text-tertiary)' 
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                                        <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                                            No reviews found
                                        </p>
                                        <p style={{ fontSize: '13px' }}>
                                            {reviews.length === 0 
                                                ? 'Start by fetching reviews from your Google Business Profile' 
                                                : 'Try adjusting your filters to see more reviews'}
                                        </p>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderBottom: '2px solid var(--border-color)'
                                            }}>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Reviewer</th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Rating</th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Platform</th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Date</th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Sentiment</th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReviews.map((review) => (
                                                <tr
                                                    key={review.id}
                                                    onClick={() => setSelectedReview(review)}
                                                    style={{
                                                        borderBottom: '1px solid var(--border-color)',
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedReview?.id === review.id ? 'var(--hover-bg)' : 'transparent',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (selectedReview?.id !== review.id) {
                                                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedReview?.id !== review.id) {
                                                            e.currentTarget.style.backgroundColor = 'transparent'
                                                        }
                                                    }}
                                                >
                                                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                                        {review.reviewer}
                                                    </td>
                                                    <td style={{ padding: '16px', fontSize: '14px' }}>
                                                        {getRatingStars(review.rating)}
                                                    </td>
                                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        {review.platform}
                                                    </td>
                                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        {new Date(review.date).toLocaleDateString()}
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            backgroundColor: getSentimentColor(review.sentiment) + '20',
                                                            color: getSentimentColor(review.sentiment)
                                                        }}>
                                                            {review.sentiment}
                                                        </span>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '13px' }}>
                                                    {review.reply ? (
                                                        <span style={{ color: '#10b981' }}>✓ Replied</span>
                                                    ) : (
                                                        <span style={{ color: '#f59e0b' }}>● Pending</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Review Detail Panel */}
                    {selectedReview && (
                        <div className="grid-col-4">
                            <div className="widget-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <h3 className="widget-title">Review Details</h3>
                                    <button
                                        onClick={() => setSelectedReview(null)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '20px',
                                            cursor: 'pointer',
                                            color: 'var(--text-tertiary)',
                                            padding: '0'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                        {selectedReview.reviewer}
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '18px' }}>{getRatingStars(selectedReview.rating)}</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {selectedReview.platform}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                        {new Date(selectedReview.date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    borderLeft: `4px solid ${getSentimentColor(selectedReview.sentiment)}`
                                }}>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: getSentimentColor(selectedReview.sentiment),
                                        marginBottom: '8px'
                                    }}>
                                        {selectedReview.sentiment} Sentiment
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                        {selectedReview.comment}
                                    </div>
                                </div>

                                {selectedReview.reply && (
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: '8px',
                                        marginBottom: '16px'
                                    }}>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
                                            Your Reply
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                            {selectedReview.reply}
                                        </div>
                                    </div>
                                )}

                                <button style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}>
                                    {selectedReview.reply ? 'Edit Reply' : 'Generate AI Reply'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
