const { generateToken } = require('../config/jwt');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { google } = require('googleapis');

/**
 * Authentication Controller
 * Handles login and registration for ADMIN, CLIENT_OWNER, and STAFF roles
 */

/**
 * Login endpoint - handles authentication for all user types
 * @route POST /api/auth/login
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} JWT token and user information
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findOne({
            where: { email: email.toLowerCase() },
            include: [{
                model: Tenant,
                as: 'tenant',
                attributes: ['id', 'name', 'slug', 'businessName', 'gbp_accessToken', 'gbp_refreshToken']
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been disabled. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        // Add tenant info for non-admin users
        if (user.role !== 'ADMIN' && user.tenant) {
            tokenPayload.tenant = user.tenant.id;
            tokenPayload.tenantSlug = user.tenant.slug;
        }

        const token = generateToken(tokenPayload);

        // Prepare response
        const response = {
            success: true,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            token,
            message: 'Login successful'
        };

        // Add tenant info for non-admin users
        if (user.role !== 'ADMIN' && user.tenant) {
            response.tenant = {
                id: user.tenant.id,
                name: user.tenant.name,
                slug: user.tenant.slug,
                businessName: user.tenant.businessName,
            };
        }

        console.log(`✓ User logged in: ${user.email} (${user.role})`);

        res.json({
            ...response,
            isOnboarded: !!(user.tenant && user.tenant.gbp_refreshToken)
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

/**
 * Verify token endpoint - validates JWT and returns user info
 * @route GET /api/auth/verify
 * @returns {object} User information from token
 */
const verifyTokenEndpoint = async (req, res) => {
    try {
        // req.user is populated by authenticate middleware
        const user = await User.findByPk(req.user.userId, {
            attributes: { exclude: ['password'] },
            include: [{
                model: Tenant,
                as: 'tenant',
                attributes: ['id', 'name', 'slug', 'businessName']
            }]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                tenant: user.tenant,
                isActive: user.isActive,
            },
            message: 'Token is valid'
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Token verification failed',
            error: error.message
        });
    }
};

/**
 * Register Client Owner endpoint - creates a new CLIENT_OWNER user and their tenant
 * @route POST /api/auth/register/client
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} businessName - Business name for the tenant
 * @param {string} slug - Unique slug for the tenant (optional, will be auto-generated if not provided)
 * @returns {object} JWT token and user information
 */
const registerClientOwner = async (req, res) => {
    try {
        const { email, password, firstName, lastName, businessName, slug } = req.body;

        // Validation
        if (!email || !password || !firstName || !lastName || !businessName) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, first name, last name, and business name are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate password strength (at least 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Generate slug from business name if not provided
        let tenantSlug = slug;
        if (!tenantSlug) {
            tenantSlug = businessName
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
        } else {
            tenantSlug = tenantSlug.toLowerCase().trim();
        }

        // Check if tenant slug already exists
        const existingTenant = await Tenant.findOne({ where: { slug: tenantSlug } });
        if (existingTenant) {
            return res.status(409).json({
                success: false,
                message: `Business slug "${tenantSlug}" is already taken. Please choose a different one.`
            });
        }

        // Create tenant
        const tenant = await Tenant.create({
            name: businessName,
            slug: tenantSlug,
            businessName: businessName,
            isActive: true,
        });

        console.log(`✓ Tenant created: ${tenant.businessName} (${tenant.slug})`);

        // Create CLIENT_OWNER user
        const user = await User.create({
            email: email.toLowerCase(),
            password: password, // Will be hashed by hooks
            role: 'CLIENT_OWNER',
            tenantId: tenant.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            isActive: true,
        });

        console.log(`✓ CLIENT_OWNER created: ${user.email}`);

        // Generate JWT token
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenant: tenant.id,
            tenantSlug: tenant.slug,
        };

        const token = generateToken(tokenPayload);

        // Prepare response
        const response = {
            success: true,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            token,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                businessName: tenant.businessName,
            },
            // Indicate that Google Business connection is required
            requiresGoogleConnection: true,
            nextStep: 'Connect your Google Business account to start managing reviews',
            message: 'Registration successful'
        };

        res.status(201).json(response);

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

/**
 * Initiate Google Login Flow
 * @route GET /api/auth/google
 */
const googleLogin = async (req, res) => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback'
        );

        const scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'online',
            scope: scopes
        });

        res.redirect(url);
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate Google login'
        });
    }
};

/**
 * Handle Google Login Callback
 * @route GET /api/auth/google/callback
 */
const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback'
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data: googleUser } = await oauth2.userinfo.get();
        const { email, given_name, family_name, id: googleId } = googleUser;

        // Check if user exists
        let user = await User.findOne({
            where: { email: email.toLowerCase() },
            include: [{
                model: Tenant,
                as: 'tenant',
                attributes: ['id', 'name', 'slug', 'businessName', 'gbp_accessToken', 'gbp_refreshToken']
            }]
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (user) {
            // LOGIN SUCCESS

            // Generate Token
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                role: user.role,
            };

            if (user.role !== 'ADMIN' && user.tenant) {
                tokenPayload.tenant = user.tenant.id;
                tokenPayload.tenantSlug = user.tenant.slug;
            }

            const token = generateToken(tokenPayload);

            // Redirect to frontend with token
            // We encode the user data to pass it safely
            const userData = encodeURIComponent(JSON.stringify({
                token,
                role: user.role,
                email: user.email,
                userName: `${user.firstName} ${user.lastName}`,
                tenantId: user.tenant?.id,
                tenantSlug: user.tenant?.slug,
                businessName: user.tenant?.businessName,
                isOnboarded: !!(user.tenant && user.tenant.gbp_refreshToken)
            }));

            return res.redirect(`${frontendUrl}/login?google_auth=success&data=${userData}`);

        } else {
            // USER NOT FOUND -> Redirect to Signup
            // Pass pre-filled data
            const signupData = encodeURIComponent(JSON.stringify({
                email,
                firstName: given_name,
                lastName: family_name,
                googleId // Potentially useful if we want to validte later
            }));

            return res.redirect(`${frontendUrl}/login?google_auth=signup&data=${signupData}`);
        }

    } catch (error) {
        console.error('Google callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google login failed')}`);
    }
};

module.exports = {
    login,
    verifyTokenEndpoint,
    registerClientOwner,
    googleLogin,
    googleCallback,
};