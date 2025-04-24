const db = require('../db/database');

const friendHandler = {
  // Obtenir la liste des amis
  getAll: async (req, res) => {
    const userId = req.user.id;
    try {
      const { rows: friends } = await db.query(`
        SELECT u.id, u.name, u.icon, u.registration_date,
               (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as rated_movies
        FROM friends f
        JOIN users u ON (
          CASE 
            WHEN f.user_id = $1 THEN f.friend_id = u.id
            WHEN f.friend_id = $1 THEN f.user_id = u.id
          END
        )
        WHERE (f.user_id = $1 OR f.friend_id = $1) 
        AND f.state = 2
      `, [userId]);
      res.json(friends);
    } catch (err) {
      console.error('Erreur lors de la récupération de la liste d\'amis:', err);
      res.status(500).json({ message: 'Erreur lors de la récupération de la liste d\'amis' });
    }
  },

  // Obtenir les invitations d'amis
  getRequests: async (req, res) => {
    const userId = req.user.id;
    try {
      const { rows: requests } = await db.query(`
        SELECT u.id, u.name, u.icon, u.registration_date,
               (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as rated_movies
        FROM friends f
        JOIN users u ON f.user_id = u.id
        WHERE f.friend_id = $1 AND f.state = 1
        ORDER BY u.name ASC
      `, [userId]);
      res.json(requests);
    } catch (err) {
      console.error('Erreur lors de la récupération des invitations:', err);
      res.status(500).json({ message: 'Erreur lors de la récupération des invitations' });
    }
  },

  // Accepter une demande d'ami
  acceptRequest: async (req, res) => {
    const userId = req.user.id;
    const requesterId = req.params.userId;
    try {
      const { rowCount } = await db.query(`
        UPDATE friends 
        SET state = 2 
        WHERE user_id = $1 AND friend_id = $2 AND state = 1
      `, [requesterId, userId]);
      if (rowCount === 0) {
        return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
      }
      res.json({ message: 'Demande acceptée avec succès' });
    } catch (err) {
      console.error('Erreur lors de l\'acceptation de la demande:', err);
      res.status(500).json({ message: 'Erreur lors de l\'acceptation de la demande' });
    }
  },

  // Refuser une demande d'ami
  declineRequest: async (req, res) => {
    const userId = req.user.id;
    const requesterId = req.params.userId;
    try {
      const { rowCount } = await db.query(`
        DELETE FROM friends 
        WHERE user_id = $1 AND friend_id = $2 AND state = 1
      `, [requesterId, userId]);
      if (rowCount === 0) {
        return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
      }
      res.json({ message: 'Demande refusée avec succès' });
    } catch (err) {
      console.error('Erreur lors du refus de la demande:', err);
      res.status(500).json({ message: 'Erreur lors du refus de la demande' });
    }
  }
};

module.exports = friendHandler;