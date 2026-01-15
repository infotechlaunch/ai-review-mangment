const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Review = require('../models/Review');

/**
 * Admin Controller
 * Handles admin-specific operations
 */

/**
 * Get all registered clients (tenants)
 * @route GET /api/admin/clients
 * @access ADMIN only
 */
const getClients = async (req, res) => {
    try {
        const clients = await Tenant.find()
            .select('name slug businessName isActive createdAt')
            .sort({ createdAt: -1 });

        // Get user count for each tenant
        const clientsWithStats = await Promise.all(
            clients.map(async (client) => {
                const userCount = await User.countDocuments({ tenant: client._id });
                const reviewCount = await Review.countDocuments({ tenant: client._id });

                return {
                    ...client.toObject(),
                    userCount,
                    reviewCount,
                };
            })
        );

        res.json({
            success: true,
            data: {
                clients: clientsWithStats,
                total: clients.length,
            }
        });

    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get clients',
            error: error.message
        });
    }
};

/**
 * Enable or disable a client
 * @route PUT /api/admin/clients/:id/toggle-status
 * @access ADMIN only
 */
const toggleClientStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await Tenant.findById(id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        client.isActive = !client.isActive;
        await client.save();

        console.log(`✓ Client ${client.slug} status toggled to ${client.isActive ? 'active' : 'inactive'}`);

        res.json({
            success: true,
            message: `Client ${client.isActive ? 'enabled' : 'disabled'} successfully`,
            data: {
                clientId: client._id,
                slug: client.slug,
                isActive: client.isActive,
            }
        });

    } catch (error) {
        console.error('Error toggling client status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle client status',
            error: error.message
        });
    }
};

/**
 * Get admin dashboard statistics
 * @route GET /api/admin/dashboard
 * @access ADMIN only
 */
const getDashboardStats = async (req, res) => {
    try {
        // Get counts
        const totalClients = await Tenant.countDocuments();
        const activeClients = await Tenant.countDocuments({ isActive: true });
        const totalUsers = await User.countDocuments();
        const totalReviews = await Review.countDocuments();
        const pendingReviews = await Review.countDocuments({ approval_status: 'pending' });
        const repliedReviews = await Review.countDocuments({ has_reply: true });

        // Get recent reviews
        const recentReviews = await Review.find()
            .populate('tenant', 'businessName slug')
            .populate('location', 'name')
            .sort({ review_created_at: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                stats: {
                    totalClients,
                    activeClients,
                    totalUsers,
                    totalReviews,
                    pendingReviews,
                    repliedReviews,
                },
                recentReviews,
            }
        });

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard statistics',
            error: error.message
        });
    }
};

module.exports = {
    getClients,
    toggleClientStatus,
    getDashboardStats,
};
