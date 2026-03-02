const Tenant = require('../models/Tenant');

// Mock function for posting logic
exports.postReview = async (req, res) => {
    try {
        const { reviewData, platform, imageData } = req.body;
        
        console.log(`[Social] Posting review ${reviewData.id} to ${platform}`);
        
        // Mock API call to Facebook/Instagram Graph API
        // In reality: 
        // 1. Upload image to FB/IG -> get ID
        // 2. Post status with image ID and caption
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (Math.random() > 0.9) {
            throw new Error('Simulated network error');
        }

        return res.status(200).json({
            success: true,
            message: `Successfully posted to ${platform}`,
            postId: `mock_post_id_${Date.now()}`
        });

    } catch (error) {
        console.error('[Social] Post error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to post review',
            error: error.message
        });
    }
};

exports.getAutoPostSettings = async (req, res) => {
    try {
        const userSlug = req.user.slug || req.user.tenantSlug;
        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        const settings = tenant?.settings?.autoPost || {
            enabled: false,
            minRating: 5,
            platforms: ['facebook', 'instagram']
        };

        return res.status(200).json({
            success: true,
            settings: settings
        });
    } catch (error) {
        console.error('[Social] Get settings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
};

exports.saveAutoPostSettings = async (req, res) => {
    try {
        const { enabled, minRating, platforms } = req.body;
        const userSlug = req.user.slug || req.user.tenantSlug;

        const tenant = await Tenant.findOne({ where: { slug: userSlug } });
        
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        const currentSettings = tenant.settings || {};
        const newAutoPostSettings = {
            enabled,
            minRating: parseInt(minRating) || 5,
            platforms: platforms || ['facebook', 'instagram']
        };

        tenant.settings = {
            ...currentSettings,
            autoPost: newAutoPostSettings
        };

        await tenant.save();

        console.log('[Social] Updated auto-post settings:', newAutoPostSettings);

        return res.status(200).json({
            success: true,
            message: 'Settings saved successfully',
            settings: newAutoPostSettings
        });
    } catch (error) {
        console.error('[Social] Save settings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to save settings'
        });
    }
};
