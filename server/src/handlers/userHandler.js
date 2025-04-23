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

  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Récupérer les informations de base de l'utilisateur
      const user = await new Promise((resolve, reject) => {
        db.get(`SELECT id, name, email, role, registration_date, icon FROM users WHERE id = ?`, [userId], (err, user) => {
          if (err) reject(err);
          resolve(user);
        });
      });

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Récupérer les statistiques
      const stats = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            (SELECT COUNT(*) FROM ratings WHERE user_id = ?) as rated_movies,
            (SELECT COUNT(*) FROM friends WHERE (user_id = ? OR friend_id = ?) AND state = 1) as friends_count
        `, [userId, userId, userId], (err, stats) => {
          if (err) reject(err);
          resolve(stats);
        });
      });

      // Récupérer les films récemment notés
      const recentRatings = await new Promise((resolve, reject) => {
        db.all(`
          SELECT f.id, f.title, r.rating, r.timestamp
          FROM films f
          JOIN ratings r ON f.id = r.film_id
          WHERE r.user_id = ?
          ORDER BY r.timestamp DESC
          LIMIT 4
        `, [userId], (err, ratings) => {
          if (err) reject(err);
          resolve(ratings);
        });
      });

      res.json({
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          memberSince: user.registration_date,
          icon: user.icon
        },
        stats: {
          ratedMovies: stats.rated_movies,
          friends: stats.friends_count
        },
        recentRatings: recentRatings.map(rating => ({
          id: rating.id,
          title: rating.title,
          rating: rating.rating,
          ratedAt: rating.timestamp
        }))
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = userHandler; 