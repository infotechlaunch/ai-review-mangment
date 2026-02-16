import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight } from '../components/Icons'
import './AdminCommon.css'

export default function ClientDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState({
      businessName: 'Umesh Travels',
      slug: slug || 'umesh-travels',
      isActive: true,
      reviewCount: 45,
      userCount: 4,
      createdAt: '2025-10-24T10:00:00Z',
      id: '883920e8-client'
  })
  const [loading, setLoading] = useState(false)

  // API fetch removed for dummy data request
  /* 
  useEffect(() => { ... } 
  */

  if (loading) {
      return <div className="p-10 text-center text-slate-500">Loading client details...</div>
  }

  if (!client) {
      return (
        <div className="p-10 text-center space-y-4">
            <div className="text-xl font-bold text-slate-800">Client Not Found</div>
            <button onClick={() => navigate('/admin/clients')} className="admin-btn-primary mx-auto">Back to Clients</button>
        </div>
      )
  }

  return (
    <div className="space-y-6 admin-page-container">
      {/* <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-medium admin-page-header">
            <span onClick={() => navigate('/admin/clients')} className="cursor-pointer hover:text-indigo-600 transition-colors">Clients</span>
            <ChevronRight size={14} />
            <span className="text-slate-800">Details</span>
       </div> */}
      
      {/* <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
        <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-4xl mb-4 shadow-sm border border-indigo-100">
                    {client.businessName ? client.businessName.charAt(0) : 'C'}
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1 capitalize">{client.businessName || client.name}</h1>
                <p className="text-sm text-slate-500 mb-6">ID: #{client.id.substring(0, 8)}</p>
                
                <div className="w-full space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${client.isActive ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-100'}`}>
                            {client.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                     <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Plan</span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">Enterprise</span>
                    </div>
                     <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Joined</span>
                        <span className="text-xs font-bold text-slate-700">{new Date(client.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="w-full md:w-2/3 space-y-10 pl-0 md:pl-8">
                 <div className="admin-section">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Subscription Usage</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl font-bold text-slate-800 mb-2">{client.reviewCount || 0}</div>
                            <div className="text-sm font-medium text-slate-500">Reviews Generated</div>
                        </div>
                         <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl font-bold text-slate-800 mb-2">{client.userCount || 0}</div>
                            <div className="text-sm font-medium text-slate-500">Users</div>
                        </div>
                         <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl font-bold text-slate-800 mb-2">4.8<span className="text-lg text-slate-400">/5</span></div>
                            <div className="text-sm font-medium text-slate-500">Avg Rating</div>
                        </div>
                    </div>
                </div>
                
                 <div className="admin-section">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Activity</h3>
                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 mb-3 text-slate-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-slate-500 font-medium">No recent activity logs available for this client.</p>
                    </div>
                </div>
                
                 <div className="flex gap-3 pt-4">
                    <button onClick={() => navigate('/admin/clients')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm admin-btn-secondary">
                        Back to List
                    </button>
                    <button className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-500/20 admin-btn-primary">
                        Edit Client
                    </button>
                </div>
            </div>
        </div>
      </div> */}
<div className='item-center'>
<h1>client page </h1>
</div>
      
    </div>
  )
}
