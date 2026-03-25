document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM ELEMENTS ----
    const homeView = document.getElementById('home-view');
    const readerView = document.getElementById('reader-view');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    const readerTitle = document.getElementById('reader-title');
    const readerContent = document.getElementById('reader-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const recentCards = document.getElementById('recent-cards');
    
    // Library Elements
    const libraryLoader = document.getElementById('library-loader');
    const testamentGrid = document.getElementById('testament-grid');
    
    const libraryModal = document.getElementById('library-modal');
    const libModalTitle = document.getElementById('library-modal-title');
    const libBackBtn = document.getElementById('lib-back-btn');
    const modalBooksGrid = document.getElementById('modal-books-grid');
    const modalChaptersGrid = document.getElementById('modal-chapters-grid');
    
    let currentLibraryData = {};
    
    const fontInc = document.getElementById('font-inc');
    const fontDec = document.getElementById('font-dec');
    
    // Auth Elements
    const authActionBtn = document.getElementById('auth-action-btn');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authSubmitBtn = document.getElementById('auth-submit');
    const switchAuthBtn = document.getElementById('switch-auth');
    const authError = document.getElementById('auth-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const modalTitle = document.getElementById('modal-title');
    const logoLink = document.getElementById('logo-link');
    const themeSelect = document.getElementById('theme-select');

    // ---- STATE ----
    let currentUser = null;
    let authMode = 'login';
    let userHighlights = {};
    let activeHighlightColor = localStorage.getItem('ob_hl_color') || 'yellow';
    let currentSearch = '';
    
    // Default config values
    let defaultVersion = localStorage.getItem('ob_version') || 'NIV';
    let currentVersion = defaultVersion;
    let fontSizeBase = parseFloat(localStorage.getItem('ob_fontsize')) || 1.1; // Base rems
    let versionsList = [];

    // ---- INIT ----
    async function init() {
        initTheme();
        applyFontSize();
        setupDropdowns();
        setupSwipe();
        
        // Load data concurrently
        await Promise.all([
            checkAuth(),
            loadVersions(),
            loadVOTD()
        ]);
        
        setRandomGreeting();
        setupColorPicker();
        loadRecentReadings();
        loadLibrary();
        handleRoute();
        window.addEventListener('hashchange', handleRoute);
    }

    // ---- DYNAMIC GREETING ----
    const greetings = [
        "What will you read today?",
        "Seek and you shall find... a good chapter.",
        "Your daily bread awaits.",
        "Let there be light reading.",
        "In the beginning... was this search bar.",
        "A chapter a day keeps the locusts away.",
        "Knock, and the verse shall be opened to you.",
        "Manna for your mind.",
        "Quench your spiritual thirst here.",
        "Ready for some Revelation?"
    ];

    function setRandomGreeting() {
        const greetingEl = document.getElementById('home-greeting');
        if (greetingEl) {
            const randomIndex = Math.floor(Math.random() * greetings.length);
            greetingEl.textContent = greetings[randomIndex];
        }
    }

    // ---- FONT SIZING ----
    function applyFontSize() {
        // Clamp dynamically based on adjusted root state
        document.documentElement.style.setProperty('--text-size', `clamp(${fontSizeBase - 0.15}rem, 1.5vw + ${fontSizeBase - 0.15}rem, ${fontSizeBase + 0.15}rem)`);
        localStorage.setItem('ob_fontsize', fontSizeBase);
    }
    if(fontInc) fontInc.addEventListener('click', () => { if (fontSizeBase < 2.0) { fontSizeBase += 0.1; applyFontSize(); saveState(); } });
    if(fontDec) fontDec.addEventListener('click', () => { if (fontSizeBase > 0.8) { fontSizeBase -= 0.1; applyFontSize(); saveState(); } });

    // ---- PRESENTER MODE ----
    const presentBtn = document.getElementById('present-btn');
    const presenterModal = document.getElementById('presenter-modal');
    const closePresenter = document.getElementById('close-presenter');
    const launchProjectorBtn = document.getElementById('launch-projector-btn');
    const pFontSlider = document.getElementById('p-font-slider');
    const pSizeVal = document.getElementById('p-size-val');

    if (presentBtn && presenterModal) {
        function syncProjectorState() {
            try {
                let payload = null;
                const readerView = document.getElementById('reader-view');
                const isReaderActive = readerView && readerView.style.display !== 'none';
                
                if (isReaderActive) {
                    const rTitle = document.getElementById('reader-title').textContent || 'Passage';
                    const rHtml = document.getElementById('reader-content').innerHTML || '<p>No content loaded.</p>';
                    payload = {
                        title: rTitle,
                        version: typeof currentVersion !== 'undefined' ? currentVersion : 'NIV',
                        html: rHtml,
                        timestamp: Date.now()
                    };
                } else {
                    // Fallback unconditionally to Homepage context
                    const vText = document.getElementById('votd-text').textContent || 'Verse Loading...';
                    const vRef = document.getElementById('votd-ref').textContent || 'Verse of the Day';
                    payload = {
                        title: 'Verse of the Day',
                        version: typeof currentVersion !== 'undefined' ? currentVersion : 'NIV',
                        html: `<div style="text-align:center; padding-top: 5vh;"><div style="font-size: 1.5em; font-style: italic; margin-bottom: 40px;">${vText}</div><div style="font-family: var(--font-ui); font-size: 0.8em; color: var(--accent); letter-spacing: 2px; text-transform: uppercase;">${vRef}</div></div>`,
                        timestamp: Date.now()
                    };
                }

                if (payload) {
                    localStorage.setItem('ob_presenter_data', JSON.stringify(payload));
                    const frame = document.getElementById('p-preview-frame');
                    if (frame && frame.contentWindow) {
                        frame.contentWindow.postMessage({type: 'setPresenterData', payload: payload}, '*');
                        frame.contentWindow.postMessage({type: 'setScroll', pct: 0}, '*');
                    }
                }
            } catch(e) {
                console.error('Projector sync failed:', e);
            }
        }

        let projectorWin = null;

        presentBtn.addEventListener('click', () => {
            presenterModal.classList.remove('minimized');
            presenterModal.classList.add('visible');
            syncProjectorState();
        });
        
        document.getElementById('min-presenter').addEventListener('click', () => {
            presenterModal.classList.add('minimized');
        });
        
        closePresenter.addEventListener('click', () => {
            presenterModal.classList.remove('visible');
            presenterModal.classList.remove('minimized');
            if (projectorWin && !projectorWin.closed) {
                projectorWin.postMessage({type: 'closeProjector'}, '*');
                setTimeout(() => { if (!projectorWin.closed) projectorWin.close(); }, 150);
            }
        });
        
        presenterModal.addEventListener('click', (e) => {
            if (e.target === presenterModal) presenterModal.classList.add('minimized');
        });

        document.querySelector('.presenter-header-row').addEventListener('click', (e) => {
            if (e.target.closest('#min-presenter') || e.target.closest('#close-presenter')) return;
            if (presenterModal.classList.contains('minimized')) {
                presenterModal.classList.remove('minimized');
            }
        });

        const storedSize = localStorage.getItem('ob_presenter_fontsize') || '4.5';
        if (pFontSlider) pFontSlider.value = storedSize;
        if (pSizeVal) pSizeVal.textContent = storedSize;

        if (pFontSlider) {
            pFontSlider.addEventListener('input', (e) => {
                const size = e.target.value;
                if (pSizeVal) pSizeVal.textContent = size;
                localStorage.setItem('ob_presenter_fontsize', size);
                
                const frame = document.getElementById('p-preview-frame');
                if (frame && frame.contentWindow) {
                    frame.contentWindow.postMessage({type: 'setFontSize', size: size}, '*');
                }
            });
        }

        const pScrollSlider = document.getElementById('p-scroll-slider');
        if (pScrollSlider) {
            pScrollSlider.addEventListener('input', (e) => {
                const pct = e.target.value;
                localStorage.setItem('ob_presenter_scroll', pct);
                
                const frame = document.getElementById('p-preview-frame');
                if (frame && frame.contentWindow) {
                    frame.contentWindow.postMessage({type: 'setScroll', pct: pct}, '*');
                }
            });
        }

        const displaySelect = document.getElementById('p-display-select');
        const detectBtn = document.getElementById('p-detect-displays');
        let screenCache = null;

        if (detectBtn && displaySelect) {
            async function fetchDisplays() {
                if (!('getScreenDetails' in window)) {
                    alert('Your browser does not support the Multi-Screen Window Management API. Try using Chrome or Edge.');
                    return;
                }
                try {
                    const screenDetails = await window.getScreenDetails();
                    screenCache = screenDetails.screens;
                    
                    displaySelect.innerHTML = '<option value="auto">Default (Standard Popup)</option>';
                    
                    screenCache.forEach((screen, index) => {
                        const opt = document.createElement('option');
                        opt.value = index;
                        opt.textContent = `${screen.isPrimary ? '[Primary] ' : ''}${screen.label || 'Display ' + (index+1)} (${screen.width}x${screen.height})`;
                        displaySelect.appendChild(opt);
                    });
                    
                    // Live listener for hot-plugged projectors!
                    screenDetails.addEventListener('screenschange', fetchDisplays);
                } catch (err) {
                    console.error('Failed to get screen details:', err);
                    alert('Permission to manage displays was denied.');
                }
            }

            detectBtn.addEventListener('click', fetchDisplays);
            
            // Auto-fetch if permission was previously granted without aggressively pop-upping
            if ('permissions' in navigator) {
                navigator.permissions.query({name: 'window-management'}).then(result => {
                    if (result.state === 'granted') fetchDisplays();
                });
            }
        }

        launchProjectorBtn.addEventListener('click', () => {
            syncProjectorState();
            let popParams = 'width=1280,height=720,popup,fullscreen,menubar=no,toolbar=no,location=no,status=no,directories=no';
            
            if (displaySelect && displaySelect.value !== 'auto' && screenCache) {
                const targetScreen = screenCache[parseInt(displaySelect.value)];
                if (targetScreen) {
                    // Force Chromium to physically lock the new popup window exactly directly onto the targeted display's hardware coordinates AND natively fullscreen!
                    popParams = `left=${targetScreen.availLeft},top=${targetScreen.availTop},width=${targetScreen.width},height=${targetScreen.height},popup,fullscreen`;
                }
            }
            
            projectorWin = window.open('present.html', '_blank', popParams);
        });
    }

    // Ping fallback mechanism against Chromium arbitrary local IPC frame lag drops
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'requestPresenterData') {
            const payload = localStorage.getItem('ob_presenter_data');
            if (payload && e.source) {
                e.source.postMessage({type: 'setPresenterData', payload: JSON.parse(payload)}, '*');
            }
        }
    });

    // Mirror projector manual scrolling visually onto the hardware slider
    window.addEventListener('storage', (e) => {
        if (e.key === 'ob_presenter_scroll') {
            const sc = document.getElementById('p-scroll-slider');
            if (sc) sc.value = e.newValue;
        }
    });

    // ---- COLOR PICKER ----
    function setupColorPicker() {
        const colorPickerBtn = document.getElementById('color-picker-btn');
        const colorIndicator = document.getElementById('color-indicator');
        const colorPickerDropdown = document.getElementById('color-picker-dropdown');
        const swatches = document.querySelectorAll('.color-swatch');

        if (colorPickerBtn) {
            // init preview
            if (colorIndicator) colorIndicator.style.background = `var(--hl-${activeHighlightColor})`;
            swatches.forEach(s => {
                s.classList.toggle('active', s.dataset.color === activeHighlightColor);
            });

            colorPickerBtn.addEventListener('click', () => {
                colorPickerDropdown.classList.toggle('open');
            });
            
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.color-picker-wrapper')) {
                    if (colorPickerDropdown) colorPickerDropdown.classList.remove('open');
                }
            });

            swatches.forEach(swatch => {
                swatch.addEventListener('click', () => {
                    activeHighlightColor = swatch.dataset.color;
                    localStorage.setItem('ob_hl_color', activeHighlightColor);
                    
                    swatches.forEach(s => s.classList.remove('active'));
                    swatch.classList.add('active');
                    
                    if (colorIndicator) colorIndicator.style.background = `var(--hl-${activeHighlightColor})`;
                    colorPickerDropdown.classList.remove('open');
                });
            });
        }
    }

    // ---- VERSION DROPDOWNS ----
    async function loadVersions() {
        try {
            const res = await fetch('data/versions.json');
            versionsList = await res.json();
            renderDropdown('home');
            renderDropdown('reader');
        } catch(e) { console.error("Failed to load versions", e); }
    }

    function setupDropdowns() {
        ['home', 'reader'].forEach(prefix => {
            const selected = document.getElementById(`${prefix}-selected`);
            const pane = document.getElementById(`${prefix}-dropdown`);
            const search = document.getElementById(`${prefix}-version-search`);
            if(!selected) return;
            
            selected.addEventListener('click', () => {
                pane.classList.toggle('open');
                if(pane.classList.contains('open')) search.focus();
            });
            
            search.addEventListener('input', () => renderDropdown(prefix, search.value));
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#home-version-widget') && document.getElementById('home-dropdown')) {
                document.getElementById('home-dropdown').classList.remove('open');
            }
            if (!e.target.closest('#reader-version-widget') && document.getElementById('reader-dropdown')) {
                document.getElementById('reader-dropdown').classList.remove('open');
            }
        });
    }

    function renderDropdown(prefix, filter = '') {
        const list = document.getElementById(`${prefix}-version-list`);
        const selected = document.getElementById(`${prefix}-selected`);
        if (!list || !selected || versionsList.length === 0) return;
        
        list.innerHTML = '';
        const currentObj = versionsList.find(v => v.id === currentVersion) || {id: currentVersion, name: currentVersion};
        selected.innerHTML = `${currentObj.id} &#9662;`;

        const filtered = versionsList.filter(v => 
            v.id.toLowerCase().includes(filter.toLowerCase()) || 
            v.name.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(v => {
            const li = document.createElement('li');
            const cleanName = v.name.replace(/^[- \t]+|[- \t]+$/g, '');
            li.textContent = `${v.id} - ${cleanName}`;
            li.addEventListener('click', () => {
                currentVersion = v.id;
                defaultVersion = v.id;
                saveState();
                
                document.getElementById(`${prefix}-dropdown`).classList.remove('open');
                renderDropdown('home');
                renderDropdown('reader');
                loadVOTD();
                loadLibrary();
                
                const votdBox = document.getElementById('votd-box');
                if (votdBox && votdBox.href.includes('#read=')) {
                    const currentHrefSearch = votdBox.href.split('&v=')[0];
                    votdBox.href = `${currentHrefSearch}&v=${currentVersion}`;
                }
                
                if (prefix === 'reader' && currentSearch) {
                    window.location.hash = `#read=${encodeURIComponent(currentSearch)}&v=${currentVersion}`;
                }
            });
            list.appendChild(li);
        });
    }

    // ---- VOTD ----
    async function loadVOTD() {
        try {
            const res = await fetch(`votd.php?version=${encodeURIComponent(currentVersion)}`);
            const data = await res.json();
            if (!data.error) {
                document.getElementById('votd-text').textContent = data.text;
                document.getElementById('votd-ref').textContent = data.ref;
                document.getElementById('votd-box').href = `#read=${encodeURIComponent(data.search)}&v=${currentVersion}`;
            }
        } catch(e) {}
    }

    // ---- ROUTING ----
    function handleRoute() {
        const hash = window.location.hash;
        if (hash.startsWith('#read=')) {
            const params = new URLSearchParams(hash.replace('#read=', 'search='));
            const search = params.get('search');
            const version = params.get('v') || defaultVersion;
            
            if (version !== currentVersion) {
                currentVersion = version;
                renderDropdown('home');
                renderDropdown('reader');
            }
            showReader(search, version);
        } else {
            showHome();
        }
    }

    function showHome() {
        homeView.style.display = 'block';
        readerView.style.display = 'none';
        loadRecentReadings();
        window.scrollTo(0,0);
        
        // Ensure VOTD link carries correct version context
        const votdBox = document.getElementById('votd-box');
        if (votdBox && votdBox.href.includes('#read=')) {
            const currentHrefSearch = votdBox.href.split('&v=')[0];
            votdBox.href = `${currentHrefSearch}&v=${currentVersion}`;
        }
    }

    async function showReader(search, version) {
        homeView.style.display = 'none';
        readerView.style.display = 'block';
        
        currentSearch = search;
        readerTitle.textContent = search.replace(/\+/g, ' ');
        
        readerContent.innerHTML = '<div class="loader">Loading passage...</div>';
        prevBtn.classList.add('disabled');
        nextBtn.classList.add('disabled');
        prevBtn.href = '#';
        nextBtn.href = '#';
        
        window.scrollTo(0,0);

        try {
            const res = await fetch(`proxy.php?search=${encodeURIComponent(search)}&version=${encodeURIComponent(version)}`);
            const data = await res.json();
            
            if (data.error) {
                readerContent.innerHTML = `<div style="color:red; text-align:center; padding:2rem;">Error: ${data.error}</div>`;
                return;
            }
            
            readerTitle.textContent = data.search;
            readerContent.innerHTML = data.html;
            
            // Broadcast to presenter window
            const payload = {
                title: data.search,
                version: version,
                html: data.html,
                timestamp: Date.now()
            };
            localStorage.setItem('ob_presenter_data', JSON.stringify(payload));
            
            // Hard reset the remote scroll anytime the text loads to prevent jarring layout jumps!
            localStorage.setItem('ob_presenter_scroll', '0');
            
            const frame = document.getElementById('p-preview-frame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({type: 'setPresenterData', payload: payload}, '*');
                frame.contentWindow.postMessage({type: 'setScroll', pct: 0}, '*');
            }
            
            // Fix any stray links that the PHP proxy missed
            const links = readerContent.querySelectorAll('a');
            links.forEach(link => {
                try {
                    const hrefAttr = link.getAttribute('href');
                    if (!hrefAttr || hrefAttr.startsWith('#')) return; // Ignore local hash links
                    
                    const url = new URL(hrefAttr, 'https://www.biblegateway.com/passage/');
                    const searchParam = url.searchParams.get('search');
                    
                    if (searchParam) {
                        link.href = `#read=${encodeURIComponent(searchParam)}&v=${version}`;
                    } else {
                        link.removeAttribute('href');
                    }
                } catch(e) {
                    link.removeAttribute('href');
                }
            });

            // Navigation
            if (data.prev) {
                prevBtn.classList.remove('disabled');
                prevBtn.href = `#read=${encodeURIComponent(data.prev)}&v=${version}`;
            }
            if (data.next) {
                nextBtn.classList.remove('disabled');
                nextBtn.href = `#read=${encodeURIComponent(data.next)}&v=${version}`;
            }

            saveRecentReading(data.search, version);
            setupHighlights();

        } catch (err) {
            readerContent.innerHTML = `<div style="color:red; text-align:center; padding:2rem;">Failed to connect to proxy.</div>`;
        }
    }

    // ---- MOBILE SWIPE ----
    function setupSwipe() {
        let touchStartX = 0;
        let touchEndX = 0;

        readerView.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        readerView.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});

        function handleSwipe() {
            if (touchEndX < touchStartX - 80) {
                // Swiped Left -> Next Chapter (Like reading a book, turning page left)
                if (!nextBtn.classList.contains('disabled')) window.location.hash = nextBtn.getAttribute('href');
            }
            if (touchEndX > touchStartX + 80) {
                // Swiped Right -> Prev Chapter
                if (!prevBtn.classList.contains('disabled')) window.location.hash = prevBtn.getAttribute('href');
            }
        }
    }

    // ---- INTERACTIVITY ----
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const search = searchInput.value.trim();
            if (search) window.location.hash = `#read=${encodeURIComponent(search)}&v=${currentVersion}`;
        });
    }

    // ---- HIGHLIGHTS & STATE ----
    function getHighlights() {
        if (currentUser) return userHighlights;
        const stored = sessionStorage.getItem('guest_highlights');
        if (!stored) return {};
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            let newObj = {};
            parsed.forEach(id => newObj[id] = 'yellow');
            return newObj;
        }
        return parsed;
    }

    function saveState() {
        // Save to browser natively first
        localStorage.setItem('ob_version', defaultVersion);
        const currentTheme = localStorage.getItem('ob_theme') || 'sepia';
        
        if (currentUser) {
            fetch('auth.php?action=save_state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    highlights: userHighlights,
                    default_version: defaultVersion,
                    theme: currentTheme,
                    font_size: fontSizeBase
                })
            });
        } else {
            sessionStorage.setItem('guest_highlights', JSON.stringify(userHighlights));
        }
    }

    function setupHighlights() {
        const textNodes = readerContent.querySelectorAll('.text');
        
        textNodes.forEach(node => {
            const idClass = Array.from(node.classList).find(c => c.match(/[A-Za-z0-9]+-[0-9]+-[0-9]+/));
            
            if (idClass) {
                let savedColor = null;
                if (currentUser && userHighlights[idClass]) {
                    savedColor = userHighlights[idClass];
                } else if (!currentUser) {
                    const guestData = getHighlights();
                    if (guestData[idClass]) savedColor = guestData[idClass];
                }

                if (savedColor) {
                    node.classList.add(`hl-${savedColor}`);
                    node.dataset.hlColor = savedColor;
                }

                node.addEventListener('click', () => {
                    let currentHighlights = getHighlights();
                    if (Array.isArray(currentHighlights)) currentHighlights = {}; // Safe fallback
                    
                    if (node.dataset.hlColor) {
                        if (node.dataset.hlColor === activeHighlightColor) {
                            // Toggle off entirely
                            node.className = node.className.replace(/\bhl-[a-z]+\b/g, '').trim();
                            delete node.dataset.hlColor;
                            delete currentHighlights[idClass];
                        } else {
                            // Swap color
                            node.className = node.className.replace(/\bhl-[a-z]+\b/g, '').trim();
                            node.classList.add(`hl-${activeHighlightColor}`);
                            node.dataset.hlColor = activeHighlightColor;
                            currentHighlights[idClass] = activeHighlightColor;
                        }
                    } else {
                        // Apply new highlight
                        node.classList.add(`hl-${activeHighlightColor}`);
                        node.dataset.hlColor = activeHighlightColor;
                        currentHighlights[idClass] = activeHighlightColor;
                    }
                    
                    userHighlights = currentHighlights; // Sync local var
                    saveState();
                });
            }
        });
    }

    // ---- LIBRARY MODAL (DRILL-DOWN) ----
    async function loadLibrary() {
        if (!testamentGrid) return;
        testamentGrid.innerHTML = '';
        if (libraryLoader) libraryLoader.style.display = 'block';
        
        try {
            const res = await fetch(`books.php?version=${encodeURIComponent(currentVersion)}`);
            const data = await res.json();
            if (libraryLoader) libraryLoader.style.display = 'none';
            
            if (data.error || !Array.isArray(data)) return;
            
            currentLibraryData = {
                'OT': { title: 'Old Testament', books: [] },
                'NT': { title: 'New Testament', books: [] },
                'Apoc': { title: 'Apocrypha', books: [] }
            };
            
            data.forEach(book => {
                const t = book.testament || 'OT';
                if (!currentLibraryData[t]) currentLibraryData[t] = { title: t, books: [] };
                currentLibraryData[t].books.push(book);
            });
            
            Object.keys(currentLibraryData).forEach(key => {
                const group = currentLibraryData[key];
                if (group.books.length > 0) {
                    const btn = document.createElement('div');
                    btn.className = 'testament-btn';
                    btn.textContent = group.title;
                    btn.addEventListener('click', () => openTestamentModal(key));
                    testamentGrid.appendChild(btn);
                }
            });
            
        } catch(e) {
            if (libraryLoader) libraryLoader.style.display = 'none';
        }
    }

    function openTestamentModal(testamentKey) {
        if (!libraryModal) return;
        const group = currentLibraryData[testamentKey];
        if (!group) return;
        
        libModalTitle.textContent = group.title;
        libBackBtn.style.display = 'none';
        
        const spacer = document.getElementById('lib-modal-spacer');
        if (spacer) spacer.style.display = 'none';
        
        modalBooksGrid.innerHTML = '';
        modalBooksGrid.style.display = 'grid';
        modalChaptersGrid.style.display = 'none';
        
        group.books.forEach(book => {
            const btn = document.createElement('div');
            btn.className = 'book-btn';
            btn.textContent = book.name;
            btn.addEventListener('click', () => {
                openChapterModal(book.name, book.chapters, testamentKey);
            });
            modalBooksGrid.appendChild(btn);
        });
        
        libraryModal.classList.add('visible');
    }

    function openChapterModal(bookName, chaptersCount, parentTestamentKey) {
        libModalTitle.textContent = bookName;
        libBackBtn.style.display = 'block';
        
        const spacer = document.getElementById('lib-modal-spacer');
        if (spacer) spacer.style.display = 'block';
        
        libBackBtn.onclick = () => {
            openTestamentModal(parentTestamentKey);
        };
        
        modalChaptersGrid.innerHTML = '';
        modalBooksGrid.style.display = 'none';
        modalChaptersGrid.style.display = 'grid';
        
        for (let i = 1; i <= chaptersCount; i++) {
            const a = document.createElement('a');
            a.className = 'chapter-btn';
            a.textContent = i;
            a.href = `#read=${encodeURIComponent(bookName + ' ' + i)}&v=${currentVersion}`;
            a.addEventListener('click', () => {
                libraryModal.classList.remove('visible');
            });
            modalChaptersGrid.appendChild(a);
        }
    }

    if (libraryModal) {
        libraryModal.addEventListener('click', (e) => {
            if (e.target === libraryModal) libraryModal.classList.remove('visible');
        });
    }

    // ---- RECENT READINGS ----
    function saveRecentReading(search, version) {
        let recents = JSON.parse(localStorage.getItem('ob_recent') || '[]');
        recents = recents.filter(r => r.search !== search);
        recents.unshift({ search, version }); // Store historically natively for backend safety, but override visually
        if (recents.length > 6) recents.pop();
        localStorage.setItem('ob_recent', JSON.stringify(recents));
    }

    function loadRecentReadings() {
        let recents = JSON.parse(localStorage.getItem('ob_recent') || '[]');
        if (!recentCards) return;
        recentCards.innerHTML = '';
        
        if (recents.length === 0) {
            recentCards.innerHTML = '<p style="opacity:0.6;">No recent readings.</p>';
            return;
        }
        recents.forEach(r => {
            const a = document.createElement('a');
            a.href = `#read=${encodeURIComponent(r.search)}&v=${currentVersion}`;
            a.className = 'card';
            a.innerHTML = `<div class="card-title">${r.search}</div><div class="card-version">${currentVersion}</div>`;
            recentCards.appendChild(a);
        });
    }

    // ---- AUTH LOGIC ----
    async function checkAuth() {
        try {
            const res = await fetch('auth.php?action=me');
            const data = await res.json();
            if (data.authenticated) {
                currentUser = data.username;
                let hl = data.highlights || {};
                if (Array.isArray(hl)) {
                    userHighlights = {};
                    hl.forEach(id => userHighlights[id] = 'yellow');
                } else {
                    userHighlights = hl;
                }
                if (data.default_version) {
                    defaultVersion = data.default_version;
                    currentVersion = defaultVersion;
                    localStorage.setItem('ob_version', defaultVersion);
                    renderDropdown('home');
                    renderDropdown('reader');
                }
                if (data.theme) {
                    localStorage.setItem('ob_theme', data.theme);
                    if (themeSelect) themeSelect.value = data.theme;
                    applyTheme(data.theme);
                }
                if (data.font_size) {
                    fontSizeBase = parseFloat(data.font_size);
                    applyFontSize();
                }
                if (authActionBtn) authActionBtn.textContent = 'Logout';
            } else {
                currentUser = null;
                // If guest, grab session highlights locally
                userHighlights = getHighlights();
                if (authActionBtn) authActionBtn.textContent = 'Login';
            }
        } catch(e) {}
    }

    if (authActionBtn) {
        authActionBtn.addEventListener('click', async () => {
            if (currentUser) {
                await fetch('auth.php?action=logout');
                currentUser = null;
                userHighlights = {};
                authActionBtn.textContent = 'Login';
                location.reload(); 
            } else {
                authError.textContent = '';
                authModal.classList.add('visible');
            }
        });
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) authModal.classList.remove('visible');
        });
    }

    if (switchAuthBtn) {
        switchAuthBtn.addEventListener('click', () => {
            authMode = authMode === 'login' ? 'register' : 'login';
            modalTitle.textContent = authMode === 'login' ? 'Login to Verse.' : 'Register for Verse.';
            authSubmitBtn.textContent = authMode === 'login' ? 'Login' : 'Create Account';
            switchAuthBtn.textContent = authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login';
            authError.textContent = '';
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            if (!username || !password) return;
            
            authError.textContent = 'Processing...';
            
            try {
                // First merge guest highlights before login so we can save them
                const guestHl = getHighlights();
                
                const res = await fetch(`auth.php?action=${authMode}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                
                if (data.error) {
                    authError.textContent = data.error;
                } else {
                    authModal.classList.remove('visible');
                    await checkAuth();
                    
                    if (authMode === 'register' && Object.keys(guestHl).length > 0) {
                        userHighlights = guestHl;
                        saveState();
                    }
                    if (readerView.style.display === 'block') setupHighlights(); 
                }
            } catch(err) {
                authError.textContent = 'Network error.';
            }
        });
    }

    // ---- THEME ----
    function initTheme() {
        const savedTheme = localStorage.getItem('ob_theme') || 'sepia';
        if (themeSelect) themeSelect.value = savedTheme;
        applyTheme(savedTheme);
        
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                localStorage.setItem('ob_theme', e.target.value);
                applyTheme(e.target.value);
                saveState();
            });
        }
    }

    function applyTheme(theme) {
        document.documentElement.className = '';
        document.documentElement.classList.add(`theme-${theme}`);
    }

    // Start App
    init();
});
