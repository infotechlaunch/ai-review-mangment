const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { generateToken } = require('../config/jwt');
const { sequelize } = require('../config/database');
const { initiateOAuthFlow, handleOAuthCallback } = require('./google_oauth_controller');

/**
 * Authentication Controller
 * Handles user login, registration, and token validation
 */

/**
 * Login user (ADMIN or CLIENT_OWNER)
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            console.log('Login failed: Missing email or password');
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        console.log(`Checking login for email: ${email.toLowerCase()}`);

        // Find user by email
        const user = await User.findOne({ 
            where: { email: email.toLowerCase() },
            include: [{ model: Tenant, as: 'tenant', attributes: ['slug', 'businessName', 'isActive', 'gbp_initialSyncDone', 'social_profiles', 'city', 'country'] }]
        });

        if (!user) {
            console.log(`User not found: ${email.toLowerCase()}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        console.log(`User found: ${user.email}, role: ${user.role}`);

        // Check password
        const isMatch = await user.comparePassword(password);
        console.log(`Password match result for ${user.email}: ${isMatch}`);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Check if tenant is active (for non-admin users)
        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your business profile is currently inactive. Please contact support.'
            });
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenant: user.tenantId,
            slug: user.tenant ? user.tenant.slug : null
        });

        // Remove password from response
        const userJSON = user.toJSON();
        delete userJSON.password;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userJSON,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenant: user.tenant,
            isOnboarded: !!(
                (user.tenant && user.tenant.gbp_initialSyncDone) ||
                (user.tenant && user.tenant.social_profiles && user.tenant.social_profiles.placeId)
            )
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: error.message
        });
    }
};

/**
 * Register a new Client Owner and their Tenant
 * @route POST /api/auth/register/client
 */
const registerClientOwner = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, password, firstName, lastName, businessName, slug } = req.body;

        // Basic validation
        if (!email || !password || !businessName) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and business name are required'
            });
        }

        // Auto-generate slug if missing
        const tenantSlug = (slug || businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

        if (!tenantSlug) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'A valid business slug could not be generated. Please provide one.'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check if slug already exists
        const existingTenant = await Tenant.findOne({ where: { slug: tenantSlug.toLowerCase() } });
        if (existingTenant) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Business name or slug already exists, please choose another'
            });
        }

        // 1. Create Tenant
        const tenant = await Tenant.create({
            name: businessName,
            businessName: businessName,
            slug: tenantSlug.toLowerCase(),
            isActive: true
        }, { transaction: t });

        // 2. Create User (Client Owner)
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            role: 'CLIENT_OWNER',
            tenantId: tenant.id,
            isActive: true
        }, { transaction: t });

        await t.commit();

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenant: user.tenantId,
            slug: tenant.slug
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenant: tenant,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register',
            error: error.message
        });
    }
};

/**
 * Verify token and return user info
 * @route GET /api/auth/verify
 */
const verifyTokenEndpoint = async (req, res) => {
    try {
        // req.user is already attached by authenticate middleware
        const user = await User.findByPk(req.user.userId, {
            attributes: { exclude: ['password'] },
            include: [{ model: Tenant, as: 'tenant' }]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify token',
            error: error.message
        });
    }
};

module.exports = {
    login,
    registerClientOwner,
    verifyTokenEndpoint,
    googleLogin: initiateOAuthFlow,
    googleCallback: handleOAuthCallback
};
