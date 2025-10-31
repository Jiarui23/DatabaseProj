const express = require('express');
const router = express.Router();
const { listReviews, createReview, deleteReview } = require('../controllers/reviewsController');

// Reviews for an anime
router.get('/anime/:id/reviews', listReviews);
router.post('/anime/:id/reviews', createReview);

// Delete specific review by id
router.delete('/reviews/:id', deleteReview);

module.exports = router;
