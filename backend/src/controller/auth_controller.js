const { generateToken } = require('../config/jwt');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

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
        const user = await User.findOne({ email: email.toLowerCase() })
            .populate('tenant', 'name slug businessName');

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
            userId: user._id,
            email: user.email,
            role: user.role,
        };

        // Add tenant info for non-admin users
        if (user.role !== 'ADMIN' && user.tenant) {
            tokenPayload.tenant = user.tenant._id;
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
                id: user.tenant._id,
                name: user.tenant.name,
                slug: user.tenant.slug,
                businessName: user.tenant.businessName,
            };
        }

        console.log(`✓ User logged in: ${user.email} (${user.role})`);

        res.json(response);

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
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('tenant', 'name slug businessName');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
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
        const existingUser = await User.findOne({ email: email.toLowerCase() });
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
        const existingTenant = await Tenant.findOne({ slug: tenantSlug });
        if (existingTenant) {
            return res.status(409).json({
                success: false,
                message: `Business slug "${tenantSlug}" is already taken. Please choose a different one.`
            });
        }

        // Create tenant
        const tenant = new Tenant({
            name: businessName,
            slug: tenantSlug,
            businessName: businessName,
            isActive: true,
        });

        await tenant.save();
        console.log(`✓ Tenant created: ${tenant.businessName} (${tenant.slug})`);

        // Create CLIENT_OWNER user
        const user = new User({
            email: email.toLowerCase(),
            password: password, // Will be hashed by pre-save middleware
            role: 'CLIENT_OWNER',
            tenant: tenant._id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            isActive: true,
        });

        await user.save();
        console.log(`✓ CLIENT_OWNER created: ${user.email}`);

        // Generate JWT token
        const tokenPayload = {
            userId: user._id,
            email: user.email,
            role: user.role,
            tenant: tenant._id,
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
                id: tenant._id,
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

module.exports = {
    login,
    verifyTokenEndpoint,
    registerClientOwner,
};