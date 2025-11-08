const express = require('express');
const router = express.Router();
const { listReviews, createReview, deleteReview, updateReview } = require('../controllers/reviewsController');

// Reviews for an anime
router.get('/anime/:id/reviews', listReviews);
router.post('/anime/:id/reviews', createReview);

// Update and delete specific review by id
router.put('/reviews/:id', updateReview);
router.delete('/reviews/:id', deleteReview);

module.exports = router;
