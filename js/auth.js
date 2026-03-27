window.App = window.App || {};

App.auth = {
    supabase: null,

    // --- Supabase Initialization ---
    initializeSupabase() {
        try {
            // Check if Supabase library is loaded (from CDN @supabase/supabase-js@2)
            if (typeof window !== 'undefined' && window.supabase) {
                if (typeof window.supabase.createClient === 'function') {
                    App.auth.supabase = window.supabase.createClient(App.config.SUPABASE_URL, App.config.SUPABASE_ANON_KEY, {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true,
                            storage: window.localStorage,
                            storageKey: 'sb-auth-token',
                            flowType: 'pkce'
                        }
                    });
                    console.log('✓ Supabase client initialized successfully');
                    console.log('Supabase URL:', App.config.SUPABASE_URL);
                    return true;
                } else {
                    console.error('✗ window.supabase.createClient is not a function');
                    console.log('window.supabase type:', typeof window.supabase);
                    console.log('window.supabase keys:', Object.keys(window.supabase || {}));
                    return false;
                }
            } else {
                console.warn('⚠ window.supabase not found, Supabase library may not be loaded yet');
                return false;
            }
        } catch (error) {
            console.error('✗ Error initializing Supabase:', error);
            return false;
        }
    },

    // Try to initialize immediately, with retry logic
    ensureSupabase() {
        if (!App.auth.initializeSupabase()) {
            // Wait for script to load, then try again
            let retryCount = 0;
            const maxRetries = 10;

            const retryInit = setInterval(() => {
                retryCount++;
                if (App.auth.initializeSupabase()) {
                    clearInterval(retryInit);
                } else if (retryCount >= maxRetries) {
                    clearInterval(retryInit);
                    console.error('✗ Failed to initialize Supabase after', maxRetries, 'attempts');
                    console.error('Please check if the Supabase script is loaded: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
                }
            }, 200);
        }
    },

    // Test Supabase connection
    async testSupabaseConnection() {
        if (!App.auth.supabase) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const startTime = Date.now();
            const { data, error } = await App.utils.withTimeout(
                App.auth.supabase.auth.getSession(),
                5000,
                '連接測試超時'
            );
            const duration = Date.now() - startTime;

            if (error && error.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
                return { success: false, error: error.message, duration };
            }

            return { success: true, duration, hasSession: !!data?.session };
        } catch (error) {
            return { success: false, error: error.message || '連接測試失敗' };
        }
    },

    // --- Authentication Functions ---
    async checkAuth() {
        // Wait for Supabase to be initialized
        let retries = 0;
        while (!App.auth.supabase && retries < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        if (!App.auth.supabase) {
            console.error('Supabase not initialized. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
            return false;
        }

        try {
            console.log('Checking authentication state...');
            const { data: { session }, error } = await App.utils.withTimeout(
                App.auth.supabase.auth.getSession(),
                10000,
                '認證檢查超時'
            );

            if (error) {
                console.error('Auth check error:', error);
                // Don't throw for "Invalid Refresh Token" - it's normal when not logged in
                if (error.message && !error.message.includes('Invalid Refresh Token')) {
                    throw error;
                }
                return false;
            }

            if (session && session.user) {
                console.log('Session found, user:', session.user.email);
                App.state.isAuthenticated = true;
                App.state.currentUser = session.user;

                // Verify user is still authorized
                try {
                    const { data: authorizedUser, error: authCheckError } = await App.utils.withTimeout(
                        App.auth.supabase
                            .from('authorized_users')
                            .select('id, is_active')
                            .eq('user_id', session.user.id)
                            .eq('is_active', true)
                            .single(),
                        5000,
                        '授權檢查超時'
                    );

                    if (authCheckError || !authorizedUser) {
                        console.warn('User session exists but not authorized, signing out...');
                        await App.auth.supabase.auth.signOut();
                        App.state.isAuthenticated = false;
                        App.state.currentUser = null;
                        return false;
                    }

                    return true;
                } catch (authError) {
                    console.error('Authorization check failed:', authError);
                    // If authorization check fails, still allow session (might be network issue)
                    return true;
                }
            }

            console.log('No active session found');
            return false;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    },

    async handleLogin(email, password) {
        // Ensure Supabase is initialized
        if (!App.auth.supabase) {
            console.error('Supabase not initialized, attempting to initialize...');
            if (!App.auth.initializeSupabase()) {
                throw new Error('無法連接到 Supabase 服務器。請檢查網絡連接或聯繫管理員。');
            }
        }

        // Test connection first
        console.log('Testing Supabase connection...');
        const connectionTest = await App.auth.testSupabaseConnection();
        if (!connectionTest.success) {
            console.error('Connection test failed:', connectionTest);
            throw new Error(`無法連接到服務器：${connectionTest.error}。請檢查網絡連接。`);
        }
        console.log('Connection test passed:', connectionTest);

        console.log('Attempting login for:', email);
        const startTime = Date.now();

        const loginPromise = App.auth.supabase.auth.signInWithPassword({
            email,
            password
        });

        const { data, error } = await App.utils.withTimeout(loginPromise, 20000, '登入請求超時，請檢查網絡連接');
        const duration = Date.now() - startTime;

        console.log(`Login attempt completed in ${duration}ms`, { hasData: !!data, error });

        if (error) {
            console.error('Login error details:', {
                message: error.message,
                status: error.status,
                name: error.name
            });
            throw error;
        }

        if (!data || !data.user) {
            throw new Error('登入失敗：未收到有效的用戶數據');
        }

        return data;
    },

    async handleSignup(email, password) {
        if (!App.auth.supabase) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await App.auth.supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;
        return data;
    },

    async handleLogout() {
        if (!App.auth.supabase) return;
        await App.auth.supabase.auth.signOut();
        App.state.isAuthenticated = false;
        App.state.currentUser = null;
        App.auth.showLoginModal();
    },

    showLoginModal() {
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('signup-modal').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');
        // Sync language switcher
        const loginLangSwitcher = document.getElementById('login-language-switcher');
        if (loginLangSwitcher) {
            // Get current language from main switcher or default
            const mainLangSwitcher = document.getElementById('language-switcher');
            const currentLangValue = App.state.currentLang
                || (mainLangSwitcher ? mainLangSwitcher.value : 'zh-Hant');
            loginLangSwitcher.value = currentLangValue;
        }
    },

    showSignupModal() {
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('signup-modal').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        // Sync language switcher
        const signupLangSwitcher = document.getElementById('signup-language-switcher');
        if (signupLangSwitcher) {
            // Get current language from main switcher or default
            const mainLangSwitcher = document.getElementById('language-switcher');
            const currentLangValue = App.state.currentLang
                || (mainLangSwitcher ? mainLangSwitcher.value : 'zh-Hant');
            signupLangSwitcher.value = currentLangValue;
        }
    },

    showMainApp() {
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('signup-modal').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        // Hide logout button in internal mode
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.classList.add('hidden');
    },

    // Check if current user is admin (rofi90@hotmail.com)
    checkAndShowAdminButton() {
        const adminNavBtn = document.getElementById('admin-nav-btn');
        if (adminNavBtn && App.state.currentUser && App.state.currentUser.email === 'rofi90@hotmail.com') {
            adminNavBtn.classList.remove('hidden');
        } else if (adminNavBtn) {
            adminNavBtn.classList.add('hidden');
        }
    },

    // --- Setup Authentication UI ---
    setupAuthUI() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');
        const loginError = document.getElementById('login-error');
        const signupError = document.getElementById('signup-error');
        const signupSuccess = document.getElementById('signup-success');

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get elements fresh to avoid stale references
            const loginError = document.getElementById('login-error');
            const loginEmail = document.getElementById('login-email');
            const loginPassword = document.getElementById('login-password');
            const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

            if (!loginError || !loginEmail || !loginPassword) {
                console.error('Login form elements not found');
                return;
            }

            loginError.classList.add('hidden');

            const email = loginEmail.value.trim();
            const password = loginPassword.value;

            if (!email || !password) {
                loginError.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>請輸入電子郵件和密碼';
                loginError.classList.remove('hidden');
                return;
            }

            // Disable button and show loading state
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = true;
                const originalText = loginSubmitBtn.innerHTML;
                loginSubmitBtn.innerHTML = '<div class="loader mx-auto"></div><span class="ml-2">登入中...</span>';

                // Function to restore button state
                const restoreButton = () => {
                    if (loginSubmitBtn) {
                        loginSubmitBtn.disabled = false;
                        loginSubmitBtn.innerHTML = originalText;
                    }
                };

                try {
                    console.log('Starting login process...');
                    const loginData = await App.auth.handleLogin(email, password);
                    console.log('Login successful, checking authorization...');
                    App.state.isAuthenticated = true;

                    // Check if user is authorized with timeout
                    const authCheckPromise = App.auth.supabase
                        .from('authorized_users')
                        .select('id, is_active')
                        .eq('user_id', loginData.user.id)
                        .eq('is_active', true)
                        .single();

                    const { data: authorizedUser, error: authCheckError } = await App.utils.withTimeout(
                        authCheckPromise,
                        10000,
                        '授權檢查超時，請稍後再試'
                    );

                    console.log('Authorization check result:', { authorizedUser, authCheckError });

                    if (authCheckError || !authorizedUser) {
                        console.warn('User not authorized:', authCheckError);
                        await App.auth.handleLogout();
                        loginError.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>您的帳號尚未獲得使用權限，請聯繫管理員。';
                        loginError.classList.remove('hidden');
                        restoreButton();
                        return;
                    }

                    console.log('Login complete, showing main app...');
                    restoreButton();
                    App.auth.showMainApp();
                } catch (error) {
                    console.error('Login error:', error);
                    let errorMessage = '登入失敗，請檢查您的帳號密碼';

                    if (error.message) {
                        if (error.message.includes('超時')) {
                            errorMessage = error.message;
                        } else if (error.message.includes('Invalid login credentials')) {
                            errorMessage = '帳號或密碼錯誤';
                        } else if (error.message.includes('Email not confirmed')) {
                            errorMessage = '請先驗證您的電子郵件';
                        } else {
                            errorMessage = error.message;
                        }
                    }

                    loginError.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${errorMessage}`;
                    loginError.classList.remove('hidden');
                    restoreButton();
                }
            } else {
                // Fallback if button not found
                try {
                    const loginData = await App.auth.handleLogin(email, password);
                    App.state.isAuthenticated = true;

                    const authCheckPromise = App.auth.supabase
                        .from('authorized_users')
                        .select('id, is_active')
                        .eq('user_id', loginData.user.id)
                        .eq('is_active', true)
                        .single();

                    const { data: authorizedUser, error: authCheckError } = await App.utils.withTimeout(
                        authCheckPromise,
                        10000,
                        '授權檢查超時，請稍後再試'
                    );

                    if (authCheckError || !authorizedUser) {
                        await App.auth.handleLogout();
                        loginError.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>您的帳號尚未獲得使用權限，請聯繫管理員。';
                        loginError.classList.remove('hidden');
                        return;
                    }

                    App.auth.showMainApp();
                } catch (error) {
                    console.error('Login error:', error);
                    let errorMessage = '登入失敗，請檢查您的帳號密碼';
                    if (error.message) {
                        if (error.message.includes('超時')) {
                            errorMessage = error.message;
                        } else if (error.message.includes('Invalid login credentials')) {
                            errorMessage = '帳號或密碼錯誤';
                        } else {
                            errorMessage = error.message;
                        }
                    }
                    loginError.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${errorMessage}`;
                    loginError.classList.remove('hidden');
                }
            }
        });

        signupForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            signupError.classList.add('hidden');
            signupSuccess.classList.add('hidden');

            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            try {
                await App.auth.handleSignup(email, password);
                signupSuccess.innerHTML = '<i class="fas fa-check-circle mr-2"></i>註冊成功！請檢查您的電子郵件以驗證帳號（如果啟用了郵件驗證）。';
                signupSuccess.classList.remove('hidden');
                signupError.classList.add('hidden');
                setTimeout(() => {
                    App.auth.showLoginModal();
                }, 2000);
            } catch (error) {
                signupError.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${error.message || '註冊失敗，請稍後再試'}`;
                signupError.classList.remove('hidden');
                signupSuccess.classList.add('hidden');
            }
        });

        showSignupLink?.addEventListener('click', (e) => {
            e.preventDefault();
            App.auth.showSignupModal();
        });

        showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            App.auth.showLoginModal();
        });

        // Language switchers for login/signup modals
        const loginLanguageSwitcher = document.getElementById('login-language-switcher');
        const signupLanguageSwitcher = document.getElementById('signup-language-switcher');

        loginLanguageSwitcher?.addEventListener('change', (e) => {
            const lang = e.target.value;
            console.log('Login language switcher changed to:', lang);

            // Update currentLang immediately
            App.state.currentLang = lang;
            document.documentElement.lang = lang;

            // Update translations via i18n module
            if (App.i18n && typeof App.i18n.setLanguage === 'function') {
                App.i18n.setLanguage(App.state.currentLang);
            }

            // Sync with main language switcher
            const mainLangSwitcher = document.getElementById('language-switcher');
            if (mainLangSwitcher) {
                mainLangSwitcher.value = lang;
            }
        });

        // Also add click event for better compatibility
        loginLanguageSwitcher?.addEventListener('click', (e) => {
            console.log('Login language switcher clicked');
        });

        signupLanguageSwitcher?.addEventListener('change', (e) => {
            const lang = e.target.value;
            // Update currentLang immediately
            App.state.currentLang = lang;
            document.documentElement.lang = lang;

            // Update translations via i18n module
            if (App.i18n && typeof App.i18n.setLanguage === 'function') {
                App.i18n.setLanguage(App.state.currentLang);
            }

            // Sync with main language switcher
            const mainLangSwitcher = document.getElementById('language-switcher');
            if (mainLangSwitcher) {
                mainLangSwitcher.value = lang;
            }
        });

        // Auth disabled for internal use - no logout or auth state listening needed
    }
};

// Auto-initialize Supabase when this script loads
App.auth.ensureSupabase();
