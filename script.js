// SoraVer2 — Core App Script
(function () {
    'use strict';

    /* ——— Theme Management ——— */
    function initTheme() {
        const saved = localStorage.getItem('sorav2-theme') || 'dark';
        document.body.setAttribute('data-theme', saved);
        updateThemeToggle(saved);
    }

    function updateThemeToggle(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.innerHTML = theme === 'dark'
            ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
            : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
    }

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('sorav2-theme', next);
        updateThemeToggle(next);
    });

    /* ——— Mobile Menu ——— */
    function initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        if (!btn || !sidebar) return;

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        btn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('visible');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
        });
    }

    /* ——— Sidebar Search ——— */
    function initSidebarSearch() {
        const input = document.getElementById('tool-search');
        if (!input) return;
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            document.querySelectorAll('.nav-item').forEach(item => {
                const text = item.querySelector('span')?.textContent?.toLowerCase() || '';
                item.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }

    /* ——— Toast Notification ——— */
    window.showToast = function (message, type = 'info', duration = 3000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    /* ——— Init ——— */
    initTheme();
    initMobileMenu();
    initSidebarSearch();

})();
