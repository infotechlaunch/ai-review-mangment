const { appendToGoogleSheet } = require('../services/googleSheetsWrite');

const Location = require('../models/Location');
const Tenant = require('../models/Tenant');

/**
 * Handle Onboarding Form Data submission
 * @route POST /api/onboarding/submit
 */
const submitOnboardingForm = async (req, res) => {
    try {
        const { businessName, ownerName, email, phone, address, planSelected } = req.body;

        // Basic validation
        if (!businessName || !ownerName || !email) {
            return res.status(400).json({
                success: false,
                message: 'Business Name, Owner Name, and Email are required.'
            });
        }

        // Map data appropriately to pass to Google Sheets service
        const formData = {
            businessName,
            ownerName,
            email,
            phone,
            address,
            planSelected
        };

        // Write directly to Google Sheets
        const sheetResult = await appendToGoogleSheet(formData);

        if (!sheetResult || !sheetResult.success) {
            // Depending on architecture, you may choose to throw error or continue
            console.warn("Could not save to Google Sheets:", sheetResult?.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Onboarding form data submitted successfully to Google Sheets.',
        });

    } catch (error) {
        console.error('Error submitting onboarding form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit onboarding form',
            error: error.message
        });
    }
};

/**
 * Update Google Place ID for development mode (Option B)
 * @route POST /api/onboarding/update-place-id
 * @access PRIVATE
 */
const updatePlaceId = async (req, res) => {
    try {
        const { googlePlaceId } = req.body;
        console.log("updatePlaceId called. googlePlaceId:", googlePlaceId);
        console.log("req.user is:", req.user);
        
        const tenantId = req.user.tenantId || req.user.tenant;

        if (!googlePlaceId) {
            return res.status(400).json({
                success: false,
                message: 'googlePlaceId is required'
            });
        }

        if (!tenantId) {
             return res.status(400).json({
                success: false,
                message: 'Tenant ID is missing from user session'
            });
        }

        // Get tenant by id
        const tenant = await Tenant.findByPk(tenantId);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Find existing location (create if doesn't exist)
        let location = await Location.findOne({ where: { tenantId: tenant.id } });

        if (location) {
            location.googlePlaceId = googlePlaceId;
            await location.save();
        } else {
            location = await Location.create({
                tenantId: tenant.id,
                name: tenant.businessName || 'Main Location',
                slug: tenant.slug || 'main',
                googlePlaceId: googlePlaceId,
                isActive: true
            });
        }

        return res.json({
            success: true,
            message: 'Place ID updated successfully',
            location: location
        });

    } catch (error) {
        console.error('Error updating Place ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Place ID',
            error: error.message,
            stack: error.stack
        });
    }
}

module.exports = {
    submitOnboardingForm,
    updatePlaceId
};
