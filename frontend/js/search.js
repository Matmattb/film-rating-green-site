// Gestion de la recherche
function initializeSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const searchResults = document.querySelector('.search-results');
    let searchTimeout;

    console.log('Initialisation de la recherche');
    console.log('Input de recherche trouvé:', searchInput);

    if (!searchInput) {
        console.error('Input de recherche non trouvé');
        return;
    }

    searchInput.addEventListener('input', (e) => {
        console.log('Événement input détecté');
        const query = e.target.value.trim();
        console.log('Valeur de recherche:', query);
        
        // Effacer le timeout précédent
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        // Attendre 300ms après la dernière frappe avant de lancer la recherche
        searchTimeout = setTimeout(async () => {
            try {
                console.log('Envoi de la requête de recherche:', query);
                const response = await fetch(`http://localhost:3000/api/films/search?q=${encodeURIComponent(query)}`);
                console.log('Réponse reçue:', response.status);
                if (!response.ok) throw new Error('Erreur lors de la recherche');
                
                const films = await response.json();
                console.log('Films reçus:', films);
                
                // Vider les résultats précédents
                searchResults.innerHTML = '';
                
                if (films.length === 0) {
                    searchResults.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
                } else {
                    films.forEach(film => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.innerHTML = `
                            <div class="title">${film.title}</div>
                            <div class="year">${film.year}</div>
                        `;
                        div.addEventListener('click', () => {
                            window.location.href = `film.html?id=${film.id}`;
                        });
                        searchResults.appendChild(div);
                    });
                }
                
                searchResults.classList.add('active');
            } catch (error) {
                console.error('Erreur:', error);
                searchResults.innerHTML = '<div class="search-result-item">Erreur lors de la recherche</div>';
                searchResults.classList.add('active');
            }
        }, 300);
    });

    // Fermer les résultats quand on clique en dehors
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

// Initialiser la recherche quand le DOM est chargé
document.addEventListener('DOMContentLoaded', initializeSearch); 