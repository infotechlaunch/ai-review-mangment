import React from 'react'

export default function Dashboard() {
    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Monitor and analyze your AI review management metrics at a glance</p>
            </div>
            <div className="page-content">
                <div className="grid-container">
                    <div className="grid-col-12">
                        <div className="widget-card">
                            <h3 className="widget-title">Welcome to AI Review Management</h3>
                            <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Your dashboard widgets will appear here. Use the 12-column grid system to organize your content.</p>
                        </div>
                    </div>
                </div>
                
                <div className="grid-container">
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Total Reviews</h3>
                            <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>0</p>
                        </div>
                    </div>
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Average Sentiment</h3>
                            <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>0%</p>
                        </div>
                    </div>
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Active Insights</h3>
                            <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>0</p>
                        </div>
                    </div>
                </div>
                
                <div className="grid-container">
                    <div className="grid-col-8">
                        <div className="widget-card">
                            <h3 className="widget-title">Recent Activity</h3>
                            <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Recent activity content will appear here</p>
                        </div>
                    </div>
                    <div className="grid-col-4">
                        <div className="widget-card">
                            <h3 className="widget-title">Quick Stats</h3>
                            <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Quick statistics will appear here</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
