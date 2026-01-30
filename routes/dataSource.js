const express = require('express');
const router = express.Router();
const controller = require('../controllers/dataSource');
const requireAuth = require('../middleware/requireAuth');

router.post('/', requireAuth, controller.create);
router.get('/', requireAuth, controller.getAll);
router.get('/:id', requireAuth, controller.getById);
router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;