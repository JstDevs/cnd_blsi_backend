const express = require('express');
const router = express.Router();
const businessPermitController = require('../controllers/businessPermit');
// const { verifyToken } = require('../middleware/authMiddleware'); // Uncomment if you have auth middleware

// Define routes
// Prefix: /business-permit (defined in index.js)

// GET all
router.get('/getall', businessPermitController.getAll);

// GET one by ID
router.get('/:id', businessPermitController.getById);

// POST create
router.post('/save', businessPermitController.create);

// PUT update
router.put('/:id', businessPermitController.update);

// DELETE
router.delete('/:id', businessPermitController.delete);

// APPROVE
router.post('/approve', businessPermitController.approve);

// REJECT
router.post('/reject', businessPermitController.reject);

module.exports = router;
