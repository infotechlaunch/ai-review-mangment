import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../../utils/api'
import { LayoutDashboard, Users, Star, BarChart3, CreditCard, Settings, LogOut } from './Icons'

const sidebarStructure = [
    {
        title: "Overview",
        items: [
            { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/admin/analytics-deme', label: 'Analytics', icon: BarChart3 },
        ]
    },
    {
        title: "Management",
        items: [
            { to: '/admin/clients/deme', label: 'Clients', icon: Users },
            { to: '/admin/reviews/deme', label: 'Reviews', icon: Star },
        ]
    },
    {
        title: "Account",
        items: [
            { to: '/admin/billing/deme', label: 'Billing', icon: CreditCard },
            { to: '/admin/settings/deme', label: 'Settings', icon: Settings },
        ]
    }
]

export default function AdminSidebar() {
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/admin/login')
    }

    return (
        <>
            <aside className="sidebar-container w-64 bg-[#1e293b] text-white flex flex-col h-screen sticky top-0 border-r border-slate-600/50 hidden md:flex">
                {/* Logo Section */}
                <div className="h-20 flex items-center px-6 border-b border-slate-600/50 bg-[#0f172a]">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                            <span className="font-extrabold text-xl text-white">A</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-white leading-tight">Admin</span>
                            <span className="text-xs font-medium text-indigo-300">Control Panel</span>
                        </div>
                    </div>
                </div>
                
                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-7 overflow-y-auto sidebar-scroll">
                    {sidebarStructure.map((section, idx) => (
                        <div key={idx}>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2 letter-spacing-wide">
                                {section.title}
                            </div>
                            <div className="space-y-1.5">
                                {section.items.map((item) => (
                                    <NavLink 
                                        key={item.to} 
                                        to={item.to} 
                                        className={({isActive}) => `
                                            nav-link flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' 
                                                : 'text-white hover:bg-slate-700/60 hover:scale-[1.01]'
                                            }
                                        `}
                                    >
                                        <item.icon 
                                            size={21} 
                                            className="flex-shrink-0" 
                                        />
                                        <span className="font-medium text-white">{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Logout Section */}
                <div className="p-4 border-t border-slate-600/50 bg-[#0f172a]">
                    <button 
                        onClick={handleLogout} 
                        className="logout-btn flex w-full items-center gap-3 px-4 py-3 text-[15px] font-semibold text-white rounded-xl hover:bg-red-500/15 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/30"
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Inline Styles for Custom Scrollbar */}
            <style jsx global>{`
                .sidebar-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
                }
                
                .sidebar-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                
                .sidebar-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .sidebar-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(100, 116, 139, 0.5);
                    border-radius: 10px;
                }
                
                .sidebar-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(100, 116, 139, 0.8);
                }
                
                .nav-link {
                    position: relative;
                }
                
                .logout-btn:hover {
                    transform: translateY(-1px);
                }
            `}</style>
        </>
    )
}