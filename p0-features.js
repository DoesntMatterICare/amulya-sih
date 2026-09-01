(() => {
    if (!window.lumaSupabase || !window.LumaData || !window.LumaAuth) return;
    const client = window.lumaSupabase;
    const isGuest = () => Boolean(window.LumaGuest?.isActive());
    const guestState = () => window.LumaGuest.getState();
    const updateGuest = (updater) => window.LumaGuest.updateState(updater);
    const projectSelect = `
        id,user_id,title,description,project_url,image_url,is_public,created_at,updated_at,
        profiles!projects_profile_fk(user_id,display_name,avatar_url,bio,headline),
        career_paths(id,name,slug),project_skills(skills(id,name,slug))
    `;

    const sessionUser = async ({ required = false } = {}) => {
        if (window.lumaAuthReady) await window.lumaAuthReady;
        const session = await window.LumaAuth.getSession();
        if (!session?.user && required) throw new Error('Authentication required.');
        return { session, user: session?.user || null };
    };

    const normalizeProject = (project, currentUserId = '') => ({
        ...project,
        author: project.profiles || { display_name: 'Luma Student', avatar_url: '' },
        career: project.career_paths || null,
        skills: (project.project_skills || []).map((item) => item.skills).filter(Boolean),
        is_owner: project.user_id === currentUserId
    });

    const uploadImage = async (bucket, file) => {
        if (!file) return '';
        if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
        if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
        if (isGuest()) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('The image could not be read.'));
                reader.readAsDataURL(file);
            });
        }
        const { user } = await sessionUser({ required: true });
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    };

    const loadProjects = async ({ search = '', career = '', skill = '', sort = 'newest', ownerId = '' } = {}) => {
        const { user } = await sessionUser();
        let query = client.from('projects').select(projectSelect).eq('is_public', true).order('created_at', { ascending: false }).limit(60);
        if (ownerId && !isGuest()) query = query.eq('user_id', ownerId);
        const { data, error } = await query;
        if (error) throw error;
        const localProjects = isGuest() ? (guestState().projects || []) : [];
        const all = [...localProjects, ...(data || [])].map((project) => normalizeProject(project, user?.id));
        const needle = search.trim().toLowerCase();
        const filtered = all.filter((project) => {
            if (ownerId && project.user_id !== ownerId) return false;
            const searchMatch = !needle || `${project.title} ${project.description} ${project.author?.display_name || ''}`.toLowerCase().includes(needle);
            const careerMatch = !career || project.career?.slug === career || project.career?.name === career;
            const skillMatch = !skill || project.skills.some((item) => item.slug === skill || item.name === skill);
            return searchMatch && careerMatch && skillMatch;
        });
        if (sort === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return filtered;
    };

    const loadProject = async (projectId) => {
        const { user } = await sessionUser();
        if (isGuest()) {
            const local = (guestState().projects || []).find((item) => item.id === projectId);
            if (local) return normalizeProject(local, user?.id);
        }
        const { data, error } = await client.from('projects').select(projectSelect).eq('id', projectId).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Project not found.');
        return normalizeProject(data, user?.id);
    };

    const saveProject = async ({ id = '', title, description, careerPathId = null, projectUrl = '', imageUrl = '', skillIds = [] }) => {
        const { user } = await sessionUser({ required: true });
        if (isGuest()) {
            let project;
            updateGuest((state) => {
                state.projects = state.projects || [];
                const existing = state.projects.find((item) => item.id === id);
                project = existing || {
                    id: `guest-project-${crypto.randomUUID()}`, user_id: user.id,
                    created_at: new Date().toISOString(), profiles: { user_id: user.id, display_name: 'Guest Reviewer', avatar_url: '' }
                };
                Object.assign(project, {
                    title, description, project_url: projectUrl || null, image_url: imageUrl || null,
                    is_public: true, updated_at: new Date().toISOString(),
                    career_paths: window.LumaProjectFacets?.careers?.find((item) => item.id === careerPathId) || null,
                    project_skills: (window.LumaProjectFacets?.skills || []).filter((item) => skillIds.includes(item.id)).map((skills) => ({ skills }))
                });
                if (!existing) state.projects.unshift(project);
                return state;
            });
            return normalizeProject(project, user.id);
        }
        const payload = {
            user_id: user.id, title, description, career_path_id: careerPathId || null,
            project_url: projectUrl || null, image_url: imageUrl || null, is_public: true
        };
        let projectResult;
        if (id) projectResult = await client.from('projects').update(payload).eq('id', id).eq('user_id', user.id).select('id').single();
        else projectResult = await client.from('projects').insert(payload).select('id').single();
        if (projectResult.error) throw projectResult.error;
        const projectId = projectResult.data.id;
        const removeSkills = await client.from('project_skills').delete().eq('project_id', projectId);
        if (removeSkills.error) throw removeSkills.error;
        if (skillIds.length) {
            const addSkills = await client.from('project_skills').insert(skillIds.map((skillId) => ({ project_id: projectId, skill_id: skillId })));
            if (addSkills.error) throw addSkills.error;
        }
        return loadProject(projectId);
    };

    const deleteProject = async (projectId) => {
        const { user } = await sessionUser({ required: true });
        if (isGuest()) {
            updateGuest((state) => { state.projects = (state.projects || []).filter((item) => item.id !== projectId); return state; });
            return;
        }
        const { error } = await client.from('projects').delete().eq('id', projectId).eq('user_id', user.id);
        if (error) throw error;
    };

    const loadActiveChallenge = async (challengeId = '') => {
        const { user } = await sessionUser();
        const state = isGuest() ? guestState() : null;
        let careerName = state?.profile?.active_career_name || localStorage.getItem('luma_career_path') || '';
        if (user && !isGuest()) {
            const profile = await client.from('profiles').select('active_career_name').eq('user_id', user.id).maybeSingle();
            if (!profile.error) careerName = profile.data?.active_career_name || careerName;
        }
        let query = client.from('challenges').select('*,career_paths(id,name,slug)').eq('is_active', true);
        if (challengeId) query = query.eq('id', challengeId);
        const { data, error } = await query.order('created_at').limit(challengeId ? 1 : 20);
        if (error) throw error;
        const challenge = challengeId ? data?.[0] : (data || []).find((item) => item.career_paths?.name === careerName) || data?.[0];
        if (!challenge) return null;
        let progress = null;
        if (isGuest()) progress = (state.challengeProgress || {})[challenge.id] || null;
        else if (user) {
            const result = await client.from('user_challenge_progress').select('*').eq('challenge_id', challenge.id).eq('user_id', user.id).maybeSingle();
            if (result.error) throw result.error;
            progress = result.data;
        }
        return { ...challenge, progress };
    };

    const completeChallenge = async ({ challengeId, reflection, submissionUrl = '' }) => {
        const { user } = await sessionUser({ required: true });
        const payload = {
            user_id: user.id, challenge_id: challengeId, status: 'completed', reflection,
            submission_url: submissionUrl || null, completed_at: new Date().toISOString()
        };
        if (isGuest()) {
            updateGuest((state) => {
                state.challengeProgress = state.challengeProgress || {};
                state.challengeProgress[challengeId] = payload;
                state.progress.completedChallenges = Object.values(state.challengeProgress).filter((item) => item.status === 'completed').length;
                return state;
            });
            return payload;
        }
        const { data, error } = await client.from('user_challenge_progress').upsert(payload, { onConflict: 'user_id,challenge_id' }).select('*').single();
        if (error) throw error;
        return data;
    };

    const loadProfile = async (requestedUserId = '') => {
        const { user } = await sessionUser();
        const userId = requestedUserId || user?.id;
        if (!userId) throw new Error('Profile not found.');
        if (isGuest() && userId === window.LumaGuest.user.id) {
            const state = guestState();
            return {
                profile: state.profile, projects: (state.projects || []).map((item) => normalizeProject(item, userId)), badges: [],
                progress: state.progress, is_owner: true
            };
        }
        const [profileResult, projects, badgeResult, progressResult] = await Promise.all([
            client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
            loadProjects({ ownerId: userId }),
            client.from('user_badges').select('badge_id,awarded_at,badges(id,title,description,icon)').eq('user_id', userId).order('awarded_at', { ascending: false }),
            user?.id === userId ? client.from('user_progress').select('*').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);
        if (profileResult.error) throw profileResult.error;
        if (badgeResult.error) throw badgeResult.error;
        if (!profileResult.data) throw new Error('Profile not found.');
        return { profile: profileResult.data, projects, badges: badgeResult.data || [], progress: progressResult.data, is_owner: user?.id === userId };
    };

    const updateProfile = async ({ displayName, bio, headline, location, avatarUrl }) => {
        const { user } = await sessionUser({ required: true });
        const updates = { display_name: displayName, bio, headline, location, avatar_url: avatarUrl || '' };
        if (isGuest()) {
            updateGuest((state) => { state.profile = { ...state.profile, ...updates }; return state; });
            localStorage.setItem('luma_user', JSON.stringify({ id: user.id, name: displayName, email: user.email, picture: avatarUrl || '' }));
            return { user_id: user.id, ...updates };
        }
        const { data, error } = await client.from('profiles').update(updates).eq('user_id', user.id).select('*').single();
        if (error) throw error;
        await client.auth.updateUser({ data: { full_name: displayName, avatar_url: avatarUrl || '' } });
        const cached = JSON.parse(localStorage.getItem('luma_user') || '{}');
        localStorage.setItem('luma_user', JSON.stringify({ ...cached, name: displayName, picture: avatarUrl || '' }));
        return data;
    };

    const loadDashboardSnapshot = async () => {
        const [roadmap, catalog, challenge, profileBundle] = await Promise.all([
            window.LumaData.loadRoadmapWithResources(),
            window.LumaData.loadLearningCatalog({ mode: 'browse' }),
            loadActiveChallenge(),
            loadProfile()
        ]);
        const resources = catalog.resources || [];
        const completedResources = resources.filter((item) => item.completed).length;
        const requiredDays = roadmap?.roadmap_days?.length || 7;
        const completedDays = (roadmap?.roadmap_days || []).filter((day) => day.status === 'completed').length;
        const challengeComplete = challenge?.progress?.status === 'completed';
        const projectCount = profileBundle.projects.length;
        const totalUnits = Math.max(resources.length, 1) + requiredDays + 2;
        const completedUnits = completedResources + completedDays + Number(challengeComplete) + Number(projectCount > 0);
        return {
            profile: profileBundle.profile, roadmap, resources, challenge,
            projects: profileBundle.projects, badges: profileBundle.badges,
            completedResources, completedDays, challengeComplete, projectCount,
            progressPercent: Math.min(100, Math.round((completedUnits / totalUnits) * 100))
        };
    };

    const deterministicSuggestion = (snapshot) => {
        if (!snapshot.completedResources) return `Start with one short ${snapshot.profile.active_career_name || 'career'} resource, then add a reflection to make the learning stick.`;
        if (!snapshot.challengeComplete) return `You have completed ${snapshot.completedResources} resources. Your next high-impact step is the weekly challenge: ${snapshot.challenge?.title || 'apply what you learned'}.`;
        if (!snapshot.projectCount) return 'Turn your completed challenge into a public project so your profile shows evidence of your progress.';
        return `You have ${snapshot.projectCount} project${snapshot.projectCount === 1 ? '' : 's'} and ${snapshot.completedResources} completed resources. Choose the next incomplete roadmap day to keep momentum.`;
    };

    const loadPersonalizedSuggestion = async (snapshot) => {
        const fallback = deterministicSuggestion(snapshot);
        if (isGuest()) return { suggestion: fallback, source: 'progress' };
        const { session } = await sessionUser({ required: true });
        try {
            const response = await fetch('/api/ai/suggestion', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    career: snapshot.profile.active_career_name || '',
                    completed_resources: snapshot.completedResources,
                    completed_days: snapshot.completedDays,
                    challenge_complete: snapshot.challengeComplete,
                    project_count: snapshot.projectCount,
                    next_challenge: snapshot.challenge?.title || ''
                })
            });
            if (!response.ok) throw new Error('AI suggestion unavailable.');
            return { ...(await response.json()), source: 'groq' };
        } catch (error) {
            return { suggestion: fallback, source: 'progress' };
        }
    };

    const loadWingmanContext = async () => {
        const [snapshot, account, discovery] = await Promise.all([
            loadDashboardSnapshot(),
            window.LumaData.loadAccountState(),
            window.LumaData.loadDiscoveryState()
        ]);
        const assessment = account?.assessment || {};
        return {
            interests: assessment.answers || {},
            quiz_result: {
                selected_path: assessment.selected_path || snapshot.profile.active_career_name || '',
                insights: assessment.raw_result?.insights || []
            },
            active_career: snapshot.profile.active_career_name || '',
            roadmap: (snapshot.roadmap?.roadmap_days || []).map((day) => ({ day: day.day_number, title: day.title, status: day.status })),
            completed_resources: snapshot.resources.filter((item) => item.completed).map((item) => item.title).slice(0, 20),
            challenge: snapshot.challenge ? { title: snapshot.challenge.title, completed: snapshot.challengeComplete } : null,
            projects: snapshot.projects.map((item) => item.title).slice(0, 12),
            communities: (discovery.memberships || []).map((item) => item.communities?.name).filter(Boolean),
            community_activity: { posts_created: (discovery.userPosts || []).length, saved_posts: (discovery.savedPosts || []).length }
        };
    };

    Object.assign(window.LumaData, {
        uploadImage, loadProjects, loadProject, saveProject, deleteProject,
        loadActiveChallenge, completeChallenge, loadProfile, updateProfile,
        loadDashboardSnapshot, loadPersonalizedSuggestion, loadWingmanContext
    });
})();