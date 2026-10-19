const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');

// Public evaluation endpoints
router.get('/:token', evaluationController.getEvaluationForm);
router.post('/:token', evaluationController.submitEvaluation);
router.get('/:token/status', evaluationController.evaluationTokenStatus);

module.exports = router;
