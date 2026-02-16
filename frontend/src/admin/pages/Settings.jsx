import React, { useState } from 'react'
import { Check, ArrowUpRight } from '../components/Icons'
import './AdminCommon.css'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'integrations', label: 'Integrations' },
  ]

  return (
    <div className="space-y-6 admin-page-container">
      <div className="admin-page-header">
        <h1 className="text-2xl font-bold text-slate-800">Admin Settings</h1>
        <p className="text-slate-500 mt-1">Configure your dashboard preferences and global settings.</p>
      </div>

      <div className="flex gap-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-1 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[400px] admin-card admin-card-content">
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            <div>
                 <h3 className="text-lg font-bold text-slate-800 mb-4">Platform Identity</h3>
                 <div className="grid gap-4 admin-grid">
                    <div className="admin-form-group">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 admin-form-label">Platform Name</label>
                        <input type="text" defaultValue="AI Review Manager" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white admin-input" />
                    </div>
                     <div className="admin-form-group">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 admin-form-label">Support Email</label>
                        <input type="email" defaultValue="support@example.com" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white admin-input" />
                    </div>
                </div>
            </div>
             <div className="pt-6 border-t border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 mb-4">Localization</h3>
                 <div className="grid grid-cols-2 gap-4 admin-grid-2">
                     <div className="admin-form-group">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 admin-form-label">Language</label>
                        <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white admin-input">
                            <option>English (US)</option>
                            <option>Spanish</option>
                            <option>French</option>
                        </select>
                    </div>
                     <div className="admin-form-group">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 admin-form-label">Timezone</label>
                        <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white admin-input">
                            <option>UTC-05:00 Eastern Time</option>
                            <option>UTC-08:00 Pacific Time</option>
                            <option>UTC+00:00 GMT</option>
                        </select>
                    </div>
                 </div>
             </div>
          </div>
        )}
         {activeTab === 'notifications' && (
             <div className="space-y-4 max-w-xl">
                 <h3 className="text-lg font-bold text-slate-800 mb-4">Email Notifications</h3>
                 {['New client registration', 'Daily summary report', 'System alerts', 'Billing updates'].map((item, idx) => (
                     <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                         <span className="font-medium text-slate-700 text-sm">{item}</span>
                         <div className="w-11 h-6 bg-indigo-600 rounded-full relative cursor-pointer shadow-inner">
                             <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                         </div>
                     </div>
                 ))}
             </div>
         )}
         {activeTab === 'security' && (
             <div className="text-center py-12">
                 <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-4">
                    <Check size={24} className="text-slate-400" />
                 </div>
                 <h3 className="text-slate-800 font-bold">Two-Factor Authentication</h3>
                 <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2 mb-6">Secure your account with 2FA using an authenticator app.</p>
                 <button className="px-6 py-2 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors admin-btn admin-btn-primary">Enable 2FA</button>
             </div>
         )}
         {activeTab === 'integrations' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 admin-grid-2">
                 {['Stripe', 'Google Analytics', 'Slack', 'Intercom'].map((app, idx) => (
                     <div key={idx} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-white/50 hover:bg-white transition-colors">
                         <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                                 app === 'Stripe' ? 'bg-indigo-600' :
                                 app === 'Google Analytics' ? 'bg-amber-500' :
                                 app === 'Slack' ? 'bg-emerald-600' : 'bg-blue-600'
                             }`}>
                                 {app.charAt(0)}
                             </div>
                             <span className="font-bold text-slate-700">{app}</span>
                         </div>
                         <button className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors admin-btn admin-btn-secondary">Configure</button>
                     </div>
                 ))}
             </div>
         )}
      </div>
       <div className="flex justify-end gap-3 pt-4">
            <button className="px-6 py-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm admin-btn admin-btn-secondary">Cancel</button>
            <button className="px-6 py-2.5 text-white bg-indigo-600 rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all text-sm hover:scale-105 active:scale-95 admin-btn admin-btn-primary">Save Changes</button>
        </div>
    </div>
  )
}
