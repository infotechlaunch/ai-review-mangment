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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

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
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Welcome back, Super Admin</p>
                    </div>
                </div>
                <div className="loading-message">Loading your review metrics...</div>
            </div>
        )
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, Super Admin</p>
                </div>
            </div>

            {/* Overview Section */}
            <div className="section">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Overview</h2>
                        <p className="section-subtitle">Platform performance statistics</p>
                    </div>
                    <div className="section-actions">
                        <select className="time-select">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                        </select>
                        <button className="download-btn">Download Report</button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card stat-blue">
                        <div className="stat-icon-circle blue">
                            <span className="stat-emoji">📊</span>
                        </div>
                        <div className="stat-info">
                            <div className="stat-change positive">↗ 12%</div>
                            <div className="stat-value">{stats.totalReviews.toLocaleString()}</div>
                            <div className="stat-label">Total Clients</div>
                        </div>
                    </div>

                    <div className="stat-card stat-orange">
                        <div className="stat-icon-circle orange">
                            <span className="stat-emoji">⭐</span>
                        </div>
                        <div className="stat-info">
                            <div className="stat-change positive">↗ 25%</div>
                            <div className="stat-value">{stats.totalReviews.toLocaleString()}</div>
                            <div className="stat-label">Active Reviews</div>
                        </div>
                    </div>

                    <div className="stat-card stat-green">
                        <div className="stat-icon-circle green">
                            <span className="stat-emoji">💰</span>
                        </div>
                        <div className="stat-info">
                            <div className="stat-change positive">↗ 8%</div>
                            <div className="stat-value">${(stats.totalReviews * 365).toLocaleString()}</div>
                            <div className="stat-label">Total Revenue</div>
                        </div>
                    </div>

                    <div className="stat-card stat-purple">
                        <div className="stat-icon-circle purple">
                            <span className="stat-emoji">⭐</span>
                        </div>
                        <div className="stat-info">
                            <div className="stat-change positive">↗ 2%</div>
                            <div className="stat-value">{stats.avgRating}</div>
                            <div className="stat-label">Avg. Rating</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="bottom-grid">
                {/* Recent Clients */}
                <div className="data-card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Clients</h3>
                        <a href="#" className="view-all-link">View All</a>
                    </div>
                    <div className="clients-list">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className="client-item">
                                <div className="client-avatar" style={{
                                    background: ['#a855f7', '#10b981', '#3b82f6', '#a855f7', '#10b981'][num - 1]
                                }}>
                                    <span>C</span>
                                </div>
                                <div className="client-details">
                                    <div className="client-name">Company {num}</div>
                                    <div className="client-email">admin@company{num}.com</div>
                                </div>
                                <div className="client-status active">Active</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Latest Reviews */}
                <div className="data-card">
                    <div className="card-header">
                        <h3 className="card-title">Latest Reviews</h3>
                        <a href="#" className="view-all-link">View Feed</a>
                    </div>
                    <div className="reviews-list">
                        {[
                            { user: 'User 1', time: '5m ago' },
                            { user: 'User 2', time: '10m ago' },
                            { user: 'User 3', time: '15m ago' },
                            { user: 'User 4', time: '20m ago' }
                        ].map((review, idx) => (
                            <div key={idx} className="review-item">
                                <div className="review-header">
                                    <div className="review-user">{review.user}</div>
                                    <div className="review-stars">⭐⭐⭐⭐⭐</div>
                                    <div className="review-time">{review.time}</div>
                                </div>
                                <div className="review-text">
                                    "Great service, the automated replies are a game changer for our business workflow!"
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .page-container {
                    background: #f8fafc;
                    min-height: 100vh;
                    padding: 40px;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 40px;
                }

                .page-title {
                    font-size: 36px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.025em;
                }

                .page-subtitle {
                    font-size: 16px;
                    color: #64748b;
                    margin: 0;
                    font-weight: 500;
                }

                .loading-message {
                    font-size: 18px;
                    color: #475569;
                    text-align: center;
                    padding: 48px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .section {
                    margin-bottom: 40px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 24px;
                }

                .section-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 4px 0;
                }

                .section-subtitle {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                }

                .section-actions {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .time-select {
                    padding: 12px 20px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    transition: all 0.2s;
                }

                .time-select:hover {
                    border-color: #cbd5e0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .download-btn {
                    padding: 12px 24px;
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
                }

                .download-btn:hover {
                    background: #4f46e5;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                }

                .stat-card {
                    background: white;
                    border-radius: 16px;
                    padding: 28px;
                    display: flex;
                    align-items: flex-start;
                    gap: 24px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    transition: all 0.3s ease;
                }

                .stat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.04);
                    border-color: white;
                }

                .stat-icon-circle {
                    width: 60px;
                    height: 60px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 28px;
                }

                .stat-icon-circle.blue {
                    background: #eff6ff;
                    color: #3b82f6;
                    border: 1px solid #dbeafe;
                }

                .stat-icon-circle.orange {
                    background: #fff7ed;
                    color: #f97316;
                    border: 1px solid #ffedd5;
                }

                .stat-icon-circle.green {
                    background: #f0fdf4;
                    color: #22c55e;
                    border: 1px solid #dcfce7;
                }

                .stat-icon-circle.purple {
                    background: #faf5ff;
                    color: #a855f7;
                    border: 1px solid #f3e8ff;
                }

                .stat-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .stat-change {
                    font-size: 13px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    background: #f0fdf4;
                    color: #16a34a;
                    border-radius: 20px;
                    width: fit-content;
                }

                .stat-value {
                    font-size: 32px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                    margin-bottom: 4px;
                    letter-spacing: -0.05em;
                }

                .stat-label {
                    font-size: 14px;
                    color: #64748b;
                    font-weight: 600;
                }

                .bottom-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                    gap: 32px;
                }

                .data-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    padding: 32px;
                    height: 100%;
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 0;
                    border-bottom: none;
                }

                .card-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }

                .view-all-link {
                    font-size: 14px;
                    font-weight: 600;
                    color: #6366f1;
                    text-decoration: none;
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .view-all-link:hover {
                    color: #4f46e5;
                }

                .clients-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .client-item {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 16px;
                    border-radius: 12px;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }

                .client-item:hover {
                    background: #f8fafc;
                    border-color: #e2e8f0;
                }

                .client-avatar {
                    width: 52px;
                    height: 52px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 22px;
                    font-weight: 700;
                    flex-shrink: 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .client-details {
                    flex: 1;
                }

                .client-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 4px;
                }

                .client-email {
                    font-size: 14px;
                    color: #64748b;
                }

                .client-status {
                    padding: 6px 16px;
                    border-radius: 9999px;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.025em;
                }

                .client-status.active {
                    background: #f0fdf4;
                    color: #16a34a;
                    border: 1px solid #dcfce7;
                }

                .reviews-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .review-item {
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    transition: all 0.2s;
                }

                .review-item:hover {
                    background: #fff;
                    border-color: #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }

                .review-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .review-user {
                    font-size: 15px;
                    font-weight: 700;
                    color: #1e293b;
                }

                .review-stars {
                    font-size: 14px;
                    letter-spacing: 2px;
                }

                .review-time {
                    font-size: 12px;
                    color: #94a3b8;
                    margin-left: auto;
                    font-weight: 500;
                }

                .review-text {
                    font-size: 15px;
                    color: #475569;
                    line-height: 1.6;
                }

                @media (max-width: 1024px) {
                    .bottom-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .page-container {
                        padding: 20px;
                    }

                    .page-header {
                        flex-direction: column;
                        gap: 16px;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                    }

                    .section-actions {
                        width: 100%;
                    }

                    .time-select,
                    .download-btn {
                        flex: 1;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    )
}