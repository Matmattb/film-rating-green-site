const db = require('../db/database');

const friendHandler = {
    // Obtenir la liste des amis
    getAll: (req, res) => {
        const userId = req.user.id;

        db.all(`
            SELECT u.id, u.name, u.icon, u.registration_date,
                   (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as rated_movies
            FROM friends f
            JOIN users u ON (
                CASE 
                    WHEN f.user_id = ? THEN f.friend_id = u.id
                    WHEN f.friend_id = ? THEN f.user_id = u.id
                END
            )
            WHERE (f.user_id = ? OR f.friend_id = ?) 
            AND f.state = 2
        `, [userId, userId, userId, userId], (err, friends) => {
            if (err) {
                console.error('Erreur lors de la récupération de la liste d\'amis:', err);
                return res.status(500).json({ message: 'Erreur lors de la récupération de la liste d\'amis' });
            }
            res.json(friends);
        });
    },

    // Obtenir les invitations d'amis
    getRequests: (req, res) => {
        const userId = req.user.id;

        db.all(`
            SELECT u.id, u.name, u.icon, u.registration_date,
                   (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as rated_movies
            FROM friends f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_id = ? AND f.state = 1
            ORDER BY u.name ASC
        `, [userId], (err, requests) => {
            if (err) {
                console.error('Erreur lors de la récupération des invitations:', err);
                return res.status(500).json({ message: 'Erreur lors de la récupération des invitations' });
            }
            res.json(requests);
        });
    },

    // Accepter une demande d'ami
    acceptRequest: (req, res) => {
        const userId = req.user.id;
        const requesterId = req.params.userId;

        db.run(`
            UPDATE friends 
            SET state = 2 
            WHERE user_id = ? AND friend_id = ? AND state = 1
        `, [requesterId, userId], function(err) {
            if (err) {
                console.error('Erreur lors de l\'acceptation de la demande:', err);
                return res.status(500).json({ message: 'Erreur lors de l\'acceptation de la demande' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            res.json({ message: 'Demande acceptée avec succès' });
        });
    },

    // Refuser une demande d'ami
    declineRequest: (req, res) => {
        const userId = req.user.id;
        const requesterId = req.params.userId;

        db.run(`
            DELETE FROM friends 
            WHERE user_id = ? AND friend_id = ? AND state = 1
        `, [requesterId, userId], function(err) {
            if (err) {
                console.error('Erreur lors du refus de la demande:', err);
                return res.status(500).json({ message: 'Erreur lors du refus de la demande' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            res.json({ message: 'Demande refusée avec succès' });
        });
    }
};

module.exports = friendHandler;
