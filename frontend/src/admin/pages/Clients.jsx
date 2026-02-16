import React, { useEffect, useState } from 'react'
import { Search, Filter, MoreHorizontal, Plus } from '../components/Icons'
import { useNavigate } from 'react-router-dom'
import './AdminCommon.css'

export default function Clients() {
  const [clients, setClients] = useState([
      { businessName: 'Acme Corp', slug: 'acme-corp', isActive: true, reviewCount: 1245, userCount: 12, createdAt: '2025-10-24T10:00:00Z' },
      { businessName: 'Globex Inc', slug: 'globex-inc', isActive: true, reviewCount: 856, userCount: 5, createdAt: '2025-11-05T14:30:00Z' },
      { businessName: 'Soylent Corp', slug: 'soylent-corp', isActive: false, reviewCount: 23, userCount: 2, createdAt: '2026-01-12T09:15:00Z' },
      { businessName: 'Initech', slug: 'initech', isActive: true, reviewCount: 567, userCount: 8, createdAt: '2025-12-01T11:00:00Z' },
      { businessName: 'Umbrella Corp', slug: 'umbrella-corp', isActive: true, reviewCount: 2450, userCount: 45, createdAt: '2025-09-15T16:45:00Z' },
      { businessName: 'Stark Ind', slug: 'stark-ind', isActive: true, reviewCount: 9999, userCount: 100, createdAt: '2025-08-20T10:00:00Z' },
  ])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // API fetch removed for dummy data request
  /* 
  useEffect(() => { ... } 
  */

  return (
    <div className="space-y-6 admin-page-container">
      <div className="admin-page-header">
        <div className="admin-header-content">
          <h1 className="text-2xl font-bold text-slate-800">Client Management</h1>
          <p className="text-slate-500 mt-1">Manage your client base and subscriptions.</p>
        </div>
        <button className="admin-btn-primary">
          <Plus size={18} />
          <span>Add Client</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden admin-card">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center gap-4 flex-wrap bg-white">
            <div className="admin-search-wrapper">
                <Search size={18} className="admin-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search clients..." 
                  className="admin-search-input"
                />
            </div>
            <button className="admin-action-btn">
                <Filter size={18} />
                <span>Filter</span>
            </button>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Status</th>
                <th>Reviews</th>
                <th>Users</th>
                <th>Joined Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="6" className="text-center py-10 text-slate-500">Loading clients...</td></tr>
              ) : clients.length > 0 ? (
                clients.map((client, idx) => (
                    <tr key={idx} className="group cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => navigate(`/admin/clients/${client.slug}`)}>
                      <td>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {client.businessName ? client.businessName.charAt(0) : 'C'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{client.businessName || client.name}</div>
                            <div className="text-xs text-slate-500">{client.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          client.isActive 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {client.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="font-medium text-slate-700">{client.reviewCount || 0}</div>
                      </td>
                      <td>
                         <div className="font-medium text-slate-700">{client.userCount || 0}</div>
                      </td>
                      <td className="text-slate-500 text-sm">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                ))
              ) : (
                 <tr><td colSpan="6" className="text-center py-10 text-slate-500">No clients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span className="text-sm font-medium text-slate-500">Showing {clients.length} clients</span>
          <div className="flex gap-2">
            <button className="admin-action-btn py-2 px-4" disabled>Previous</button>
            <button className="admin-action-btn py-2 px-4" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
