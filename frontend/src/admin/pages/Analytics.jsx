import React from 'react'
import './AdminCommon.css'

export default function Analytics() {
  return (
    <div className="space-y-6 admin-page-container">
      <div className="admin-page-header">
        <div className="admin-header-content">
          <h1 className="text-2xl font-bold text-slate-800">Advanced Analytics</h1>
          <p className="text-slate-500 mt-1">Deep dive into your performance metrics and user behavior.</p>
        </div>
      </div>
      
      <div className="admin-grid-3">
          <div className="admin-card admin-card-content min-h-[250px] flex flex-col justify-between">
              <h3 className="text-base font-bold text-slate-700 mb-4">Traffic Sources</h3>
              <div className="flex-1 flex items-center justify-center relative">
                   <div style={{
                        width: '140px', 
                        height: '140px', 
                        borderRadius: '50%', 
                        background: 'conic-gradient(#6366f1 0% 35%, #8b5cf6 35% 60%, #ec4899 60% 85%, #e2e8f0 85% 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                   }}>
                        <div className="bg-white w-24 h-24 rounded-full flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-slate-800">4.2k</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Visits</span>
                        </div>
                   </div>
              </div>
              <div className="mt-4 flex justify-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Direct</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Social</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Search</div>
              </div>
          </div>
           <div className="admin-card admin-card-content min-h-[250px] flex flex-col justify-between">
              <h3 className="text-base font-bold text-slate-700 mb-4">User Retention</h3>
              <div className="flex-1 grid grid-cols-6 gap-2">
                 {Array.from({ length: 24 }).map((_, i) => (
                     <div key={i} className={`rounded-sm transition-all hover:scale-105 ${
                         Math.random() > 0.6 ? 'bg-indigo-500' : 
                         Math.random() > 0.3 ? 'bg-indigo-300' : 
                         'bg-indigo-50'
                     }`}></div>
                 ))}
              </div>
              <p className="text-xs text-center text-slate-500 mt-4">Cohort analysis over last 6 weeks</p>
          </div>
           <div className="admin-card admin-card-content min-h-[250px] flex flex-col justify-between">
              <h3 className="text-base font-bold text-slate-700 mb-4">Device Breakdown</h3>
              <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                   {[45, 78, 52, 30, 60, 85, 40].map((h, i) => (
                       <div key={i} className="w-full bg-slate-100 rounded-t-md relative group h-32 overflow-hidden">
                            <div className="absolute bottom-0 w-full bg-indigo-500 rounded-t-md transition-all duration-500 group-hover:bg-indigo-600" style={{ height: `${h}%` }}></div>
                       </div>
                   ))}
              </div>
              <div className="flex justify-between text-xs text-slate-400 px-2 mt-2">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
          </div>
      </div>

      <div className="admin-card min-h-[400px]">
          <div className="admin-card-header">
            <h3 className="text-lg font-bold text-slate-800">Performance Over Time</h3>
            <div className="flex gap-2">
                <button className="admin-action-btn py-1.5 px-3 text-xs bg-slate-100 border-none hover:bg-slate-200">Daily</button>
                <button className="admin-btn-primary py-1.5 px-3 text-xs shadow-md">Weekly</button>
                <button className="admin-action-btn py-1.5 px-3 text-xs bg-slate-100 border-none hover:bg-slate-200">Monthly</button>
            </div>
          </div>
           <div className="p-6">
                <div className="h-80 w-full relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                    {/* SVG Line Chart */}
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 400">
                        <defs>
                            <linearGradient id="chartOverlay" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="#818cf8" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        {[1, 2, 3, 4].map(i => (
                            <line key={i} x1="0" y1={i * 80} x2="1000" y2={i * 80} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
                        ))}
                        
                        {/* Path for data */}
                        <path 
                            d="M0,350 C100,320 150,200 250,250 S400,300 500,150 S650,50 800,100 S900,180 1000,120 V400 H0 Z" 
                            fill="url(#chartOverlay)" 
                        />
                        <path 
                            d="M0,350 C100,320 150,200 250,250 S400,300 500,150 S650,50 800,100 S900,180 1000,120" 
                            fill="none" 
                            stroke="#6366f1" 
                            strokeWidth="4" 
                            strokeLinecap="round"
                        />
                         {/* Data Points */}
                        {[ 
                            {cx: 250, cy: 250}, {cx: 500, cy: 150}, {cx: 800, cy: 100} 
                        ].map((pt, i) => (
                             <circle key={i} cx={pt.cx} cy={pt.cy} r="6" fill="#fff" stroke="#4f46e5" strokeWidth="3" />
                        ))}
                    </svg>
                    <div className="absolute bottom-4 left-6 text-xs font-semibold text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm border border-indigo-100">
                        +12.5% Growth
                    </div>
                </div>
            </div>
      </div>
    </div>
  )
}
