/* ==========================================================================
   LUMA LANDING & AUTHENTICATION SCRIPT
   - Navbar scroll effects
   - Mobile navigation toggle
   - Interactive assessment pathway tabs
   - Session checking & Navbar profile avatar swapping
   - Tabs toggle (Login / Signup) in auth.html
   - Password toggles (Show/Hide)
   - Live signup validation & strength meter
   - Authentication session management
   ========================================================================== */

// ============================================================================
const API_BASE = window.LUMA_API_BASE || '/api';

// HELPER FUNCTION: Get current page name reliably for deployment
// ============================================================================
const getCurrentPageName = () => {
    let pathname = window.location.pathname.toLowerCase();
    // Remove leading/trailing slashes
    pathname = pathname.replace(/^\/+|\/+$/g, '');
    
    // Default to index.html if empty
    if (!pathname || pathname === '') {
        return 'index.html';
    }
    
    // Map clean route paths to their physical file names
    if (pathname === 'login' || pathname === 'signup' || pathname === 'auth') {
        return 'auth.html';
    }
    if (pathname === 'discovery-assessment' || pathname === 'assessment') {
        return 'assessment.html';
    }
    if (pathname === 'recommendations') {
        return 'recommendations.html';
    }
    if (pathname === 'dashboard') {
        return 'dashboard.html';
    }
    if (pathname === 'learning-hub' || pathname === 'learning') {
        return 'learning.html';
    }
    if (pathname === 'learning-concept') {
        return 'learning-concept.html';
    }
    if (pathname === 'journey') {
        return 'journey.html';
    }
    if (pathname === 'explorer-hub' || pathname === 'explorer') {
        return 'explorer.html';
    }
    if (pathname === 'summary') {
        return 'summary.html';
    }
    if (pathname === 'profile') {
        return 'profile.html';
    }

    // Get last segment
    const filename = pathname.split('/').pop() || '';
    if (filename.endsWith('.html')) {
        return filename;
    }
    
    return 'index.html';
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lumaAuthReady) {
        await window.lumaAuthReady;
    }

    // --------------------------------------------------------------------------
    // 1. STICKY NAVBAR SCROLL ACTION
    // --------------------------------------------------------------------------
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // --------------------------------------------------------------------------
    // 2. MOBILE MENU NAVIGATION TOGGLE
    // --------------------------------------------------------------------------
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking links
        const navLinksList = document.querySelectorAll('.nav-link');
        navLinksList.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // --------------------------------------------------------------------------
    // 3. INTERACTIVE ASSESSMENT CAREER SWITCHER (landing page preview)
    // --------------------------------------------------------------------------
    const interestBtns = document.querySelectorAll('.interest-btn');
    const demoCards = document.querySelectorAll('.demo-result-card');

    interestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            interestBtns.forEach(b => b.classList.remove('active'));
            demoCards.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            btn.classList.add('active');

            const careerId = btn.getAttribute('data-career');
            const targetCard = document.getElementById(`demo-${careerId}`);
            if (targetCard) {
                targetCard.style.display = 'grid';
                void targetCard.offsetWidth;
                targetCard.classList.add('active');
            }
        });
    });

    // --------------------------------------------------------------------------
    // 4. ACTIVE SECTION LINK HIGHLIGHT ON SCROLL
    // --------------------------------------------------------------------------
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    if (sections.length > 0 && navLinks.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '-30% 0px -60% 0px',
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        } else {
                            link.classList.remove('active');
                        }
                    });
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(section => observer.observe(section));
    }

    // --------------------------------------------------------------------------
    // 5. SESSION CHECKING & PROFILE DROPDOWN TRANSITIONS
    // --------------------------------------------------------------------------
    const checkSession = () => {
        const loggedIn = localStorage.getItem('luma_logged_in') === 'true';
        const pageName = getCurrentPageName();
        const isAuthPage = pageName === 'auth.html';
        const isLandingPage = pageName === 'index.html';
        const protectedPages = ['assessment.html', 'dashboard.html', 'journey.html', 'summary.html', 'recommendations.html', 'challenge.html'];
        const isPublicProfile = pageName === 'profile.html' && new URLSearchParams(window.location.search).has('user');
        const isProtectedPage = protectedPages.includes(pageName) || (pageName === 'profile.html' && !isPublicProfile);
        const shouldBlockDashboard = pageName === 'dashboard.html' && localStorage.getItem('luma_assessment_completed') !== 'true';

        if (loggedIn && isAuthPage && localStorage.getItem('luma_password_recovery') !== 'true') {
            const completed = localStorage.getItem('luma_assessment_completed') === 'true';
            if (completed) {
                window.location.replace('dashboard.html');
            } else {
                window.location.replace('assessment.html');
            }
            return;
        }

        if (!loggedIn && isProtectedPage) {
            window.location.replace('auth.html');
            return;
        }

        if (shouldBlockDashboard) {
            window.location.replace('assessment.html');
            return;
        }
        
        // Grab navbar containers
        const actionsDesktop = document.getElementById('nav-actions-desktop-wrapper');
        const actionsMobile = document.getElementById('nav-actions-mobile-wrapper');
        const profileDesktop = document.getElementById('profile-menu-desktop');
        const profileMobile = document.getElementById('profile-menu-mobile');

        if (loggedIn) {
            const userStr = localStorage.getItem('luma_user');
            let user = { name: 'Amulya Tanneru', email: 'you@example.com' };
            if (userStr) {
                user = JSON.parse(userStr);
            }

            // Hide standard actions
            if (actionsDesktop) actionsDesktop.style.display = 'none';
            if (actionsMobile) actionsMobile.style.display = 'none';

            // Show avatar menus
            if (profileDesktop) {
                profileDesktop.style.display = '';
                document.getElementById('dropdown-name-desktop').textContent = user.name;
                document.getElementById('dropdown-email-desktop').textContent = user.email;
            }
            if (profileMobile) {
                profileMobile.style.display = '';
                document.getElementById('dropdown-name-mobile').textContent = user.name;
                document.getElementById('dropdown-email-mobile').textContent = user.email;
            }
        } else {
            // Restore standard actions
            if (actionsDesktop) actionsDesktop.style.display = '';
            if (actionsMobile) actionsMobile.style.display = '';

            // Hide avatar menus
            if (profileDesktop) profileDesktop.style.display = 'none';
            if (profileMobile) profileMobile.style.display = 'none';
        }
    };

    checkSession();

    if (localStorage.getItem('luma_guest_mode') === 'true' && getCurrentPageName() !== 'auth.html') {
        const guestBanner = document.createElement('aside');
        guestBanner.className = 'guest-mode-banner';
        guestBanner.dataset.testid = 'guest-mode-banner';
        guestBanner.innerHTML = '<span><strong>Guest Mode</strong> • Changes stay in this browser</span><button type="button" data-testid="guest-mode-sign-in-button">Sign in</button>';
        guestBanner.querySelector('button').addEventListener('click', async () => {
            await window.LumaAuth?.signOut();
            window.location.href = 'auth.html';
        });
        document.body.appendChild(guestBanner);
    }

    // Toggle dropdown visibility on clicking profile avatars
    const avatarBtnDesktop = document.getElementById('avatar-btn-desktop');
    const dropdownMenuDesktop = document.getElementById('dropdown-menu-desktop');
    if (avatarBtnDesktop && dropdownMenuDesktop) {
        avatarBtnDesktop.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenuDesktop.classList.toggle('active');
        });
        document.addEventListener('click', () => {
            dropdownMenuDesktop.classList.remove('active');
        });
    }

    const avatarBtnMobile = document.getElementById('avatar-btn-mobile');
    const dropdownMenuMobile = document.getElementById('dropdown-menu-mobile');
    if (avatarBtnMobile && dropdownMenuMobile) {
        avatarBtnMobile.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenuMobile.classList.toggle('active');
        });
    }

    // Bind log out buttons
    const logoutBtns = document.querySelectorAll('.logout-action-btn, #dash-logout-btn, #mobile-logout-btn-action');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                if (window.LumaAuth) await window.LumaAuth.signOut();
            } catch (error) {
                console.error('Supabase sign out failed', error);
            }
            ['luma_logged_in', 'luma_auth_provider', 'luma_auth_token', 'luma_user'].forEach((key) => localStorage.removeItem(key));
            
            const pageName = getCurrentPageName();
            const isAuthPath = pageName === 'auth.html' || pageName === 'assessment.html' || pageName === 'recommendations.html' || pageName === 'dashboard.html' || pageName === 'learning.html' || pageName === 'learning-concept.html' || pageName === 'journey.html' || pageName === 'explorer.html' || pageName === 'summary.html' || pageName === 'profile.html';

            if (isAuthPath) {
                window.location.replace('index.html');
            } else {
                checkSession();
                if (dropdownMenuDesktop) dropdownMenuDesktop.classList.remove('active');
                if (dropdownMenuMobile) dropdownMenuMobile.classList.remove('active');
            }
        });
    });

    // --------------------------------------------------------------------------
    // 6. AUTHENTICATION PAGES HANDLERS (auth.html)
    // --------------------------------------------------------------------------
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const panelLogin = document.getElementById('panel-login');
    const panelSignup = document.getElementById('panel-signup');

    if (tabLogin && tabSignup && panelLogin && panelSignup) {
        const activateLoginTab = () => {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            panelLogin.classList.add('active');
            panelSignup.classList.remove('active');
        };

        const activateSignupTab = () => {
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            panelSignup.classList.add('active');
            panelLogin.classList.remove('active');
        };

        tabLogin.addEventListener('click', () => activateLoginTab());
        tabSignup.addEventListener('click', () => activateSignupTab());

        const linkToSignup = document.getElementById('link-go-to-signup');
        const linkToLogin = document.getElementById('link-go-to-login');
        if (linkToSignup) linkToSignup.addEventListener('click', (e) => { e.preventDefault(); activateSignupTab(); });
        if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); activateLoginTab(); });

        // Check URL path or hash to activate the correct tab dynamically
        const currentPath = window.location.pathname.toLowerCase();
        const currentHash = window.location.hash.toLowerCase();
        
        if (currentPath.includes('signup') || currentHash === '#signup') {
            activateSignupTab();
        } else {
            activateLoginTab();
        }
    }

    // --------------------------------------------------------------------------
    // 7. PASSWORD SHOW/HIDE TOGGLES
    // --------------------------------------------------------------------------
    const togglePwBtns = document.querySelectorAll('.password-toggle-icon');
    togglePwBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const eyeOff = btn.querySelector('.eye-off-svg');
            const eyeOn = btn.querySelector('.eye-on-svg');

            if (input && input.type === 'password') {
                input.type = 'text';
                if (eyeOff) eyeOff.style.display = 'none';
                if (eyeOn) eyeOn.style.display = 'block';
            } else if (input) {
                input.type = 'password';
                if (eyeOff) eyeOff.style.display = 'block';
                if (eyeOn) eyeOn.style.display = 'none';
            }
        });
    });

    // --------------------------------------------------------------------------
    // 8. SIGNUP PASSWORD LIVE CHECKER & STRENGTH METER
    // --------------------------------------------------------------------------
    const signupPassword = document.getElementById('signup-password');
    const ruleLength = document.getElementById('rule-length');
    const ruleUpper = document.getElementById('rule-upper');
    const ruleNumber = document.getElementById('rule-number');
    const strengthBar = document.getElementById('strength-bar');

    if (signupPassword) {
        signupPassword.addEventListener('input', () => {
            const val = signupPassword.value;
            
            // Rules flags
            const hasLength = val.length >= 8;
            const hasUpper = /[A-Z]/.test(val);
            const hasNumber = /[0-9]/.test(val);

            // Toggle criteria styles
            if (hasLength) ruleLength.classList.add('met'); else ruleLength.classList.remove('met');
            if (hasUpper) ruleUpper.classList.add('met'); else ruleUpper.classList.remove('met');
            if (hasNumber) ruleNumber.classList.add('met'); else ruleNumber.classList.remove('met');

            // Calculate strength score
            let score = 0;
            if (hasLength) score++;
            if (hasUpper) score++;
            if (hasNumber) score++;

            // Update strength bar fill
            if (strengthBar) {
                // Clear active states
                strengthBar.className = 'strength-bar-fill';
                if (score === 1) {
                    strengthBar.classList.add('weak');
                } else if (score === 2) {
                    strengthBar.classList.add('medium');
                } else if (score === 3) {
                    strengthBar.classList.add('strong');
                }
            }
        });
    }

    // --------------------------------------------------------------------------
    // 9. SUBMIT MOCK ACTIONS & REDIRECTS
    // --------------------------------------------------------------------------
    const showLoginError = (message) => {
        const errorDiv = document.getElementById('login-error-msg');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    };

    const showSignupError = (message) => {
        const errorDiv = document.getElementById('signup-error-msg');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    };

    const showAuthStatus = (message, isError = false) => {
        const signupIsActive = document.getElementById('panel-signup')?.classList.contains('active');
        const errorDiv = document.getElementById(signupIsActive ? 'signup-error-msg' : 'login-error-msg');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.color = isError ? '#EA4335' : '#0f766e';
            errorDiv.style.backgroundColor = isError ? 'rgba(234, 67, 53, 0.08)' : 'rgba(20, 184, 166, 0.12)';
            errorDiv.style.borderColor = isError ? 'rgba(234, 67, 53, 0.2)' : 'rgba(20, 184, 166, 0.2)';
        }
    };

    const clearAuthStatus = () => {
        ['login-error-msg', 'signup-error-msg'].forEach((id) => {
            const errorDiv = document.getElementById(id);
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.style.display = 'none';
            }
        });
    };

    const triggerAuthRedirect = async (name, email, picture = '') => {
        const loginBtn = document.querySelector('#form-login-action button[type="submit"]');
        const signupBtn = document.querySelector('#form-signup-action button[type="submit"]');
        
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="btn-spinner"></span> Signing in...';
        }
        if (signupBtn) {
            signupBtn.disabled = true;
            signupBtn.innerHTML = '<span class="btn-spinner"></span> Registering...';
        }

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            // Force reflow
            void loadingScreen.offsetWidth;
            loadingScreen.classList.add('active');
        }
        try {
            const account = await window.LumaData?.loadAccountState();
            if (account?.profile?.assessment_completed) localStorage.setItem('luma_assessment_completed', 'true');
            else localStorage.removeItem('luma_assessment_completed');
            if (account?.profile?.active_career_name) localStorage.setItem('luma_career_path', account.profile.active_career_name);
            if (account?.roadmap) {
                const plan = (account.roadmap.roadmap_days || []).sort((a, b) => a.day_number - b.day_number);
                localStorage.setItem('luma_career_roadmap', JSON.stringify({ career: account.roadmap.career_name, plan }));
            }
        } catch (error) {
            console.warn('Account state could not be loaded before redirect', error);
        }
        
        setTimeout(() => {
            const completed = localStorage.getItem('luma_assessment_completed') === 'true';
            if (completed) {
                window.location.replace('dashboard.html');
            } else {
                window.location.replace('assessment.html');
            }
        }, 750); // 500-800ms loading duration
    };

    const formLogin = document.getElementById('form-login-action');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            // Clear previous errors
            const errorDiv = document.getElementById('login-error-msg');
            if (errorDiv) errorDiv.style.display = 'none';

            // Validate Email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showLoginError('Please enter a valid email address.');
                return;
            }

            if (!password) {
                showLoginError('Please enter your password.');
                return;
            }

            try {
                if (!window.LumaAuth) throw new Error('Authentication is unavailable right now.');
                const result = await window.LumaAuth.signIn({ email, password });
                await triggerAuthRedirect(result.user.name, result.user.email, result.user.picture);
            } catch (error) {
                showLoginError(error.message);
            }
        });
    }

    const formSignup = document.getElementById('form-signup-action');
    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;

            // Clear previous errors
            const errorDiv = document.getElementById('signup-error-msg');
            if (errorDiv) errorDiv.style.display = 'none';

            // Validate Email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showSignupError('Please enter a valid email address.');
                return;
            }

            // Enforce criteria checks
            const hasLength = password.length >= 8;
            const hasUpper = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);

            if (!hasLength || !hasUpper || !hasNumber) {
                showSignupError('Please ensure your password meets all strength criteria.');
                return;
            }

            if (password !== confirm) {
                showSignupError('Passwords do not match. Please verify.');
                return;
            }

            try {
                if (!window.LumaAuth) throw new Error('Authentication is unavailable right now.');
                const result = await window.LumaAuth.signUp({ name, email, password });
                if (result.session && result.user) {
                    await triggerAuthRedirect(result.user.name, result.user.email, result.user.picture);
                } else {
                    showAuthStatus('Check your email to confirm your account, then return here to log in.');
                    formSignup.reset();
                }
            } catch (error) {
                showSignupError(error.message);
            }
        });
    }

    const startGoogleSignIn = async () => {
        clearAuthStatus();
        try {
            if (!window.LumaAuth) throw new Error('Authentication is unavailable right now.');
            await window.LumaAuth.signInWithGoogle();
        } catch (error) {
            const message = /provider is not enabled|unsupported provider/i.test(error.message)
                ? 'Google Sign-In will be available after the Google provider is enabled in Supabase.'
                : error.message;
            showAuthStatus(message, true);
        }
    };

    const googleBtns = document.querySelectorAll('#login-google-btn, #signup-google-btn');
    googleBtns.forEach((btn) => {
        btn.addEventListener('click', startGoogleSignIn);
    });

    const guestButton = document.getElementById('continue-as-guest-btn');
    if (guestButton) {
        guestButton.addEventListener('click', async () => {
            guestButton.disabled = true;
            guestButton.textContent = 'Opening Guest Mode…';
            try {
                await window.LumaAuth.continueAsGuest();
                window.location.replace('explorer.html');
            } catch (error) {
                guestButton.disabled = false;
                guestButton.textContent = 'Continue as Guest';
                showLoginError('Guest Mode could not be started. Please try again.');
            }
        });
    }

    const resetModal = document.getElementById('password-reset-modal');
    const updateModal = document.getElementById('password-update-modal');
    const showRecoveryForm = () => updateModal?.classList.add('active');
    document.getElementById('forgot-password-link')?.addEventListener('click', (event) => {
        event.preventDefault();
        const loginEmail = document.getElementById('login-email')?.value || '';
        const resetEmail = document.getElementById('password-reset-email');
        if (resetEmail) resetEmail.value = loginEmail;
        resetModal?.classList.add('active');
    });
    document.getElementById('password-reset-close')?.addEventListener('click', () => resetModal?.classList.remove('active'));
    document.getElementById('password-reset-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button[type="submit"]');
        const status = document.getElementById('password-reset-status');
        button.disabled = true;
        try {
            await window.LumaAuth.sendPasswordReset(document.getElementById('password-reset-email').value.trim());
            status.textContent = 'Reset link sent. Check your inbox and spam folder.';
            status.style.color = '#1c6b35';
        } catch (error) {
            status.textContent = /rate limit/i.test(error.message || '')
                ? 'A reset email was requested recently. Please wait a few minutes, then try again.'
                : (error.message || 'The reset link could not be sent.');
        } finally { button.disabled = false; }
    });
    document.getElementById('password-update-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = document.getElementById('password-update-value').value;
        const confirmation = document.getElementById('password-update-confirm').value;
        const status = document.getElementById('password-update-status');
        if (password !== confirmation) { status.textContent = 'Passwords do not match.'; return; }
        const button = event.currentTarget.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
            await window.LumaAuth.updatePassword(password);
            status.textContent = 'Password updated. Opening your dashboard…';
            status.style.color = '#1c6b35';
            setTimeout(() => window.location.replace('dashboard.html'), 500);
        } catch (error) {
            status.textContent = error.message || 'The password could not be updated.';
            button.disabled = false;
        }
    });
    window.addEventListener('lumaPasswordRecovery', showRecoveryForm);
    if (localStorage.getItem('luma_password_recovery') === 'true') showRecoveryForm();

    // --------------------------------------------------------------------------
    // 10. REAL PROGRESS TRACKING & DASHBOARD STATE
    // --------------------------------------------------------------------------
    const progressStorageKey = 'luma_progress_state';
    const resourceLibraryKey = 'luma_resource_library';
    const defaultResourceLibrary = [
        { id: 'design-thinking-guide', title: 'Guide: The 5 Phases of Design Thinking', minutes: 8, concept: 'design-thinking' },
        { id: 'design-thinking-brainstorm', title: 'Article: Brainstorming without Constraints', minutes: 7, concept: 'design-thinking' },
        { id: 'user-research-interviews', title: 'Guide: Conducting Effective User Interviews', minutes: 10, concept: 'user-research' },
        { id: 'user-research-personas', title: 'Article: Creating Realistic User Personas', minutes: 8, concept: 'user-research' },
        { id: 'user-research-script', title: 'Challenge: Draft Your First Interview Script', minutes: 7, concept: 'user-research' },
        { id: 'wireframing-sketching', title: 'Guide: Low-Fidelity Sketching Techniques', minutes: 15, concept: 'wireframing' },
        { id: 'wireframing-tools', title: 'Article: Digital Wireframing Tools Guide', minutes: 10, concept: 'wireframing' },
        { id: 'wireframing-landing-page', title: 'Challenge: Design a Landing Page Sketch', minutes: 15, concept: 'wireframing' },
        { id: 'ia-card-sorting', title: 'Guide: Card Sorting Methodologies', minutes: 12, concept: 'information-architecture' },
        { id: 'ia-sitemaps', title: 'Article: Creating Comprehensive Sitemaps', minutes: 10, concept: 'information-architecture' },
        { id: 'visual-design-grids', title: 'Guide: Grid Systems & Layout Layouts', minutes: 20, concept: 'visual-design' },
        { id: 'visual-design-color', title: 'Article: Selecting Color Palettes', minutes: 15, concept: 'visual-design' },
        { id: 'prototyping-micro', title: 'Guide: Interactive Micro-Animations', minutes: 15, concept: 'prototyping' },
        { id: 'prototyping-flow', title: 'Challenge: Connect a 3-Screen App Flow', minutes: 20, concept: 'prototyping' }
    ];

    const getProgressState = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(progressStorageKey) || '{}');
            return {
                completedResourceIds: Array.isArray(saved.completedResourceIds) ? saved.completedResourceIds : [],
                completedWeeklyTasks: Array.isArray(saved.completedWeeklyTasks) ? saved.completedWeeklyTasks : [],
                completedProjects: Number.isFinite(saved.completedProjects) ? saved.completedProjects : 0,
                completedChallenges: Number.isFinite(saved.completedChallenges) ? saved.completedChallenges : 0,
                completedCertificates: Number.isFinite(saved.completedCertificates) ? saved.completedCertificates : 0,
                streak: Number.isFinite(saved.streak) ? saved.streak : 0,
                lastCompletedDate: saved.lastCompletedDate || null
            };
        } catch (error) {
            return {
                completedResourceIds: [],
                completedWeeklyTasks: [],
                completedProjects: 0,
                completedChallenges: 0,
                completedCertificates: 0,
                streak: 0,
                lastCompletedDate: null
            };
        }
    };

    const saveProgressState = (state) => {
        localStorage.setItem(progressStorageKey, JSON.stringify(state));
        if (window.LumaData && localStorage.getItem('luma_logged_in') === 'true') {
            window.LumaData.saveProgress(state).catch((error) => console.warn('Progress could not be synced to Supabase', error));
        }
    };

    const getResourceLibrary = () => {
        try {
            const stored = JSON.parse(localStorage.getItem(resourceLibraryKey) || 'null');
            if (Array.isArray(stored) && stored.length) {
                return stored;
            }
        } catch (error) {
            // Fall back to the built-in library below.
        }

        localStorage.setItem(resourceLibraryKey, JSON.stringify(defaultResourceLibrary));
        return defaultResourceLibrary;
    };

    const updateLearningConceptTimeline = (state = getProgressState()) => {
        const holder = document.getElementById('learning-real-concepts');
        if (!holder) return;
        const resources = getResourceLibrary();
        const conceptOrder = ['design-thinking', 'user-research', 'wireframing', 'information-architecture', 'visual-design', 'prototyping'];
        const concepts = conceptOrder.map((concept) => {
            const conceptResources = resources.filter((resource) => resource.concept === concept);
            return {
                resources: conceptResources,
                completed: conceptResources.length > 0 && conceptResources.every((resource) => state.completedResourceIds.includes(resource.id)),
                minutes: conceptResources.reduce((total, resource) => total + Number(resource.minutes || 0), 0)
            };
        });
        const currentIndex = concepts.findIndex((concept) => !concept.completed);
        const rows = [...holder.querySelectorAll('.concept-node-row')];
        rows.forEach((row, index) => {
            const concept = concepts[index];
            if (!concept) return;
            const statusName = concept.completed ? 'completed' : index === currentIndex ? 'current' : 'locked';
            const status = row.querySelector('.concept-node-status');
            const card = row.querySelector('.concept-node-card');
            const title = row.querySelector('.concept-node-title');
            const duration = row.querySelector('.concept-node-duration');
            const badge = row.querySelector('.concept-node-badge');
            if (status) {
                status.className = `concept-node-status ${statusName}`;
                status.replaceChildren();
                if (statusName === 'completed') status.textContent = '✓';
                if (statusName === 'locked') status.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
            }
            if (card) {
                card.classList.toggle('current', statusName === 'current');
                card.style.borderColor = statusName === 'current' ? 'var(--color-primary)' : '';
                card.style.boxShadow = statusName === 'current' ? '0 4px 15px rgba(167, 117, 201, 0.1)' : '';
            }
            if (title) title.style.color = statusName === 'current' ? 'var(--color-primary)' : '';
            if (duration) duration.textContent = `${concept.minutes} mins`;
            if (badge) {
                badge.className = `concept-node-badge ${statusName}`;
                badge.textContent = statusName === 'completed' ? 'Completed' : statusName === 'current' ? 'Current' : 'Locked';
            }
        });
    };

    const formatMinutes = (minutes) => {
        if (!minutes || minutes <= 0) return '0 minutes';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours && mins) return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
        if (hours) return `${hours} hour${hours > 1 ? 's' : ''}`;
        return `${mins} minute${mins > 1 ? 's' : ''}`;
    };

    const getProgressSummary = (state = getProgressState()) => {
        const resources = getResourceLibrary();
        const completedIds = new Set(state.completedResourceIds);
        const completedResources = resources.filter((resource) => completedIds.has(resource.id));
        const completedCount = completedIds.size;
        const projectsCompleted = state.completedProjects;
        const challengesCompleted = state.completedChallenges;
        const totalCount = Math.max(resources.length, completedCount) + 2;
        const weightedCompleted = completedCount + Number(projectsCompleted > 0) + Number(challengesCompleted > 0);
        const overallProgress = totalCount ? Math.round((weightedCompleted / totalCount) * 100) : 0;
        const completedModules = new Set(completedResources.map((resource) => resource.concept)).size;
        const estimatedMinutes = completedResources.reduce((total, resource) => total + (resource.minutes || 0), 0);
        const estimatedTimeLabel = formatMinutes(estimatedMinutes);
        const weeklyCompletedCount = state.completedWeeklyTasks.length;
        const certificates = state.completedCertificates;
        const streak = state.streak || 0;
        const emptyStateMessage = completedCount === 0
            ? 'Your journey starts today. Complete your first lesson to begin tracking your progress.'
            : '';

        return {
            completedResources: completedCount,
            totalResources: totalCount,
            overallProgress,
            completedModules,
            weeklyCompletedCount,
            projectsCompleted,
            challengesCompleted,
            certificates,
            streak,
            estimatedMinutes,
            estimatedTimeLabel,
            emptyStateMessage,
            hasProgress: completedCount > 0
        };
    };

    const syncWeeklyChecklist = (state = getProgressState()) => {
        const checklistItems = document.querySelectorAll('#dash-plan-checklist .plan-checkbox-item');
        checklistItems.forEach((item) => {
            const label = item.querySelector('span')?.textContent?.trim() || '';
            const shouldBeChecked = state.completedWeeklyTasks.includes(label);
            item.classList.toggle('checked', shouldBeChecked);
        });
    };

    const updateProgressUI = (state = getProgressState()) => {
        const summary = getProgressSummary(state);
        const progressCircle = document.querySelector('.progress-circle-fill');
        if (progressCircle) {
            const radius = 54;
            const circumference = 2 * Math.PI * radius;
            progressCircle.style.strokeDasharray = circumference;
            progressCircle.style.strokeDashoffset = circumference - (summary.overallProgress / 100) * circumference;
        }

        const progressPercentLabel = document.querySelector('.progress-percentage-label');
        if (progressPercentLabel) {
            progressPercentLabel.textContent = `${summary.overallProgress}%`;
        }

        const milestoneText = document.getElementById('dash-milestone-progress-text');
        if (milestoneText) {
            milestoneText.textContent = `${summary.overallProgress}%`;
        }

        const milestoneBar = document.getElementById('dash-milestone-progress-bar');
        if (milestoneBar) {
            milestoneBar.style.width = `${summary.overallProgress}%`;
        }

        const dashboardMessage = document.getElementById('dash-progress-message');
        if (dashboardMessage) {
            dashboardMessage.textContent = summary.hasProgress
                ? `You have completed ${summary.completedResources} resource${summary.completedResources === 1 ? '' : 's'} and ${summary.estimatedTimeLabel} of learning time.`
                : summary.emptyStateMessage;
        }

        const dashboardLearningTime = document.getElementById('dash-learning-time-value');
        if (dashboardLearningTime) {
            dashboardLearningTime.textContent = summary.estimatedTimeLabel;
        }

        const dashboardResourcesCount = document.getElementById('dash-resources-count');
        if (dashboardResourcesCount) {
            dashboardResourcesCount.textContent = String(summary.completedResources);
        }

        const dashboardModulesCount = document.getElementById('dash-modules-count');
        if (dashboardModulesCount) {
            dashboardModulesCount.textContent = String(summary.completedModules);
        }

        const dashboardProjectsCount = document.getElementById('dash-projects-count');
        if (dashboardProjectsCount) {
            dashboardProjectsCount.textContent = String(summary.projectsCompleted);
        }

        const dashboardCertificatesCount = document.getElementById('dash-certificates-count');
        if (dashboardCertificatesCount) {
            dashboardCertificatesCount.textContent = String(summary.certificates);
        }

        const dashboardWeeklyCount = document.getElementById('dash-weekly-count');
        if (dashboardWeeklyCount) {
            dashboardWeeklyCount.textContent = `${summary.weeklyCompletedCount} / 5`;
        }

        const dashboardStreak = document.getElementById('dash-streak-value');
        if (dashboardStreak) {
            dashboardStreak.textContent = `${summary.streak} Day${summary.streak === 1 ? '' : 's'}`;
        }

        const dashboardReminder = document.getElementById('dash-reminder-text');
        if (dashboardReminder) {
            dashboardReminder.textContent = summary.hasProgress
                ? 'You are building momentum. Keep going and complete one more lesson today.'
                : 'Your journey starts today. Complete your first lesson to begin tracking your progress.';
        }

        const learningProgressPercent = document.getElementById('learning-progress-percent');
        if (learningProgressPercent) {
            learningProgressPercent.textContent = `${summary.overallProgress}%`;
        }

        const learningProgressBar = document.getElementById('learning-progress-bar');
        if (learningProgressBar) {
            learningProgressBar.style.width = `${summary.overallProgress}%`;
        }

        const learningProgressCaption = document.getElementById('learning-progress-caption');
        if (learningProgressCaption) {
            learningProgressCaption.textContent = summary.hasProgress
                ? `${summary.completedResources} resources completed • ${summary.estimatedTimeLabel}`
                : 'Start your first lesson to begin tracking progress.';
        }

        const journeyPercent = document.getElementById('journey-progress-percent');
        if (journeyPercent) {
            journeyPercent.textContent = `${summary.overallProgress}%`;
        }

        const journeyProgressBar = document.getElementById('journey-progress-bar');
        if (journeyProgressBar) {
            journeyProgressBar.style.width = `${summary.overallProgress}%`;
        }

        const journeyLessons = document.getElementById('journey-lessons-count');
        if (journeyLessons) {
            journeyLessons.textContent = String(summary.completedResources);
        }

        const journeyModules = document.getElementById('journey-modules-count');
        if (journeyModules) {
            journeyModules.textContent = String(summary.completedModules);
        }

        const journeyProjects = document.getElementById('journey-projects-count');
        if (journeyProjects) {
            journeyProjects.textContent = String(summary.projectsCompleted);
        }

        const journeyLearningTime = document.getElementById('journey-learning-time');
        if (journeyLearningTime) {
            journeyLearningTime.textContent = summary.estimatedTimeLabel;
        }

        const journeyStreak = document.getElementById('journey-streak-value');
        if (journeyStreak) {
            journeyStreak.textContent = `${summary.streak} Day${summary.streak === 1 ? '' : 's'}`;
        }

        const summaryCircleText = document.getElementById('sum-circle-percentage');
        if (summaryCircleText) {
            summaryCircleText.textContent = `${summary.overallProgress}%`;
        }

        const summaryCircle = document.getElementById('sum-circle-fill');
        if (summaryCircle) {
            const radius = 54;
            const circumference = 2 * Math.PI * radius;
            summaryCircle.style.strokeDasharray = circumference;
            summaryCircle.style.strokeDashoffset = circumference - (summary.overallProgress / 100) * circumference;
        }

        const summaryResources = document.getElementById('summary-resources-count');
        if (summaryResources) {
            summaryResources.textContent = `${summary.completedResources}`;
        }

        const summaryProjects = document.getElementById('summary-projects-count');
        if (summaryProjects) {
            summaryProjects.textContent = `${summary.projectsCompleted}`;
        }

        const summaryChallenges = document.getElementById('summary-challenges-count');
        if (summaryChallenges) {
            summaryChallenges.textContent = `${summary.challengesCompleted}`;
        }

        const summaryCertificates = document.getElementById('summary-certificates-count');
        if (summaryCertificates) {
            summaryCertificates.textContent = `${summary.certificates}`;
        }

        const summaryStreak = document.getElementById('summary-streak-count');
        if (summaryStreak) {
            summaryStreak.textContent = `🔥 ${summary.streak} Day${summary.streak === 1 ? '' : 's'}`;
        }

        const summaryLearningTime = document.getElementById('summary-learning-time');
        if (summaryLearningTime) {
            summaryLearningTime.textContent = summary.estimatedTimeLabel;
        }

        const summaryEmptyState = document.getElementById('summary-empty-state');
        if (summaryEmptyState) {
            summaryEmptyState.textContent = summary.hasProgress
                ? ''
                : 'Your journey starts today. Complete your first lesson to begin tracking your progress.';
        }

        const profileProgress = document.getElementById('profile-progress-percent');
        if (profileProgress) {
            profileProgress.textContent = `${summary.overallProgress}%`;
        }

        const profileProgressBar = document.getElementById('profile-progress-bar');
        if (profileProgressBar) {
            profileProgressBar.style.width = `${summary.overallProgress}%`;
        }

        const profileResources = document.getElementById('profile-resources-count');
        if (profileResources) {
            profileResources.textContent = String(summary.completedResources);
        }

        const profileProjects = document.getElementById('profile-projects-count');
        if (profileProjects) {
            profileProjects.textContent = String(summary.projectsCompleted);
        }

        const profileLearningTime = document.getElementById('profile-learning-time');
        if (profileLearningTime) {
            profileLearningTime.textContent = summary.estimatedTimeLabel;
        }

        const profileStreak = document.getElementById('profile-streak-value');
        if (profileStreak) {
            profileStreak.textContent = `${summary.streak} Day${summary.streak === 1 ? '' : 's'}`;
        }

        const profileReminder = document.getElementById('profile-reminder-text');
        if (profileReminder) {
            profileReminder.textContent = summary.hasProgress
                ? 'You are building momentum. Keep going and complete one more lesson today.'
                : 'Your journey starts today. Complete your first lesson to begin tracking your progress.';
        }

        updateLearningConceptTimeline(state);
        syncWeeklyChecklist(state);
    };

    window.completeLearningResource = (resourceId, title, minutes, concept = 'general') => {
        const state = getProgressState();
        if (!state.completedResourceIds.includes(resourceId)) {
            state.completedResourceIds.push(resourceId);
            const today = new Date().toISOString().slice(0, 10);
            if (state.lastCompletedDate) {
                const lastDate = new Date(state.lastCompletedDate);
                const currentDate = new Date(today);
                const diffDays = Math.round((currentDate - lastDate) / 86400000);
                if (diffDays === 1) {
                    state.streak = (state.streak || 0) + 1;
                } else if (diffDays > 1) {
                    state.streak = 1;
                }
            } else {
                state.streak = 1;
            }
            state.lastCompletedDate = today;
            if (concept === 'prototyping' || title.toLowerCase().includes('project')) {
                state.completedProjects = (state.completedProjects || 0) + 1;
            }
            saveProgressState(state);
            updateProgressUI(state);
            window.dispatchEvent(new CustomEvent('luma:resource-completed', {
                detail: { resourceId, title, minutes, concept }
            }));
        }
    };

    window.toggleWeeklyTask = (label) => {
        const state = getProgressState();
        const existingIndex = state.completedWeeklyTasks.indexOf(label);
        if (existingIndex >= 0) {
            state.completedWeeklyTasks.splice(existingIndex, 1);
        } else {
            state.completedWeeklyTasks.push(label);
        }
        saveProgressState(state);
        updateProgressUI(state);
    };

    const initializeProgressTracking = () => {
        updateProgressUI(getProgressState());

        window.addEventListener('luma:resource-completed', () => {
            updateProgressUI(getProgressState());
        });

        const checklistItems = document.querySelectorAll('#dash-plan-checklist .plan-checkbox-item');
        checklistItems.forEach((item) => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const label = item.querySelector('span')?.textContent?.trim() || '';
                if (label) {
                    window.toggleWeeklyTask(label);
                }
            });
        });
    };

    initializeProgressTracking();

    const hydrateSupabaseState = async () => {
        if (!window.LumaData || localStorage.getItem('luma_logged_in') !== 'true') return;
        try {
            const account = await window.LumaData.loadAccountState();
            if (account.progress) {
                localStorage.setItem(progressStorageKey, JSON.stringify(account.progress));
                updateProgressUI(account.progress);
            }
            if (account.assessment) {
                localStorage.setItem('luma_assessment_answers', JSON.stringify(account.assessment.answers || {}));
                localStorage.setItem('luma_ai_recommendations', JSON.stringify(account.assessment.raw_result || {}));
                if (account.assessment.selected_path) localStorage.setItem('luma_career_path', account.assessment.selected_path);
            }
            if (account.profile?.assessment_completed) localStorage.setItem('luma_assessment_completed', 'true');
            if (account.roadmap) {
                const plan = (account.roadmap.roadmap_days || []).sort((a, b) => a.day_number - b.day_number);
                localStorage.setItem('luma_career_roadmap', JSON.stringify({ career: account.roadmap.career_name, plan }));
            }
        } catch (error) {
            console.warn('Supabase account data could not be refreshed', error);
        }
    };
    hydrateSupabaseState();

    // --------------------------------------------------------------------------
    // 10. DASHBOARD AVATAR DROPDOWN (assessment.html)
    // --------------------------------------------------------------------------
    const dashAvatarBtn = document.getElementById('dash-avatar-btn');
    const dashAvatarDropdown = document.getElementById('dash-avatar-dropdown');
    if (dashAvatarBtn && dashAvatarDropdown) {
        dashAvatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dashAvatarDropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => {
            dashAvatarDropdown.classList.remove('active');
        });
    }

    if (localStorage.getItem('luma_logged_in') === 'true' && localStorage.getItem('luma_guest_mode') !== 'true' && !document.getElementById('luma-wingman')) {
        const wingman = document.createElement('aside');
        wingman.id = 'luma-wingman';
        wingman.className = 'luma-wingman';
        wingman.innerHTML = `<button class="luma-wingman-toggle" id="luma-wingman-toggle" aria-label="Open Luma Wingman" data-testid="wingman-open-button">✦</button>
            <div class="luma-wingman-panel" id="luma-wingman-panel" aria-live="polite" data-testid="wingman-panel">
                <div class="luma-wingman-header"><strong data-testid="wingman-title">Luma Wingman</strong><button type="button" id="luma-wingman-close" aria-label="Close Luma Wingman" data-testid="wingman-close-button">×</button></div>
                <div class="luma-wingman-messages" id="luma-wingman-messages" data-testid="wingman-messages"><p class="wingman-message assistant">Ask me about careers, learning plans, or your next step.</p></div>
                <form class="luma-wingman-form" id="luma-wingman-form"><input id="luma-wingman-input" aria-label="Message Luma Wingman" placeholder="What should I explore next?" required data-testid="wingman-message-input"><button type="submit" aria-label="Send message" data-testid="wingman-send-button">Send</button></form>
            </div>`;
        document.body.appendChild(wingman);
        const panel = document.getElementById('luma-wingman-panel');
        document.getElementById('luma-wingman-toggle').addEventListener('click', () => panel.classList.add('active'));
        document.getElementById('luma-wingman-close').addEventListener('click', () => panel.classList.remove('active'));
        document.getElementById('luma-wingman-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const input = document.getElementById('luma-wingman-input');
            const messages = document.getElementById('luma-wingman-messages');
            const message = input.value.trim();
            if (!message) return;
            const messageId = Date.now();
            const userBubble = document.createElement('p'); userBubble.className = 'wingman-message user'; userBubble.dataset.testid = `wingman-user-message-${messageId}`; userBubble.textContent = message; messages.appendChild(userBubble);
            input.value = '';
            const pending = document.createElement('p'); pending.className = 'wingman-message assistant'; pending.dataset.testid = `wingman-assistant-message-${messageId}`; pending.textContent = 'Thinking...'; messages.appendChild(pending);
            try {
                const user = JSON.parse(localStorage.getItem('luma_user') || '{}');
                const sessionKey = `luma_wingman_session_${user.id || 'current'}`;
                let sessionId = localStorage.getItem(sessionKey);
                if (!sessionId) {
                    sessionId = crypto.randomUUID();
                    localStorage.setItem(sessionKey, sessionId);
                }
                let context = {};
                try { context = await window.LumaData.loadWingmanContext?.() || {}; } catch (contextError) { console.warn('Wingman context could not be fully loaded', contextError); }
                const response = await fetch(`${API_BASE}/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('luma_auth_token') || ''}` }, body: JSON.stringify({ message, session_id: sessionId, context }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail || 'Wingman is unavailable.');
                pending.textContent = result.answer;
            } catch (error) { pending.textContent = error.message; pending.classList.add('error'); }
            messages.scrollTop = messages.scrollHeight;
        });
    }
});
