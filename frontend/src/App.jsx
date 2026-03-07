import { useEffect } from 'react'
import './App.css'
import Sidebar from './components/sidebar/sidebar'
import Navbar from './components/header/navbar'
import AppRoute from './App-route'
import { ThemeProvider } from './context/ThemeContext'
import { useLocation } from 'react-router-dom'
import { cachedApiRequest, isAuthenticated } from './utils/api'

function App() {
  const location = useLocation()

  // Pre-warm the cache as soon as the app shell mounts so every page
  // finds data ready instead of waiting for a network round-trip.
  useEffect(() => {
    if (isAuthenticated()) {
      cachedApiRequest('/api/client/reviews').catch(() => {})
    }
  }, [])
  const isAuthPage = location.pathname === '/login' || location.pathname === '/onboarding'
  const isAdminPage = location.pathname.startsWith('/admin')

  // Don't show client sidebar/navbar on auth pages or admin pages
  if (isAuthPage || isAdminPage) {
    return (
      <ThemeProvider>
        <AppRoute />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Navbar />
          <AppRoute />
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
