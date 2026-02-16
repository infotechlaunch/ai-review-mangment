import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'
import './common.css'

export default function ProsCons() {
    const [pros, setPros] = useState([])
    const [cons, setCons] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProsConsData()
    }, [])

    const fetchProsConsData = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.data) {
                const reviews = result.data.reviews || result.data || []
                
                // Extract pros from positive reviews
                const positiveReviews = reviews.filter(r => parseInt(r.rating) >= 4)
                const prosData = positiveReviews.slice(0, 10).map((r, i) => ({
                    id: i + 1,
                    text: r.review_text?.substring(0, 150) + '...' || 'Positive feedback',
                    reviewer: r.reviewer_name,
                    rating: r.rating
                }))

                // Extract cons from negative reviews
                const negativeReviews = reviews.filter(r => parseInt(r.rating) <= 2)
                const consData = negativeReviews.slice(0, 10).map((r, i) => ({
                    id: i + 1,
                    text: r.review_text?.substring(0, 150) + '...' || 'Negative feedback',
                    reviewer: r.reviewer_name,
                    rating: r.rating
                }))

                setPros(prosData)
                setCons(consData)
            }
            setLoading(false)
        } catch (err) {
            console.error('Error fetching pros/cons data:', err)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Pros & Cons</h1>
                    <p className="page-subtitle">Loading data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Pros & Cons</h1>
                <p className="page-subtitle">Comprehensive analysis of positive and negative aspects from customer feedback</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className="grid-col-6">
                        <div className="widget-card">
                            <h3 className="widget-title" style={{ color: '#10b981' }}>✓ Pros ({pros.length})</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Positive feedback from customers</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {pros.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px' }}>No positive reviews yet</p>
                                ) : (
                                    pros.map(pro => (
                                        <div key={pro.id} style={{
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #10b981'
                                        }}>
                                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                                {pro.text}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', gap: '12px' }}>
                                                <span>{'⭐'.repeat(pro.rating)}</span>
                                                <span>- {pro.reviewer}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid-col-6">
                        <div className="widget-card">
                            <h3 className="widget-title" style={{ color: '#ef4444' }}>✗ Cons ({cons.length})</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Areas for improvement</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {cons.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px' }}>No negative reviews found</p>
                                ) : (
                                    cons.map(con => (
                                        <div key={con.id} style={{
                                            padding: '16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #ef4444'
                                        }}>
                                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                                {con.text}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', gap: '12px' }}>
                                                <span>{'⭐'.repeat(con.rating)}</span>
                                                <span>- {con.reviewer}</span>
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
