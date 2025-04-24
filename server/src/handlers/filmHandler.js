const db = require('../db/database');

const filmHandler = {
  getAll: async (req, res) => {
    try {
      const { rows: films } = await db.query(`SELECT id, title, year FROM films ORDER BY title`);
      res.json(films);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getFeatured: async (req, res) => {
    try {
      const { rows: films } = await db.query(`
        SELECT f.id, f.title, f.year, AVG(r.rating) as avg_rating
        FROM films f
        LEFT JOIN ratings r ON f.id = r.film_id
        GROUP BY f.id
        LIMIT 4
      `);
      res.json(films);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  create: async (req, res) => {
    const { title, year } = req.body;
    try {
      const { rows } = await db.query(`INSERT INTO films (title, year) VALUES ($1, $2) RETURNING id`, [title, year]);
      res.status(201).json({ id: rows[0].id });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  update: async (req, res) => {
    const { title, year } = req.body;
    try {
      await db.query(`UPDATE films SET title = $1, year = $2 WHERE id = $3`, [title, year, req.params.id]);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  delete: async (req, res) => {
    try {
      await db.query(`DELETE FROM films WHERE id = $1`, [req.params.id]);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  search: async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Le paramètre de recherche est requis' });
    }
    const searchQuery = `%${q}%`;
    try {
      const { rows: films } = await db.query(
        `SELECT id, title, year FROM films 
         WHERE title ILIKE $1 
         ORDER BY title ASC 
         LIMIT 10`,
        [searchQuery]
      );
      res.json(films);
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la recherche' });
    }
  }
};

module.exports = filmHandler;