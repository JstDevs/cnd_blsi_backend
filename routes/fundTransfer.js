const express = require('express');
const router = express.Router();
const controller = require('../controllers/fundTransfer');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('fundTransfer');

router.post('/save', requireAuth, uploader.any(), controller.save);
router.get('/fundList', requireAuth, controller.fundList);
router.get('/list', requireAuth, controller.list);
// router.get('/:id', requireAuth, controller.getById);
// router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);
router.post('/reject', requireAuth, uploader.any(), controller.rejectTransaction);
router.post('/approve', requireAuth, uploader.any(), controller.approve);

module.exports = router;