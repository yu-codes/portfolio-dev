/**
 * Theme Toggle - 深色/淺色模式切換
 */
function initializeThemeToggle() {
    const html = document.documentElement;
    
    // 初始化主題（從 localStorage 讀取，預設為深色）
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        html.classList.remove('dark');
    } else {
        html.classList.add('dark');
    }
    
    // 綁定所有 .theme-toggle 按鈕（桌面 + 手機面板各一個）
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
        });
    });
}

/**
 * Language Toggle - 語言切換
 * 使用 Hugo 注入的 data-base-path 屬性，正確處理語言切換
 * 支援本地開發環境和正式環境（任何 baseURL）
 */
function initializeLanguageToggle() {
    // 綁定所有 .lang-toggle 按鈕（桌面 + 手機面板各一個）
    document.querySelectorAll('.lang-toggle').forEach(langToggle => {
        langToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentLang = document.documentElement.lang;
            let currentPathname = window.location.pathname;
            
            // 確保路徑以 / 結尾
            if (!currentPathname.endsWith('/')) {
                currentPathname += '/';
            }
            
            // 從 Hugo 注入的 data-base-path 取得基礎路徑
            const basePath = document.documentElement.dataset.basePath || '/';
            
            let newPath;
            
            if (currentLang === 'en') {
                // EN -> ZH: /base/xxx/ -> /base/zh/xxx/
                const relativePath = currentPathname.slice(basePath.length);
                newPath = basePath + 'zh/' + relativePath;
            } else {
                // ZH -> EN: /base/zh/xxx/ -> /base/xxx/
                const zhPrefix = basePath + 'zh/';
                if (currentPathname.startsWith(zhPrefix)) {
                    newPath = basePath + currentPathname.slice(zhPrefix.length);
                } else {
                    // fallback
                    newPath = basePath;
                }
            }
            
            // 標準化路徑
            newPath = newPath.replace(/\/+/g, '/');
            if (!newPath) newPath = '/';
            
            // 儲存語言偏好
            localStorage.setItem('preferredLang', currentLang === 'en' ? 'zh' : 'en');
            
            // 執行跳轉
            window.location.href = newPath;
        });
    });
}

/**
 * Mobile Menu - 手機導覽選單
 */
function initializeMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-nav-overlay');
    const closeBtn = document.getElementById('mobile-nav-close');
    
    if (!menuBtn || !overlay) return;
    
    menuBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    function closeMenu() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    
    // Close when clicking the backdrop
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeMenu();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeMenu();
        }
    });
}

/**
 * Initialize All
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeThemeToggle();
    initializeLanguageToggle();
    initializeMobileMenu();
});
