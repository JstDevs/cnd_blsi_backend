const express = require('express');
const router = express.Router();
const controller = require('../controllers/chequeGenerator');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('chequeGenerator');

router.post('/save', requireAuth, uploader.any(), controller.save);
router.post('/approve', requireAuth, controller.approve);
router.post('/reject', requireAuth, controller.reject);
router.get('/checkList', requireAuth, controller.checkList);
// router.get('/list', requireAuth, controller.list);
// router.get('/:id', requireAuth, controller.getById);
// router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;