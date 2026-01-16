const express = require('express');
const router = express.Router();
const controller = require('../controllers/marriageRecord');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('generalServiceRecipts');

router.post('/approve', requireAuth, controller.approve);
router.post('/reject', requireAuth, controller.reject);
router.post('/', requireAuth, uploader.any(), controller.saveTransaction);
router.get('/', requireAuth, controller.getAll);
// router.get('/:id', requireAuth, controller.getById);
// router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;