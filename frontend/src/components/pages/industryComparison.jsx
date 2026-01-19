import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'

export default function IndustryComparison() {
    const [stats, setStats] = useState({ avgRating: 0, responseRate: 0, totalReviews: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchComparisonData()
    }, [])

    const fetchComparisonData = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.data) {
                const reviews = result.data.reviews || result.data || []
                const totalReviews = reviews.length
                const avgRating = totalReviews > 0 
                    ? (reviews.reduce((sum, r) => sum + parseInt(r.rating || 0), 0) / totalReviews).toFixed(1)
                    : 0
                const responseRate = totalReviews > 0
                    ? Math.round((reviews.filter(r => r.ai_generated_reply || r.edited_reply).length / totalReviews) * 100)
                    : 0

                setStats({ avgRating: parseFloat(avgRating), responseRate, totalReviews })
            }
            setLoading(false)
        } catch (err) {
            console.error('Error fetching comparison data:', err)
            setLoading(false)
        }
    }

    const industryAvg = { avgRating: 4.2, responseRate: 75 }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Industry Comparison</h1>
                    <p className="page-subtitle">Loading data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Industry Comparison</h1>
                <p className="page-subtitle">Compare your performance metrics against industry standards and benchmarks</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className="grid-col-6">
                        <div className="widget-card">
                            <h3 className="widget-title">Average Rating Comparison</h3>
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Your Business</div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: stats.avgRating >= industryAvg.avgRating ? '#10b981' : '#f59e0b' }}>
                                        {stats.avgRating} ⭐
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Industry Average</div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                        {industryAvg.avgRating} ⭐
                                    </div>
                                </div>
                                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: stats.avgRating >= industryAvg.avgRating ? '#10b981' : '#f59e0b' }}>
                                        {stats.avgRating >= industryAvg.avgRating ? '✓ Above' : '↓ Below'} Industry Average
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        {Math.abs((stats.avgRating - industryAvg.avgRating).toFixed(1))} points difference
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-6">
                        <div className="widget-card">
                            <h3 className="widget-title">Response Rate Comparison</h3>
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Your Business</div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: stats.responseRate >= industryAvg.responseRate ? '#10b981' : '#f59e0b' }}>
                                        {stats.responseRate}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Industry Average</div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                        {industryAvg.responseRate}%
                                    </div>
                                </div>
                                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: stats.responseRate >= industryAvg.responseRate ? '#10b981' : '#f59e0b' }}>
                                        {stats.responseRate >= industryAvg.responseRate ? '✓ Above' : '↓ Below'} Industry Average
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        {Math.abs(stats.responseRate - industryAvg.responseRate)}% difference
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
