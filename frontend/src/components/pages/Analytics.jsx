import React from 'react'
import { Link } from 'react-router-dom'

export default function Analytics() {
    const analyticsCards = [
        {
            title: 'Sentiment Map',
            description: 'View sentiment distribution across different review categories',
            icon: '📊',
            path: '/sentiment-map',
            color: '#3b82f6'
        },
        {
            title: 'Word Cloud',
            description: 'Discover most frequently mentioned keywords in reviews',
            icon: '☁️',
            path: '/word-cloud',
            color: '#8b5cf6'
        },
        {
            title: 'Industry Comparison',
            description: 'Compare your performance against industry benchmarks',
            icon: '📈',
            path: '/industry-comparison',
            color: '#10b981'
        },
        {
            title: 'Sentiment Trend',
            description: 'Track sentiment changes over time',
            icon: '📉',
            path: '/sentiment-trend',
            color: '#f59e0b'
        },
        {
            title: 'Pros & Cons',
            description: 'Analyze strengths and weaknesses from customer feedback',
            icon: '⚖️',
            path: '/pros-cons',
            color: '#ef4444'
        }
    ]

    // Quick stats
    const quickStats = [
        { label: 'Total Reviews', value: '1,247', change: '+12%', positive: true },
        { label: 'Avg Sentiment', value: '82%', change: '+5%', positive: true },
        { label: 'Response Rate', value: '94%', change: '+8%', positive: true },
        { label: 'Avg Rating', value: '4.3', change: '+0.2', positive: true }
    ]

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Analytics Dashboard</h1>
                <p className="page-subtitle">Access comprehensive analytics tools to gain insights from your customer reviews</p>
            </div>
            <div className="page-content">
                {/* Quick Stats */}
                <div className="grid-container">
                    {quickStats.map((stat, index) => (
                        <div key={index} className="grid-col-3">
                            <div className="widget-card">
                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                                    {stat.label}
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                    {stat.value}
                                </div>
                                <div style={{ 
                                    fontSize: '13px', 
                                    color: stat.positive ? '#10b981' : '#ef4444',
                                    fontWeight: '600'
                                }}>
                                    {stat.positive ? '↑' : '↓'} {stat.change} from last month
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Analytics Tools */}
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Analytics Tools</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                                Select an analytics tool to dive deeper into your review data
                            </p>

                            <div style={{ 
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '20px'
                            }}>
                                {analyticsCards.map((card, index) => (
                                    <Link
                                        key={index}
                                        to={card.path}
                                        style={{
                                            textDecoration: 'none',
                                            color: 'inherit'
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: '24px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '12px',
                                                border: '2px solid var(--border-color)',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)'
                                                e.currentTarget.style.borderColor = card.color
                                                e.currentTarget.style.boxShadow = `0 8px 16px ${card.color}20`
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)'
                                                e.currentTarget.style.borderColor = 'var(--border-color)'
                                                e.currentTarget.style.boxShadow = 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                backgroundColor: card.color + '20',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '28px',
                                                marginBottom: '16px'
                                            }}>
                                                {card.icon}
                                            </div>
                                            <h4 style={{
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px',
                                                margin: '0 0 8px 0'
                                            }}>
                                                {card.title}
                                            </h4>
                                            <p style={{
                                                fontSize: '13px',
                                                color: 'var(--text-tertiary)',
                                                lineHeight: '1.5',
                                                margin: 0,
                                                flex: 1
                                            }}>
                                                {card.description}
                                            </p>
                                            <div style={{
                                                marginTop: '16px',
                                                paddingTop: '16px',
                                                borderTop: '1px solid var(--border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span style={{
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: card.color
                                                }}>
                                                    View Details
                                                </span>
                                                <span style={{
                                                    fontSize: '18px',
                                                    color: card.color
                                                }}>
                                                    →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Insights */}
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Recent Insights</h3>
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px' 
                                }}>
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #10b981'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600',
                                                color: 'var(--text-primary)'
                                            }}>
                                                Positive Trend Detected
                                            </span>
                                            <span style={{ 
                                                fontSize: '12px',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                2 hours ago
                                            </span>
                                        </div>
                                        <div style={{ 
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.5'
                                        }}>
                                            Customer satisfaction with "service quality" has increased by 15% in the last week
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #f59e0b'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600',
                                                color: 'var(--text-primary)'
                                            }}>
                                                Area for Improvement
                                            </span>
                                            <span style={{ 
                                                fontSize: '12px',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                5 hours ago
                                            </span>
                                        </div>
                                        <div style={{ 
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.5'
                                        }}>
                                            "Wait time" mentions have increased by 8%. Consider reviewing your service process
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #3b82f6'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600',
                                                color: 'var(--text-primary)'
                                            }}>
                                                New Keyword Emerging
                                            </span>
                                            <span style={{ 
                                                fontSize: '12px',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                1 day ago
                                            </span>
                                        </div>
                                        <div style={{ 
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.5'
                                        }}>
                                            "Innovative" is being mentioned more frequently in positive reviews
                                        </div>
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
