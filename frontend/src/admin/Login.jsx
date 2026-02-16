import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || "/admin/dashboard"

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
        // Build the API URL - handling development environment
        // Assuming your backend is running on port 4000 based on previous context
        const response = await fetch('http://localhost:4000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.message || 'Login failed')
        }

        // Store auth data
        localStorage.setItem('token', data.token)
        localStorage.setItem('userEmail', data.admin.email)
        localStorage.setItem('userRole', 'admin')

        // Redirect
        navigate(from, { replace: true })

    } catch (err) {
        console.error("Login error:", err)
        // Fallback for demo/development if backend isn't ready
        if (email === 'admin@demo.com' && password === 'password') {
             localStorage.setItem('token', 'demo-token')
             localStorage.setItem('userEmail', email)
             localStorage.setItem('userRole', 'admin')
             navigate(from, { replace: true })
             return
        }
        setError(err.message || 'Invalid credentials')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 transform rotate-3">
                    <span className="text-3xl font-bold text-white">A</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
                <p className="text-slate-500 text-sm mt-2">Sign in to manage your platform</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="email">Work Email</label>
                    <input 
                        type="email" 
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium placeholder:text-slate-400"
                        placeholder="name@company.com"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="password">Password</label>
                    <input 
                        type="password" 
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium placeholder:text-slate-400"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Signing in...</span>
                        </>
                    ) : (
                        <span>Sign In</span>
                    )}
                </button>
            </form>
        </div>
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
                Protected Information System. Unauthorized access is strictly prohibited and monitored.
            </p>
        </div>
      </div>
    </div>
  )
}
