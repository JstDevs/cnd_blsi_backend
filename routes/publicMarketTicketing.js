const express = require('express');
const router = express.Router();
const controller = require('../controllers/publicMarketTicketing');
const requireAuth = require('../middleware/requireAuth');

console.info('🚀 [SYSTEM] Public Market Ticketing Routes initialized on /public-market-ticketing');

router.use((req, res, next) => {
    console.log(`--- [PUBLIC MARKET ROUTE] ${req.method} ${req.url} ---`);
    next();
});

router.post('/save', requireAuth, controller.save);
router.get('/', requireAuth, controller.getAll);
// router.get('/:id', requireAuth, controller.getById);
router.delete('/:id', requireAuth, controller.delete);
router.post('/approve/:id', requireAuth, controller.approve);
router.post('/reject/:id', requireAuth, controller.reject);

module.exports = router;