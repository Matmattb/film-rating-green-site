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

    // Rechercher des utilisateurs
    search: (req, res) => {
        const userId = req.user.id;

        db.all(`
            SELECT 
                u.name,
                u.registration_date,
                u.icon,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM friends 
                        WHERE ((user_id = ? AND friend_id = u.id) 
                        OR (user_id = u.id AND friend_id = ?))
                        AND state = 2
                    ) THEN 3
                    WHEN EXISTS (
                        SELECT 1 FROM friends 
                        WHERE user_id = ? AND friend_id = u.id AND state = 1
                    ) THEN 1
                    WHEN EXISTS (
                        SELECT 1 FROM friends 
                        WHERE user_id = u.id AND friend_id = ? AND state = 1
                    ) THEN 2
                    ELSE 0
                END as state
            FROM users u
            WHERE u.role != 'admin' AND u.id != ?
            ORDER BY u.name ASC
        `, [userId, userId, userId, userId, userId], (err, users) => {
            if (err) {
                console.error('Erreur lors de la recherche d\'utilisateurs:', err);
                return res.status(500).json({ message: 'Erreur lors de la recherche d\'utilisateurs' });
            }
            res.json(users);
        });
    }
};

module.exports = friendHandler;
