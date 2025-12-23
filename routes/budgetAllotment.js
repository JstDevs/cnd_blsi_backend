const express = require('express');
const router = express.Router();
const controller = require('../controllers/budgetAllotment');
const requireAuth = require('../middleware/requireAuth');
const createUploader = require('../middleware/uploadFiles');
const uploader = createUploader('budgetAllotment');

router.post('/', requireAuth, uploader.any(), controller.save);
router.get('/list', requireAuth, controller.getAll);
router.get('/budgetList', requireAuth, controller.budgetList);
router.post('/approve', requireAuth, controller.approveTransaction);
router.post('/reject', requireAuth, controller.rejectTransaction);
router.post('/delete', requireAuth, controller.delete);
// router.get('/:id', requireAuth, controller.getById);
// router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;