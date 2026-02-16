import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated, getUserRole } from '../utils/api'

export default function ProtectedAdminRoute({ children }) {
    const location = useLocation()
    const isAuth = isAuthenticated()
    const role = getUserRole()

    // If not authenticated, redirect to admin login
    if (!isAuth) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />
    }

    // Optional: Check if user has admin role
    // This assumes your backend returns a 'role' field in login response
    // If you don't use roles yet, you can remove this check or keep it for future proofing
    // if (role !== 'admin' && role !== 'superadmin') {
    //     // Redirect to unauthorized page or user dashboard
    //     return <Navigate to="/dashboard" replace />
    // }

    return children
}
