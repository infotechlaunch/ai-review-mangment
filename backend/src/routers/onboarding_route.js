const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submitOnboardingForm, updatePlaceId } = require('../controller/onboarding_controller');

/**
 * Onboarding Form Routes
 * @prefix /api/onboarding
 */

// Route for submitting the Onboarding Form
// This route can be accessed publicly during typical flow after Signup,
// or placed under the `authenticate` middleware if needed.
router.post('/submit', submitOnboardingForm);

// Route for updating Google Place ID (Dev Mode)
router.post('/update-place-id', authenticate, updatePlaceId);

module.exports = router;
