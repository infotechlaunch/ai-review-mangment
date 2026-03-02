const Tenant = require('../models/Tenant');
const { getClientBySlug } = require('../models/Client'); // Might be used later if syncing with sheets

/**
 * Get Tenant Profile
 * Returns the profile information for the authenticated user's tenant
 */
const getTenantProfile = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const tenant = await Tenant.findByPk(tenantId, {
            attributes: [
                'businessName', 
                'industry', 
                'phone', 
                'website', 
                'address', 
                'timezone', 
                'logoUrl',
                'communication_settings',
                'social_profiles',
                'settings'
            ]
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Format response to match frontend expectations if necessary
        // Or send as is if frontend adapts
        
        res.json({
            success: true,
            data: tenant
        });

    } catch (error) {
        console.error('Error fetching tenant profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
};

/**
 * Update Tenant Profile
 * Updates the profile information for the authenticated user's tenant
 */
const updateTenantProfile = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const updates = req.body;

        const tenant = await Tenant.findByPk(tenantId);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Update basic fields
        if (updates.businessName) tenant.businessName = updates.businessName;
        if (updates.industry) tenant.industry = updates.industry;
        if (updates.phone) tenant.phone = updates.phone;
        if (updates.website) tenant.website = updates.website;
        if (updates.address) tenant.address = updates.address;
        if (updates.timezone) tenant.timezone = updates.timezone;
        if (updates.logoUrl) tenant.logoUrl = updates.logoUrl;

        // Update complex fields (JSONB)
        // We fetch existing values to merge or overwrite completely based on requirement. 
        // Assuming overwrite for simplicity or merge if partial updates needed.
        
        // Communication Settings
        if (updates.communication_settings) {
            tenant.communication_settings = {
                ...tenant.communication_settings,
                ...updates.communication_settings
            };
        } else {
             // If individual fields are sent flat (e.g. from form without nesting)
             const commChanges = {};
             if (updates.whatsappNumber !== undefined) commChanges.whatsappNumber = updates.whatsappNumber;
             if (updates.whatsappLink !== undefined) commChanges.whatsappLink = updates.whatsappLink;
             if (updates.sendRequestsViaWhatsapp !== undefined) commChanges.sendRequestsViaWhatsapp = updates.sendRequestsViaWhatsapp;
             if (updates.sendFollowupsViaWhatsapp !== undefined) commChanges.sendFollowupsViaWhatsapp = updates.sendFollowupsViaWhatsapp;
             
             if (Object.keys(commChanges).length > 0) {
                 tenant.communication_settings = {
                     ...tenant.communication_settings,
                     ...commChanges
                 };
             }
        }

        // Social Profiles
        if (updates.social_profiles) {
            tenant.social_profiles = {
                ...tenant.social_profiles,
                ...updates.social_profiles
            };
        } else {
            // Handle flat updates
            const socialChanges = {};
            if (updates.facebookPage !== undefined) socialChanges.facebookPage = updates.facebookPage;
            if (updates.instagramHandle !== undefined) socialChanges.instagramHandle = updates.instagramHandle;
            if (updates.googleReviewLink !== undefined) socialChanges.googleReviewLink = updates.googleReviewLink;
            if (updates.gmbConnName !== undefined) socialChanges.gmbConnName = updates.gmbConnName;
            if (updates.fbConnName !== undefined) socialChanges.fbConnName = updates.fbConnName;
            if (updates.igConnName !== undefined) socialChanges.igConnName = updates.igConnName;
            if (updates.placeId !== undefined) socialChanges.placeId = updates.placeId;
            if (updates.account_resource !== undefined) socialChanges.account_resource = updates.account_resource;
            if (updates.locationId !== undefined) socialChanges.locationId = updates.locationId;
            if (updates.ReviewKey !== undefined) socialChanges.ReviewKey = updates.ReviewKey;
            if (updates.gid !== undefined) socialChanges.gid = updates.gid;
            if (updates.ScreenshotOneHTML !== undefined) socialChanges.ScreenshotOneHTML = updates.ScreenshotOneHTML;

            if (Object.keys(socialChanges).length > 0) {
                tenant.social_profiles = {
                    ...tenant.social_profiles,
                    ...socialChanges
                };
            }
        }

        // Permissions / Automation Settings
        // Mapped to tenant.settings.automation mostly
        if (updates.permissions) {
            const currentSettings = tenant.settings || {};
            const currentAutomation = currentSettings.automation || {};
            
            // Map permissions to automation settings
            const automationUpdates = {
               enabled: updates.permissions.allowAiResponse || updates.permissions.allowPosting, // Example logic
               ...currentAutomation
            };
            
            // Or store permissions directly in settings if flexible
            // Let's store them under 'permissions' key in settings for clarity
            tenant.settings = {
                ...currentSettings,
                permissions: {
                    ...(currentSettings.permissions || {}),
                    ...updates.permissions
                },
                automation: {
                    ...currentAutomation,
                    // Map specific automation flags if needed
                    autoReply: updates.permissions.allowAiResponse,
                    autoPost: updates.permissions.allowPosting
                }
            };
        }

        await tenant.save();

        // Push onboarding configuration data to Google Sheets exactly as required
        const { appendClientConfigRow } = require('../services/googleSheetsWrite');
        try {
            // Gather the latest merged updates or fallback to tenant state
            const mappedData = {
                slug: tenant.slug,
                businessName: updates.businessName || tenant.businessName,
                businessType: updates.industry || tenant.industry,
                reviewURL: (updates.social_profiles && updates.social_profiles.googleReviewLink) || (tenant.social_profiles && tenant.social_profiles.googleReviewLink) || updates.googleReviewLink || '',
                fbPage: (updates.social_profiles && updates.social_profiles.facebookPage) || (tenant.social_profiles && tenant.social_profiles.facebookPage) || updates.facebookPage || '',
                igHandle: (updates.social_profiles && updates.social_profiles.instagramHandle) || (tenant.social_profiles && tenant.social_profiles.instagramHandle) || updates.instagramHandle || '',
                whatsAppLink: (updates.communication_settings && updates.communication_settings.whatsappLink) || (tenant.communication_settings && tenant.communication_settings.whatsappLink) || updates.whatsappLink || updates.whatsappNumber || '',
                gmbConnName: (updates.social_profiles && updates.social_profiles.gmbConnName) || (tenant.social_profiles && tenant.social_profiles.gmbConnName) || updates.gmbConnName || '',
                fbConnName: (updates.social_profiles && updates.social_profiles.fbConnName) || (tenant.social_profiles && tenant.social_profiles.fbConnName) || updates.fbConnName || '',
                igConnName: (updates.social_profiles && updates.social_profiles.igConnName) || (tenant.social_profiles && tenant.social_profiles.igConnName) || updates.igConnName || '',
                placeId: (updates.social_profiles && updates.social_profiles.placeId) || (tenant.social_profiles && tenant.social_profiles.placeId) || updates.placeId || '',
                account_resource: (updates.social_profiles && updates.social_profiles.account_resource) || (tenant.social_profiles && tenant.social_profiles.account_resource) || updates.account_resource || '',
                locationId: (updates.social_profiles && updates.social_profiles.locationId) || (tenant.social_profiles && tenant.social_profiles.locationId) || updates.locationId || '',
                ReviewKey: (updates.social_profiles && updates.social_profiles.ReviewKey) || (tenant.social_profiles && tenant.social_profiles.ReviewKey) || updates.ReviewKey || '',
                gid: (updates.social_profiles && updates.social_profiles.gid) || (tenant.social_profiles && tenant.social_profiles.gid) || updates.gid || '',
                ScreenshotOneHTML: (updates.social_profiles && updates.social_profiles.ScreenshotOneHTML) || (tenant.social_profiles && tenant.social_profiles.ScreenshotOneHTML) || updates.ScreenshotOneHTML || '',
                packageTier: 'Basic', // Assign basic initially or if available via updates
                waitForApproval: updates.permissions ? !updates.permissions.allowPosting : true,
                socialPostSetup: updates.permissions ? updates.permissions.allowAiResponse : false,
            };

            await appendClientConfigRow(mappedData);
        } catch (sheetError) {
            console.error('Failed to append configuration to Google Sheet:', sheetError.message);
            // Non-blocking error: we still return success to frontend since DB save worked
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: tenant
        });

    } catch (error) {
        console.error('Error updating tenant profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

module.exports = {
    getTenantProfile,
    updateTenantProfile
};
