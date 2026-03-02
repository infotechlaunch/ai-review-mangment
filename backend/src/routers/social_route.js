const { Router } = require('express');
const router = Router();
const { postReview, getAutoPostSettings, saveAutoPostSettings } = require('../controller/social_controller');

// Manual Post
router.post('/post', postReview);

// Auto-Post Configuration
router.get('/settings', getAutoPostSettings);
router.post('/settings', saveAutoPostSettings);

module.exports = router;
