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

// Preloader functionality
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
        'Loading cryptocurrency battles...',
        'Preparing leaderboards...',
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

// Language selector functionality
document.addEventListener('DOMContentLoaded', function() {
    // Start preloader
    startPreloader();
    
    // Load top groups when page loads
    loadTopGroups();
    
    // Load latest coins when page loads and start auto-refresh
    loadLatestCoins();
    startLatestCoinsAutoRefresh();
    
    // Attach event listeners to group cards
    attachGroupCardEventListeners();
    

    
    const langInactive = document.querySelector('.lang-inactive');
    const langActive = document.querySelector('.lang-active');
    
    if (langInactive && langActive) {
        langInactive.addEventListener('click', function() {
            // Swap text content
            const temp = langActive.textContent;
            langActive.textContent = this.textContent;
            this.textContent = temp;
            
            // Toggle classes
            langActive.classList.toggle('lang-active');
            langActive.classList.toggle('lang-inactive');
            this.classList.toggle('lang-inactive');
            this.classList.toggle('lang-active');
            
            console.log('Language changed to:', langActive.textContent);
        });
    }
    
    // Menu icon functionality
    const menuIcon = document.querySelector('.menu-icon');
    if (menuIcon) {
        menuIcon.addEventListener('click', function() {
            alert('Menu clicked - This would open a navigation menu');
        });
    }
    
    // CTA button functionality
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            console.log('GET STARTED button clicked');
            // Here you would typically redirect to the main application
            alert('Welcome to ENATI! Redirecting to the main application...');
        });
    }
    
    // Social links functionality
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const platform = this.textContent;
            console.log(`${platform} link clicked`);
            // Here you would typically open the social media page
            alert(`Opening ${platform} page...`);
        });
    });
    

    
    // Add loading animation
    window.addEventListener('load', function() {
        const leftContent = document.querySelector('.left-content');
        if (leftContent) {
            leftContent.style.transition = 'opacity 1s ease, transform 1s ease';
            
            setTimeout(() => {
                leftContent.style.opacity = '1';
                leftContent.style.transform = 'translateY(0)';
            }, 100);
        }
    });
    
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('.cta-button, .social-link, .menu-icon');
    interactiveElements.forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '2px solid #ffffff';
            this.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === ctaButton) {
            ctaButton.click();
        }
    });
    
    // Add smooth scrolling for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    

    
    // Add page indicator animation
    const pageNumber = document.querySelector('.page-number');
    if (pageNumber) {
        setInterval(() => {
            pageNumber.style.opacity = '0.7';
            setTimeout(() => {
                pageNumber.style.opacity = '1';
            }, 200);
        }, 3000);
    }
    
    // Fallback: hide preloader after 5 seconds if data doesn't load
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader && !preloader.classList.contains('hidden')) {
            hidePreloader();
        }
    }, 5000);

    // Leaderboards functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            console.log('Filter changed to:', this.textContent);
        });
    });

    const allLeaderboardsBtn = document.querySelector('.all-leaderboards-btn');
    if (allLeaderboardsBtn) {
        allLeaderboardsBtn.addEventListener('click', function() {
            console.log('ALL LEADERBOARDS button clicked');
            // Открываем новую страницу лидерборда
            window.location.href = 'leaderboards.html';
        });
    }

    // Link buttons functionality
    const linkBtns = document.querySelectorAll('.link-btn');
    linkBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('LINK button clicked');
            alert('Opening link...');
        });
    });

    // Social icons in leaderboards
    const leaderboardSocialIcons = document.querySelectorAll('.group-card .social-icons i');
    leaderboardSocialIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const platform = this.classList.contains('fa-telegram-plane') ? 'Telegram' : 'Twitter';
            console.log(`${platform} icon clicked in leaderboard`);
            alert(`Opening ${platform}...`);
        });
    });

    // Add scroll animations for leaderboards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe leaderboard elements
    const leaderboardElements = document.querySelectorAll('.section-title');
    leaderboardElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add hover effects for leaderboard cards
    const groupCards = document.querySelectorAll('.group-card');
    groupCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (this.classList.contains('king-card')) {
                this.style.transform = 'translateY(-45px)';
                this.style.boxShadow = '0 15px 40px rgba(255, 215, 0, 0.4)';
            } else {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (this.classList.contains('king-card')) {
                this.style.transform = 'translateY(-20px)';
                this.style.boxShadow = '0 10px 30px rgba(255, 215, 0, 0.3)';
            } else {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            }
        });
    });

    // Chess pieces removed

    // Add keyboard navigation for leaderboards
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement.classList.contains('filter-btn')) {
                activeElement.click();
            } else if (activeElement.classList.contains('all-leaderboards-btn')) {
                activeElement.click();
            }
        }
    });

    // Add smooth scrolling to leaderboards section
    const leaderboardsSection = document.querySelector('.leaderboards-section');
    if (leaderboardsSection) {
        // Add scroll indicator
        const scrollIndicator = document.createElement('div');
        scrollIndicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #8b5cf6, #f97316);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            cursor: pointer;
            z-index: 1000;
            opacity: 0.8;
            transition: opacity 0.3s ease;
        `;
        scrollIndicator.innerHTML = '↓';
        scrollIndicator.title = 'Scroll to Leaderboards';
        document.body.appendChild(scrollIndicator);

        scrollIndicator.addEventListener('click', function() {
            leaderboardsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });

        scrollIndicator.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
        });

        scrollIndicator.addEventListener('mouseleave', function() {
            this.style.opacity = '0.8';
        });

        // Hide scroll indicator when at leaderboards section
        window.addEventListener('scroll', function() {
            const rect = leaderboardsSection.getBoundingClientRect();
            if (rect.top <= 100) {
                scrollIndicator.style.display = 'none';
            } else {
                scrollIndicator.style.display = 'flex';
            }
        });
    }



    // Page load animation is now handled by individual elements
});

// Function to load top groups from Python server
async function loadTopGroups() {
    const container = document.querySelector('.group-leaderboard');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading top groups...</p>
        </div>
    `;

    try {
        // Используем локальный прокси для обращения к Python серверу
        const response = await fetch('/api/top-groups');
        const result = await response.json();

        if (result.success && result.data) {
            console.log('Top groups API response:', result);
            console.log('First group data:', result.data[0]);
            await displayTopGroups(result.data);
            // Hide preloader after successful data load
            hidePreloader();
        } else {
            throw new Error(result.message || 'Failed to load groups');
        }
    } catch (error) {
        console.error('Error loading top groups:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Failed to load top groups. Please try again later.</p>
                <button class="retry-btn" onclick="loadTopGroups()">Retry</button>
            </div>
        `;
        // Hide preloader even on error
        hidePreloader();
    }
}

// Function to display top groups
async function displayTopGroups(groups) {
    const container = document.querySelector('.group-leaderboard');
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Определяем порядок отображения: 2-е место слева, 1-е место посередине, 3-е место справа
    const displayOrder = [1, 0, 2]; // Индексы групп в нужном порядке
    
    // Chess piece images for different positions (queen, king, rook)
    const chessPieces = ['queen', 'king', 'rook'];
    const cardClasses = ['queen-card', 'king-card', 'rook-card'];
    const avatarImages = ['avatar-light-blue.png', 'avatar-purple-orange.png', 'avatar-purple-green.png'];

    // Создаем промисы для загрузки топ-5 монет для каждой группы
    const allTopCoins = {}; // Объект для хранения монет всех групп
    
    const groupPromises = displayOrder.map(async (groupIndex, displayIndex) => {
        if (groups[groupIndex]) {
            const group = groups[groupIndex];
            const position = groupIndex + 1;
            const chessPiece = chessPieces[displayIndex];
            const cardClass = cardClasses[displayIndex];
            const avatarImage = avatarImages[displayIndex];
            
            console.log(`Processing group ${position} (${group.group_name}):`, group);

            // Загружаем топ-5 монет для этой группы
            let topCoins = [];
            try {
                // Используем group_id (который теперь в _id) для получения монет
                const coinsResponse = await fetch(`/api/top-coins/${encodeURIComponent(group._id)}`);
                const coinsResult = await coinsResponse.json();
                if (coinsResult.success && coinsResult.data) {
                    topCoins = coinsResult.data;
                    allTopCoins[groupIndex] = topCoins; // Сохраняем монеты для этой группы
                }
            } catch (error) {
                console.error(`Error loading coins for group ${group.group_name} (ID: ${group._id}):`, error);
            }

            const groupCard = document.createElement('div');
            groupCard.className = `group-card ${cardClass}`;
            
            // Создаем HTML для монет с плейсхолдерами
            const coinsHTML = topCoins.length > 0 
                ? topCoins.map((coin, coinIndex) => {
                    return `
                        <div class="entry" data-coin-index="${coinIndex}">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzMzMyIvPgo8L3N2Zz4=" alt="Loading..." class="entry-avatar" data-contract-address="${coin.contract_address || ''}">
                            <div class="entry-details">
                                <span class="entry-mc">${coin.coin_name || 'Unknown Coin'}</span>
                                <span class="entry-value">${Math.round(coin.current_stat || 1)}X</span>
                            </div>
                                </div>
    `;
    
    console.log('✅ Fallback data displayed');
}).join('')
                : `<div class="entry">
                    <img src="images/${avatarImage}" alt="Avatar" class="entry-avatar">
                    <div class="entry-details">
                        <span class="entry-mc">No coins available</span>
                        <span class="entry-value">1X</span>
                    </div>
                </div>`;

            // Clean group photo URL - remove @ symbol if present
            let groupPhotoUrl = group.group_photo;
            if (groupPhotoUrl && groupPhotoUrl.startsWith('@')) {
                groupPhotoUrl = groupPhotoUrl.substring(1);
            }
            
            // Debug logging for group photos
            console.log(`Group ${group.group_name} photo:`, {
                original: group.group_photo,
                cleaned: groupPhotoUrl,
                isValid: isValidGroupPhoto(groupPhotoUrl)
            });

            groupCard.innerHTML = `
                <div class="group-header">
                    <div class="group-info">
                        <div class="group-avatar">
                            ${isValidGroupPhoto(groupPhotoUrl) ? 
                                `<img src="${groupPhotoUrl}" alt="${group.group_name}" class="group-photo" 
                                     onload="console.log('Group photo loaded successfully:', '${group.group_name}')" 
                                     onerror="console.log('Group photo failed to load:', '${group.group_name}', '${groupPhotoUrl}'); this.src='images/${getRandomGroupAvatar()}'">` : 
                                `<img src="images/${getRandomGroupAvatar()}" alt="${group.group_name}" class="group-photo">`
                            }
                        </div>
                        <span class="group-name">${group.group_name || 'Unknown Group'}</span>
                        <div class="social-icons">
                            <i class="fab fa-telegram-plane"></i>
                            <i class="fab fa-twitter"></i>
                        </div>
                    </div>
                    <div class="group-position">
                        <span class="position-label">POSITION</span>
                        <span class="position-number">${position}</span>
                    </div>
                </div>
                <div class="group-entries">
                    ${coinsHTML}
                </div>
            `;

            return groupCard;
        }
        return null;
    });

    // Ждем загрузки всех групп и их монет
    const groupCards = await Promise.all(groupPromises);
    
    // Добавляем карты в контейнер
    groupCards.forEach((card, index) => {
        if (card) {
            container.appendChild(card);
            
            // Анимируем появление карточки
            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200); // Задержка для каждой следующей карточки
        }
    });

    // Обновляем изображения токенов для всех монет
    await updateAllTokenImages(allTopCoins, displayOrder, groups);

    // Re-attach event listeners for new elements
    attachGroupCardEventListeners();
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

// Function to update coin avatar with token image
async function updateCoinAvatar(avatarElement, contractAddress) {
    if (!contractAddress) {
        avatarElement.src = `images/${getRandomCoinAvatar()}`;
        return;
    }

    try {
        const tokenImageUrl = await getTokenImage(contractAddress);
        if (tokenImageUrl) {
            avatarElement.src = tokenImageUrl;
            // Add error handling for image loading
            avatarElement.onerror = function() {
                this.src = `images/${getRandomCoinAvatar()}`;
            };
        } else {
            // Если изображения нет на сервере, показываем стандартную аватарку
            avatarElement.src = `images/${getRandomCoinAvatar()}`;
        }
    } catch (error) {
        console.error('Error updating coin avatar:', error);
        avatarElement.src = `images/${getRandomCoinAvatar()}`;
    }
}

// Function to update all token images for all groups
async function updateAllTokenImages(allTopCoins, displayOrder, groups) {
    // Проходим по всем группам и обновляем изображения токенов
    for (let i = 0; i < displayOrder.length; i++) {
        const groupIndex = displayOrder[i];
        const group = groups[groupIndex];
        
        if (group && allTopCoins[groupIndex]) {
            const coins = allTopCoins[groupIndex];
            
            // Находим все аватары для этой группы
            const groupCard = document.querySelector(`.group-card:nth-child(${i + 1})`);
            if (groupCard) {
                const avatarElements = groupCard.querySelectorAll('.entry-avatar');
                
                // Обновляем изображения для каждой монеты
                for (let j = 0; j < Math.min(coins.length, avatarElements.length); j++) {
                    const coin = coins[j];
                    const avatarElement = avatarElements[j];
                    
                    if (coin && coin.contract_address) {
                        await updateCoinAvatar(avatarElement, coin.contract_address);
                    } else {
                        // Если нет contract_address, сразу показываем стандартную аватарку
                        avatarElement.src = `images/${getRandomCoinAvatar()}`;
                    }
                }
            }
        }
    }
}

// Function to attach event listeners to group cards
function attachGroupCardEventListeners() {
    const groupCards = document.querySelectorAll('.group-card');
    groupCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (this.classList.contains('king-card')) {
                this.style.transform = 'translateY(-45px)';
                this.style.boxShadow = '0 15px 40px rgba(255, 215, 0, 0.4)';
            } else {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (this.classList.contains('king-card')) {
                this.style.transform = 'translateY(-20px)';
                this.style.boxShadow = '0 10px 30px rgba(255, 215, 0, 0.3)';
            } else {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            }
        });
    });

    // Social icons event listeners
    const socialIcons = document.querySelectorAll('.group-card .social-icons i');
    socialIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const platform = this.classList.contains('fa-telegram-plane') ? 'Telegram' : 'Twitter';
            console.log(`${platform} icon clicked in leaderboard`);
            alert(`Opening ${platform}...`);
        });
    });



    // Add hover effects for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Load top clans data
    loadTopClansData();
    
    // Test server connection for debugging
    testTopClansServerConnection();
    
    // Stop auto-refresh when page is about to unload
    window.addEventListener('beforeunload', () => {
        stopLatestCoinsAutoRefresh();
    });
}

// Function to test server connection for top clans
async function testTopClansServerConnection() {
    try {
        console.log('Testing top clans server connection...');
        
        const response = await fetch('/api/shared-contracts');
        console.log('Server connection test - Status:', response.status);
        console.log('Server connection test - OK:', response.ok);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Server connection test - Data received:', result);
            console.log('Server connection test - Success:', result.success);
            console.log('Server connection test - Data length:', result.data ? result.data.length : 0);
        } else {
            console.error('Server connection test - Failed with status:', response.status);
        }
    } catch (error) {
        console.error('Server connection test - Error:', error);
    }
}

// Function to load top clans data
async function loadTopClansData() {
    try {
        console.log('Loading top clans data...');
        
        // Show loading state
        const topClansGrid = document.getElementById('topClansGrid');
        if (topClansGrid) {
            topClansGrid.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1;">
                    <div class="loading-spinner"></div>
                    <p>Loading top clans...</p>
                </div>
            `;
        }
        
        const response = await fetch('/api/shared-contracts');
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Top clans API response:', result);
        
        if (result.success && result.data) {
            console.log(`Found ${result.data.length} shared contracts`);
            displayTopClansData(result.data);
        } else {
            console.error('Failed to load top clans data:', result.error || result.message);
            showFallbackTopClansData();
        }
    } catch (error) {
        console.error('Error loading top clans data:', error);
        showFallbackTopClansData();
    }
}

// Function to display top clans data
function displayTopClansData(clansData) {
    const topClansGrid = document.getElementById('topClansGrid');
    
    if (!topClansGrid) {
        console.error('Top clans grid element not found');
        return;
    }
    
    console.log('Displaying top clans data:', clansData);
    
    // Debug: log first clan structure
    if (clansData.length > 0) {
        console.log('First clan structure:', clansData[0]);
        console.log('Available fields:', Object.keys(clansData[0]));
    }
    
    // Take only top 6 clans
    const top6Clans = clansData.slice(0, 6);
    
    if (top6Clans.length === 0) {
        topClansGrid.innerHTML = `
            <div class="no-data-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888888;">
                <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <p>No shared contracts found yet</p>
                <p style="font-size: 14px; margin-top: 10px;">Coins will appear here when they are used across multiple groups</p>
            </div>
        `;
        return;
    }
    
    const clansHTML = top6Clans.map((clan, index) => {
        const rank = index + 1;
        const avatarSrc = clan.token_image || `images/${getRandomCoinAvatar()}`;
        
        // Format numbers for better display
        const formattedGroupsCount = clan.groups_count.toLocaleString();
        const formattedTotalRecords = clan.total_records.toLocaleString();
        const formattedMarketCap = clan.market_cap ? formatMarketCap(clan.market_cap) : 'N/A';
        
        // Get ticker from different possible field names
        const ticker = clan.token_ticker || clan.token_symbol || clan.symbol || 'UNK';
        console.log(`Clan ${index + 1} ticker debug:`, {
            token_ticker: clan.token_ticker,
            token_symbol: clan.token_symbol,
            symbol: clan.symbol,
            final_ticker: ticker
        });
        
        return `
            <div class="clan-entry" style="animation-delay: ${index * 0.1}s;">
                <div class="clan-rank-badge">
                    ${rank <= 3 ? `<i class="fas fa-star"></i>` : `#${rank}`}
                </div>
                <div class="clan-avatar">
                    <img src="${avatarSrc}" alt="${clan.token_name}" 
                         onerror="this.src='images/${getRandomCoinAvatar()}'">
                </div>
                <div class="clan-info">
                    <div class="clan-description">
                        $${ticker} CALLED IN <span class="highlight">${clan.total_records}</span> GROUPS
                    </div>
                    <div class="clan-details">
                        ${clan.token_name || 'Unknown Token'} • ${formattedMarketCap} MC
                    </div>
                </div>
                <div class="clan-actions">
                    <button class="action-btn market-cap-btn" title="Market Cap">
                        ${formattedMarketCap}
                    </button>
                    <button class="action-btn copy-btn" onclick="copyContractAddress('${clan.contract_address}')" title="Copy Contract Address">
                        COPY CA
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    topClansGrid.innerHTML = clansHTML;
    
    // Add animation classes
    const clanEntries = topClansGrid.querySelectorAll('.clan-entry');
    clanEntries.forEach((entry, index) => {
        setTimeout(() => {
            entry.style.opacity = '1';
            entry.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Function to format market cap
function formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 0) return 'N/A';
    
    if (marketCap >= 1000000000) {
        return `$${(marketCap / 1000000000).toFixed(1)}B`;
    } else if (marketCap >= 1000000) {
        return `$${(marketCap / 1000000).toFixed(1)}M`;
    } else if (marketCap >= 1000) {
        return `$${(marketCap / 1000).toFixed(1)}K`;
    } else {
        return `$${marketCap.toLocaleString()}`;
    }
}

// Function to copy contract address
function copyContractAddress(contractAddress) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(contractAddress).then(() => {
            // Show success feedback
            const copyBtn = event.target;
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'COPIED!';
            copyBtn.style.background = '#10b981';
            copyBtn.style.borderColor = '#10b981';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = 'transparent';
                copyBtn.style.borderColor = '#3b82f6';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = contractAddress;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// Function to show fallback top clans data
function showFallbackTopClansData() {
    const topClansGrid = document.getElementById('topClansGrid');
    
    if (!topClansGrid) {
        console.error('Top clans grid element not found');
        return;
    }
    
    const fallbackData = [
        { token_name: 'Sample Coin 1', token_ticker: 'SC1', groups_count: 5, total_records: 12, market_cap: 1500000, contract_address: '0x1234567890abcdef...' },
        { token_name: 'Sample Coin 2', token_ticker: 'SC2', groups_count: 4, total_records: 10, market_cap: 800000, contract_address: '0xabcdef1234567890...' },
        { token_name: 'Sample Coin 3', token_ticker: 'SC3', groups_count: 3, total_records: 8, market_cap: 500000, contract_address: '0x9876543210fedcba...' },
        { token_name: 'Sample Coin 4', token_ticker: 'SC4', groups_count: 3, total_records: 7, market_cap: 300000, contract_address: '0xfedcba0987654321...' },
        { token_name: 'Sample Coin 5', token_ticker: 'SC5', groups_count: 2, total_records: 6, market_cap: 200000, contract_address: '0x5555555555555555...' },
        { token_name: 'Sample Coin 6', token_ticker: 'SC6', groups_count: 2, total_records: 5, market_cap: 100000, contract_address: '0x6666666666666666...' }
    ];
    
    displayTopClansData(fallbackData);
}

// Function to load latest coins from API
async function loadLatestCoins() {
    const latestCoinsGrid = document.getElementById('latestCoinsGrid');
    
    if (!latestCoinsGrid) {
        console.error('Latest coins grid element not found');
        return;
    }
    
    try {
        // Add updating class for smooth transition
        latestCoinsGrid.classList.add('updating');
        
        // Wait a bit for the transition to start
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Show loading state
        latestCoinsGrid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading latest coins...</p>
            </div>
        `;
        
        // Update last updated display to show loading
        const lastUpdatedTime = document.getElementById('lastUpdatedTime');
        if (lastUpdatedTime) {
            lastUpdatedTime.textContent = 'Loading...';
        }
        
        // Update coins count to show loading
        const coinsCount = document.getElementById('coinsCount');
        if (coinsCount) {
            coinsCount.textContent = '...';
        }
        
        console.log('Fetching latest coins from API...');
        
        // Fetch latest coins from API
        const response = await fetch('/api/latest-records');
        console.log('API Response status:', response.status);
        console.log('API Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (data.success && data.data && Array.isArray(data.data)) {
            console.log(`Successfully loaded ${data.data.length} latest coins`);
            displayLatestCoinsData(data.data);
        } else {
            console.error('Invalid API response format:', data);
            // Remove updating class and show error smoothly
            latestCoinsGrid.classList.remove('updating');
            latestCoinsGrid.classList.add('fade-in');
            
            latestCoinsGrid.innerHTML = `
                <div class="no-data-state" style="text-align: center; padding: 40px; color: #ff6b6b;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;"></i>
                    <p>Failed to load latest coins</p>
                    <p style="font-size: 14px; margin-top: 10px;">API response format is invalid</p>
                    <p style="font-size: 12px; margin-top: 10px; color: #888888;">Expected: {"success": true, "data": [...]}</p>
                    <button onclick="loadLatestCoins()" style="margin-top: 15px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;
            
            // Update last updated display to show error
            const lastUpdatedTime = document.getElementById('lastUpdatedTime');
            if (lastUpdatedTime) {
                lastUpdatedTime.textContent = 'Invalid Format';
            }
            
            // Update coins count to show 0
            const coinsCount = document.getElementById('coinsCount');
            if (coinsCount) {
                coinsCount.textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error loading latest coins:', error);
        // Show error instead of fallback with smooth animation
        const latestCoinsGrid = document.getElementById('latestCoinsGrid');
        if (latestCoinsGrid) {
            // Remove updating class and show error smoothly
            latestCoinsGrid.classList.remove('updating');
            latestCoinsGrid.classList.add('fade-in');
            
            latestCoinsGrid.innerHTML = `
                <div class="no-data-state" style="text-align: center; padding: 40px; color: #ff6b6b;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;"></i>
                    <p>Failed to load latest coins</p>
                    <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                    <p style="font-size: 12px; margin-top: 10px; color: #888888;">Make sure your Python server is running on http://127.0.0.1:5000</p>
                    <button onclick="loadLatestCoins()" style="margin-top: 15px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;
        }
        
        // Update last updated display to show error
        const lastUpdatedTime = document.getElementById('lastUpdatedTime');
        if (lastUpdatedTime) {
            lastUpdatedTime.textContent = 'Error';
        }
        
        // Update coins count to show 0
        const coinsCount = document.getElementById('coinsCount');
        if (coinsCount) {
            coinsCount.textContent = '0';
        }
    }
}

// Function to display latest coins data
function displayLatestCoinsData(latestCoinsData) {
    const latestCoinsGrid = document.getElementById('latestCoinsGrid');
    
    if (!latestCoinsGrid) {
        console.error('Latest coins grid element not found');
        return;
    }
    
    console.log('Displaying latest coins data:', latestCoinsData);
    
    if (latestCoinsData.length === 0) {
        latestCoinsGrid.innerHTML = `
            <div class="no-data-state" style="text-align: center; padding: 40px; color: #888888;">
                <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <p>No latest coins found yet</p>
                <p style="font-size: 14px; margin-top: 10px;">Coins will appear here when users scan them</p>
            </div>
        `;
        return;
    }
    
    const coinsHTML = latestCoinsData.map((coin, index) => {
        const rank = index + 1;
        
        // Debug logging for each coin
        console.log(`Processing coin ${index + 1}:`, coin);
        
        // Try to get avatar from different possible fields
        const avatarSrc = coin.token_image || coin.image || coin.avatar || `images/${getRandomCoinAvatar()}`;
        
        // Format market cap for display - try different possible field names
        const marketCap = coin.market_cap || coin.marketcap || coin.mc || 0;
        const formattedMarketCap = marketCap ? formatMarketCap(marketCap) : 'N/A';
        
        // Get group name and coin name - try different possible field names
        const groupName = coin.group_name || coin.groupname || coin.group || `Group ${coin.group_id || 'Unknown'}`;
        const coinName = coin.coin_name || coin.coinname || coin.name || coin.symbol || 'Unknown Coin';
        
        // Clean group photo URL - remove @ symbol if present
        let groupPhotoUrl = coin.group_photo;
        if (groupPhotoUrl && groupPhotoUrl.startsWith('@')) {
            groupPhotoUrl = groupPhotoUrl.substring(1);
        }
        
        // Note: multiplier calculation removed as it's no longer needed
        
        return `
            <div class="latest-coin-entry" style="animation-delay: ${index * 0.1}s;">
                <div class="latest-coin-rank">
                    #${rank}
                </div>
                <div class="latest-coin-avatar">
                    ${isValidGroupPhoto(groupPhotoUrl) ? 
                        `<img src="${groupPhotoUrl}" alt="${groupName}" class="group-photo" onerror="this.src='images/${getRandomGroupAvatar()}'">` : 
                        `<img src="images/${getRandomGroupAvatar()}" alt="${groupName}" class="group-photo">`
                    }
                </div>
                <div class="latest-coin-info">
                    <div class="latest-coin-description">
                        <span class="group-name">${groupName}</span>
                        <span class="called">Called</span> 
                        <span class="coin-name">${coinName}</span> 
                        <span class="at">at</span> 
                        <span class="market-cap">${formattedMarketCap}</span>
                    </div>
                    <div class="latest-coin-stats">
                        ${coin.creation_time || 'Unknown time'}
                    </div>
                </div>
                <div class="latest-coin-actions">
                    <button class="latest-coin-current-stat" title="Current Stat">
                        ${coin.current_stat || 'N/A'}
                    </button>
                    <button class="latest-coin-request" title="Request">
                        REQUEST
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Remove updating class and add fade-in effect
    latestCoinsGrid.classList.remove('updating');
    latestCoinsGrid.classList.add('fade-in');
    
    latestCoinsGrid.innerHTML = coinsHTML;
    
    // Add staggered animation for each entry
    const coinEntries = latestCoinsGrid.querySelectorAll('.latest-coin-entry');
    coinEntries.forEach((entry, index) => {
        setTimeout(() => {
            entry.style.opacity = '1';
            entry.style.transform = 'translateY(0)';
        }, index * 80 + 100); // Staggered animation with slight delay
    });
    
    // Add last updated timestamp
    const timestamp = new Date().toLocaleTimeString();
    console.log(`Latest coins displayed at: ${timestamp}`);
    
    // Update last updated display
    const lastUpdatedTime = document.getElementById('lastUpdatedTime');
    if (lastUpdatedTime) {
        lastUpdatedTime.textContent = timestamp;
    }
    
    // Update coins count
    const coinsCount = document.getElementById('coinsCount');
    if (coinsCount) {
        coinsCount.textContent = latestCoinsData.length;
    }
}

// Function to show fallback latest coins data (kept for potential future use)
function showFallbackLatestCoinsData() {
    const latestCoinsGrid = document.getElementById('latestCoinsGrid');
    
    if (!latestCoinsGrid) {
        console.error('Latest coins grid element not found');
        return;
    }
    
    console.log('Showing fallback sample data for testing...');
    
    const fallbackData = [
        { group_name: 'HORNES', coin_name: 'Sample Coin 1', market_cap: 1500000, current_stat: 100, creation_time: '31.08.2025 11:11' },
        { group_name: 'TOSHIB', coin_name: 'Sample Coin 2', market_cap: 800000, current_stat: 85, creation_time: '31.08.2025 10:45' },
        { group_name: 'MEMISH', coin_name: 'Sample Coin 3', market_cap: 500000, current_stat: 72, creation_time: '31.08.2025 10:30' },
        { group_name: 'HORNES', coin_name: 'Sample Coin 4', market_cap: 300000, current_stat: 65, creation_time: '31.08.2025 10:15' },
        { group_name: 'TOSHIB', coin_name: 'Sample Coin 5', market_cap: 200000, current_stat: 58, creation_time: '31.08.2025 10:00' },
        { group_name: 'MEMISH', coin_name: 'Sample Coin 6', market_cap: 100000, current_stat: 45, creation_time: '31.08.2025 09:45' },
        { group_name: 'HORNES', coin_name: 'Sample Coin 7', market_cap: 75000, current_stat: 38, creation_time: '31.08.2025 09:30' },
        { group_name: 'TOSHIB', coin_name: 'Sample Coin 8', market_cap: 50000, current_stat: 32, creation_time: '31.08.2025 09:15' },
        { group_name: 'MEMISH', coin_name: 'Sample Coin 9', market_cap: 25000, current_stat: 25, creation_time: '31.08.2025 09:00' },
        { group_name: 'HORNES', coin_name: 'Sample Coin 10', market_cap: 10000, current_stat: 18, creation_time: '31.08.2025 08:45' }
    ];
    
    displayLatestCoinsData(fallbackData);
    
    // Update last updated display to show sample data
    const lastUpdatedTime = document.getElementById('lastUpdatedTime');
    if (lastUpdatedTime) {
        lastUpdatedTime.textContent = 'Sample Data';
    }
    
    // Update coins count for sample data
    const coinsCount = document.getElementById('coinsCount');
    if (coinsCount) {
        coinsCount.textContent = fallbackData.length;
    }
}

// Variable to store the auto-refresh interval
let latestCoinsRefreshInterval = null;

// Function to start auto-refresh for latest coins
function startLatestCoinsAutoRefresh() {
    // Clear any existing interval
    if (latestCoinsRefreshInterval) {
        clearInterval(latestCoinsRefreshInterval);
    }
    
    // Set up new interval for 10 seconds (10000ms)
    latestCoinsRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing latest coins...');
        loadLatestCoins();
    }, 10000);
    
    console.log('Latest coins auto-refresh started (every 10 seconds)');
}

// Function to stop auto-refresh for latest coins
function stopLatestCoinsAutoRefresh() {
    if (latestCoinsRefreshInterval) {
        clearInterval(latestCoinsRefreshInterval);
        latestCoinsRefreshInterval = null;
        console.log('Latest coins auto-refresh stopped');
    }
}

// Function to force refresh latest coins
function forceRefreshLatestCoins() {
    console.log('Force refreshing latest coins...');
    
    // Add updating animation to button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.classList.add('updating');
        refreshBtn.disabled = true;
        
        // Remove updating class after loading is complete
        setTimeout(() => {
            refreshBtn.classList.remove('updating');
            refreshBtn.disabled = false;
        }, 2000); // Remove after 2 seconds
    }
    
    loadLatestCoins();
}

// Function to clear console (kept for potential future use)
function clearConsole() {
    console.clear();
    console.log('Console cleared at:', new Date().toLocaleTimeString());
}