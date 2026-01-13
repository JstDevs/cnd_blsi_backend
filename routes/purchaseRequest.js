const express = require('express');
const router = express.Router();
const controller = require('../controllers/purchaseRequest');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('purchaseRequests');

router.post('/', requireAuth, uploader.any(), controller.create);
router.get('/', requireAuth, controller.getAll);
router.post('/approve', requireAuth, controller.approve);
router.post('/reject', requireAuth, controller.reject);
router.get('/:id', requireAuth, controller.getById);
router.put('/:id', requireAuth, uploader.any(), controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;