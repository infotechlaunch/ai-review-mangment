import React from 'react'

export default function Reviews() {
    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Reviews</h1>
                <p className="page-subtitle">Manage and view all customer reviews in one place</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">All Reviews</h3>
                            <p style={{ color: '#6c757d', margin: 0 }}>Review list will appear here</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
