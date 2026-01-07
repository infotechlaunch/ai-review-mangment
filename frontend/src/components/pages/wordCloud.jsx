import React from 'react'

export default function WordCloud() {
    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Word Cloud</h1>
                <p className="page-subtitle">Discover the most frequently mentioned words and phrases in customer reviews</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Keyword Analysis</h3>
                            <p style={{ color: '#6c757d', margin: 0 }}>Word cloud visualization will appear here</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
