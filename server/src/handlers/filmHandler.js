const db = require('../db/database');

const filmHandler = {
  getAll: (req, res) => {
    db.all(`SELECT id, title, year FROM films ORDER BY title`, [], (err, films) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(films);
    });
  },

  getFeatured: (req, res) => {
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
  },

  create: (req, res) => {
    const { title, year } = req.body;
    db.run(`INSERT INTO films (title, year) VALUES (?, ?)`, [title, year], function(err) {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.status(201).json({ id: this.lastID });
    });
  },

  update: (req, res) => {
    const { title, year } = req.body;
    db.run(`UPDATE films SET title = ?, year = ? WHERE id = ?`, [title, year, req.params.id], (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.sendStatus(200);
    });
  },

  delete: (req, res) => {
    db.run(`DELETE FROM films WHERE id = ?`, [req.params.id], (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.sendStatus(200);
    });
  },

  search: (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Le paramètre de recherche est requis' });
    }

    const searchQuery = `%${q}%`;
    
    db.all(
      `SELECT id, title, year FROM films 
       WHERE title LIKE ? 
       ORDER BY title ASC 
       LIMIT 10`,
      [searchQuery],
      (err, films) => {
        if (err) {
          return res.status(500).json({ message: 'Erreur lors de la recherche' });
        }
        res.json(films);
      }
    );
  }
};

module.exports = filmHandler; 