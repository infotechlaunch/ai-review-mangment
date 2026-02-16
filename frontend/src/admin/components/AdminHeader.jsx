import React from 'react'
import { Bell, Menu, Star } from './Icons'

export default function AdminHeader() {
    const email = localStorage.getItem('userEmail') || 'admin@company.com'

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 transition-all duration-300">
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 rounded-xl hover:bg-gray-100/80 text-gray-500 transition-colors">
                    <Menu size={24} />
                </button>
                
                <div className="hidden md:flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Dashboard</h2>
                    <p className="text-sm text-gray-500 font-medium">Welcome back, Super Admin</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all duration-300 relative group">
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white group-hover:bg-red-600 transition-colors"></span>
                    </button>
                </div>
                
                <div className="h-8 w-px bg-gray-200 mx-2"></div>

                <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">{email}</p>
                        <p className="text-xs text-gray-400 font-medium">Super Admin</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                        <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center text-indigo-600 font-bold text-lg">
                            {email.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
