import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import ProtectedAdminRoute from './admin/ProtectedAdminRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLayout from './admin/Layout/AdminLayout'
import AdminLogin from './admin/Login'
import AdminDashboardPage from './admin/pages/Dashboard'
import SkeletonLoader from './components/common/SkeletonLoader'
import { usePrefetchRoutes, prefetchAllCommonRoutes } from './utils/routePrefetch'
import Profile from './components/pages/profile'

// Lazy load all components with preload hints
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ './components/pages/dashboard'))
const Reviews = lazy(() => import(/* webpackChunkName: "reviews", webpackPrefetch: true */ './components/pages/reviews'))
const Analytics = lazy(() => import(/* webpackChunkName: "analytics", webpackPrefetch: true */ './components/pages/Analytics'))
const SentimentMap = lazy(() => import(/* webpackChunkName: "sentiment-map" */ './components/pages/sentimentMap'))
const WordCloud = lazy(() => import(/* webpackChunkName: "word-cloud" */ './components/pages/wordCloud'))
const IndustryComparison = lazy(() => import(/* webpackChunkName: "industry-comparison" */ './components/pages/industryComparison'))
const SentimentTrend = lazy(() => import(/* webpackChunkName: "sentiment-trend" */ './components/pages/sentimentTrend'))
const ProsCons = lazy(() => import(/* webpackChunkName: "pros-cons" */ './components/pages/prosCons'))
const Settings = lazy(() => import(/* webpackChunkName: "settings", webpackPrefetch: true */ './components/pages/Settings'))
const Billing = lazy(() => import(/* webpackChunkName: "billing" */ './components/pages/Billing'))
const SocialShare = lazy(() => import(/* webpackChunkName: "social-share" */ './components/pages/SocialShare'))
const Login = lazy(() => import(/* webpackChunkName: "login" */ './components/auth/Login'))
const BusinessSetup = lazy(() => import(/* webpackChunkName: "onboarding" */ './components/onboarding/BusinessSetup'))
const OnboardingSuccess = lazy(() => import(/* webpackChunkName: "onboarding-success" */ './components/onboarding/OnboardingSuccess'))

const Clients = lazy(() => import(/* webpackChunkName: "admin-clients" */ './admin/pages/Clients'))
const ClientDetail = lazy(() => import(/* webpackChunkName: "admin-client-detail" */ './admin/pages/ClientDetail'))
const AdminReviews = lazy(() => import(/* webpackChunkName: "admin-reviews" */ './admin/pages/Reviews'))
const ReviewDetail = lazy(() => import(/* webpackChunkName: "admin-review-detail" */ './admin/pages/ReviewDetail'))
const AdminAnalytics = lazy(() => import(/* webpackChunkName: "admin-analytics" */ './admin/pages/Analytics'))
const AdminBilling = lazy(() => import(/* webpackChunkName: "admin-billing" */ './admin/pages/Billing'))
const AdminSettings = lazy(() => import(/* webpackChunkName: "admin-settings" */ './admin/pages/Settings'))

// Smart Loading component based on route
const SmartLoadingFallback = () => {
    const location = useLocation()
    const path = location.pathname

    // Determine skeleton type based on route
    const getSkeletonType = () => {
        if (path === '/' || path.includes('dashboard')) return 'dashboard'
        if (path.includes('reviews')) return 'reviews'
        if (path.includes('analytics')) return 'analytics'
        if (path.includes('settings')) return 'settings'
        if (path.includes('billing')) return 'form'
        if (path.includes('admin')) return 'table'
        return 'dashboard'
    }

    return <SkeletonLoader type={getSkeletonType()} />
}

export default function AppRoute() {
    // Prefetch routes based on navigation patterns
    usePrefetchRoutes()

    // Prefetch common routes after initial load
    useEffect(() => {
        prefetchAllCommonRoutes()
    }, [])

    return (
        <Suspense fallback={<SmartLoadingFallback />}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<BusinessSetup />} />
                <Route path="/onboarding/success" element={<OnboardingSuccess />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                <Route path="/admin/*" element={
                    <React.Suspense fallback={<SmartLoadingFallback />}>
                        <ProtectedAdminRoute>
                            <AdminLayout />
                        </ProtectedAdminRoute>
                    </React.Suspense>
                }>
                    <Route path="dashboard" element={<AdminDashboardPage />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="clients/:slug" element={<ClientDetail />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="reviews/:reviewKey" element={<ReviewDetail />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="billing" element={<AdminBilling />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route index element={<Navigate to="dashboard" replace />} />
                </Route>
                
                {/* Client Protected Routes */}
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/sentiment-map" element={<ProtectedRoute><SentimentMap /></ProtectedRoute>} />
                <Route path="/word-cloud" element={<ProtectedRoute><WordCloud /></ProtectedRoute>} />
                <Route path="/industry-comparison" element={<ProtectedRoute><IndustryComparison /></ProtectedRoute>} />
                <Route path="/sentiment-trend" element={<ProtectedRoute><SentimentTrend /></ProtectedRoute>} />
                <Route path="/pros-cons" element={<ProtectedRoute><ProsCons /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/social-share" element={<ProtectedRoute><SocialShare /></ProtectedRoute>} />
                <Route path='/Profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            </Routes>
        </Suspense>
    )
}
