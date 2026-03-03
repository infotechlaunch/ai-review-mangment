import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../utils/api';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const isAuth = isAuthenticated();

    if (!isAuth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
