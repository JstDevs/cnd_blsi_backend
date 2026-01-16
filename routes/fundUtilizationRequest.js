const express = require('express');
const router = express.Router();
const controller = require('../controllers/fundUtilizationRequest');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('fundUtilizationRequest');


router.post('/approve', requireAuth, controller.approveTransaction);
router.post('/reject', requireAuth, controller.rejectTransaction);
router.post('/void', requireAuth, controller.delete); // Using 'void' as the path
router.post('/save', requireAuth, uploader.any(), controller.save);
// router.post('/', requireAuth, uploader.any(), controller.create);
router.get('/', requireAuth, controller.getAll);
router.get('/:id', requireAuth, controller.getById);
// router.put('/:id', requireAuth, uploader.any(), controller.update);

module.exports = router;