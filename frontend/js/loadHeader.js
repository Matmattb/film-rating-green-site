function loadHeader() {
    // Créer le header directement dans le DOM
    const header = document.createElement('header');
    header.className = 'header';
    
    // Ajouter les styles
    const style = document.createElement('style');
    style.textContent = `
        .header {
            background-color: #2c3e50;
            padding: 0.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            height: 80px;
        }

        .site-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            height: 100%;
        }

        .site-title img {
            height: 100%;
            width: auto;
            object-fit: contain;
        }

        .search-bar {
            display: none;
            flex: 0 1 400px;
            margin: 0 2rem;
            position: relative;
        }

        .search-bar input {
            width: 100%;
            padding: 0.5rem;
            border: none;
            border-radius: 4px;
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .search-bar input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        .search-results {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
        }

        .search-results.active {
            display: block;
        }

        .search-result-item {
            padding: 10px;
            cursor: pointer;
            color: #2c3e50;
            border-bottom: 1px solid #eee;
        }

        .search-result-item:hover {
            background-color: #f5f5f5;
        }

        .search-result-item .title {
            font-weight: bold;
        }

        .search-result-item .year {
            color: #666;
            font-size: 0.9em;
        }

        .auth-buttons {
            display: flex;
            gap: 1rem;
        }

        .auth-button {
            padding: 0.5rem 1rem;
            border: 2px solid white;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .auth-button:hover {
            background-color: white;
            color: #2c3e50;
        }

        .profile-button {
            display: none;
            padding: 0.5rem 1rem;
            border: 2px solid white;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .profile-button:hover {
            background-color: white;
            color: #2c3e50;
        }
    `;
    document.head.appendChild(style);

    // Créer la structure du header
    header.innerHTML = `
        <a href="${sessionStorage.getItem('token') ? 'home.html' : 'index.html'}" class="site-title">
            <img src="img/logo.png" alt="FilmRating Logo">
        </a>
        
        <div class="search-bar">
            <input type="text" placeholder="Rechercher un film...">
            <div class="search-results"></div>
        </div>

        <div class="auth-buttons">
            <a href="login.html" class="auth-button">Login</a>
        </div>

        <a href="profile.html" class="profile-button">Mon Profil</a>
    `;

    // Ajouter le header au début du body
    document.body.insertBefore(header, document.body.firstChild);

    // Fonction pour mettre à jour le header
    function updateHeader() {
        const token = sessionStorage.getItem('token');
        const searchBar = document.querySelector('.search-bar');
        const authButtons = document.querySelector('.auth-buttons');
        const profileButton = document.querySelector('.profile-button');

        if (token) {
            searchBar.style.display = 'block';
            authButtons.style.display = 'none';
            profileButton.style.display = 'block';
        } else {
            searchBar.style.display = 'none';
            authButtons.style.display = 'flex';
            profileButton.style.display = 'none';
        }
    }

    // Vérifier l'état de connexion au chargement
    updateHeader();

    // Écouter les changements de token
    window.addEventListener('storage', (e) => {
        if (e.key === 'token') {
            updateHeader();
        }
    });

    // Gestion de la recherche
    const searchInput = document.querySelector('.search-bar input');
    const searchResults = document.querySelector('.search-results');
    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Effacer le timeout précédent
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                searchResults.classList.remove('active');
                return;
            }

            // Attendre 300ms après la dernière frappe avant de lancer la recherche
            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`http://localhost:3000/api/films/search?q=${encodeURIComponent(query)}`);
                    if (!response.ok) throw new Error('Erreur lors de la recherche');
                    
                    const films = await response.json();
                    
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
}

// Charger le header au chargement de la page
document.addEventListener('DOMContentLoaded', loadHeader); 