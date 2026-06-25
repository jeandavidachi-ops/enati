// Utility functions for random avatars
function getRandomGroupAvatar() {
    const groupAvatars = [
        'default-group-1.svg',
        'default-group-2.svg', 
        'default-group-3.svg'
    ];
    return groupAvatars[Math.floor(Math.random() * groupAvatars.length)];
}

// Function to check if group photo is valid
// Returns false if photo is null, undefined, 'none', empty string, or falsy
function isValidGroupPhoto(photo) {
    const isValid = photo && photo !== 'none' && photo !== null && photo !== undefined && photo !== '';
    
    // Log when using default avatar for debugging
    if (!isValid && photo !== undefined) {
        console.log(`Using default avatar for group photo: "${photo}"`);
    }
    
    return isValid;
}

function getRandomCoinAvatar() {
    const coinAvatars = [
        'avatar-light-blue.png',
        'avatar-purple-orange.png',
        'avatar-purple-green.png'
    ];
    return coinAvatars[Math.floor(Math.random() * coinAvatars.length)];
}

// Preloader functionality for leaderboards page
let preloaderProgress = 0;
let preloaderInterval;

function startPreloader() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('progressBar');
    const preloaderText = document.querySelector('.preloader-text');
    
    if (!preloader || !progressBar) return;
    
    // Show preloader
    preloader.classList.remove('hidden');
    
    // Start progress animation
    preloaderInterval = setInterval(() => {
        preloaderProgress += Math.random() * 15;
        if (preloaderProgress > 90) {
            preloaderProgress = 90; // Don't go to 100% until everything is loaded
        }
        progressBar.style.width = preloaderProgress + '%';
    }, 200);
    
    // Update loading text
    const loadingTexts = [
        'Loading leaderboards...',
        'Preparing group data...',
        'Connecting to blockchain...',
        'Almost ready...'
    ];
    
    let textIndex = 0;
    setInterval(() => {
        if (preloaderText) {
            preloaderText.textContent = loadingTexts[textIndex];
            textIndex = (textIndex + 1) % loadingTexts.length;
        }
    }, 1500);
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('progressBar');
    
    if (!preloader || !progressBar) return;
    
    // Complete progress bar
    progressBar.style.width = '100%';
    
    // Clear interval
    if (preloaderInterval) {
        clearInterval(preloaderInterval);
    }
    
    // Hide preloader after a short delay
    setTimeout(() => {
        preloader.classList.add('hidden');
        
        // Remove preloader from DOM after animation
        setTimeout(() => {
            if (preloader.parentNode) {
                preloader.parentNode.removeChild(preloader);
            }
        }, 500);
    }, 500);
}

// Leaderboards page functionality
document.addEventListener('DOMContentLoaded', function() {
    
    // Start preloader
    startPreloader();
    
    // Load leaderboard data
    loadLeaderboardData();
    
    // Initialize search functionality
    initializeSearch();
    
    // Back button functionality
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('Back button clicked');
            window.location.href = 'index.html';
        });
    }

    // Time filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            console.log('Time filter changed to:', this.textContent);
            // Here you would typically filter the data based on the selected time period
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const tableRows = document.querySelectorAll('.table-row');
        
        tableRows.forEach(row => {
            const groupName = row.querySelector('.group-name').textContent.toLowerCase();
            const position = row.querySelector('.position').textContent.toLowerCase();
            const winRate = row.querySelector('.win-rate').textContent.toLowerCase();
            const multiplier = row.querySelector('.multiplier').textContent.toLowerCase();
            
            if (groupName.includes(searchTerm) || 
                position.includes(searchTerm) || 
                winRate.includes(searchTerm) || 
                multiplier.includes(searchTerm)) {
                row.style.display = 'grid';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Sort functionality for Win Rate column
    const sortableHeader = document.querySelector('.sortable');
    let sortDirection = 'asc';
    
    sortableHeader.addEventListener('click', function() {
        const sortIcon = this.querySelector('.sort-icon');
        const tableRows = document.querySelectorAll('.table-row');
        const rows = Array.from(tableRows);
        
        // Toggle sort direction
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        
        // Update sort icon
        sortIcon.className = sortDirection === 'asc' 
            ? 'fas fa-arrow-up sort-icon' 
            : 'fas fa-arrow-down sort-icon';
        
        // Sort rows based on win rate
        rows.sort((a, b) => {
            const aRate = parseFloat(a.querySelector('.win-rate').textContent.replace(/[^\d.]/g, ''));
            const bRate = parseFloat(b.querySelector('.win-rate').textContent.replace(/[^\d.]/g, ''));
            
            return sortDirection === 'asc' ? aRate - bRate : bRate - aRate;
        });
        
        // Reorder rows in the table
        const tableBody = document.querySelector('.table-body');
        rows.forEach(row => tableBody.appendChild(row));
    });

    // About button functionality (delegated event handling for dynamic content)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.about-btn')) {
            const btn = e.target.closest('.about-btn');
            const groupId = btn.getAttribute('data-group-id');
            const row = btn.closest('.table-row');
            const groupName = row.querySelector('.group-name').textContent;
            console.log('About button clicked for:', groupName, 'Group ID:', groupId);
            
            // Load and display top coins for this group
            loadTopCoins(groupId, groupName);
        }
    });

    // Language selector functionality
    const langActive = document.querySelector('.lang-active');
    const langInactive = document.querySelector('.lang-inactive');
    
    langActive.addEventListener('click', function() {
        console.log('Language already active: English');
    });
    
    langInactive.addEventListener('click', function() {
        // Swap active language
        langActive.classList.remove('lang-active');
        langActive.classList.add('lang-inactive');
        this.classList.remove('lang-inactive');
        this.classList.add('lang-active');
        console.log('Language changed to: Chinese');
    });

    // Menu icon functionality
    const menuIcon = document.querySelector('.menu-icon');
    menuIcon.addEventListener('click', function() {
        console.log('Menu clicked');
        alert('Menu functionality would be implemented here');
    });

    // Row hover effects (will be applied after data loads)
    function applyRowHoverEffects() {
        const tableRows = document.querySelectorAll('.table-row');
        tableRows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.01)';
                this.style.transition = 'transform 0.2s ease';
            });
            
            row.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement.classList.contains('filter-btn')) {
                activeElement.click();
            } else if (activeElement.classList.contains('about-btn')) {
                activeElement.click();
            } else if (activeElement.classList.contains('sortable')) {
                activeElement.click();
            } else if (activeElement.classList.contains('back-btn')) {
                activeElement.click();
            }
        }
        
        // Escape key to go back
        if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });

    // Focus management for accessibility
    const focusableElements = document.querySelectorAll('button, input, .sortable');
    focusableElements.forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '2px solid #8b5cf6';
            this.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });

    // Page load animation is now handled by loadLeaderboardData()

    // Back button animation on load
    if (backBtn) {
        backBtn.style.opacity = '0';
        backBtn.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            backBtn.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            backBtn.style.opacity = '1';
            backBtn.style.transform = 'translateX(0)';
        }, 200);
    }

    console.log('Leaderboards page loaded successfully');
    
    // Fallback: hide preloader after 5 seconds if data doesn't load
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader && !preloader.classList.contains('hidden')) {
            hidePreloader();
        }
    }, 5000);
});

// Function to load leaderboard data from server
async function loadLeaderboardData() {
    try {
        const response = await fetch('/api/all-groups-stats');
        const result = await response.json();
        
        if (result.success) {
            displayLeaderboardData(result.data);
            // Hide preloader after successful data load
            hidePreloader();
        } else {
            console.error('Failed to load leaderboard data:', result.message);
            // Show fallback data or error message
            showFallbackData();
            // Hide preloader even on error
            hidePreloader();
        }
    } catch (error) {
        console.error('Error loading leaderboard data:', error);
        // Show fallback data or error message
        showFallbackData();
        // Hide preloader even on error
        hidePreloader();
    }
}

// Function to display leaderboard data
function displayLeaderboardData(groups) {
    const tableBody = document.querySelector('.table-body');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Create new rows from data
    groups.forEach((group, index) => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        // Use data from the new API structure
        const winRate = group.win_rate || 0;
        const totalGames = group.total_wins + group.total_defeats;
        const multiplier = group.max_current_stat || 1;
        
        // Clean group photo URL - remove @ symbol if present
        let groupPhotoUrl = group.group_photo;
        if (groupPhotoUrl && groupPhotoUrl.startsWith('@')) {
            groupPhotoUrl = groupPhotoUrl.substring(1);
        }

        row.innerHTML = `
            <div class="table-cell position">${index + 1}</div>
            <div class="table-cell group">
                <div class="group-avatar">
                    ${isValidGroupPhoto(groupPhotoUrl) ? 
                        `<img src="${groupPhotoUrl}" alt="${group.group_name}" class="group-photo" onerror="this.src='images/${getRandomGroupAvatar()}'">` : 
                        `<img src="images/${getRandomGroupAvatar()}" alt="${group.group_name}" class="group-photo">`
                    }
                </div>
                <span class="group-name">${group.group_name || 'Unknown Group'}</span>
            </div>
            <div class="table-cell win-rate ${winRate >= 50 ? 'positive' : 'negative'}">
                <i class="fas fa-arrow-${winRate >= 50 ? 'up' : 'down'}"></i>${winRate.toFixed(1)}%
            </div>
            <div class="table-cell multiplier">${multiplier}X</div>
            <div class="table-cell duels">${totalGames}</div>
            <div class="table-cell action">
                <button class="about-btn" data-group-id="${group.group_id}">
                    <i class="fas fa-info-circle"></i>
                    About
                </button>
            </div>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Re-apply animations
    animateTableRows();
}

// Function to show fallback data when API fails
function showFallbackData() {
    const tableBody = document.querySelector('.table-body');
    
    tableBody.innerHTML = `
        <div class="table-row">
            <div class="table-cell position">1</div>
            <div class="table-cell group">
                <div class="group-avatar"></div>
                <span class="group-name">Loading...</span>
            </div>
            <div class="table-cell win-rate positive">
                <i class="fas fa-arrow-up"></i>0%
            </div>
            <div class="table-cell multiplier">1X</div>
            <div class="table-cell duels">0</div>
            <div class="table-cell action">
                <button class="about-btn" disabled>
                    <i class="fas fa-info-circle"></i>
                    About
                </button>
            </div>
        </div>
    `;
}

// Function to load top coins for a specific group
async function loadTopCoins(groupId, groupName) {
    try {
        // Show loading state in modal
        const loadingModal = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Top Coins - ${groupName}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <p>Loading top coins...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingModal);
        
        const response = await fetch(`/api/top-coins/${groupId}`);
        const result = await response.json();
        
        // Remove loading modal
        const loadingModalElement = document.querySelector('.modal-overlay');
        if (loadingModalElement) {
            loadingModalElement.remove();
        }
        
        if (result.success) {
            displayTopCoinsModal(result.data, groupName);
        } else {
            console.error('Failed to load top coins:', result.message);
            alert(`Failed to load data for ${groupName}`);
        }
    } catch (error) {
        console.error('Error loading top coins:', error);
        alert(`Error loading data for ${groupName}`);
        
        // Remove loading modal on error
        const loadingModalElement = document.querySelector('.modal-overlay');
        if (loadingModalElement) {
            loadingModalElement.remove();
        }
    }
}

// Function to get token image from API
async function getTokenImage(contractAddress) {
    try {
        const response = await fetch(`/api/token-image/${encodeURIComponent(contractAddress)}`);
        const result = await response.json();
        
        if (result.success && result.image_url) {
            return result.image_url;
        } else {
            console.warn('Failed to get token image:', result.error || 'No image URL returned');
            return null;
        }
    } catch (error) {
        console.error('Error fetching token image:', error);
        return null;
    }
}

// Function to display top coins in a modal
async function displayTopCoinsModal(coins, groupName) {
    // Create modal HTML with token images
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Top Coins - ${groupName}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="coins-list">
                        ${coins.map((coin, index) => `
                            <div class="coin-item" data-coin-index="${index}">
                                <div class="coin-position">${index + 1}</div>
                                <div class="coin-avatar">
                                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzMzMyIvPgo8L3N2Zz4=" alt="Loading..." class="token-image" data-contract-address="${coin.contract_address || ''}">
                                </div>
                                <div class="coin-name">${coin.name || 'Unknown Coin'}</div>
                                <div class="coin-multiplier">${Math.round(coin.current_stat || 1)}X</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    const modal = document.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Update token images in modal
    await updateModalTokenImages(coins);
}

// Function to update token images in modal
async function updateModalTokenImages(coins) {
    const tokenImages = document.querySelectorAll('.modal-overlay .token-image');
    
    for (let i = 0; i < Math.min(coins.length, tokenImages.length); i++) {
        const coin = coins[i];
        const tokenImage = tokenImages[i];
        
        if (coin && coin.contract_address) {
            try {
                const tokenImageUrl = await getTokenImage(coin.contract_address);
                if (tokenImageUrl) {
                    tokenImage.src = tokenImageUrl;
                    // Add error handling for image loading
                    tokenImage.onerror = function() {
                        this.src = `images/${getRandomCoinAvatar()}`;
                    };
                } else {
                    // Если изображения нет на сервере, показываем стандартную аватарку
                    tokenImage.src = `images/${getRandomCoinAvatar()}`;
                }
            } catch (error) {
                console.error('Error updating modal token image:', error);
                tokenImage.src = `images/${getRandomCoinAvatar()}`;
            }
        } else {
            // Если нет contract_address, сразу показываем стандартную аватарку
            tokenImage.src = `images/${getRandomCoinAvatar()}`;
        }
    }
}

// Function to animate table rows
function animateTableRows() {
    const tableRows = document.querySelectorAll('.table-row');
    
    tableRows.forEach((row, index) => {
        setTimeout(() => {
            row.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Apply hover effects after animation
    setTimeout(() => {
        applyRowHoverEffects();
    }, tableRows.length * 100 + 500);
}

// Global variables for search functionality
let allCoinsData = [];
let searchTimeout;
let selectedSearchIndex = -1;

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('coinSearchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('focus', handleSearchFocus);
    
    // Close search results when clicking outside
    document.addEventListener('click', handleOutsideClick);
    
    // Load all coins data for search
    loadAllCoinsForSearch();
}

// Handle search input changes
function handleSearchInput(event) {
    const query = event.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce search
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}

// Handle search keyboard navigation
function handleSearchKeydown(event) {
    const searchResults = document.getElementById('searchResults');
    const resultItems = searchResults.querySelectorAll('.search-result-item');
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            selectedSearchIndex = Math.min(selectedSearchIndex + 1, resultItems.length - 1);
            updateSearchSelection(resultItems);
            break;
        case 'ArrowUp':
            event.preventDefault();
            selectedSearchIndex = Math.max(selectedSearchIndex - 1, -1);
            updateSearchSelection(resultItems);
            break;
        case 'Enter':
            event.preventDefault();
            if (selectedSearchIndex >= 0 && resultItems[selectedSearchIndex]) {
                selectSearchResult(resultItems[selectedSearchIndex]);
            }
            break;
        case 'Escape':
            hideSearchResults();
            break;
    }
}

// Handle search focus
function handleSearchFocus() {
    const query = document.getElementById('coinSearchInput').value.trim();
    if (query.length > 0) {
        performSearch(query);
    }
}

// Handle outside click
function handleOutsideClick(event) {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer.contains(event.target)) {
        hideSearchResults();
    }
}

// Load all coins data for search
async function loadAllCoinsForSearch() {
    try {
        console.log('Loading all coins data for search...');
        
        // Fetch all groups data
        const groupsResponse = await fetch('/api/top-groups');
        const groupsData = await groupsResponse.json();
        
        if (!groupsData.success) {
            console.error('Failed to load groups data for search');
            return;
        }
        
        // Fetch all coins data
        const coinsResponse = await fetch('/api/top-coins');
        const coinsData = await coinsResponse.json();
        
        if (!coinsData.success) {
            console.error('Failed to load coins data for search');
            return;
        }
        
        // Combine all coins data
        allCoinsData = [];
        
        coinsData.data.forEach((groupCoins, groupIndex) => {
            if (groupCoins && Array.isArray(groupCoins)) {
                groupCoins.forEach(coin => {
                    if (coin) {
                        allCoinsData.push({
                            ...coin,
                            groupIndex: groupIndex,
                            groupName: groupsData.data[groupIndex]?.group_name || 'Unknown Group'
                        });
                    }
                });
            }
        });
        
        console.log(`Loaded ${allCoinsData.length} coins for search`);
        
    } catch (error) {
        console.error('Error loading coins data for search:', error);
    }
}

// Perform search
function performSearch(query) {
    if (query.length === 0) {
        hideSearchResults();
        return;
    }
    
    const searchResults = document.getElementById('searchResults');
    const results = searchCoins(query);
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No coins found</div>';
    } else {
        searchResults.innerHTML = results.map((coin, index) => `
            <div class="search-result-item" data-coin-index="${index}" data-group-index="${coin.groupIndex}">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPgo8L3N2Zz4=" alt="Loading..." class="search-result-avatar" data-contract-address="${coin.contract_address || ''}">
                <div class="search-result-info">
                    <div class="search-result-name">${highlightSearchTerm(coin.name || 'Unknown Coin', query)}</div>
                    <div class="search-result-symbol">${coin.symbol || 'N/A'} • ${coin.groupName}</div>
                    <div class="search-result-mc">${formatMarketCap(coin.market_cap)} MC</div>
                </div>
            </div>
        `).join('');
        
        // Add click event listeners
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => selectSearchResult(item));
        });
        
        // Update token images
        updateSearchResultImages(results);
    }
    
    showSearchResults();
    selectedSearchIndex = -1;
}

// Search coins by name, symbol, or group
function searchCoins(query) {
    const lowerQuery = query.toLowerCase();
    
    return allCoinsData.filter(coin => {
        const name = (coin.name || '').toLowerCase();
        const symbol = (coin.symbol || '').toLowerCase();
        const groupName = (coin.groupName || '').toLowerCase();
        
        return name.includes(lowerQuery) || 
               symbol.includes(lowerQuery) || 
               groupName.includes(lowerQuery);
    }).slice(0, 10); // Limit to 10 results
}

// Highlight search term in results
function highlightSearchTerm(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// Update search result images
async function updateSearchResultImages(results) {
    const avatars = document.querySelectorAll('.search-results .search-result-avatar');
    
    for (let i = 0; i < Math.min(results.length, avatars.length); i++) {
        const coin = results[i];
        const avatar = avatars[i];
        
        if (coin && coin.contract_address) {
            try {
                const tokenImageUrl = await getTokenImage(coin.contract_address);
                if (tokenImageUrl) {
                    avatar.src = tokenImageUrl;
                    avatar.onerror = function() {
                        this.src = `images/${getRandomCoinAvatar()}`;
                    };
                } else {
                    avatar.src = `images/${getRandomCoinAvatar()}`;
                }
            } catch (error) {
                console.error('Error updating search result image:', error);
                avatar.src = `images/${getRandomCoinAvatar()}`;
            }
        } else {
            avatar.src = `images/${getRandomCoinAvatar()}`;
        }
    }
}

// Select search result
function selectSearchResult(resultItem) {
    const coinIndex = parseInt(resultItem.dataset.coinIndex);
    const groupIndex = parseInt(resultItem.dataset.groupIndex);
    const coin = allCoinsData[coinIndex];
    
    if (coin) {
        console.log('Selected coin:', coin);
        
        // Update search input
        document.getElementById('coinSearchInput').value = coin.name || 'Unknown Coin';
        
        // Hide search results
        hideSearchResults();
        
        // Show coin details (you can implement this as needed)
        showCoinDetails(coin, groupIndex);
    }
}

// Show coin details
function showCoinDetails(coin, groupIndex) {
    // You can implement this to show detailed information about the selected coin
    // For now, we'll just show an alert
    alert(`Selected: ${coin.name || 'Unknown Coin'}\nGroup: ${coin.groupName}\nMarket Cap: ${formatMarketCap(coin.market_cap)}`);
}

// Update search selection
function updateSearchSelection(resultItems) {
    resultItems.forEach((item, index) => {
        if (index === selectedSearchIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// Show search results
function showSearchResults() {
    const searchResults = document.getElementById('searchResults');
    searchResults.classList.add('active');
}

// Hide search results
function hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    searchResults.classList.remove('active');
    selectedSearchIndex = -1;
}

// Format market cap
function formatMarketCap(marketCap) {
    if (!marketCap) return 'N/A';
    
    if (marketCap >= 1e9) {
        return `${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
        return `${(marketCap / 1e6).toFixed(1)}M`;
    } else if (marketCap >= 1e3) {
        return `${(marketCap / 1e3).toFixed(1)}K`;
    } else {
        return marketCap.toString();
    }
}
