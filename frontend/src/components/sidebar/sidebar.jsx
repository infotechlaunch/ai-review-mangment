import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './sidebar.css'
import { handleLinkHover } from '../../utils/routePrefetch'
import logo from '../../assets/logo.svg'
import dashboardIcon from '../../assets/sidebar-icons/dashboard (1).svg'
import reviewIcon from '../../assets/sidebar-icons/review-icon-8101227-512.svg'
import sentimentMapIcon from '../../assets/sidebar-icons/Sentiment-Map.svg'
import wordCloudIcon from '../../assets/sidebar-icons/word-cloud-icon.svg'
import industryComparisonIcon from '../../assets/sidebar-icons/Industry Comparison.svg'
import sentimentTrendIcon from '../../assets/sidebar-icons/Sentiment Trend.svg'
import prosConsIcon from '../../assets/sidebar-icons/pros-and-cons-icon-7522814-512.svg'

export default function Sidebar() {
    const location = useLocation()

    const menuItems = [
        { path: '/', icon: dashboardIcon, label: 'Dashboard' },
        { path: '/reviews', icon: reviewIcon, label: 'Reviews' },
        { path: '/analytics', icon: sentimentMapIcon, label: 'Analytics' },
        //   { path: '/analytics', icon: sentimentMapIcon, label: 'Analytics' },
            { path: '/settings', icon: '⚙️', label: 'Settings' },
            { path: '/billing', icon: '💳', label: 'Billing' }
    ]

    const analyticsSubmenu = [
        { path: '/sentiment-map', icon: sentimentMapIcon, label: 'Sentiment Map' },
        { path: '/word-cloud', icon: wordCloudIcon, label: 'Word Cloud' },
        { path: '/industry-comparison', icon: industryComparisonIcon, label: 'Industry Comparison' },
        { path: '/sentiment-trend', icon: sentimentTrendIcon, label: 'Sentiment Trend' },
        { path: '/pros-cons', icon: prosConsIcon, label: 'Pros & Cons' }
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-container">
                    <img src={logo} alt="Logo" className="sidebar-logo" />
                </div>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {menuItems.map((item) => (
                        <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
                            <Link 
                                to={item.path}
                                onMouseEnter={() => handleLinkHover(item.path)}
                                onFocus={() => handleLinkHover(item.path)}
                            >
                                <span className="icon">
                                    {typeof item.icon === 'string' && item.icon.length < 3 ? (
                                        item.icon
                                    ) : (
                                        <img src={item.icon} alt={item.label} />
                                    )}
                                </span>
                                <span className="label">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )
}
