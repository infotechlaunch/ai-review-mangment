import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Preload routes for faster navigation
const routePrefetchMap = {
    '/': () => import('../components/pages/dashboard'),
    '/reviews': () => import('../components/pages/reviews'),
    '/analytics': () => import('../components/pages/Analytics'),
    '/settings': () => import('../components/pages/Settings'),
    '/sentiment-map': () => import('../components/pages/sentimentMap'),
    '/word-cloud': () => import('../components/pages/wordCloud'),
    '/industry-comparison': () => import('../components/pages/industryComparison'),
    '/sentiment-trend': () => import('../components/pages/sentimentTrend'),
    '/pros-cons': () => import('../components/pages/prosCons'),
    '/billing': () => import('../components/pages/Billing'),
    '/admin': () => import('../components/pages/AdminDashboard')
}

// Prefetch a route
export const prefetchRoute = (path) => {
    const loader = routePrefetchMap[path]
    if (loader) {
        loader().catch(() => { })
    }
}

// Prefetch multiple routes
export const prefetchRoutes = (paths) => {
    paths.forEach(path => prefetchRoute(path))
}

// Hook to prefetch common routes
export const usePrefetchRoutes = () => {
    const location = useLocation()

    useEffect(() => {
        // Prefetch common navigation patterns based on current route
        const currentPath = location.pathname

        // Prefetch likely next routes with a small delay
        const timer = setTimeout(() => {
            switch (currentPath) {
                case '/':
                    // From dashboard, users likely go to reviews or analytics
                    prefetchRoutes(['/reviews', '/analytics'])
                    break
                case '/reviews':
                    // From reviews, users might check analytics or settings
                    prefetchRoutes(['/analytics', '/settings'])
                    break
                case '/analytics':
                    // From analytics, users might check specific visualizations
                    prefetchRoutes(['/sentiment-map', '/word-cloud', '/sentiment-trend'])
                    break
                case '/settings':
                    // From settings, users might go back to dashboard
                    prefetchRoutes(['/'])
                    break
                default:
                    // Prefetch dashboard as fallback
                    prefetchRoute('/')
            }
        }, 1000) // Wait 1 second after page load before prefetching

        return () => clearTimeout(timer)
    }, [location.pathname])
}

// Prefetch on link hover
export const handleLinkHover = (path) => {
    prefetchRoute(path)
}

// Prefetch all common routes after initial load
export const prefetchAllCommonRoutes = () => {
    setTimeout(() => {
        prefetchRoutes([
            '/',
            '/reviews',
            '/analytics',
            '/settings'
        ])
    }, 2000) // Wait 2 seconds after app load
}
