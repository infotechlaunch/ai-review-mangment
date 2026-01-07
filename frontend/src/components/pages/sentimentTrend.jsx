import React from 'react'

export default function SentimentTrend() {
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
                            <h3 className="widget-title">Trend Analysis</h3>
                            <p style={{ color: '#6c757d', margin: 0 }}>Sentiment trend charts will appear here</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
