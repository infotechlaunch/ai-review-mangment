import React from 'react'
import { CreditCard, Check } from '../components/Icons'
import './AdminCommon.css'

export default function Billing() {
  return (
    <div className="space-y-6 admin-page-container">
      <div className="admin-page-header">
        <div className="admin-header-content">
           <h1 className="text-2xl font-bold text-slate-800">Billing & Subscription</h1>
           <p className="text-slate-500 mt-1">Manage your plan and billing details.</p>
        </div>
      </div>

      <div className="admin-grid-3 billing-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="admin-card admin-card-content admin-card-primary" style={{ gridColumn: 'span 2' }}>
            <h3 className="text-lg font-semibold opacity-90 mb-6">Current Plan</h3>
            <div className="flex justify-between items-end">
                <div>
                   <p className="text-sm font-medium opacity-75 mb-1">Enterprise Tier</p>
                   <h2 className="text-4xl font-bold tracking-tight">$499<span className="text-lg font-medium opacity-60">/mo</span></h2>
                </div>
                 <button className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-semibold transition-colors">Manage Plan</button>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex gap-6 text-sm font-medium opacity-80">
                <span className="flex items-center gap-2"><Check size={16} /> Unlimited Users</span>
                <span className="flex items-center gap-2"><Check size={16} /> Advanced Analytics</span>
                <span className="flex items-center gap-2"><Check size={16} /> Priority Support</span>
            </div>
        </div>
        
         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center admin-card admin-card-content">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Payment Method</h3>
             <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center text-white text-xs font-bold font-mono">VISA</div>
                 <div className="text-slate-700 font-semibold">•••• 4242</div>
             </div>
             <p className="text-xs text-slate-500 mb-6">Expires 12/28</p>
              <button className="admin-action-btn w-full justify-center">Update Card</button>
         </div>
      </div>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden admin-card">
         <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Invoice History</h3>
         </div>
         <table className="admin-table">
             <thead>
                 <tr>
                     <th>Invoice ID</th>
                     <th>Date</th>
                     <th>Amount</th>
                     <th>Status</th>
                     <th className="text-right">Download</th>
                 </tr>
             </thead>
             <tbody>
                  {[
                      { id: 'INV-2024-001', date: 'Oct 24, 2025', amount: '$499.00', status: 'Paid' },
                      { id: 'INV-2024-002', date: 'Sep 24, 2025', amount: '$499.00', status: 'Paid' },
                      { id: 'INV-2024-003', date: 'Aug 24, 2025', amount: '$499.00', status: 'Paid' },
                      { id: 'INV-2024-004', date: 'Jul 24, 2025', amount: '$499.00', status: 'Refunded' },
                  ].map((invoice, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="font-medium text-slate-700">#{invoice.id}</td>
                          <td className="text-slate-500">{invoice.date}</td>
                          <td className="font-semibold text-slate-700">{invoice.amount}</td>
                          <td>
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                  invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                  {invoice.status}
                              </span>
                          </td>
                          <td className="text-right text-indigo-600 font-medium cursor-pointer hover:underline">Download</td>
                      </tr>
                  ))}
             </tbody>
         </table>
       </div>
    </div>
  )
}
