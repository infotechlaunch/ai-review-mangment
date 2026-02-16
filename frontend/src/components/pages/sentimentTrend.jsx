import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'
import './common.css'

export default function SentimentTrend() {
    const [trendData, setTrendData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTrendData()
    }, [])

    const fetchTrendData = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.data) {
                const reviews = result.data.reviews || result.data || []
                
                // Calculate monthly trends for last 6 months
                const now = new Date()
                const months = []
                
                for (let i = 5; i >= 0; i--) {
                    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
                    const monthName = monthDate.toLocaleString('default', { month: 'short' })
                    const monthReviews = reviews.filter(r => {
                        const reviewDate = new Date(r.Timestamp || r.timestamp)
                        return reviewDate.getMonth() === monthDate.getMonth() && 
                               reviewDate.getFullYear() === monthDate.getFullYear()
                    })

                    const positive = monthReviews.filter(r => parseInt(r.rating) >= 4).length
                    const total = monthReviews.length

                    months.push({
                        month: monthName,
                        positive: total > 0 ? Math.round((positive / total) * 100) : 0,
                        total: total
                    })
                }

                setTrendData(months)
            }
            setLoading(false)
        } catch (err) {
            console.error('Error fetching trend data:', err)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Sentiment Trend</h1>
                    <p className="page-subtitle">Loading trend data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Sentiment Trend</h1>
                <p className="page-subtitle">Track and analyze sentiment changes and patterns over time</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Sentiment Trend (Last 6 Months)</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>Track positive sentiment percentage over time</p>
                            <div style={{ display: 'flex', gap: '20px', marginTop: '32px', alignItems: 'flex-end', height: '300px' }}>
                                {trendData.map((data, index) => (
                                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {data.positive}%
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: `${data.positive * 2}px`,
                                            backgroundColor: data.positive >= 70 ? '#10b981' : data.positive >= 50 ? '#f59e0b' : '#ef4444',
                                            borderRadius: '8px 8px 0 0',
                                            transition: 'all 0.3s ease'
                                        }} />
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                            {data.month}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            ({data.total})
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
