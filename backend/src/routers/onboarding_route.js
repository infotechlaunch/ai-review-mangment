const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submitOnboardingForm, updatePlaceId, searchAndSavePlaceId, searchPlaceSuggestions } = require('../controller/onboarding_controller');

/**
 * Onboarding Form Routes
 * @prefix /api/onboarding
 */

router.post('/submit', submitOnboardingForm);
router.post('/update-place-id', authenticate, updatePlaceId);
router.post('/search-place', authenticate, searchAndSavePlaceId);

// Live search suggestions dropdown (GET with ?q=...)
router.get('/search-suggestions', authenticate, searchPlaceSuggestions);

module.exports = router;
