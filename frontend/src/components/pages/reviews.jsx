import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'
import './reviews.css'

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
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncMessage, setSyncMessage] = useState(null)
    const [isInitialSyncPending, setIsInitialSyncPending] = useState(false)

    useEffect(() => {
        // ONLY fetch reviews from DATABASE
        fetchReviewsFromDB()
        checkSyncStatus()
    }, [])

    // Check if initial sync is needed
    const checkSyncStatus = async () => {
        try {
            const statusResult = await apiRequest('/api/google-oauth/status')
            
            if (statusResult.success && statusResult.isConnected) {
                // Check if initial sync is done by checking if we have reviews
                const reviewsResult = await apiRequest('/api/client/reviews')
                const hasReviews = reviewsResult.success && reviewsResult.data?.reviews?.length > 0
                
                if (!hasReviews) {
                    setIsInitialSyncPending(true)
                }
            }
        } catch (err) {
            console.error('Error checking sync status:', err)
        }
    }

    // Trigger initial sync (ONE TIME after OAuth)
    const triggerInitialSync = async () => {
        try {
            setIsSyncing(true)
            setSyncMessage('🚀 Starting initial sync from Google Business Profile...')
            
            const syncResult = await apiRequest('/api/google-oauth/initial-sync', { method: 'POST' })
            
            if (syncResult.success) {
                if (syncResult.alreadySynced) {
                    setSyncMessage('✓ Data already synced. Refreshing...')
                } else {
                    const { reviewsNew, reviewsUpdated } = syncResult.data || {}
                    setSyncMessage(`✓ Initial sync complete! ${reviewsNew} new reviews imported.`)
                }
                
                setIsInitialSyncPending(false)
                
                // Fetch reviews from DB
                await fetchReviewsFromDB()
            } else {
                if (syncResult.message?.includes('cooldown')) {
                    const minutes = syncResult.retryAfter ? Math.ceil(syncResult.retryAfter / 60) : 1
                    setSyncMessage(`⏰ Google API cooldown active. Please wait ${minutes} minute(s) and try again.`)
                } else {
                    setSyncMessage(`⚠️ ${syncResult.message || 'Sync failed. Please try again.'}`)
                }
            }
        } catch (err) {
            console.error('Error in initial sync:', err)
            
            if (err.response?.status === 429) {
                const retryAfter = err.response?.data?.retryAfter || 60
                const minutes = Math.ceil(retryAfter / 60)
                setSyncMessage(`⏰ Google API cooldown active. Retry in ${minutes} minute(s)`)
            } else {
                setSyncMessage(`⚠️ ${err.message || 'Failed to sync. Please try again.'}`)
            }
        } finally {
            setIsSyncing(false)
            setTimeout(() => setSyncMessage(null), 10000)
        }
    }

    // Fetch reviews from DATABASE ONLY (NO Google API calls)
    const fetchReviewsFromDB = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.data) {
                // Extract reviews from paginated response
                const reviewsData = result.data.reviews || result.data || []
                
                // Transform backend data to match component structure using normalized fields
                const transformedReviews = reviewsData.map((review, index) => ({
                    id: review.review_key || review.ReviewKey || review.id || index + 1,
                    reviewer: review.reviewer_name || review['Reviewer Name'] || 'Anonymous',
                    rating: parseInt(review.rating) || 0,
                    platform: 'Google',
                    date: review.review_created_at || review.Timestamp || review.timestamp || review.approved_at || new Date().toISOString(),
                    sentiment: review.sentiment || review.SentimentResult || 'Neutral',
                    comment: review.review_text || review.Review || '',
                    reply: review.final_caption || review.edited_reply || review.ai_generated_reply || review.reply_text || null,
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
                                    {syncMessage && (
                                        <span style={{ 
                                            fontSize: '13px', 
                                            color: syncMessage.startsWith('✓') ? '#10b981' : '#f59e0b',
                                            padding: '4px 12px',
                                            backgroundColor: syncMessage.startsWith('✓') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            borderRadius: '4px'
                                        }}>
                                            {syncMessage}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                        {filteredReviews.length} reviews
                                    </span>
                                    <button
                                        onClick={fetchReviewsFromDB}
                                        disabled={loading}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: loading ? 'var(--bg-tertiary)' : '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="filters-container" style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '8px'
                            }}>
                                <div className="filter-group">
                                    <label className="filter-label">
                                        Platform
                                    </label>
                                    <select
                                        value={filters.platform}
                                        onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                                        className="filter-select"
                                    >
                                        <option value="all">All Platforms</option>
                                        <option value="Google">Google</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Yelp">Yelp</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label className="filter-label">
                                        Rating
                                    </label>
                                    <select
                                        value={filters.rating}
                                        onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                                        className="filter-select"
                                    >
                                        <option value="all">All Ratings</option>
                                        <option value="5">5 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="2">2 Stars</option>
                                        <option value="1">1 Star</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label className="filter-label">
                                        Sentiment
                                    </label>
                                    <select
                                        value={filters.sentiment}
                                        onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                                        className="filter-select"
                                    >
                                        <option value="all">All Sentiments</option>
                                        <option value="Positive">Positive</option>
                                        <option value="Neutral">Neutral</option>
                                        <option value="Negative">Negative</option>
                                    </select>
                                </div>
                            </div>

                            {/* Review Table */}
                            <div className="table-container">
                                {filteredReviews.length === 0 ? (
                                    <div style={{ 
                                        textAlign: 'center', 
                                        padding: '60px 20px', 
                                        color: 'var(--text-tertiary)' 
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                                        <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                            No reviews found yet
                                        </p>
                                        {isInitialSyncPending ? (
                                            <div style={{ marginTop: '16px' }}>
                                                <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                                                    Your Google Business Profile is connected.<br/>
                                                    Click below to import your reviews.
                                                </p>
                                                <button
                                                    onClick={triggerInitialSync}
                                                    disabled={isSyncing}
                                                    style={{
                                                        padding: '12px 24px',
                                                        backgroundColor: isSyncing ? '#94a3b8' : '#4285F4',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        cursor: isSyncing ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {isSyncing ? '🔄 Importing Reviews...' : '📥 Import Reviews from Google'}
                                                </button>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: '13px', marginTop: '8px' }}>
                                                {reviews.length === 0 
                                                    ? 'Reviews will appear once your Google Business Profile finishes initial sync.' 
                                                    : 'Try adjusting your filters to see more reviews'}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Table View */}
                                        <table className="reviews-table">
                                            <thead>
                                                <tr>
                                                    <th>Reviewer</th>
                                                    <th>Rating</th>
                                                    <th>Platform</th>
                                                    <th>Date</th>
                                                    <th>Sentiment</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredReviews.map((review) => (
                                                    <tr
                                                        key={review.id}
                                                        onClick={() => setSelectedReview(review)}
                                                        style={{
                                                            backgroundColor: selectedReview?.id === review.id ? 'var(--hover-bg)' : 'transparent'
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
                                        
                                        {/* Mobile Card View */}
                                        <div className="mobile-card-view">
                                            {filteredReviews.map((review) => (
                                                <div 
                                                    key={review.id}
                                                    className="review-card"
                                                    onClick={() => setSelectedReview(review)}
                                                    style={{
                                                        borderColor: selectedReview?.id === review.id ? 'var(--primary-color)' : 'var(--border-color)'
                                                    }}
                                                >
                                                    <div className="review-card-header">
                                                        <span className="review-card-reviewer">{review.reviewer}</span>
                                                        <span className="review-card-rating">{getRatingStars(review.rating)}</span>
                                                    </div>
                                                    <div className="review-card-meta">
                                                        <span>{review.platform}</span>
                                                        <span>{new Date(review.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="review-card-comment">
                                                        {review.comment.length > 120 ? review.comment.substring(0, 120) + '...' : review.comment}
                                                    </div>
                                                    <div className="review-card-footer">
                                                        <span className={`sentiment-badge sentiment-${review.sentiment.toLowerCase()}`}>
                                                            {review.sentiment}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: review.reply ? '#10b981' : '#f59e0b' }}>
                                                            {review.reply ? '✓ Replied' : '● Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
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
