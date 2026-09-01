(() => {
    const SUPABASE_URL = 'https://suqhxsovfyqleyrpdkzj.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_y73YMOjdJTKtFB_BkskdSQ_Ma19YjJd';

    if (!window.supabase?.createClient) {
        console.error('Supabase client failed to load.');
        return;
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });

    const authRedirectUrl = () => new URL('/auth.html', window.location.origin).href;
    if (window.location.hash.includes('type=recovery')) localStorage.setItem('luma_password_recovery', 'true');
    const GUEST_MODE_KEY = 'luma_guest_mode';
    const GUEST_STATE_KEY = 'luma_guest_state';
    const guestUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'guest@luma.local',
        user_metadata: { full_name: 'Guest Reviewer' },
        app_metadata: { provider: 'guest' }
    };
    const defaultGuestProgress = () => ({
        completedResourceIds: [], completedWeeklyTasks: [], completedProjects: 0,
        completedChallenges: 0, completedCertificates: 0, streak: 0, lastCompletedDate: null
    });
    const defaultGuestState = () => ({
        joinedCommunityNames: [], savedPostIds: [], posts: [], comments: [], messages: {},
        progress: defaultGuestProgress(),
        profile: { user_id: guestUser.id, display_name: 'Guest Reviewer', active_career_name: 'UI/UX Designer', assessment_completed: true },
        assessment: null, roadmap: null
    });
    const isGuestMode = () => localStorage.getItem(GUEST_MODE_KEY) === 'true';
    const getGuestState = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(GUEST_STATE_KEY) || 'null');
            return saved ? { ...defaultGuestState(), ...saved, progress: { ...defaultGuestProgress(), ...(saved.progress || {}) } } : defaultGuestState();
        } catch (error) {
            return defaultGuestState();
        }
    };
    const saveGuestState = (state) => localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(state));
    const updateGuestState = (updater) => {
        const state = getGuestState();
        const result = updater(state) || state;
        saveGuestState(result);
        return result;
    };
    const applyGuestSession = () => {
        const user = { id: guestUser.id, name: 'Guest Reviewer', email: guestUser.email, picture: '' };
        localStorage.setItem('luma_logged_in', 'true');
        localStorage.setItem('luma_auth_provider', 'guest');
        localStorage.setItem('luma_auth_token', '');
        localStorage.setItem('luma_user', JSON.stringify(user));
        localStorage.setItem('luma_assessment_completed', 'true');
        localStorage.setItem('luma_career_path', getGuestState().profile.active_career_name || 'UI/UX Designer');
        return user;
    };

    const toLumaUser = (user) => ({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Luma User',
        email: user.email || '',
        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
    });

    const clearLocalSession = () => {
        ['luma_logged_in', 'luma_auth_provider', 'luma_auth_token', 'luma_user'].forEach((key) => localStorage.removeItem(key));
    };

    const applySession = (session) => {
        if (!session?.user) {
            if (isGuestMode()) return applyGuestSession();
            clearLocalSession();
            return null;
        }
        const user = toLumaUser(session.user);
        localStorage.setItem('luma_logged_in', 'true');
        localStorage.setItem('luma_auth_provider', session.user.app_metadata?.provider || 'email');
        localStorage.setItem('luma_auth_token', session.access_token);
        localStorage.setItem('luma_user', JSON.stringify(user));
        return user;
    };

    let latestSession = null;

    const getStableSession = async () => {
        if (isGuestMode()) return { user: guestUser, access_token: '', is_guest: true };
        if (window.lumaAuthReady) await window.lumaAuthReady;
        if (latestSession?.user) return latestSession;

        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        latestSession = data.session || null;
        if (latestSession) applySession(latestSession);
        return latestSession;
    };

    const currentUser = async () => {
        const session = await getStableSession();
        if (session?.user) return session.user;
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) throw new Error('Authentication required.');
        return data.user;
    };

    const queryWithClockSkewRetry = async (queryFactory) => {
        let result = await queryFactory();
        if (result.error?.code === 'PGRST303' && /issued at future/i.test(result.error.message || '')) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            result = await queryFactory();
        }
        return result;
    };

    const careerPathId = async (name) => {
        if (!name) return null;
        const { data } = await client.from('career_paths').select('id').ilike('name', name).maybeSingle();
        return data?.id || null;
    };

    const saveRoadmap = async (selectedPath, plan, assessmentId = null) => {
        if (!Array.isArray(plan) || !plan.length) return null;
        if (isGuestMode()) {
            const roadmapId = `guest-roadmap-${Date.now()}`;
            updateGuestState((state) => {
                state.profile.active_career_name = selectedPath || 'UI/UX Designer';
                state.roadmap = {
                    id: roadmapId, career_name: selectedPath || 'UI/UX Designer', is_active: true,
                    roadmap_days: plan.slice(0, 7).map((item, index) => ({
                        id: `guest-day-${index + 1}`, day_number: Number(item.day || index + 1),
                        title: item.title || `Day ${index + 1}`, objective: item.objective || item.description || '',
                        activity: item.activity || '', duration_minutes: Number(item.duration_minutes || 30), status: 'upcoming'
                    }))
                };
                return state;
            });
            localStorage.setItem('luma_career_roadmap', JSON.stringify({ career: selectedPath, plan }));
            return roadmapId;
        }
        const user = await currentUser();
        const career_path_id = await careerPathId(selectedPath);
        await client.from('career_roadmaps').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true);
        const { data: roadmap, error } = await client.from('career_roadmaps').insert({
            user_id: user.id,
            assessment_id: assessmentId,
            career_path_id,
            career_name: selectedPath,
            is_active: true
        }).select('id').single();
        if (error) throw error;
        const days = plan.slice(0, 7).map((item, index) => ({
            roadmap_id: roadmap.id,
            user_id: user.id,
            day_number: Number(item.day || index + 1),
            title: item.title || `Day ${index + 1}`,
            objective: item.objective || item.description || '',
            activity: item.activity || '',
            duration_minutes: Number(item.duration_minutes || 30),
            status: 'upcoming'
        }));
        const { error: daysError } = await client.from('roadmap_days').insert(days);
        if (daysError) throw daysError;
        return roadmap.id;
    };

    const saveAssessment = async ({ questions = [], answers = {}, analysis = {} }) => {
        if (isGuestMode()) {
            const assessmentId = `guest-assessment-${Date.now()}`;
            updateGuestState((state) => {
                state.assessment = { id: assessmentId, questions, answers, selected_path: analysis.selected_path || '', raw_result: analysis };
                return state;
            });
            if (analysis.first_week_plan?.length) await saveRoadmap(analysis.selected_path || 'UI/UX Designer', analysis.first_week_plan, assessmentId);
            return assessmentId;
        }
        const user = await currentUser();
        const selectedPath = analysis.selected_path || '';
        const selected_path_id = await careerPathId(selectedPath);
        const { data: assessment, error } = await client.from('assessments').insert({
            user_id: user.id,
            questions,
            answers,
            insights: analysis.insights || [],
            selected_path_id,
            selected_path: selectedPath,
            raw_result: analysis
        }).select('id').single();
        if (error) throw error;

        const recommendations = await Promise.all((analysis.recommendations || []).slice(0, 3).map(async (item, index) => ({
            user_id: user.id,
            assessment_id: assessment.id,
            career_path_id: await careerPathId(item.career),
            career_name: item.career,
            rank: index + 1,
            match_percent: Number(item.match_percent || 0),
            rationale: item.rationale || '',
            skills: item.skills || []
        })));
        if (recommendations.length) {
            const { error: recommendationsError } = await client.from('career_recommendations').insert(recommendations);
            if (recommendationsError) throw recommendationsError;
        }
        if (analysis.first_week_plan?.length) {
            await saveRoadmap(selectedPath, analysis.first_week_plan, assessment.id);
        }
        return assessment.id;
    };

    const saveProgress = async (state) => {
        if (isGuestMode()) {
            updateGuestState((guestState) => {
                guestState.progress = { ...defaultGuestProgress(), ...state };
                return guestState;
            });
            return;
        }
        const user = await currentUser();
        const payload = {
            user_id: user.id,
            completed_resource_ids: state.completedResourceIds || [],
            completed_weekly_tasks: state.completedWeeklyTasks || [],
            completed_projects: Number(state.completedProjects || 0),
            completed_challenges: Number(state.completedChallenges || 0),
            completed_certificates: Number(state.completedCertificates || 0),
            current_streak: Number(state.streak || 0),
            last_completed_date: state.lastCompletedDate || null,
            updated_at: new Date().toISOString()
        };
        const { error } = await client.from('user_progress').upsert(payload, { onConflict: 'user_id' });
        if (error) throw error;
        if (payload.completed_resource_ids.length) {
            const completedAt = new Date().toISOString();
            const { data: knownResources, error: catalogError } = await client.from('learning_resources').select('id').in('id', payload.completed_resource_ids);
            if (catalogError) throw catalogError;
            const resources = (knownResources || []).map(({ id: resource_id }) => ({
                user_id: user.id,
                resource_id,
                status: 'completed',
                completed_at: completedAt,
                updated_at: completedAt
            }));
            if (resources.length) {
                const { error: resourceError } = await client.from('user_resource_progress').upsert(resources, { onConflict: 'user_id,resource_id' });
                if (resourceError) throw resourceError;
            }
        }
    };

    const loadProgress = async () => {
        if (isGuestMode()) return getGuestState().progress;
        const user = await currentUser();
        const { data, error } = await queryWithClockSkewRetry(() => client.from('user_progress').select('*').eq('user_id', user.id).maybeSingle());
        if (error) throw error;
        if (!data) return null;
        return {
            completedResourceIds: data.completed_resource_ids || [],
            completedWeeklyTasks: data.completed_weekly_tasks || [],
            completedProjects: data.completed_projects || 0,
            completedChallenges: data.completed_challenges || 0,
            completedCertificates: data.completed_certificates || 0,
            streak: data.current_streak || 0,
            lastCompletedDate: data.last_completed_date || null
        };
    };

    const finalizeJourney = async (selectedPath, plan = []) => {
        if (isGuestMode()) {
            updateGuestState((state) => {
                state.profile.active_career_name = selectedPath || 'UI/UX Designer';
                state.profile.assessment_completed = true;
                return state;
            });
            if (plan.length) await saveRoadmap(selectedPath, plan);
            return;
        }
        const user = await currentUser();
        const { error } = await client.from('profiles').upsert({
            user_id: user.id,
            display_name: toLumaUser(user).name,
            avatar_url: toLumaUser(user).picture,
            active_career_name: selectedPath,
            assessment_completed: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
        if (plan.length) await saveRoadmap(selectedPath, plan);
    };

    const loadAccountState = async () => {
        if (isGuestMode()) {
            const state = getGuestState();
            return { profile: state.profile, assessment: state.assessment, progress: state.progress, roadmap: state.roadmap };
        }
        const user = await currentUser();
        const [profileResult, assessmentResult, progress, roadmapResult] = await Promise.all([
            queryWithClockSkewRetry(() => client.from('profiles').select('*').eq('user_id', user.id).maybeSingle()),
            queryWithClockSkewRetry(() => client.from('assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()),
            loadProgress(),
            queryWithClockSkewRetry(() => client.from('career_roadmaps').select('*,roadmap_days(*)').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle())
        ]);
        if (profileResult.error) throw profileResult.error;
        if (assessmentResult.error) throw assessmentResult.error;
        if (roadmapResult.error) throw roadmapResult.error;
        return { profile: profileResult.data, assessment: assessmentResult.data, progress, roadmap: roadmapResult.data };
    };

    const toggleCommunity = async (communityName, shouldJoin) => {
        if (isGuestMode()) {
            updateGuestState((state) => {
                const joined = new Set(state.joinedCommunityNames || []);
                shouldJoin ? joined.add(communityName) : joined.delete(communityName);
                state.joinedCommunityNames = [...joined];
                return state;
            });
            return;
        }
        const user = await currentUser();
        const { data: community, error } = await client.from('communities').select('id').eq('name', communityName).single();
        if (error) throw error;
        if (shouldJoin) {
            const { error: joinError } = await client.from('community_memberships').upsert({ user_id: user.id, community_id: community.id }, { onConflict: 'user_id,community_id' });
            if (joinError) throw joinError;
        } else {
            const { error: leaveError } = await client.from('community_memberships').delete().eq('user_id', user.id).eq('community_id', community.id);
            if (leaveError) throw leaveError;
        }
    };

    const toggleSavedPost = async (postId, shouldSave) => {
        if (isGuestMode()) {
            updateGuestState((state) => {
                const saved = new Set(state.savedPostIds || []);
                shouldSave ? saved.add(postId) : saved.delete(postId);
                state.savedPostIds = [...saved];
                return state;
            });
            return;
        }
        const user = await currentUser();
        if (shouldSave) {
            const { error } = await client.from('saved_posts').upsert({ user_id: user.id, post_id: postId }, { onConflict: 'user_id,post_id' });
            if (error) throw error;
        } else {
            const { error } = await client.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', postId);
            if (error) throw error;
        }
    };

    const loadDiscoveryState = async () => {
        if (isGuestMode()) {
            const state = getGuestState();
            return {
                memberships: (state.joinedCommunityNames || []).map((name) => ({ communities: { name } })),
                userPosts: state.posts || [],
                savedPosts: (state.posts || []).filter((post) => state.savedPostIds.includes(post.id)).map((post) => ({ post_id: post.id, discovery_posts: post }))
            };
        }
        const user = await currentUser();
        const [membershipResult, postsResult, savedResult] = await Promise.all([
            queryWithClockSkewRetry(() => client.from('community_memberships').select('community_id,communities(name)').eq('user_id', user.id)),
            queryWithClockSkewRetry(() => client.from('discovery_posts').select('id,title,body,author_name,created_at,communities(name)').eq('user_id', user.id).order('created_at', { ascending: false })),
            queryWithClockSkewRetry(() => client.from('saved_posts').select('post_id,discovery_posts(id,title,body,author_name,created_at,communities(name))').eq('user_id', user.id).order('saved_at', { ascending: false }))
        ]);
        if (membershipResult.error) throw membershipResult.error;
        if (postsResult.error) throw postsResult.error;
        if (savedResult.error) throw savedResult.error;
        return {
            memberships: membershipResult.data || [],
            userPosts: postsResult.data || [],
            savedPosts: savedResult.data || []
        };
    };

    const createPost = async ({ title, body, communityName }) => {
        if (isGuestMode()) {
            const { data: community } = await client.from('communities').select('id,name,slug').eq('name', communityName).maybeSingle();
            const post = {
                id: `guest-post-${crypto.randomUUID()}`, user_id: guestUser.id,
                community_id: community?.id || `guest-community-${communityName.toLowerCase().replace(/\s+/g, '-')}`,
                author_name: 'Guest Reviewer', title, body, created_at: new Date().toISOString(),
                communities: community || { name: communityName }, post_comments: [{ count: 0 }]
            };
            updateGuestState((state) => { state.posts.unshift(post); return state; });
            return post;
        }
        const user = await currentUser();
        const { data: community, error: communityError } = await client.from('communities').select('id').eq('name', communityName).single();
        if (communityError) throw communityError;
        const { data, error } = await client.from('discovery_posts').insert({
            user_id: user.id,
            community_id: community.id,
            author_name: toLumaUser(user).name,
            title,
            body
        }).select('*').single();
        if (error) throw error;
        return data;
    };

    const updatePost = async ({ postId, title, body }) => {
        if (isGuestMode()) {
            let updated = null;
            updateGuestState((state) => {
                const post = state.posts.find((item) => item.id === postId);
                if (post) { post.title = title; post.body = body; post.updated_at = new Date().toISOString(); updated = { ...post }; }
                return state;
            });
            if (!updated) throw new Error('Guest post was not found.');
            return updated;
        }
        const user = await currentUser();
        const { data, error } = await client.from('discovery_posts').update({ title, body, updated_at: new Date().toISOString() }).eq('id', postId).eq('user_id', user.id).select('*').single();
        if (error) throw error;
        return data;
    };

    window.lumaSupabase = client;
    window.LumaGuest = {
        isActive: isGuestMode,
        getState: getGuestState,
        updateState: updateGuestState,
        user: guestUser
    };
    window.LumaAuth = {
        signUp: async ({ name, email, password }) => {
            localStorage.removeItem(GUEST_MODE_KEY);
            const redirect = authRedirectUrl();
            const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { full_name: name } } });
            if (error) throw error;
            applySession(data.session);
            return { session: data.session, user: data.user ? toLumaUser(data.user) : null };
        },
        signIn: async ({ email, password }) => {
            localStorage.removeItem(GUEST_MODE_KEY);
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return { session: data.session, user: applySession(data.session) };
        },
        signInWithGoogle: async () => {
            localStorage.removeItem(GUEST_MODE_KEY);
            const settingsResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
                headers: { apikey: SUPABASE_PUBLISHABLE_KEY }
            });
            if (!settingsResponse.ok) throw new Error('Google Sign-In availability could not be checked.');
            const settings = await settingsResponse.json();
            if (!settings.external?.google) {
                throw new Error('Google Sign-In will be available after the Google provider is enabled in Supabase.');
            }
            const redirectTo = authRedirectUrl();
            const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
            if (error) throw error;
            return data;
        },
        signOut: async () => {
            const wasGuest = isGuestMode();
            localStorage.removeItem(GUEST_MODE_KEY);
            if (wasGuest) localStorage.removeItem(GUEST_STATE_KEY);
            const { error } = await client.auth.signOut();
            if (error) throw error;
            clearLocalSession();
        },
        continueAsGuest: async () => {
            await client.auth.signOut().catch(() => {});
            localStorage.setItem(GUEST_MODE_KEY, 'true');
            if (!localStorage.getItem(GUEST_STATE_KEY)) saveGuestState(defaultGuestState());
            return { user: applyGuestSession(), session: { user: guestUser, access_token: '', is_guest: true } };
        },
        getSession: async () => {
            if (isGuestMode()) return { user: guestUser, access_token: '', is_guest: true };
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            applySession(data.session);
            return data.session;
        },
        sendPasswordReset: async (email) => {
            const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
            if (error) throw error;
        },
        updatePassword: async (password) => {
            const { error } = await client.auth.updateUser({ password });
            if (error) throw error;
            localStorage.removeItem('luma_password_recovery');
        },
        getRedirectUrl: authRedirectUrl
    };
    window.LumaData = { saveAssessment, saveProgress, loadProgress, finalizeJourney, loadAccountState, saveRoadmap, toggleCommunity, toggleSavedPost, loadDiscoveryState, createPost, updatePost };
    window.lumaAuthReady = (isGuestMode() ? Promise.resolve({ data: { session: null }, error: null }) : client.auth.getSession()).then(({ data, error }) => {
        if (error) throw error;
        latestSession = data.session || null;
        return applySession(data.session);
    }).catch((error) => {
        clearLocalSession();
        console.error('Unable to restore Supabase session', error);
        return null;
    });

    client.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
            if (event === 'PASSWORD_RECOVERY') {
                localStorage.setItem('luma_password_recovery', 'true');
                window.dispatchEvent(new CustomEvent('lumaPasswordRecovery'));
            }
            latestSession = session || null;
            const user = applySession(session);
            window.dispatchEvent(new CustomEvent('luma:auth-changed', { detail: { user, session } }));
        }, 0);
    });
})();