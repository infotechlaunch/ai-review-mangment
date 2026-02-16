import React from 'react';

export const DummyPieChart = () => (
  <div className="relative w-40 h-40 rounded-full" style={{
    background: 'conic-gradient(#6366f1 0% 35%, #8b5cf6 35% 60%, #ec4899 60% 85%, #cbd5e1 85% 100%)'
  }}>
    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col">
       <span className="text-2xl font-bold text-slate-800">4.5k</span>
       <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Visitors</span>
    </div>
  </div>
);

export const DummyBarChart = () => (
  <div className="flex items-end justify-between h-full w-full gap-2 px-4 pb-2">
    {[40, 70, 45, 90, 60, 75, 50].map((h, i) => (
      <div key={i} className="w-full bg-indigo-50 rounded-t-sm relative group">
        <div 
            className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-600" 
            style={{ height: `${h}%` }}
        ></div>
        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded transition-opacity whitespace-nowrap z-10">
            {h}%
        </div>
      </div>
    ))}
  </div>
);

export const DummyLineChart = () => (
  <div className="w-full h-full relative overflow-hidden">
     {/* Grid Lines */}
     <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300">
        {[100, 75, 50, 25, 0].map((val, i) => (
            <div key={i} className="border-b border-slate-100 w-full h-px relative">
                <span className="absolute -top-2 left-0">{val}</span>
            </div>
        ))}
     </div>
     
     {/* Line SVG */}
     <svg className="absolute inset-0 w-full h-full pt-4 pl-6" preserveAspectRatio="none">
         <defs>
             <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                 <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                 <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
             </linearGradient>
         </defs>
        <path d="M0,80 C50,80 50,30 100,30 C150,30 150,60 200,60 C250,60 250,20 300,20 C350,20 350,90 400,90 C450,90 450,40 500,40 C550,40 550,70 600,70 C650,70 650,10 700,10 L700,150 L0,150 Z" fill="url(#gradient)" />
        <path d="M0,80 C50,80 50,30 100,30 C150,30 150,60 200,60 C250,60 250,20 300,20 C350,20 350,90 400,90 C450,90 450,40 500,40 C550,40 550,70 600,70 C650,70 650,10 700,10" stroke="#6366f1" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
     </svg>
  </div>
);

export const DummyCohortChart = () => (
    <div className="grid grid-cols-6 gap-1 h-full w-full">
        {Array.from({ length: 30 }).map((_, i) => (
             <div key={i} className={`rounded-sm ${
                 Math.random() > 0.7 ? 'bg-indigo-600' : 
                 Math.random() > 0.4 ? 'bg-indigo-400' : 
                 Math.random() > 0.2 ? 'bg-indigo-200' : 
                 'bg-indigo-50'
             }`}></div>
        ))}
    </div>
);
