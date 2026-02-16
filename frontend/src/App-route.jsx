import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import SkeletonLoader from './components/common/SkeletonLoader'
import { usePrefetchRoutes, prefetchAllCommonRoutes } from './utils/routePrefetch'

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
const Login = lazy(() => import(/* webpackChunkName: "login" */ './components/auth/Login'))
const BusinessSetup = lazy(() => import(/* webpackChunkName: "onboarding" */ './components/onboarding/BusinessSetup'))
const OnboardingSuccess = lazy(() => import(/* webpackChunkName: "onboarding-success" */ './components/onboarding/OnboardingSuccess'))
const AdminLayout = lazy(() => import(/* webpackChunkName: "admin-layout" */ './admin/Layout/AdminLayout'))
const AdminLogin = lazy(() => import(/* webpackChunkName: "admin-login" */ './admin/Login'))
const ProtectedAdminRoute = lazy(() => import(/* webpackChunkName: "admin-protect" */ './admin/ProtectedAdminRoute'))

const AdminDashboardPage = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ './admin/pages/Dashboard'))
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
                <Route path="/" element={<Dashboard />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/sentiment-map" element={<SentimentMap />} />
                <Route path="/word-cloud" element={<WordCloud />} />
                <Route path="/industry-comparison" element={<IndustryComparison />} />
                <Route path="/sentiment-trend" element={<SentimentTrend />} />
                <Route path="/pros-cons" element={<ProsCons />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
            </Routes>
        </Suspense>
    )
}
