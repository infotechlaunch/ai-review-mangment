import React from 'react'
import './SkeletonLoader.css'

export const SkeletonLoader = ({ type = 'dashboard' }) => {
    const renderDashboardSkeleton = () => (
        <div className="skeleton-container">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
                <div className="skeleton-subtitle"></div>
            </div>
            <div className="skeleton-content">
                {/* Stats Cards */}
                <div className="skeleton-stats-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton-card-header">
                                <div className="skeleton-text-sm"></div>
                                <div className="skeleton-icon"></div>
                            </div>
                            <div className="skeleton-text-xl"></div>
                            <div className="skeleton-text-xs"></div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="skeleton-charts-grid">
                    <div className="skeleton-card skeleton-card-large">
                        <div className="skeleton-text-md"></div>
                        <div className="skeleton-chart"></div>
                    </div>
                    <div className="skeleton-card">
                        <div className="skeleton-text-md"></div>
                        <div className="skeleton-list">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton-list-item"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderTableSkeleton = () => (
        <div className="skeleton-container">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
                <div className="skeleton-subtitle"></div>
            </div>
            <div className="skeleton-content">
                <div className="skeleton-card">
                    {/* Filters */}
                    <div className="skeleton-filters">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton-filter"></div>
                        ))}
                    </div>
                    {/* Table */}
                    <div className="skeleton-table">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="skeleton-table-row">
                                <div className="skeleton-avatar"></div>
                                <div className="skeleton-table-cell"></div>
                                <div className="skeleton-table-cell"></div>
                                <div className="skeleton-table-cell"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

    const renderAnalyticsSkeleton = () => (
        <div className="skeleton-container">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
                <div className="skeleton-subtitle"></div>
            </div>
            <div className="skeleton-content">
                {/* Stats */}
                <div className="skeleton-stats-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton-icon-lg"></div>
                            <div className="skeleton-text-xl"></div>
                            <div className="skeleton-text-xs"></div>
                        </div>
                    ))}
                </div>

                {/* Feature Cards */}
                <div className="skeleton-feature-grid">
                    {[1, 2].map((i) => (
                        <div key={i} className="skeleton-card skeleton-card-tall">
                            <div className="skeleton-text-md"></div>
                            <div className="skeleton-text-sm"></div>
                            <div className="skeleton-list">
                                {[1, 2, 3, 4].map((j) => (
                                    <div key={j} className="skeleton-list-item"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const renderFormSkeleton = () => (
        <div className="skeleton-container">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
                <div className="skeleton-subtitle"></div>
            </div>
            <div className="skeleton-content">
                <div className="skeleton-card">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton-form-row">
                            <div className="skeleton-text-sm"></div>
                            <div className="skeleton-input"></div>
                        </div>
                    ))}
                    <div className="skeleton-button"></div>
                </div>
            </div>
        </div>
    )

    const skeletonTypes = {
        dashboard: renderDashboardSkeleton,
        table: renderTableSkeleton,
        analytics: renderAnalyticsSkeleton,
        form: renderFormSkeleton,
        reviews: renderTableSkeleton,
        settings: renderFormSkeleton
    }

    return skeletonTypes[type] ? skeletonTypes[type]() : renderDashboardSkeleton()
}

export default SkeletonLoader
