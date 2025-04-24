const db = require('../db/database');

const ratingHandler = {
  create: async (req, res) => {
    const { film_id, rating, review } = req.body;
    try {
      const { rows: filmRows } = await db.query(`SELECT id FROM films WHERE id = $1`, [film_id]);
      const film = filmRows[0];
      if (!film) return res.status(404).json({ message: 'Film not found' });

      const { rows: existingRows } = await db.query(
        `SELECT id FROM ratings WHERE user_id = $1 AND film_id = $2`,
        [req.user.id, film_id]
      );
      const existingRating = existingRows[0];
      if (existingRating) {
        return res.status(400).json({ message: 'You already rated this film' });
      }

      await db.query(
        `INSERT INTO ratings (user_id, film_id, rating, review, timestamp) VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, film_id, rating, review || '', new Date().toISOString()]
      );
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMyRatings: async (req, res) => {
    try {
      const { rows: ratings } = await db.query(`
        SELECT r.id, f.title as film_title, f.year as film_year, r.rating, r.review
        FROM ratings r
        JOIN films f ON r.film_id = f.id
        WHERE r.user_id = $1
      `, [req.user.id]);
      res.json(ratings);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  delete: async (req, res) => {
    try {
      const { rows: ratingRows } = await db.query(
        `SELECT user_id FROM ratings WHERE id = $1`,
        [req.params.id]
      );
      const rating = ratingRows[0];
      if (!rating) return res.status(404).json({ message: 'Rating not found' });
      if (rating.user_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own ratings' });
      }
      await db.query(`DELETE FROM ratings WHERE id = $1`, [req.params.id]);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getFriendRatings: async (req, res) => {
    try {
      const { rows: ratings } = await db.query(`
        SELECT f.title as film_title, f.year as film_year, r.rating
        FROM ratings r
        JOIN films f ON r.film_id = f.id
        WHERE r.user_id = $1
      `, [req.params.friendId]);
      res.json(ratings);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  checkUserRating: async (req, res) => {
    const { film_id } = req.params;
    try {
      const { rows: ratingRows } = await db.query(
        `SELECT id, rating, review FROM ratings WHERE user_id = $1 AND film_id = $2`,
        [req.user.id, film_id]
      );
      const rating = ratingRows[0];
      res.json({ hasRated: !!rating, rating: rating || null });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = ratingHandler;