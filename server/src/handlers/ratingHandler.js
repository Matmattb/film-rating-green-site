const db = require('../db/database');

const ratingHandler = {
  create: (req, res) => {
    const { film_id, rating, review } = req.body;
    db.get(`SELECT id FROM films WHERE id = ?`, [film_id], (err, film) => {
      if (err || !film) return res.status(404).json({ message: 'Film not found' });
      db.get(
        `SELECT id FROM ratings WHERE user_id = ? AND film_id = ?`,
        [req.user.id, film_id],
        (err, existingRating) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          if (existingRating) {
            return res.status(400).json({ message: 'You already rated this film' });
          }
          db.run(
            `INSERT INTO ratings (user_id, film_id, rating, review, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, film_id, rating, review || '', new Date().toISOString()],
            (err) => {
              if (err) return res.status(500).json({ message: 'Server error' });
              res.sendStatus(201);
            }
          );
        }
      );
    });
  },

  getMyRatings: (req, res) => {
    db.all(`
      SELECT r.id, f.title as film_title, f.year as film_year, r.rating, r.review
      FROM ratings r
      JOIN films f ON r.film_id = f.id
      WHERE r.user_id = ?
    `, [req.user.id], (err, ratings) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(ratings);
    });
  },

  delete: (req, res) => {
    db.get(
      `SELECT user_id FROM ratings WHERE id = ?`,
      [req.params.id],
      (err, rating) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        if (!rating) return res.status(404).json({ message: 'Rating not found' });
        if (rating.user_id !== req.user.id) {
          return res.status(403).json({ message: 'You can only delete your own ratings' });
        }
        db.run(`DELETE FROM ratings WHERE id = ?`, [req.params.id], (err) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          res.sendStatus(200);
        });
      }
    );
  },

  getFriendRatings: (req, res) => {
    db.all(`
      SELECT f.title as film_title, f.year as film_year, r.rating
      FROM ratings r
      JOIN films f ON r.film_id = f.id
      WHERE r.user_id = ?
    `, [req.params.friendId], (err, ratings) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(ratings);
    });
  }
};

module.exports = ratingHandler; 