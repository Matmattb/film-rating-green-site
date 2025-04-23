const db = require('../db/database');

const friendHandler = {
  add: (req, res) => {
    const { email } = req.body;
    db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, friend) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!friend) return res.status(404).json({ message: 'User not found' });
      db.run(
        `INSERT INTO friends (user_id, friend_id) VALUES (?, ?)`,
        [req.user.id, friend.id],
        (err) => {
          if (err) return res.status(400).json({ message: 'Friendship already exists' });
          res.sendStatus(201);
        }
      );
    });
  },

  getAll: (req, res) => {
    db.all(`
      SELECT u.id, u.name, u.email
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
    `, [req.user.id], (err, friends) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(friends);
    });
  }
};

module.exports = friendHandler; 