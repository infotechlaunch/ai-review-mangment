import './App.css'
import Sidebar from './components/sidebar/sidebar'
import Navbar from './components/header/navbar'
import AppRoute from './App-route'
import { ThemeProvider } from './context/ThemeContext'
import { useLocation } from 'react-router-dom'

function App() {
  const location = useLocation()
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
