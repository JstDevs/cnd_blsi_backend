const express = require('express');
const router = express.Router();
const controller = require('../controllers/approvalMatrix');
const requireAuth = require('../middleware/requireAuth');

router.post('/', requireAuth, controller.create);
router.get('/', requireAuth, controller.getAll);
router.get('/:id', requireAuth, controller.getById);
router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);
router.post('/bulk-update', requireAuth, controller.bulkUpdate);

module.exports = router;