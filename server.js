//const apiUrl = 'http://localhost:3000/api';

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Database error:', err);
  });
  
//const apiUrl = 'http://localhost:3000/api';


// Middleware for authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  jwt.verify(token, 'secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Middleware for admin-only routes
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}

// User Routes
app.post('/api/users', async (req, res) => {
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
});

app.post('/api/users/login', (req, res) => {
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
});

app.get('/api/users/me', authenticateToken, (req, res) => {
  db.get(`SELECT id, name, email, role FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  });
});

// Film Routes
app.get('/api/films', (req, res) => {
  db.all(`SELECT id, title, year FROM films ORDER BY title`, [], (err, films) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(films);
  });
});

app.get('/api/films/featured', (req, res) => {
  db.all(`
    SELECT f.id, f.title, f.year, AVG(r.rating) as avg_rating
    FROM films f
    LEFT JOIN ratings r ON f.id = r.film_id
    GROUP BY f.id
    LIMIT 4
  `, [], (err, films) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(films);
  });
});

app.post('/api/films', authenticateToken, requireAdmin, (req, res) => {
  const { title, year } = req.body;
  db.run(`INSERT INTO films (title, year) VALUES (?, ?)`, [title, year], function(err) {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.status(201).json({ id: this.lastID });
  });
});

app.put('/api/films/:id', authenticateToken, requireAdmin, (req, res) => {
  const { title, year } = req.body;
  db.run(`UPDATE films SET title = ?, year = ? WHERE id = ?`, [title, year, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.sendStatus(200);
  });
});

app.delete('/api/films/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run(`DELETE FROM films WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.sendStatus(200);
  });
});

// Rating Routes
app.post('/api/ratings', authenticateToken, (req, res) => {
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
});

app.get('/api/ratings/me', authenticateToken, (req, res) => {
  db.all(`
    SELECT r.id, f.title as film_title, f.year as film_year, r.rating, r.review
    FROM ratings r
    JOIN films f ON r.film_id = f.id
    WHERE r.user_id = ?
  `, [req.user.id], (err, ratings) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(ratings);
  });
});

app.delete('/api/ratings/:id', authenticateToken, (req, res) => {
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
});

app.get('/api/ratings/friend/:friendId', authenticateToken, (req, res) => {
  db.all(`
    SELECT f.title as film_title, f.year as film_year, r.rating
    FROM ratings r
    JOIN films f ON r.film_id = f.id
    WHERE r.user_id = ?
  `, [req.params.friendId], (err, ratings) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(ratings);
  });
});

// Friend Routes
app.post('/api/friends', authenticateToken, (req, res) => {
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
});

app.get('/api/friends', authenticateToken, (req, res) => {
  db.all(`
    SELECT u.id, u.name, u.email
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ?
  `, [req.user.id], (err, friends) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(friends);
  });
});

// Start server after database initialization

app.listen(3000, () => console.log('Server running on port 3000'));