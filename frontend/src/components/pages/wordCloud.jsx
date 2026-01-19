import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'

export default function WordCloud() {
    const [positiveWords, setPositiveWords] = useState([])
    const [negativeWords, setNegativeWords] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchWordCloudData()
    }, [])

    const extractKeywords = (text) => {
        const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word))
        
        return words
    }

    const getWordFrequency = (words) => {
        const frequency = {}
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1
        })
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word, count]) => ({
                word: word.charAt(0).toUpperCase() + word.slice(1),
                size: 16 + Math.min(count * 2, 16),
                weight: count
            }))
    }

    const fetchWordCloudData = async () => {
        try {
            setLoading(true)
            const result = await apiRequest('/api/client/reviews')

            if (result.success && result.data) {
                const reviews = result.data.reviews || result.data || []
                
                // Extract keywords from positive reviews
                const positiveReviews = reviews.filter(r => parseInt(r.rating) >= 4)
                const positiveText = positiveReviews.map(r => r.review_text || '').join(' ')
                const positiveKeywords = extractKeywords(positiveText)
                setPositiveWords(getWordFrequency(positiveKeywords))

                // Extract keywords from negative reviews
                const negativeReviews = reviews.filter(r => parseInt(r.rating) <= 2)
                const negativeText = negativeReviews.map(r => r.review_text || '').join(' ')
                const negativeKeywords = extractKeywords(negativeText)
                setNegativeWords(getWordFrequency(negativeKeywords))
            }
            setLoading(false)
        } catch (err) {
            console.error('Error fetching word cloud data:', err)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Word Cloud</h1>
                    <p className="page-subtitle">Loading word cloud data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Word Cloud</h1>
                <p className="page-subtitle">Discover the most frequently mentioned words and phrases in customer reviews</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    {/* Positive Word Cloud */}
                    <div className="grid-col-6">
                        <div className="widget-card">
                            <h3 className="widget-title" style={{ color: '#10b981' }}>
                                ✓ Positive Keywords
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                                Most frequently mentioned positive terms
                            </p>
                            <div style={{ 
                                position: 'relative', 
                                height: '400px', 
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                padding: '24px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                overflow: 'hidden'
                            }}>
                                {positiveWords.map((item, index) => {
                                    const opacity = 0.5 + (item.weight / 200)
                                    return (
                                        <span
                                            key={index}
                                            style={{
                                                fontSize: `${item.size}px`,
                                                fontWeight: '600',
                                                color: `rgba(16, 185, 129, ${opacity})`,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                userSelect: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'scale(1.2)'
                                                e.target.style.color = '#10b981'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'scale(1)'
                                                e.target.style.color = `rgba(16, 185, 129, ${opacity})`
                                            }}
                                            title={`Mentioned ${item.weight} times`}
                                        >
                                            {item.word}
                                        </span>
                                    )
                                })}
                            </div>
                            <div style={{ 
                                marginTop: '16px', 
                                padding: '12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {positiveWords.length === 0 ? (
                                        'No positive keywords found'
                                    ) : (
                                        <>Total positive mentions: <strong style={{ color: '#10b981' }}>
                                            {positiveWords.reduce((sum, w) => sum + w.weight, 0)}
                                        </strong></>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Negative Word Cloud */}
                    <div className="grid-col-6">
                        <div className="widget-card">
                            <h3 className="widget-title" style={{ color: '#ef4444' }}>
                                ✗ Negative Keywords
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                                Most frequently mentioned negative terms
                            </p>
                            <div style={{ 
                                position: 'relative', 
                                height: '400px', 
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                padding: '24px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                overflow: 'hidden'
                            }}>
                                {negativeWords.map((item, index) => {
                                    const opacity = 0.5 + (item.weight / 200)
                                    return (
                                        <span
                                            key={index}
                                            style={{
                                                fontSize: `${item.size}px`,
                                                fontWeight: '600',
                                                color: `rgba(239, 68, 68, ${opacity})`,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                userSelect: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'scale(1.2)'
                                                e.target.style.color = '#ef4444'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'scale(1)'
                                                e.target.style.color = `rgba(239, 68, 68, ${opacity})`
                                            }}
                                            title={`Mentioned ${item.weight} times`}
                                        >
                                            {item.word}
                                        </span>
                                    )
                                })}
                            </div>
                            <div style={{ 
                                marginTop: '16px', 
                                padding: '12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {negativeWords.length === 0 ? (
                                        'No negative keywords found'
                                    ) : (
                                        <>Total negative mentions: <strong style={{ color: '#ef4444' }}>
                                            {negativeWords.reduce((sum, w) => sum + w.weight, 0)}
                                        </strong></>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Insights */}
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Key Insights</h3>
                            <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                                <div style={{ 
                                    flex: 1, 
                                    padding: '16px', 
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #10b981'
                                }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                        Top Positive Theme
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Customers frequently praise the <strong>food quality</strong> and <strong>friendly service</strong>
                                    </div>
                                </div>
                                <div style={{ 
                                    flex: 1, 
                                    padding: '16px', 
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #ef4444'
                                }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                        Area for Improvement
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Main complaints focus on <strong>wait times</strong> and <strong>pricing concerns</strong>
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
