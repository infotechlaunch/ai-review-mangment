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
    const [clientInfo, setClientInfo] = useState(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncMessage, setSyncMessage] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const syncFromPlaces = async () => {
        setIsSyncing(true);
        setSyncMessage('🔄 Syncing...');
        
        try {
            const data = await apiRequest('/api/reviews/fetch-places', {
                method: 'POST',
                body: JSON.stringify({})
            });

            if (data.success) {
                const newReviewsCount = data.data?.newReviews || 0;
                setSyncMessage(`✓ Synced ${newReviewsCount} new reviews`);
                await fetchDashboardData(); 
            } else {
                setSyncMessage(`❌ ${data.message || 'Failed to fetch reviews'}`);
            }
        } catch (err) {
            console.error('Fetch reviews error:', err);
            setSyncMessage(`❌ ${err.message || 'Error fetching reviews'}`);
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            console.log('🔄 Fetching dashboard data...')
            
            const result = await apiRequest('/api/client/reviews')
            console.log('📊 API Response:', result)

            if (result.success && result.data) {
                if (result.data.client) {
                    setClientInfo(result.data.client)
                }

                const reviews = result.data.reviews || result.data || []
                console.log(`✅ Received ${reviews.length} reviews`)
                
                if (reviews.length > 0) {
                    console.log('📝 Sample review:', reviews[0])
                }
                
                const totalReviews = reviews.length

                const positiveReviews = reviews.filter(r =>
                    r.sentiment?.toLowerCase() === 'positive' ||
                    parseInt(r.rating) >= 4
                ).length
                const sentimentSummary = totalReviews > 0
                    ? Math.round((positiveReviews / totalReviews) * 100)
                    : 0

                const respondedReviews = reviews.filter(r =>
                    r.ai_generated_reply || r.edited_reply || r.final_caption
                ).length
                const responseRate = totalReviews > 0
                    ? Math.round((respondedReviews / totalReviews) * 100)
                    : 0

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

                const trendsData = calculateMonthlyTrends(reviews)
                console.log('📊 Trends data:', trendsData)
                setRecentTrends(trendsData)

                setPlatformStats([{
                    platform: 'Google',
                    reviews: totalReviews,
                    sentiment: sentimentSummary
                }])
            } else {
                console.warn('⚠️ No data in response or success is false')
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
        
        for (let i = 2; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthName = monthDate.toLocaleString('default', { month: 'long' })
            const monthYear = monthDate.getFullYear()
            const monthNum = monthDate.getMonth()

            const monthReviews = reviews.filter(r => {
                const dateStr = r.review_created_at || r.Timestamp || r.timestamp || r.review_time || r.createTime || r.approved_at
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
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Monitor and analyze your AI review management metrics at a glance</p>
                    </div>
                </div>
                <div className="loading-message">
                    Loading your review metrics...
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Monitor and analyze your AI review management metrics at a glance</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                    <button
                        onClick={syncFromPlaces}
                        disabled={isSyncing}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isSyncing ? 'var(--bg-tertiary)' : '#4285F4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isSyncing ? '🔄 Syncing...' : '🔍 Sync Google (Places)'}
                    </button>
                    <span className="user-badge">
                        {clientInfo?.businessName || localStorage.getItem('businessName') || 'Client'}
                    </span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Total Reviews</span>
                        <span className="metric-icon">⭐</span>
                    </div>
                    <div className="metric-value">{stats.totalReviews}</div>
                    <div className="metric-sub">Across all connected platforms</div>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Sentiment Summary</span>
                        <span className="metric-icon">😊</span>
                    </div>
                    <div className="metric-value">{stats.sentimentSummary}%</div>
                    <div className="metric-sub">Positive sentiment rate</div>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Response Rate</span>
                        <span className="metric-icon">💬</span>
                    </div>
                    <div className="metric-value">{stats.responseRate}%</div>
                    <div className="metric-sub">Reviews with responses</div>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Average Rating</span>
                        <span className="metric-icon">📊</span>
                    </div>
                    <div className="metric-value">{stats.avgRating}</div>
                    <div className="metric-sub">Out of 5 stars</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Sentiment Trends */}
                <div className="chart-card trends-card">
                    <h3 className="card-title">Sentiment Trends (Last 3 Months)</h3>
                    
                    <div className="trends-list">
                        {recentTrends.map((trend, index) => (
                            <div key={index} className="trend-item">
                                <div className="trend-label">{trend.month}</div>
                                <div className="trend-bar-container">
                                    <div className="trend-bar">
                                        {trend.positive > 0 && (
                                            <div 
                                                className="bar-segment positive" 
                                                style={{ width: `${trend.positive}%` }} 
                                            />
                                        )}
                                        {trend.neutral > 0 && (
                                            <div 
                                                className="bar-segment neutral" 
                                                style={{ width: `${trend.neutral}%` }} 
                                            />
                                        )}
                                        {trend.negative > 0 && (
                                            <div 
                                                className="bar-segment negative" 
                                                style={{ width: `${trend.negative}%` }} 
                                            />
                                        )}
                                    </div>
                                    <span className="trend-value-label">
                                        {trend.positive}%
                                    </span>
                                </div>
                            </div>
                        ))}
                        {recentTrends.length === 0 && (
                            <div className="no-data-message">No trend data available</div>
                        )}
                    </div>

                    <div className="chart-legend">
                        <div className="legend-item">
                            <span className="dot positive"></span> Positive
                        </div>
                        <div className="legend-item">
                            <span className="dot neutral"></span> Neutral
                        </div>
                        <div className="legend-item">
                            <span className="dot negative"></span> Negative
                        </div>
                    </div>
                </div>

                {/* Platform Overview */}
                <div className="chart-card platform-card">
                    <h3 className="card-title">Platform Overview</h3>
                    
                    <div className="platforms-list">
                        {platformStats.map((platform, index) => (
                            <div key={index} className="platform-item">
                                <div className="platform-info">
                                    <div className="platform-name">{platform.platform}</div>
                                    <div className="platform-count">{platform.reviews} reviews</div>
                                </div>
                                <div className="platform-score positive">
                                    {platform.sentiment}%
                                </div>
                            </div>
                        ))}
                         {platformStats.length === 0 && (
                            <div className="no-data-message">No platform data available</div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .page-container {
                    padding: 40px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 40px;
                }

                .page-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 8px 0;
                }

                .page-subtitle {
                    font-size: 15px;
                    color: #64748b;
                    margin: 0;
                }

                .user-badge {
                    background: #e0e7ff;
                    color: #4f46e5;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                /* Metrics Grid */
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .metric-card {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04);
                    border: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: column;
                }

                .metric-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .metric-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                }

                .metric-icon {
                    font-size: 20px;
                }

                .metric-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 8px;
                    line-height: 1;
                }

                .metric-sub {
                    font-size: 13px;
                    color: #94a3b8;
                }

                /* Charts Grid */
                .charts-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 24px;
                }

                .chart-card {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04);
                    border: 1px solid #f1f5f9;
                }

                .card-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0 0 24px 0;
                }

                /* Trends Chart */
                .trends-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    margin-bottom: 24px;
                }

                .trend-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .trend-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #475569;
                }

                .trend-bar-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    height: 32px;
                }

                .trend-bar {
                    flex: 1;
                    height: 100%;
                    background: #f1f5f9;
                    border-radius: 6px;
                    display: flex;
                    overflow: hidden;
                }

                .bar-segment {
                    height: 100%;
                }

                .bar-segment.positive { background-color: #10b981; }
                .bar-segment.neutral { background-color: #f59e0b; }
                .bar-segment.negative { background-color: #ef4444; }

                .trend-value-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    min-width: 32px;
                    text-align: right;
                }

                .chart-legend {
                    display: flex;
                    justify-content: center;
                    gap: 24px;
                    margin-top: 16px;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: #64748b;
                }

                .dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                }
                .dot.positive { background-color: #10b981; }
                .dot.neutral { background-color: #f59e0b; }
                .dot.negative { background-color: #ef4444; }

                /* Platform Overview */
                .platforms-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .platform-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px;
                    background: #f8fafc;
                    border-radius: 8px;
                }

                .platform-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 4px;
                }

                .platform-count {
                    font-size: 13px;
                    color: #64748b;
                }

                .platform-score {
                    font-size: 16px;
                    font-weight: 700;
                    color: #10b981;
                }

                .loading-message {
                    font-size: 16px;
                    color: #64748b;
                    text-align: center;
                    margin-top: 40px;
                }
                
                .no-data-message {
                    text-align: center;
                    color: #94a3b8;
                    font-size: 14px;
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 8px;
                }

                @media (max-width: 1024px) {
                    .charts-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .page-container {
                        padding: 20px;
                    }
                    .metrics-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}