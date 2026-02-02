const express = require('express');
const router = express.Router();
const controller = require('../controllers/logoImages');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('logos');

router.post('/upload', requireAuth, uploader.single('file'), controller.upload);
router.post('/', requireAuth, controller.create);
router.get('/', requireAuth, controller.getAll);
router.get('/:id', requireAuth, controller.getById);
router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;