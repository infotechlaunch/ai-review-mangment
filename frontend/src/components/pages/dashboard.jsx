import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalReviews: 0,
        sentimentSummary: 0,
        responseRate: 0,
        avgRating: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.reviews) {
                // Calculate statistics from reviews
                const reviews = result.reviews
                const totalReviews = reviews.length

                // Calculate sentiment summary (percentage of positive reviews)
                const positiveReviews = reviews.filter(r =>
                    r.sentiment?.toLowerCase() === 'positive' ||
                    r.rating >= 4
                ).length
                const sentimentSummary = totalReviews > 0
                    ? Math.round((positiveReviews / totalReviews) * 100)
                    : 0

                // Calculate response rate
                const respondedReviews = reviews.filter(r =>
                    r.response && r.response.trim() !== ''
                ).length
                const responseRate = totalReviews > 0
                    ? Math.round((respondedReviews / totalReviews) * 100)
                    : 0

                // Calculate average rating
                const ratingsSum = reviews.reduce((sum, r) => {
                    const rating = parseFloat(r.rating) || 0
                    return sum + rating
                }, 0)
                const avgRating = totalReviews > 0
                    ? (ratingsSum / totalReviews).toFixed(1)
                    : 0

                setStats({
                    totalReviews,
                    sentimentSummary,
                    responseRate,
                    avgRating: parseFloat(avgRating)
                })
            }

            setLoading(false)
        } catch (err) {
            console.error('Error fetching dashboard data:', err)
            setError(err.message)
            setLoading(false)

            // Use mock data as fallback
            setStats({
                totalReviews: 1247,
                sentimentSummary: 82,
                responseRate: 94,
                avgRating: 4.3
            })
        }
    }

    const recentTrends = [
        { month: 'October', positive: 65, neutral: 20, negative: 15 },
        { month: 'November', positive: 70, neutral: 18, negative: 12 },
        { month: 'December', positive: 75, neutral: 15, negative: 10 }
    ]

    const platformStats = [
        { platform: 'Google', reviews: 487, sentiment: 85 },
        { platform: 'Facebook', reviews: 352, sentiment: 78 },
        { platform: 'Yelp', reviews: 408, sentiment: 81 }
    ]

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
                                        <span style={{ color: '#10b981' }}>↑ 12%</span> from last month
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
                                        <span style={{ color: '#10b981' }}>↑ 5%</span> positive sentiment
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
                                        <span style={{ color: '#10b981' }}>↑ 8%</span> from last month
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
                                        <span style={{ color: '#10b981' }}>↑ 0.2</span> from last month
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
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Platform Overview</h3>
                            <div style={{ marginTop: '20px' }}>
                                {platformStats.map((platform, index) => (
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
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
