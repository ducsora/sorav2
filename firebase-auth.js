// ============================================
//   firebase-auth.js — SoraVer2 Firebase Manager
//   Quản lý Auth, Firestore sync, User UI
// ============================================

(function () {
    'use strict';

    // ---- Kiểm tra Firebase SDK đã load chưa ----
    function waitForFirebase(cb, retries = 20) {
        if (typeof firebase !== 'undefined' && window.firebaseConfig) {
            cb();
        } else if (retries > 0) {
            setTimeout(() => waitForFirebase(cb, retries - 1), 150);
        } else {
            console.warn('[SoraV2] Firebase SDK hoặc config chưa được load.');
        }
    }

    // ========================================================
    //   GLOBAL FB MANAGER
    // ========================================================
    window.FB = {
        auth: null,
        db: null,
        user: null,
        _ready: false,

        // ---- Khởi tạo ----
        init() {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.firebaseConfig);
                }
                this.auth = firebase.auth();
                this.db   = firebase.firestore();

                // Bật persistence (offline support)
                this.db.enablePersistence({ synchronizeTabs: true })
                    .catch(() => {}); // Ignore multi-tab errors

                // Lắng nghe trạng thái đăng nhập
                this.auth.onAuthStateChanged(user => {
                    this.user   = user;
                    this._ready = true;
                    this._renderSidebarUser(user);
                    if (user) {
                        this._onSignedIn(user);
                    }
                });

                this._injectSidebarUI();
                this._hookThemeSync();

            } catch (e) {
                console.error('[SoraV2] Firebase init error:', e);
            }
        },

        // ---- Đăng nhập Google ----
        async signIn() {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            try {
                await this.auth.signInWithPopup(provider);
                if (window.showToast) showToast('Đăng nhập thành công! 👋', 'success');
            } catch (e) {
                if (e.code !== 'auth/popup-closed-by-user') {
                    if (window.showToast) showToast('Đăng nhập thất bại: ' + e.message, 'error');
                }
            }
        },

        // ---- Đăng xuất ----
        async signOut() {
            await this.auth.signOut();
            if (window.showToast) showToast('Đã đăng xuất', 'info');
        },

        // ---- Callback khi signed in ----
        async _onSignedIn(user) {
            // Sync localStorage data lên Firestore (lần đầu)
            await this._syncLocalToCloud();
            // Load settings từ cloud
            await this._loadCloudSettings();
        },

        // ========================================================
        //   SIDEBAR USER UI
        // ========================================================
        _injectSidebarUI() {
            // Try sidebar-footer first, fallback to sidebar itself
            const footer = document.querySelector('.sidebar-footer');
            const sidebar = document.querySelector('.sidebar');
            if ((!footer && !sidebar) || document.getElementById('fb-user-section')) return;

            const el = document.createElement('div');
            el.id = 'fb-user-section';
            el.className = 'fb-user-section';
            el.innerHTML = '<div class="fb-user-loading"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';

            if (footer) {
                // Insert as first child of footer (inside it, above theme-toggle)
                footer.insertBefore(el, footer.firstChild);
            } else {
                // Fallback: append to sidebar
                sidebar.appendChild(el);
            }
            console.log('[FB] Sidebar UI injected ✓');
        },

        _renderSidebarUser(user) {
            const el = document.getElementById('fb-user-section');
            if (!el) return;

            if (user) {
                const avatar = user.photoURL
                    ? `<img src="${user.photoURL}" class="fb-avatar" alt="${user.displayName || ''}"/>`
                    : `<div class="fb-avatar-fallback">${(user.displayName || 'U')[0].toUpperCase()}</div>`;

                el.innerHTML = `
                    <div class="fb-user-card">
                        ${avatar}
                        <div class="fb-user-info">
                            <span class="fb-user-name">${user.displayName || 'Người dùng'}</span>
                            <span class="fb-user-email">${user.email || ''}</span>
                        </div>
                        <button class="fb-signout-btn" onclick="window.FB.signOut()" title="Đăng xuất">
                            <i class="fa-solid fa-right-from-bracket"></i>
                        </button>
                    </div>
                    <div class="fb-sync-badge"><i class="fa-solid fa-cloud-arrow-up"></i> Đã đồng bộ</div>
                `;
            } else {
                el.innerHTML = `
                    <button class="fb-signin-btn" onclick="window.FB.signIn()">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="14" alt="Google">
                        Đăng nhập để lưu dữ liệu
                    </button>
                    <div class="fb-local-note"><i class="fa-solid fa-triangle-exclamation"></i> Đang dùng bộ nhớ cục bộ</div>
                `;
            }
        },

        // ========================================================
        //   THEME SYNC
        // ========================================================
        _hookThemeSync() {
            // Patch theme toggle để tự động sync khi đổi theme
            const btn = document.getElementById('theme-toggle');
            if (!btn) return;
            btn.addEventListener('click', () => {
                // Wait a tick for script.js to update the theme
                setTimeout(() => {
                    const theme = document.body.getAttribute('data-theme') || 'dark';
                    this.saveSettings({ theme });
                }, 50);
            });
        },

        // ========================================================
        //   FIRESTORE CRUD — Generic
        // ========================================================

        /**
         * Lưu document vào Firestore hoặc localStorage (fallback)
         * @param {string} col - Tên collection (vd: 'salary_presets')
         * @param {string} docId - ID của document
         * @param {object} data - Dữ liệu cần lưu
         */
        async save(col, docId, data) {
            const cleanId = this._safeId(docId);
            if (this.user && this.db) {
                try {
                    await this.db
                        .collection('users').doc(this.user.uid)
                        .collection(col).doc(cleanId)
                        .set({ ...data, _updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    this._showSyncBadge('saved');
                    return;
                } catch (e) {
                    console.warn('[FB] Firestore save failed, fallback to localStorage:', e);
                }
            }
            // Fallback localStorage
            localStorage.setItem(`sorav2::${col}::${cleanId}`, JSON.stringify(data));
        },

        /**
         * Đọc một document
         * @param {string} col - Collection
         * @param {string} docId - Document ID
         * @returns {object|null}
         */
        async load(col, docId) {
            const cleanId = this._safeId(docId);
            if (this.user && this.db) {
                try {
                    const snap = await this.db
                        .collection('users').doc(this.user.uid)
                        .collection(col).doc(cleanId).get();
                    return snap.exists ? snap.data() : null;
                } catch (e) {
                    console.warn('[FB] Firestore load failed:', e);
                }
            }
            // Fallback localStorage
            const raw = localStorage.getItem(`sorav2::${col}::${cleanId}`);
            return raw ? JSON.parse(raw) : null;
        },

        /**
         * Đọc toàn bộ documents trong một collection
         * @param {string} col - Collection
         * @returns {Array}
         */
        async loadAll(col) {
            if (this.user && this.db) {
                try {
                    const snap = await this.db
                        .collection('users').doc(this.user.uid)
                        .collection(col)
                        .orderBy('_updatedAt', 'desc')
                        .get();
                    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
                } catch (e) {
                    console.warn('[FB] Firestore loadAll failed:', e);
                }
            }
            // Fallback localStorage
            const prefix = `sorav2::${col}::`;
            const results = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        results.push({ _id: key.replace(prefix, ''), ...data });
                    } catch {}
                }
            }
            return results;
        },

        /**
         * Xóa một document
         * @param {string} col - Collection
         * @param {string} docId - Document ID
         */
        async delete(col, docId) {
            const cleanId = this._safeId(docId);
            if (this.user && this.db) {
                try {
                    await this.db
                        .collection('users').doc(this.user.uid)
                        .collection(col).doc(cleanId).delete();
                    this._showSyncBadge('deleted');
                    return;
                } catch (e) {
                    console.warn('[FB] Firestore delete failed:', e);
                }
            }
            localStorage.removeItem(`sorav2::${col}::${cleanId}`);
        },

        // ========================================================
        //   SETTINGS
        // ========================================================
        async saveSettings(data) {
            await this.save('settings', 'preferences', data);
        },

        async _loadCloudSettings() {
            const settings = await this.load('settings', 'preferences');
            if (!settings) return;

            // Apply theme
            if (settings.theme) {
                document.body.setAttribute('data-theme', settings.theme);
                localStorage.setItem('sorav2-theme', settings.theme);
                // Re-render theme toggle text (script.js function)
                if (typeof updateThemeToggle === 'function') updateThemeToggle(settings.theme);
                else {
                    const btn = document.getElementById('theme-toggle');
                    if (btn) btn.innerHTML = settings.theme === 'dark'
                        ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
                        : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
                }
            }
        },

        // ========================================================
        //   API KEYS
        // ========================================================

        /** Lưu API key vào Firestore + localStorage */
        async saveApiKey(service, key) {
            await this.save('api_keys', service, { key, service });
            localStorage.setItem(`sorav2-key-${service}`, key); // local fallback
        },

        /** Đọc API key */
        async loadApiKey(service) {
            const data = await this.load('api_keys', service);
            if (data?.key) return data.key;
            return localStorage.getItem(`sorav2-key-${service}`) || '';
        },

        // ========================================================
        //   SYNC LOCAL → CLOUD (khi lần đầu đăng nhập)
        // ========================================================
        async _syncLocalToCloud() {
            if (!this.user || !this.db) return;

            // Sync theme
            const theme = localStorage.getItem('sorav2-theme');
            if (theme) await this.saveSettings({ theme });

            // Sync salary presets (old key format: sorav2-sal-{name})
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sorav2-sal-')) {
                    const name = key.replace('sorav2-sal-', '');
                    try {
                        const data = JSON.parse(localStorage.getItem(key) || 'null');
                        if (data) await this.save('salary_presets', name, data);
                    } catch {}
                }
                // Sync nav group states
                if (key === 'sorav2-nav-groups') {
                    // Skip, these are UI state only
                }
            }

            console.log('[FB] LocalStorage synced to Firestore ✓');
        },

        // ========================================================
        //   UTILS
        // ========================================================
        /** Sanitize Firestore document ID (no slashes, dots, etc.) */
        _safeId(id) {
            return String(id).replace(/[\/\.#$\[\]]/g, '_').slice(0, 100);
        },

        /** Hiển thị badge "đã sync" thoáng qua */
        _showSyncBadge(action = 'saved') {
            const badge = document.querySelector('.fb-sync-badge');
            if (!badge) return;
            const icons = { saved: '☁️', deleted: '🗑️' };
            const texts = { saved: 'Đã đồng bộ', deleted: 'Đã xóa' };
            badge.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> ${texts[action] || texts.saved}`;
            badge.classList.add('pulse');
            setTimeout(() => badge.classList.remove('pulse'), 1500);
        },

        /** Kiểm tra đã đăng nhập chưa */
        isSignedIn() {
            return !!this.user;
        },

        /** Lấy uid hiện tại */
        getUid() {
            return this.user?.uid || null;
        }
    };

    // ---- Auto-init khi Firebase SDK sẵn sàng ----
    function init() {
        waitForFirebase(() => {
            const doInit = () => window.FB.init();
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', doInit);
            } else {
                doInit();
            }
        });
    }

    init();

})();
