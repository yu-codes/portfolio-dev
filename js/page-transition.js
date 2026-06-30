/* ================================
   Tech Page Transition Effect
   Clean, elegant page transitions for main navigation
   Only covers the content area, not sidebar/header/footer
   ================================ */

(function() {
    'use strict';

    // Main navigation sections
    const mainSections = ['', 'articles', 'resume', 'projects'];

    // Check if URL is a main navigation page (section root)
    function isMainNavPage(pathname) {
        // Normalize path: remove trailing slash, /portfolio prefix, /en or /zh prefix, and leading slash
        let path = pathname.replace(/\/$/, '');
        path = path.replace(/^\/portfolio/, '');
        path = path.replace(/^\/en/, '');
        path = path.replace(/^\/zh/, '');
        path = path.replace(/^\//, '');
        return mainSections.includes(path);
    }

    // Check if mobile viewport
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // Get content area element
    function getContentArea() {
        return document.querySelector('.content-area');
    }

    // Create transition overlay element
    function createTransitionOverlay() {
        // Remove any existing overlay
        const existingOverlay = document.querySelector('.page-transition-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        overlay.innerHTML = `
            <div class="transition-fade"></div>
            <div class="transition-line transition-line-1"></div>
            <div class="transition-line transition-line-2"></div>
            <div class="transition-glow"></div>
        `;

        // On mobile, attach to body for full-screen effect
        // On desktop, attach to content-area
        if (isMobile()) {
            document.body.appendChild(overlay);
        } else {
            const contentArea = getContentArea();
            if (!contentArea) {
                document.body.appendChild(overlay);
            } else {
                contentArea.style.position = 'relative';
                contentArea.appendChild(overlay);
            }
        }
        
        return overlay;
    }

    // Play exit animation (fade out current content)
    function playExitAnimation(overlay) {
        return new Promise(resolve => {
            if (!overlay) {
                resolve();
                return;
            }
            
            overlay.classList.add('active', 'exit');
            
            setTimeout(() => {
                resolve();
            }, 300);
        });
    }

    // Play enter animation (reveal new content)
    function playEnterAnimation(overlay) {
        return new Promise(resolve => {
            if (!overlay) {
                resolve();
                return;
            }
            
            overlay.classList.remove('exit');
            overlay.classList.add('enter');
            
            setTimeout(() => {
                overlay.classList.remove('active', 'enter');
                setTimeout(() => {
                    overlay.remove();
                }, 100);
                resolve();
            }, 350);
        });
    }

    // Handle navigation click
    function handleNavClick(e) {
        const link = e.target.closest('a.nav-item');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip external links and anchors
        if (href.startsWith('#') || href.startsWith('mailto:') || 
            (href.startsWith('http') && !href.includes(window.location.host))) {
            return;
        }

        try {
            const targetUrl = new URL(href, window.location.origin);
            
            // Check if target is a main nav page
            if (!isMainNavPage(targetUrl.pathname)) {
                return;
            }

            // Don't transition to current page
            if (targetUrl.pathname === window.location.pathname) {
                return;
            }

            e.preventDefault();

            // Mark that we're transitioning
            sessionStorage.setItem('pageTransition', 'true');

            // Create overlay and play animation
            const overlay = createTransitionOverlay();
            
            playExitAnimation(overlay).then(() => {
                window.location.href = href;
            });
        } catch (err) {
            // If URL parsing fails, let default behavior happen
            console.warn('Page transition error:', err);
        }
    }

    // Handle page load (enter animation)
    function handlePageLoad() {
        const fromTransition = sessionStorage.getItem('pageTransition');
        
        if (fromTransition && isMainNavPage(window.location.pathname)) {
            sessionStorage.removeItem('pageTransition');
            
            // Small delay to ensure DOM is ready
            requestAnimationFrame(() => {
                const overlay = createTransitionOverlay();
                if (overlay) {
                    overlay.classList.add('active', 'enter');
                    playEnterAnimation(overlay);
                }
            });
        }
    }

    // Initialize
    function init() {
        // Attach click handler to sidebar navigation
        const sidebar = document.querySelector('.sidebar-nav');
        if (sidebar) {
            sidebar.addEventListener('click', handleNavClick);
        }

        // Handle page load animation
        handlePageLoad();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
