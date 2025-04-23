const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const userHandler = {
  register: async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (name, email, password, role, registration_date) VALUES (?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, 'user', new Date().toISOString()],
        (err) => {
          if (err) return res.status(400).json({ message: 'Email already exists' });
          res.sendStatus(201);
        }
      );
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  login: (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      try {
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, 'secret', { expiresIn: '1h' });
        res.json({ token, role: user.role });
      } catch (error) {
        console.error('Error comparing passwords:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });
  },

  getProfile: (req, res) => {
    db.get(`SELECT id, name, email, role FROM users WHERE id = ?`, [req.user.id], (err, user) => {
      if (err || !user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    });
  }
};

module.exports = userHandler; 