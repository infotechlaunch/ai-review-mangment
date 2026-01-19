import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalReviews: 0,
        sentimentSummary: 0,
        responseRate: 0,
        avgRating: 0
    })
    const [recentTrends, setRecentTrends] = useState([])
    const [platformStats, setPlatformStats] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Always fetch dashboard data when component mounts
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            console.log('🔄 Fetching dashboard data...')
            
            const result = await apiRequest('/api/client/reviews')
            console.log('📊 API Response:', result)

            if (result.success && result.data) {
                // Extract reviews from paginated response
                const reviews = result.data.reviews || result.data || []
                console.log(`✅ Received ${reviews.length} reviews`)
                
                if (reviews.length > 0) {
                    console.log('📝 Sample review:', reviews[0])
                }
                
                const totalReviews = reviews.length

                // Calculate sentiment summary (percentage of positive reviews)
                const positiveReviews = reviews.filter(r =>
                    r.sentiment?.toLowerCase() === 'positive' ||
                    parseInt(r.rating) >= 4
                ).length
                const sentimentSummary = totalReviews > 0
                    ? Math.round((positiveReviews / totalReviews) * 100)
                    : 0

                // Calculate response rate
                const respondedReviews = reviews.filter(r =>
                    r.ai_generated_reply || r.edited_reply || r.final_caption
                ).length
                const responseRate = totalReviews > 0
                    ? Math.round((respondedReviews / totalReviews) * 100)
                    : 0

                // Calculate average rating
                const ratingsSum = reviews.reduce((sum, r) => {
                    const rating = parseInt(r.rating) || 0
                    return sum + rating
                }, 0)
                const avgRating = totalReviews > 0
                    ? (ratingsSum / totalReviews).toFixed(1)
                    : 0

                console.log('📈 Calculated stats:', {
                    totalReviews,
                    sentimentSummary,
                    responseRate,
                    avgRating
                })

                setStats({
                    totalReviews,
                    sentimentSummary,
                    responseRate,
                    avgRating: parseFloat(avgRating)
                })

                // Calculate trends for last 3 months from real data
                const trendsData = calculateMonthlyTrends(reviews)
                console.log('📊 Trends data:', trendsData)
                setRecentTrends(trendsData)

                // Set platform stats
                setPlatformStats([{
                    platform: 'Google',
                    reviews: totalReviews,
                    sentiment: sentimentSummary
                }])
            } else {
                console.warn('⚠️ No data in response or success is false')
                // No reviews yet
                setStats({
                    totalReviews: 0,
                    sentimentSummary: 0,
                    responseRate: 0,
                    avgRating: 0
                })
                setRecentTrends([])
                setPlatformStats([])
            }

            setLoading(false)
        } catch (err) {
            console.error('❌ Error fetching dashboard data:', err)
            console.error('Error details:', err.message)
            setError(err.message)
            setLoading(false)
        }
    }

    const calculateMonthlyTrends = (reviews) => {
        const now = new Date()
        const months = []
        
        // Get last 3 months
        for (let i = 2; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthName = monthDate.toLocaleString('default', { month: 'long' })
            const monthYear = monthDate.getFullYear()
            const monthNum = monthDate.getMonth()

            // Filter reviews for this month
            const monthReviews = reviews.filter(r => {
                // Try multiple date field variations
                const dateStr = r.Timestamp || r.timestamp || r.review_time || r.createTime || r.approved_at
                if (!dateStr) return false
                
                const reviewDate = new Date(dateStr)
                return reviewDate.getMonth() === monthNum && 
                       reviewDate.getFullYear() === monthYear
            })

            const total = monthReviews.length

            if (total > 0) {
                const positive = monthReviews.filter(r =>
                    r.sentiment?.toLowerCase() === 'positive' || parseInt(r.rating) >= 4
                ).length
                const negative = monthReviews.filter(r =>
                    r.sentiment?.toLowerCase() === 'negative' || parseInt(r.rating) <= 2
                ).length
                const neutral = total - positive - negative

                months.push({
                    month: monthName,
                    positive: Math.round((positive / total) * 100),
                    neutral: Math.round((neutral / total) * 100),
                    negative: Math.round((negative / total) * 100)
                })
            } else {
                months.push({
                    month: monthName,
                    positive: 0,
                    neutral: 0,
                    negative: 0
                })
            }
        }

        return months
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Loading your review metrics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Monitor and analyze your AI review management metrics at a glance</p>
            </div>
            <div className="page-content">
                {/* Key Metrics Cards */}
                <div className="grid-container">
                    <div className="grid-col-3">
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 className="widget-title">Total Reviews</h3>
                                    <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
                                        {stats.totalReviews.toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>
                                        From spreadsheet data
                                    </p>
                                </div>
                                <div style={{ fontSize: '32px' }}>⭐</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-3">
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 className="widget-title">Sentiment Summary</h3>
                                    <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
                                        {stats.sentimentSummary}%
                                    </p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>
                                        Positive sentiment rate
                                    </p>
                                </div>
                                <div style={{ fontSize: '32px' }}>😊</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-3">
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 className="widget-title">Response Rate</h3>
                                    <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
                                        {stats.responseRate}%
                                    </p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>
                                        Reviews with responses
                                    </p>
                                </div>
                                <div style={{ fontSize: '32px' }}>💬</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-3">
                        <div className="widget-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 className="widget-title">Average Rating</h3>
                                    <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
                                        {stats.avgRating}
                                    </p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>
                                        Out of 5 stars
                                    </p>
                                </div>
                                <div style={{ fontSize: '32px' }}>📊</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sentiment Trends - Last 3 Months */}
                <div className="grid-container">
                    <div className="grid-col-8">
                        <div className="widget-card">
                            <h3 className="widget-title">Sentiment Trends (Last 3 Months)</h3>
                            <div style={{ marginTop: '20px' }}>
                                {recentTrends.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                                        <p>No review data available yet</p>
                                        <p style={{ fontSize: '13px', marginTop: '8px' }}>Start by fetching reviews from your Google Business Profile</p>
                                    </div>
                                ) : (
                                    <>
                                        {recentTrends.map((trend, index) => (
                                            <div key={index} style={{ marginBottom: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                                        {trend.month}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                                        {trend.positive + trend.neutral + trend.negative}%
                                                    </span>
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    height: '32px',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    backgroundColor: 'var(--bg-tertiary)'
                                                }}>
                                                    {trend.positive > 0 && (
                                                        <div style={{
                                                            width: `${trend.positive}%`,
                                                            backgroundColor: '#10b981',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontSize: '12px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {trend.positive}%
                                                        </div>
                                                    )}
                                                    {trend.neutral > 0 && (
                                                        <div style={{
                                                            width: `${trend.neutral}%`,
                                                            backgroundColor: '#f59e0b',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontSize: '12px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {trend.neutral}%
                                                        </div>
                                                    )}
                                                    {trend.negative > 0 && (
                                                        <div style={{
                                                            width: `${trend.negative}%`,
                                                            backgroundColor: '#ef4444',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontSize: '12px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {trend.negative}%
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: '20px', marginTop: '24px', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Positive</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Neutral</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }}></div>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Negative</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Platform Overview</h3>
                            <div style={{ marginTop: '20px' }}>
                                {platformStats.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                                        <p>No platform data available</p>
                                    </div>
                                ) : (
                                    platformStats.map((platform, index) => (
                                        <div key={index} style={{
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                        {platform.platform}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                        {platform.reviews} reviews
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '18px',
                                                    fontWeight: '700',
                                                    color: platform.sentiment >= 80 ? '#10b981' : '#f59e0b'
                                                }}>
                                                    {platform.sentiment}%
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
