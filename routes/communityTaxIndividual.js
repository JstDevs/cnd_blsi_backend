const express = require('express');
const router = express.Router();
const controller = require('../controllers/communityTaxIndividual');
const requireAuth = require('../middleware/requireAuth');

router.post('/approve', requireAuth, controller.approve);
router.post('/reject', requireAuth, controller.reject);

module.exports = router;
