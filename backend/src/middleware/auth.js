const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

/**
 * Authentication & Authorization Middleware
 * Handles JWT verification and role-based access control
 */

/**
 * Authenticate user via JWT token
 * Extracts token from Authorization header and verifies it
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Please login first.',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = verifyToken(token);

        // Attach user info to request
        req.user = decoded;

        // For non-admin users, fetch full user details to get tenant
        if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
            const user = await User.findByPk(decoded.userId, {
                attributes: { exclude: ['password'] }
            });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
            }
            // Set tenant from JWT token OR from database (for old tokens)
            req.user.tenant = decoded.tenant || user.tenantId;
            req.user.tenantId = decoded.tenant || user.tenantId;

            // If token doesn't have tenant but user has one, it's an old token
            if (!decoded.tenant && user.tenantId) {
                console.log(`⚠️ Old JWT token detected for user ${user.email} - tenant missing from token`);
            }
        }

        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};

/**
 * Authorize user based on roles
 * @param {Array} allowedRoles - Array of allowed roles (e.g., ['ADMIN', 'CLIENT_OWNER'])
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this resource',
            });
        }

        next();
    };
};

/**
 * Ensure tenant data isolation
 * Prevents clients from accessing other clients' data
 */
const ensureTenantAccess = async (req, res, next) => {
    try {
        // Admin can access all tenants
        if (req.user.role === 'ADMIN') {
            return next();
        }

        // For non-admin users, ensure they can only access their own tenant data
        const requestedTenant = req.params.tenantId || req.body.tenant || req.query.tenant;

        if (requestedTenant && requestedTenant.toString() !== req.user.tenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own data.',
            });
        }

        next();
    } catch (error) {
        console.error('Tenant access error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error validating tenant access',
        });
    }
};

module.exports = {
    authenticate,
    authorize,
    ensureTenantAccess,
};
