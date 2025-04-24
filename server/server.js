const app = require('./src/app');
const routes = require('./src/routes');

// Utiliser les routes
app.use('/api', routes);

module.exports = app;
// Démarrer le serveur
//app.listen(3000, () => console.log('Server running on port 3000')); 