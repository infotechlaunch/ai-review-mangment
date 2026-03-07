import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, cachedApiRequest, invalidateCache } from '../../utils/api'
import './reviews.css'

export default function Reviews() {
    const navigate = useNavigate()
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
    const [replyText, setReplyText] = useState('')
    const [isGeneratingReply, setIsGeneratingReply] = useState(false)
    const [isApprovingReply, setIsApprovingReply] = useState(false)
    const [isPostingSocial, setIsPostingSocial] = useState(false)
    const [actionMessage, setActionMessage] = useState(null)
    const [pipelineStep, setPipelineStep] = useState(null) // null | 'generating' | 'approving' | 'social' | 'done'
    const [isGoogleConnected, setIsGoogleConnected] = useState(true) // optimistic default

    useEffect(() => {
        // ONLY fetch reviews from DATABASE
        fetchReviewsFromDB()
        checkSyncStatus()
    }, [])

    // Check if initial sync is needed
    const checkSyncStatus = async () => {
        try {
            const statusResult = await apiRequest('/api/google-oauth/status')
            const connected = !!(statusResult.success && statusResult.isConnected)
            setIsGoogleConnected(connected)

            if (connected) {
                // Reuse already-cached reviews – no extra network call
                const reviewsResult = await cachedApiRequest('/api/client/reviews')
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
                
                // Invalidate cache then fetch fresh reviews
                invalidateCache('/api/client/reviews')
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
            const result = await cachedApiRequest('/api/client/reviews')

            if (result.success && result.data) {
                // Extract reviews from paginated response
                const reviewsData = result.data.reviews || result.data || []
                
                // Transform backend data to match component structure using normalized fields
                const transformedReviews = reviewsData.map((review, index) => ({
                    id: review.review_key || review.ReviewKey || review.id || index + 1,
                    dbId: review.id,  // always the DB UUID for API calls
                    reviewer: review.reviewer_name || review['Reviewer Name'] || 'Anonymous',
                    rating: parseInt(review.rating) || 0,
                    platform: 'Google',
                    date: review.review_created_at || review.Timestamp || review.timestamp || review.approved_at || new Date().toISOString(),
                    sentiment: review.sentiment || review.SentimentResult || 'Neutral',
                    comment: review.review_text || review.Review || '',
                    autoReply: review.ai_generated_reply || review.auto_reply || review['Auto Reply'] || null,
                    editedReply: review.edited_reply || review['Edited Reply'] || null,
                    finalCaption: review.final_caption || review['Final Caption'] || null,
                    reply: review.final_caption || review.edited_reply || review.ai_generated_reply || review.reply_text || null,
                    approvalStatus: review.approval_status || review['Approval Status'] || 'pending',
                    facebookPostUrl: review.facebook_post_url || review['Facebook Post URL'] || null,
                    instagramPostUrl: review.instagram_post_url || review['Instagram Post URL'] || null,
                    socialCaption: review.social_caption || null,
                    socialPostedAt: review.social_posted_at || null,
                    rowId: review.row_id || review['Row ID (Zapier)'] || null,
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

    // When a review is selected, pre-populate reply and auto-start the pipeline
    const handleSelectReview = (review) => {
        const initialReply = review.editedReply || review.autoReply || ''
        setSelectedReview(review)
        setReplyText(initialReply)
        setActionMessage(null)
        setPipelineStep(null)
        // Auto-trigger pipeline if not already posted.
        // For 'approved' status (reply saved but not posted to Google):
        //   - If Google is now connected, run the pipeline so it posts.
        //   - If Google is still disconnected, skip (user needs to reconnect first).
        const shouldRunPipeline =
            review.approvalStatus !== 'posted' &&
            (review.approvalStatus !== 'approved' || isGoogleConnected)
        if (shouldRunPipeline) {
            handleAutoPipeline(review, initialReply)
        }
    }

    // Run the full automatic pipeline: generate → approve+post Google → social (5★)
    // Accepts optional reviewData/initialReply so it can be called before state settles
    const handleAutoPipeline = async (reviewData, initialReply) => {
        const review = reviewData || selectedReview
        if (!review?.dbId) return
        setActionMessage(null)
        setPipelineStep('generating')

        let generatedReply = initialReply !== undefined ? initialReply : replyText

        // Step 1 — Generate AI Reply (skip if already have one)
        if (!generatedReply) {
            try {
                const r1 = await apiRequest(`/api/reviews/${review.dbId}/generate-reply`, { method: 'POST' })
                if (!r1.success) throw new Error(r1.message)
                generatedReply = r1.data.aiReply
                setReplyText(generatedReply)
                setSelectedReview(prev => ({ ...prev, autoReply: generatedReply, editedReply: generatedReply }))
            } catch (err) {
                setPipelineStep(null)
                setActionMessage({ type: 'error', text: `⚠️ AI generation failed: ${err.message}` })
                return
            }
        }

        // Step 2 — Approve & Post to Google (auto-posts to social for 5★ in backend)
        setPipelineStep('approving')
        let socialData = {}
        try {
            const r2 = await apiRequest(`/api/reviews/${review.dbId}/approve-reply`, {
                method: 'POST',
                body: JSON.stringify({ editedReply: generatedReply })
            })
            if (!r2.success) throw new Error(r2.message)
            socialData = r2.data?.social || {}
            const newStatus = r2.googleNotConnected ? 'approved' : 'posted'
            setSelectedReview(prev => ({
                ...prev,
                approvalStatus: newStatus,
                editedReply: generatedReply,
                facebookPostUrl: socialData.facebookPostUrl || prev.facebookPostUrl,
                instagramPostUrl: socialData.instagramPostUrl || prev.instagramPostUrl,
                socialCaption: socialData.caption || prev.socialCaption,
            }))
            if (r2.googleNotConnected) {
                setPipelineStep('done')
                setActionMessage({ type: 'warning', text: `💾 Reply saved! Google not connected — go to Settings to reconnect Google Business Profile.` })
                invalidateCache('/api/client/reviews')
                fetchReviewsFromDB()
                return
            }
            invalidateCache('/api/client/reviews')
            fetchReviewsFromDB()
        } catch (err) {
            setPipelineStep(null)
            setActionMessage({ type: 'error', text: `⚠️ Posting to Google failed: ${err.message}` })
            return
        }

        // Step 3 — If 5★ and social wasn't auto-handled, post explicitly
        const alreadyPostedSocial = socialData.facebookPostUrl || socialData.instagramPostUrl
        if (review.rating >= 5 && !alreadyPostedSocial) {
            setPipelineStep('social')
            try {
                const r3 = await apiRequest(`/api/reviews/${review.dbId}/post-social`, { method: 'POST' })
                if (r3.success) {
                    setSelectedReview(prev => ({
                        ...prev,
                        facebookPostUrl: r3.data.facebookPostUrl || prev.facebookPostUrl,
                        instagramPostUrl: r3.data.instagramPostUrl || prev.instagramPostUrl,
                        socialCaption: r3.data.caption || prev.socialCaption,
                    }))
                    socialData = r3.data
                }
            } catch (err) {
                // Non-blocking — social failure doesn't break the pipeline
                console.error('Social post failed (non-blocking):', err.message)
            }
        }

        setPipelineStep('done')
        const hasSocial = socialData.facebookPostUrl || socialData.instagramPostUrl
        setActionMessage({
            type: 'success',
            text: `✅ Done! Reply posted to Google.${hasSocial ? ' Also shared on social media! 🎉' : ''}`
        })
    }

    // Generate AI reply for the selected review
    const handleGenerateReply = async () => {
        if (!selectedReview?.dbId) return
        setIsGeneratingReply(true)
        setActionMessage(null)
        try {
            const result = await apiRequest(`/api/reviews/${selectedReview.dbId}/generate-reply`, { method: 'POST' })
            if (result.success) {
                setReplyText(result.data.aiReply)
                setActionMessage({ type: 'success', text: '✓ AI reply generated. Review and edit before approving.' })
                setReviews(prev => prev.map(r => r.dbId === selectedReview.dbId
                    ? { ...r, autoReply: result.data.aiReply, editedReply: result.data.aiReply }
                    : r
                ))
                setSelectedReview(prev => ({ ...prev, autoReply: result.data.aiReply, editedReply: result.data.aiReply }))
            } else {
                setActionMessage({ type: 'error', text: `⚠️ ${result.message}` })
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: `⚠️ ${err.message}` })
        } finally {
            setIsGeneratingReply(false)
        }
    }

    // Approve & post reply to Google (triggers auto social-post for 5-star)
    const handleApproveAndPost = async () => {
        if (!selectedReview?.dbId) return
        setIsApprovingReply(true)
        setActionMessage(null)
        try {
            const result = await apiRequest(`/api/reviews/${selectedReview.dbId}/approve-reply`, {
                method: 'POST',
                body: JSON.stringify({ editedReply: replyText })
            })
            if (result.success) {
                const hasSocial = result.data?.social?.facebookPostUrl || result.data?.social?.instagramPostUrl
                const socialMsg = hasSocial ? ' Also posted to social media! 🎉' : ''
                setActionMessage({ type: 'success', text: `✓ Reply posted to Google.${socialMsg}` })
                invalidateCache('/api/client/reviews')
                await fetchReviewsFromDB()
                // Re-select updated review
                setSelectedReview(prev => ({
                    ...prev,
                    approvalStatus: 'posted',
                    editedReply: replyText,
                    facebookPostUrl: result.data?.social?.facebookPostUrl || prev.facebookPostUrl,
                    instagramPostUrl: result.data?.social?.instagramPostUrl || prev.instagramPostUrl,
                    socialCaption: result.data?.social?.caption || prev.socialCaption,
                }))
            } else {
                setActionMessage({ type: 'error', text: `⚠️ ${result.message}` })
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: `⚠️ ${err.message}` })
        } finally {
            setIsApprovingReply(false)
        }
    }

    // Manually post to social media
    const handlePostSocial = async () => {
        if (!selectedReview?.dbId) return
        setIsPostingSocial(true)
        setActionMessage(null)
        try {
            const result = await apiRequest(`/api/reviews/${selectedReview.dbId}/post-social`, { method: 'POST' })
            if (result.success) {
                setActionMessage({ type: 'success', text: '✓ Posted to social media!' })
                setSelectedReview(prev => ({
                    ...prev,
                    facebookPostUrl: result.data.facebookPostUrl || prev.facebookPostUrl,
                    instagramPostUrl: result.data.instagramPostUrl || prev.instagramPostUrl,
                    socialCaption: result.data.caption || prev.socialCaption,
                }))
                invalidateCache('/api/client/reviews')
            } else {
                setActionMessage({ type: 'error', text: `⚠️ ${result.message}` })
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: `⚠️ ${err.message}` })
        } finally {
            setIsPostingSocial(false)
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
                    <h1 className="page-title">Reviews</h1>
                    <p className="page-subtitle">Manage and respond to customer reviews across all platforms</p>
                </div>
                <div className="page-content">
                    <div className="grid-container">
                        <div className="grid-col-12">
                            <div className="widget-card skeleton-card">
                                {/* Toolbar skeleton */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div className="skeleton" style={{ height: 20, width: 120, borderRadius: 4 }} />
                                    <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 6 }} />
                                </div>
                                {/* Row skeletons */}
                                {[1,2,3,4,5,6].map(i => (
                                    <div key={i} className="skeleton skeleton-row" />
                                ))}
                            </div>
                        </div>
                    </div>
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

    const cleanupSearchTerm = (text) => {
        // This function was likely intended to clean up search terms,
        // but the provided snippet had a copy-paste error from getRatingStars.
        // Returning the text as-is for now, or implement actual cleanup logic.
        return text; 
    }

    const fetchReviewsFromPlaces = async () => {
        setLoading(true);
        setSyncMessage('🔄 Fetching from Places API...');
        
        try {
            const data = await apiRequest('/api/reviews/fetch-places', {
                method: 'POST',
                body: JSON.stringify({})
            });

            if (data.success) {
                const count = data.data?.newReviews || 0;
                setSyncMessage(`✓ Synced ${count} new reviews`);
                invalidateCache('/api/client/reviews')
                await fetchReviewsFromDB(); 
            } else {
                setSyncMessage(`❌ ${data.message || 'Failed'}`);
            }
        } catch (err) {
            console.error('Sync error:', err);
            setSyncMessage(`❌ ${err.message || 'Sync Error'}`);
        } finally {
            setLoading(false);
            setTimeout(() => setSyncMessage(''), 5000);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Reviews</h1>
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
                                    {/* <button
                                        onClick={fetchReviewsFromPlaces}
                                        disabled={loading}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: loading ? 'var(--bg-tertiary)' : '#4285F4',
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
                                        {loading ? '🔄 Fetching...' : '🔍 Sync Google (Places)'}
                                    </button> */}
                                    {/* <button
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
                                    </button> */}
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
                                                    <th>Review</th>
                                                    <th>Auto Reply</th>
                                                    <th>Edited Reply</th>
                                                    <th>Platform</th>
                                                    <th>Date</th>
                                                    <th>Sentiment</th>
                                                    <th>Approval Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredReviews.map((review) => (
                                                    <tr
                                                        key={review.id}
                                                        onClick={() => handleSelectReview(review)}
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
                                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                                            <span title={review.comment}>
                                                                {review.comment ? (review.comment.length > 80 ? review.comment.substring(0, 80) + '…' : review.comment) : '—'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                                            <span title={review.autoReply}>
                                                                {review.autoReply ? (review.autoReply.length > 80 ? review.autoReply.substring(0, 80) + '…' : review.autoReply) : '—'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                                            <span title={review.editedReply}>
                                                                {review.editedReply ? (review.editedReply.length > 80 ? review.editedReply.substring(0, 80) + '…' : review.editedReply) : '—'}
                                                            </span>
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
                                                            {review.approvalStatus === 'Approved' || review.approvalStatus === 'approved' ? (
                                                                <span style={{ color: '#10b981', fontWeight: '600' }}>✓ Approved</span>
                                                            ) : review.approvalStatus === 'Rejected' || review.approvalStatus === 'rejected' ? (
                                                                <span style={{ color: '#ef4444', fontWeight: '600' }}>✗ Rejected</span>
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
                                                    onClick={() => handleSelectReview(review)}
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
                            <div className="widget-card" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <h3 className="widget-title">Review Details</h3>
                                    <button
                                        onClick={() => { setSelectedReview(null); setActionMessage(null); setPipelineStep(null) }}
                                        style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0' }}
                                    >×</button>
                                </div>

                {/* Google disconnected banner */}
                                {!isGoogleConnected && (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px',
                                        backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706',
                                        border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                                    }}>
                                        <span>⚠️ Google Business Profile not connected — replies are saved but <strong>not posted to Google</strong>.</span>
                                        <button
                                            onClick={() => navigate('/settings')}
                                            style={{
                                                flexShrink: 0, padding: '4px 10px', fontSize: '12px', fontWeight: '600',
                                                backgroundColor: '#d97706', color: 'white',
                                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                                            }}
                                        >Connect →</button>
                                    </div>
                                )}

                                {/* Action message */}
                                {actionMessage && (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px',
                                        backgroundColor: actionMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : actionMessage.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: actionMessage.type === 'success' ? '#10b981' : actionMessage.type === 'warning' ? '#f59e0b' : '#ef4444', fontWeight: '500'
                                    }}>
                                        {actionMessage.text}
                                    </div>
                                )}

                                {/* Reviewer info */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                        {selectedReview.reviewer}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '18px' }}>{getRatingStars(selectedReview.rating)}</span>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                            {selectedReview.platform}
                                        </span>
                                        {selectedReview.rating === 5 && (
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                                ⭐ 5-Star
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        {new Date(selectedReview.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>

                                {/* Review text */}
                                <div style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px', borderLeft: `4px solid ${getSentimentColor(selectedReview.sentiment)}` }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: getSentimentColor(selectedReview.sentiment), marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {selectedReview.sentiment} Sentiment
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                        {selectedReview.comment || <em style={{ color: 'var(--text-tertiary)' }}>No review text</em>}
                                    </div>
                                </div>

                                {/* ── AUTO PIPELINE status (no button — runs automatically on select) ── */}
                                {selectedReview.approvalStatus === 'approved' && !isGoogleConnected ? (
                                    // Reply saved locally but Google is NOT connected
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'rgba(245,158,11,0.1)',
                                            border: '1px solid rgba(245,158,11,0.3)',
                                            borderRadius: '8px', fontSize: '13px', color: '#d97706', fontWeight: '600',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                                        }}>
                                            <span>💾 Reply saved — pending Google post</span>
                                            <button
                                                onClick={() => navigate('/settings')}
                                                style={{
                                                    flexShrink: 0, padding: '4px 10px', fontSize: '12px', fontWeight: '600',
                                                    backgroundColor: '#d97706', color: 'white',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer'
                                                }}
                                            >Connect Google →</button>
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
                                            Connect Google Business Profile in Settings, then click this review again to post the reply.
                                        </div>
                                    </div>
                                ) : selectedReview.approvalStatus !== 'posted' ? (
                                    <div style={{ marginBottom: '16px' }}>
                                        {/* Status bar */}
                                        <div style={{
                                            width: '100%', padding: '12px 14px',
                                            background: pipelineStep === 'done'
                                                ? 'rgba(16,185,129,0.1)'
                                                : pipelineStep
                                                    ? 'rgba(66,133,244,0.08)'
                                                    : 'var(--bg-secondary)',
                                            border: `1px solid ${pipelineStep === 'done' ? 'rgba(16,185,129,0.3)' : pipelineStep ? 'rgba(66,133,244,0.25)' : 'var(--border-color)'}`,
                                            borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                                            color: pipelineStep === 'done' ? '#10b981' : pipelineStep ? '#4285F4' : 'var(--text-secondary)',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            {!pipelineStep && <><span>⚙️</span> Auto-processing…</>}
                                            {pipelineStep === 'generating' && <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Step 1/3 — Generating AI reply…</>}
                                            {pipelineStep === 'approving' && <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Step 2/3 — Posting reply to Google…</>}
                                            {pipelineStep === 'social' && <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Step 3/3 — Posting to social media…</>}
                                            {pipelineStep === 'done' && <><span>✅</span> All done!</>}
                                        </div>

                                        {/* Progress bar */}
                                        {pipelineStep && pipelineStep !== 'done' && (
                                            <div style={{ marginTop: '10px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    borderRadius: '2px',
                                                    background: 'linear-gradient(90deg, #4285F4, #833AB4)',
                                                    width: pipelineStep === 'generating' ? '33%' : pipelineStep === 'approving' ? '66%' : '90%',
                                                    transition: 'width 0.4s ease'
                                                }} />
                                            </div>
                                        )}

                                        {/* Step tracker */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                            {[
                                                { key: 'generating', label: '1. AI Reply' },
                                                { key: 'approving', label: '2. Google' },
                                                { key: 'social', label: '3. Social' },
                                            ].map(step => {
                                                const stepOrder = ['generating', 'approving', 'social', 'done']
                                                const currentIndex = stepOrder.indexOf(pipelineStep)
                                                const stepIndex = stepOrder.indexOf(step.key)
                                                const isDone = pipelineStep === 'done' || currentIndex > stepIndex
                                                const isActive = pipelineStep === step.key
                                                return (
                                                    <div key={step.key} style={{ textAlign: 'center', flex: 1 }}>
                                                        <div style={{
                                                            width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '12px', fontWeight: '700',
                                                            backgroundColor: isDone ? '#10b981' : isActive ? '#4285F4' : 'var(--bg-tertiary)',
                                                            color: isDone || isActive ? 'white' : 'var(--text-tertiary)',
                                                            border: isActive ? '2px solid #4285F4' : '2px solid transparent',
                                                            transition: 'all 0.3s ease'
                                                        }}>
                                                            {isDone ? '✓' : stepIndex + 1}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: isDone ? '#10b981' : isActive ? '#4285F4' : 'var(--text-tertiary)', fontWeight: isActive ? '600' : '400' }}>
                                                            {step.label}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                                        ✅ Already processed — reply posted to Google
                                    </div>
                                )}

                                {/* Divider */}
                                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0 14px' }} />

                                {/* ── Editable reply preview ─────────────────────── */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Reply Text{selectedReview.approvalStatus !== 'posted' ? ' (editable)' : ''}
                                    </div>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        disabled={selectedReview.approvalStatus === 'posted'}
                                        placeholder="Auto-processing will fill this in automatically…"
                                        rows={4}
                                        style={{
                                            width: '100%', padding: '10px', border: '1px solid var(--border-color)',
                                            borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)',
                                            backgroundColor: selectedReview.approvalStatus === 'posted' ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                            resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box',
                                        }}
                                    />
                                    {selectedReview.approvalStatus !== 'posted' && (
                                        <button
                                            onClick={() => handleAutoPipeline()}
                                            disabled={!!pipelineStep && pipelineStep !== 'done'}
                                            style={{
                                                marginTop: '6px', padding: '6px 14px', fontSize: '12px',
                                                backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
                                            }}
                                        >
                                            {(!!pipelineStep && pipelineStep !== 'done') ? '⏳ Processing…' : '🔄 Retry Pipeline'}
                                        </button>
                                    )}
                                </div>

                                {/* Social post links if available */}
                                {(selectedReview.facebookPostUrl || selectedReview.instagramPostUrl) && (
                                    <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: '6px', marginBottom: '12px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', width: '100%', marginBottom: '4px' }}>SHARED ON SOCIAL</div>
                                        {selectedReview.facebookPostUrl && (
                                            <a href={selectedReview.facebookPostUrl} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#4267B2', textDecoration: 'none', fontWeight: '600' }}>
                                                📘 Facebook Post
                                            </a>
                                        )}
                                        {selectedReview.instagramPostUrl && (
                                            <a href={selectedReview.instagramPostUrl} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#C13584', textDecoration: 'none', fontWeight: '600' }}>
                                                📸 Instagram Post
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Manual social post button (for non-5★ or re-post) */}
                                <button
                                    onClick={handlePostSocial}
                                    disabled={isPostingSocial}
                                    style={{
                                        width: '100%', padding: '10px', marginBottom: '10px',
                                        backgroundColor: isPostingSocial ? '#94a3b8' : '#833AB4',
                                        color: 'white', border: 'none', borderRadius: '6px',
                                        fontSize: '13px', fontWeight: '600',
                                        cursor: isPostingSocial ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {isPostingSocial ? '⏳ Posting…' : (selectedReview.facebookPostUrl || selectedReview.instagramPostUrl) ? '🔄 Re-post to Social Media' : '📲 Post to Social Media Only'}
                                </button>

                                <button
                                    onClick={() => navigate('/social-share', { state: { review: selectedReview } })}
                                    style={{
                                        width: '100%', padding: '10px',
                                        backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)', borderRadius: '6px',
                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <span>📤</span> Share Review Page
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
