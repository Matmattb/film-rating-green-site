const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const userHandler = require('../handlers/userHandler');
const filmHandler = require('../handlers/filmHandler');
const ratingHandler = require('../handlers/ratingHandler');
const friendHandler = require('../handlers/friendHandler');

// User routes
router.post('/users', userHandler.register);
router.post('/users/login', userHandler.login);
router.get('/users/profile', authenticateToken, userHandler.getProfile);

// Film routes
router.get('/films', filmHandler.getAll);
router.get('/films/search', filmHandler.search);
router.post('/films', authenticateToken, requireAdmin, filmHandler.create);
router.put('/films/:id', authenticateToken, requireAdmin, filmHandler.update);
router.delete('/films/:id', authenticateToken, requireAdmin, filmHandler.delete);

// Rating routes
router.post('/ratings', authenticateToken, ratingHandler.create);
router.get('/ratings/me', authenticateToken, ratingHandler.getMyRatings);
router.delete('/ratings/:id', authenticateToken, ratingHandler.delete);
router.get('/ratings/friend/:friendId', authenticateToken, ratingHandler.getFriendRatings);
router.get('/ratings/check/:film_id', authenticateToken, ratingHandler.checkUserRating);

// Friend routes
router.post('/friends', authenticateToken, friendHandler.add);
router.get('/friends', authenticateToken, friendHandler.getAll);

module.exports = router; 