import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'
import './common.css'

export default function SentimentMap() {
  const [sentimentByCategory, setSentimentByCategory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSentimentData()
  }, [])

  const fetchSentimentData = async () => {
    try {
      setLoading(true)
      const result = await apiRequest('/api/client/reviews')

      if (result.success && result.data) {
        const reviews = result.data.reviews || result.data || []
        
        // Calculate sentiment by rating distribution
        const ratingCategories = [
          { category: '5 Star Reviews', rating: 5 },
          { category: '4 Star Reviews', rating: 4 },
          { category: '3 Star Reviews', rating: 3 },
          { category: '2 Star Reviews', rating: 2 },
          { category: '1 Star Reviews', rating: 1 }
        ]

        const categoryData = ratingCategories.map(cat => {
          const categoryReviews = reviews.filter(r => parseInt(r.rating) === cat.rating)
          const total = categoryReviews.length
          const positive = cat.rating >= 4 ? total : 0
          const neutral = cat.rating === 3 ? total : 0
          const negative = cat.rating <= 2 ? total : 0
          const totalReviews = reviews.length

          return {
            category: cat.category,
            positive: totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0,
            neutral: totalReviews > 0 ? Math.round((neutral / totalReviews) * 100) : 0,
            negative: totalReviews > 0 ? Math.round((negative / totalReviews) * 100) : 0,
            count: total
          }
        }).filter(cat => cat.count > 0)

        setSentimentByCategory(categoryData)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching sentiment data:', err)
      setLoading(false)
    }
  }

  const getOverallSentiment = (positive, negative) => {
    if (positive >= 80) return { color: '#10b981', label: 'Excellent' }
    if (positive >= 70) return { color: '#34d399', label: 'Good' }
    if (positive >= 60) return { color: '#fbbf24', label: 'Average' }
    return { color: '#ef4444', label: 'Needs Attention' }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Sentiment Map</h1>
        <p className="page-subtitle">Analyze sentiment distribution across different review categories</p>
      </div>
      <div className="page-content">
        <div className="grid-container">
          <div className="grid-col-12">
            <div className="widget-card">
              <h3 className="widget-title">Sentiment by Category</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                Horizontal bar charts showing sentiment breakdown for each category
              </p>
              
              <div style={{ marginTop: '24px' }}>
                {sentimentByCategory.map((item, index) => {
                  const overall = getOverallSentiment(item.positive, item.negative)
                  return (
                    <div key={index} style={{ marginBottom: '24px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '8px' 
                      }}>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: 'var(--text-primary)' 
                        }}>
                          {item.category}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '12px', 
                            color: overall.color,
                            fontWeight: '600',
                            padding: '2px 8px',
                            backgroundColor: overall.color + '20',
                            borderRadius: '4px'
                          }}>
                            {overall.label}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                            {item.positive}% positive
                          </span>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        height: '40px', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-tertiary)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        {item.positive > 0 && (
                          <div 
                            style={{ 
                              width: `${item.positive}%`, 
                              backgroundColor: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.3s ease'
                            }}
                            title={`Positive: ${item.positive}%`}
                          >
                            {item.positive >= 15 && `${item.positive}%`}
                          </div>
                        )}
                        {item.neutral > 0 && (
                          <div 
                            style={{ 
                              width: `${item.neutral}%`, 
                              backgroundColor: '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.3s ease'
                            }}
                            title={`Neutral: ${item.neutral}%`}
                          >
                            {item.neutral >= 15 && `${item.neutral}%`}
                          </div>
                        )}
                        {item.negative > 0 && (
                          <div 
                            style={{ 
                              width: `${item.negative}%`, 
                              backgroundColor: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.3s ease'
                            }}
                            title={`Negative: ${item.negative}%`}
                          >
                            {item.negative >= 15 && `${item.negative}%`}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '24px', 
                marginTop: '32px', 
                justifyContent: 'center',
                padding: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: '#10b981', 
                    borderRadius: '3px' 
                  }}></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Positive</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: '#f59e0b', 
                    borderRadius: '3px' 
                  }}></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Neutral</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: '#ef4444', 
                    borderRadius: '3px' 
                  }}></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Negative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
