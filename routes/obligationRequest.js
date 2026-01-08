const express = require('express');
const router = express.Router();
const controller = require('../controllers/obligationRequest');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('obligationRequests');

router.post('/', requireAuth, uploader.any(), controller.create);
router.post('/postTransaction', requireAuth, controller.approveTransaction);
router.post('/rejectTransaction', requireAuth, controller.rejectTransaction);
router.get('/', requireAuth, controller.getAll);
router.get('/:id', requireAuth, controller.getById);
router.put('/:id', requireAuth, uploader.any(), controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;
