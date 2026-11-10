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
            // Search inside both nav-items and nav-group-headers
            document.querySelectorAll('.nav-item, .nav-group').forEach(el => {
                if (el.classList.contains('nav-group')) {
                    const children = el.querySelectorAll('.nav-child');
                    let anyMatch = false;
                    children.forEach(child => {
                        const text = child.querySelector('span')?.textContent?.toLowerCase() || '';
                        const match = text.includes(q);
                        child.style.display = match ? '' : 'none';
                        if (match) anyMatch = true;
                    });
                    el.style.display = anyMatch || q === '' ? '' : 'none';
                    if (anyMatch && q !== '') el.classList.add('open');
                } else {
                    const text = el.querySelector('span')?.textContent?.toLowerCase() || '';
                    el.style.display = text.includes(q) ? '' : 'none';
                }
            });
        });
    }

    /* ——— Accordion Nav Group ——— */
    window.toggleNavGroup = function(groupId) {
        const group = document.getElementById(groupId);
        if (!group) return;
        const isOpen = group.classList.contains('open');
        // Close all groups first
        document.querySelectorAll('.nav-group.open').forEach(g => {
            if (g.id !== groupId) g.classList.remove('open');
        });
        // Toggle current
        group.classList.toggle('open', !isOpen);
        // Persist state
        const state = JSON.parse(localStorage.getItem('sorav2-nav-groups') || '{}');
        state[groupId] = !isOpen;
        localStorage.setItem('sorav2-nav-groups', JSON.stringify(state));
    };

    function initNavGroups() {
        const currentFile = location.pathname.split('/').pop() || 'index.html';

        // Map: which group each page belongs to
        const pageToGroup = {
            'video.html':               'nav-group-video',
            'shuffler.html':            'nav-group-video',
            'mashup.html':              'nav-group-video',
            'whisper-transcriber.html': 'nav-group-video',
            'gif-maker.html':           'nav-group-video',
            'tiktok-comment.html':      null, // top-level, no group
        };

        // Auto-open group if current page is inside it
        const activeGroup = pageToGroup[currentFile];
        if (activeGroup) {
            const group = document.getElementById(activeGroup);
            if (group) group.classList.add('open');
        } else {
            // Restore saved states for other pages
            const state = JSON.parse(localStorage.getItem('sorav2-nav-groups') || '{}');
            Object.entries(state).forEach(([id, open]) => {
                if (open) document.getElementById(id)?.classList.add('open');
            });
        }

        // Mark active nav item based on current page
        document.querySelectorAll('.nav-item').forEach(item => {
            const href = item.getAttribute('href');
            if (href && href.split('/').pop() === currentFile) {
                item.classList.add('active');
            }
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
    initNavGroups();

})();
