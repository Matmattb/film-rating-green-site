const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const userHandler = {
  register: async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        `INSERT INTO users (name, email, password, role, registration_date) VALUES ($1, $2, $3, $4, $5)`,
        [name, email, hashedPassword, 'user', new Date().toISOString()]
      );
      res.sendStatus(201);
    } catch (error) {
      if (error.code === '23505') { // Code d'erreur PostgreSQL pour violation d'unicité (email déjà utilisé)
        return res.status(400).json({ message: 'Email already exists' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      const { rows } = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
      const user = rows[0];
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const token = jwt.sign({ id: user.id, role: user.role }, 'secret', { expiresIn: '1h' });
      res.json({ token, role: user.role });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;

      // Récupérer les informations de base de l'utilisateur
      const { rows: userRows } = await db.query(
        `SELECT id, name, email, role, registration_date, icon FROM users WHERE id = $1`,
        [userId]
      );
      const user = userRows[0];
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Récupérer les statistiques
      const { rows: statsRows } = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM ratings WHERE user_id = $1) as rated_movies,
          (SELECT COUNT(*) FROM friends WHERE (user_id = $1 OR friend_id = $1) AND state = 1) as friends_count`,
        [userId]
      );
      const stats = statsRows[0];

      // Récupérer les films récemment notés
      const { rows: recentRatings } = await db.query(
        `SELECT f.id, f.title, r.rating, r.timestamp
        FROM films f
        JOIN ratings r ON f.id = r.film_id
        WHERE r.user_id = $1
        ORDER BY r.timestamp DESC
        LIMIT 4`,
        [userId]
      );

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