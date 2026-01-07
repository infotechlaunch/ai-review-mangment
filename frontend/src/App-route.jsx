import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/pages/dashboard'
import Reviews from './components/pages/reviews'
import SentimentMap from './components/pages/sentimentMap'
import WordCloud from './components/pages/wordCloud'
import IndustryComparison from './components/pages/industryComparison'
import SentimentTrend from './components/pages/sentimentTrend'
import ProsCons from './components/pages/prosCons'
import Login from './components/auth/Login'
import BusinessSetup from './components/onboarding/BusinessSetup'

export default function AppRoute() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<BusinessSetup />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/sentiment-map" element={<SentimentMap />} />
            <Route path="/word-cloud" element={<WordCloud />} />
            <Route path="/industry-comparison" element={<IndustryComparison />} />
            <Route path="/sentiment-trend" element={<SentimentTrend />} />
            <Route path="/pros-cons" element={<ProsCons />} />
        </Routes>
    )
}
