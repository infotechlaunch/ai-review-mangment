import React, { useState } from 'react'
import { Users, Star, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight } from '../components/Icons'
import './Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: '2,543',
    totalReviews: '45.2k',
    pendingReviews: '12',
    avgRating: '4.8'
  });
  const [recentActivity, setRecentActivity] = useState([
      { author_name: 'John Doe', review_created_at: new Date().toISOString(), stars: 5, review_text: 'Excellent service! Highly recommended.' },
      { author_name: 'Sarah Smith', review_created_at: new Date(Date.now() - 86400000).toISOString(), stars: 4, review_text: 'Great experience, but room for improvement.' },
      { author_name: 'Michael Brown', review_created_at: new Date(Date.now() - 172800000).toISOString(), stars: 5, review_text: 'Absolutely love this platform!' },
      { author_name: 'Emit Brown', review_created_at: new Date(Date.now() - 242800000).toISOString(), stars: 3, review_text: 'It is okay, but support is slow.' },
  ]);
  const [loading, setLoading] = useState(false);

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients, change: '+12.5%', trend: 'up', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Reviews', value: stats.totalReviews, change: '+8.2%', trend: 'up', icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Pending Reviews', value: stats.pendingReviews, change: '-2.4%', trend: 'down', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Avg. Rating', value: stats.avgRating, change: '+4.1%', trend: 'up', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6 dashboard-container">
      <div className="dashboard-header">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stats-grid">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow stat-card">
            <div className="flex justify-between items-start stat-header">
              <div className={`p-3 rounded-xl stat-icon ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold stat-trend ${stat.trend === 'up' ? 'text-emerald-600 trend-up' : 'text-red-600 trend-down'}`}>
                <span>{stat.change}</span>
                {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 text-sm font-medium stat-label">{stat.label}</h3>
              <p className="text-2xl font-bold text-slate-800 mt-1 stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 charts-grid">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px] chart-card flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 chart-title">Revenue Analytics</h3>
            <div className="flex-1 w-full bg-slate-50 rounded-xl overflow-hidden relative border border-slate-100">
               <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                  <defs>
                      <linearGradient id="revGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                      </linearGradient>
                  </defs>
                  {[1, 2, 3].map(i => (
                      <line key={i} x1="0" y1={i * 75} x2="800" y2={i * 75} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                  ))}
                  <path 
                    d="M0,250 C100,240 200,100 300,150 S500,200 600,80 S700,50 800,20 V300 H0 Z" 
                    fill="url(#revGradient)" 
                  />
                  <path 
                    d="M0,250 C100,240 200,100 300,150 S500,200 600,80 S700,50 800,20" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
               </svg>
               <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-emerald-600 shadow-sm">
                 +8.2% vs last month
               </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px] chart-card flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 chart-title">Recent Activity</h3>
            <div className="space-y-4 activity-list flex-1 overflow-auto">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading activity...</div>
                ) : recentActivity.length > 0 ? (
                    recentActivity.map((review, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer activity-item border border-transparent hover:border-slate-100">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg bg-blue-100 text-blue-600`}>
                           💬
                        </div>
                        <div className="flex-1 activity-content">
                            <h4 className="text-sm font-semibold text-slate-800 activity-title line-clamp-1">
                                {review.author_name ? `Review from ${review.author_name}` : 'New Review'}
                            </h4>
                            <p className="text-xs text-slate-500 activity-time">
                                {review.review_created_at ? new Date(review.review_created_at).toLocaleDateString() : 'Just now'}
                            </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg activity-badge bg-blue-50 text-blue-600`}>
                           {review.stars} ★
                        </span>
                    </div>
                ))
                ) : (
                    <div className="text-center py-10 text-slate-400 text-sm">No recent activity found.</div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
