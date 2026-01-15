import React from 'react'

export default function WordCloud() {
    // Mock data for positive and negative keywords
    const positiveWords = [
        { word: 'Excellent', size: 32, weight: 95 },
        { word: 'Amazing', size: 28, weight: 88 },
        { word: 'Delicious', size: 30, weight: 92 },
        { word: 'Friendly', size: 26, weight: 85 },
        { word: 'Great', size: 24, weight: 82 },
        { word: 'Perfect', size: 22, weight: 78 },
        { word: 'Outstanding', size: 20, weight: 75 },
        { word: 'Wonderful', size: 19, weight: 72 },
        { word: 'Fantastic', size: 21, weight: 76 },
        { word: 'Impressive', size: 18, weight: 70 },
        { word: 'Quality', size: 23, weight: 80 },
        { word: 'Professional', size: 19, weight: 73 },
        { word: 'Clean', size: 17, weight: 68 },
        { word: 'Fast', size: 18, weight: 71 },
        { word: 'Recommend', size: 25, weight: 84 }
    ]

    const negativeWords = [
        { word: 'Slow', size: 28, weight: 88 },
        { word: 'Disappointing', size: 24, weight: 82 },
        { word: 'Poor', size: 26, weight: 85 },
        { word: 'Rude', size: 22, weight: 78 },
        { word: 'Overpriced', size: 20, weight: 75 },
        { word: 'Cold', size: 19, weight: 72 },
        { word: 'Dirty', size: 21, weight: 76 },
        { word: 'Waited', size: 23, weight: 80 },
        { word: 'Expensive', size: 18, weight: 70 },
        { word: 'Unprofessional', size: 19, weight: 73 },
        { word: 'Terrible', size: 25, weight: 84 },
        { word: 'Awful', size: 20, weight: 74 },
        { word: 'Bad', size: 17, weight: 68 }
    ]

    const getRandomPosition = (index, total) => {
        const cols = Math.ceil(Math.sqrt(total))
        const row = Math.floor(index / cols)
        const col = index % cols
        return {
            x: (col * 100 / cols) + (Math.random() * 15 - 7.5),
            y: (row * 100 / Math.ceil(total / cols)) + (Math.random() * 15 - 7.5)
        }
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
                                    Total positive mentions: <strong style={{ color: '#10b981' }}>1,248</strong>
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
                                    Total negative mentions: <strong style={{ color: '#ef4444' }}>387</strong>
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
