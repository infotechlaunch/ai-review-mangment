import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight } from '../components/Icons'
import './AdminCommon.css'

export default function ReviewDetail() {
  const { reviewKey } = useParams()
  const navigate = useNavigate()
  const [review, setReview] = useState({
     id: reviewKey || 'REV-8823',
     author_name: 'John Doe',
     review_created_at: '2025-10-24T10:00:00Z',
     stars: 5,
     review_text: 'Absolutely fantastic service! The team was incredibly responsive and helped us set everything up in record time. The AI features are a game changer for our daily workflow. Highly recommended!',
     has_reply: true,
     reply_text: "Thank you so much for your kind words, John! We're thrilled to hear that our team and AI features have made such a positive impact on your workflow. We look forward to continuing to support your success!",
     tenant: { businessName: 'Acme Corp' },
     sentiment_score: 98,
     createdAt: '2025-10-24T10:00:00Z',
     updatedAt: '2025-10-24T10:05:00Z'
  })
  const [loading, setLoading] = useState(false)

  // API fetch removed for dummy data request
  /* 
  useEffect(() => { ... } 
  */

  if (loading) return <div className="p-10 text-center text-slate-500">Loading review details...</div>

  if (!review) return (
    <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-4">Review Not Found</h2>
        <button onClick={() => navigate('/admin/reviews')} className="admin-btn-primary mx-auto">Back to Reviews</button>
    </div>
  )

  return (
    <div className="space-y-6 admin-page-container">
      {/* <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-medium admin-page-header">
            <span onClick={() => navigate('/admin/reviews')} className="cursor-pointer hover:text-indigo-600 transition-colors">Reviews</span>
            <ChevronRight size={14} />
            <span className="text-slate-800">Detail</span>
       </div>
      
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl uppercase">
                            {review.author_name ? review.author_name.charAt(0) : 'U'}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{review.author_name || 'Anonymous'}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Google Review</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500">{new Date(review.review_created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${review.has_reply ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                             {review.has_reply ? 'Auto-Replied' : 'Pending Reply'}
                         </span>
                    </div>
                </div>
                
                <div className="mb-6">
                    <div className="flex gap-1 mb-3">
                         {[...Array(5)].map((_, i) => (
                             <svg key={i} className={`w-5 h-5 ${i < (review.stars || 5) ? 'text-amber-400 fill-current' : 'text-slate-200'}`} viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                         ))}
                    </div>
                    <p className="text-slate-700 text-base leading-relaxed">
                        "{review.review_text}"
                    </p>
                </div>
                
                {review.reply_text && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 relative">
                        <div className="absolute top-4 right-4 text-xs font-bold text-indigo-600 uppercase tracking-wide">AI Response</div>
                        <p className="text-slate-600 text-sm italic leading-relaxed">
                            "{review.reply_text}"
                        </p>
                        <div className="mt-4 flex gap-3">
                            <button className="text-xs font-semibold text-indigo-600 hover:underline">Edit Response</button>
                            <button className="text-xs font-semibold text-slate-500 hover:underline">Regenerate</button>
                        </div>
                    </div>
                )}
                
                <div>
                     <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Moderation Log</h3>
                     <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Action</th>
                                    <th className="px-4 py-3 font-semibold">User</th>
                                    <th className="px-4 py-3 font-semibold text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="px-4 py-3 text-slate-700">Review Ingested</td>
                                    <td className="px-4 py-3 text-slate-500">System</td>
                                    <td className="px-4 py-3 text-right text-slate-400">{new Date(review.createdAt).toLocaleTimeString()}</td>
                                </tr>
                                {review.has_reply && (
                                     <tr>
                                        <td className="px-4 py-3 text-slate-700">Auto-Reply Generated</td>
                                        <td className="px-4 py-3 text-slate-500">AI Engine</td>
                                        <td className="px-4 py-3 text-right text-slate-400">{new Date(review.updatedAt).toLocaleTimeString()}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>
            
            <div className="w-full lg:w-80 bg-slate-50 p-6 rounded-xl border border-slate-100 h-fit">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Metadata</h3>
                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Review ID</div>
                        <div className="text-sm font-mono text-slate-700 font-medium overflow-hidden text-ellipsis">{review.review_id || review.id}</div>
                    </div>
                     <div>
                        <div className="text-xs text-slate-500 mb-1">Platform</div>
                        <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Google
                        </div>
                    </div>
                     <div>
                        <div className="text-xs text-slate-500 mb-1">Client</div>
                        <div className="text-sm font-medium text-indigo-600 hover:underline cursor-pointer">
                            {review.tenant?.businessName || 'N/A'}
                        </div>
                    </div>
                     <div>
                        <div className="text-xs text-slate-500 mb-1">Sentiment Score</div>
                        <div className="text-sm font-medium text-emerald-600">{review.sentiment_score || 'N/A'}</div>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <button onClick={() => navigate('/admin/reviews')} className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm mb-3">Back to List</button>
                    <button className="w-full py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">Flag Review</button>
                </div>
            </div>
        </div>
      </div> */}
      <div className='item-center'>
<h1>review page</h1>
      </div>
    </div>
  )
}
