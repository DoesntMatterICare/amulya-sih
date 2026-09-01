document.addEventListener('DOMContentLoaded', async () => {
    if (!window.LumaData?.loadProjects) return;
    const byId = (id) => document.getElementById(id);
    const setText = (id, value) => { const node = byId(id); if (node) node.textContent = value ?? ''; };
    const formatMinutes = (minutes) => minutes >= 60 ? `${Math.round(minutes / 60 * 10) / 10} hours` : `${minutes} mins`;
    const formatDate = (value) => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(value));
    const copyText = async (value) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch (error) {
            const helper = document.createElement('textarea');
            helper.value = value; helper.setAttribute('readonly', ''); helper.style.position = 'fixed'; helper.style.opacity = '0';
            document.body.appendChild(helper); helper.select(); document.execCommand('copy'); helper.remove();
        }
    };

    const loadFacets = async () => {
        if (window.LumaProjectFacets) return window.LumaProjectFacets;
        window.LumaProjectFacets = await window.LumaData.loadLearningFacets();
        return window.LumaProjectFacets;
    };

    const fillSelect = (select, options, label) => {
        if (!select) return;
        const current = select.value;
        select.replaceChildren(new Option(label, ''));
        options.forEach((item) => select.add(new Option(item.name, item.id || item.slug)));
        if ([...select.options].some((option) => option.value === current)) select.value = current;
    };

    const makeProjectCard = (project, compact = false) => {
        const card = document.createElement('article');
        card.className = compact ? 'profile-project-item-card' : 'project-premium-card-redesigned';
        card.dataset.testid = `project-card-${project.id}`;
        const media = document.createElement('div');
        media.className = compact ? 'project-banner-img-box' : 'project-thumbnail-wrapper';
        if (project.image_url) {
            const image = document.createElement('img');
            image.src = project.image_url;
            image.alt = `${project.title} cover`;
            image.className = 'project-thumbnail-image';
            media.appendChild(image);
        } else {
            media.classList.add('p0-project-placeholder');
            media.textContent = project.title;
        }
        const body = document.createElement('div');
        body.className = compact ? 'project-details-body' : 'project-card-details';
        const title = document.createElement('h3');
        title.className = compact ? '' : 'project-card-name';
        title.textContent = project.title;
        const author = document.createElement('a');
        author.className = 'project-creator-name';
        author.href = `profile.html?user=${encodeURIComponent(project.user_id)}`;
        author.textContent = `by ${project.author?.display_name || 'Luma Student'}`;
        const description = document.createElement('p');
        description.className = 'project-card-description';
        description.textContent = project.description;
        const chips = document.createElement('div');
        chips.className = 'p0-chip-row';
        [project.career?.name, ...project.skills.map((item) => item.name)].filter(Boolean).slice(0, 4).forEach((value) => {
            const chip = document.createElement('span'); chip.className = 'project-tag-badge'; chip.textContent = value; chips.appendChild(chip);
        });
        const actions = document.createElement('div');
        actions.className = 'project-card-actions';
        const view = document.createElement('a');
        view.className = 'btn-luma-secondary';
        view.href = `project.html?id=${encodeURIComponent(project.id)}`;
        view.textContent = 'View Project';
        view.dataset.testid = `project-view-${project.id}`;
        actions.appendChild(view);
        if (project.is_owner && compact) {
            const edit = document.createElement('button');
            edit.type = 'button'; edit.className = 'btn-luma-secondary'; edit.textContent = 'Edit';
            edit.dataset.projectEdit = project.id; edit.dataset.testid = `project-edit-${project.id}`;
            actions.appendChild(edit);
        }
        body.append(title, author, description, chips, actions);
        card.append(media, body);
        return card;
    };

    const initExplorer = async () => {
        const grid = byId('featured-projects-grid');
        if (!grid) return;
        const [facets, communities] = await Promise.all([loadFacets(), window.LumaData.loadCommunityWorkspace()]);
        const communitySelect = byId('explorer-community-filter');
        if (communitySelect) {
            communitySelect.replaceChildren(new Option('All communities', ''));
            communities.forEach((item) => communitySelect.add(new Option(item.name, item.slug)));
        }
        fillSelect(byId('explorer-career-filter'), facets.careers.map((item) => ({ ...item, id: item.slug })), 'All careers');
        fillSelect(byId('explorer-skill-filter'), facets.skills.map((item) => ({ ...item, id: item.slug })), 'All skills');
        const render = async (filters = {}) => {
            const selectedCommunity = communities.find((item) => item.slug === (filters.community ?? byId('explorer-community-filter')?.value));
            const projects = await window.LumaData.loadProjects({
                search: filters.search ?? byId('community-search-input')?.value ?? '',
                career: filters.career || byId('explorer-career-filter')?.value || selectedCommunity?.career_paths?.slug || '',
                skill: filters.skill ?? byId('explorer-skill-filter')?.value ?? '',
                sort: filters.sort ?? byId('explorer-sort-select')?.value ?? 'newest'
            });
            grid.replaceChildren();
            if (!projects.length) { const empty = document.createElement('p'); empty.textContent = 'No projects match these filters yet.'; grid.appendChild(empty); return; }
            projects.slice(0, 8).forEach((project) => grid.appendChild(makeProjectCard(project)));
        };
        window.addEventListener('lumaExplorerFiltersChanged', (event) => render(event.detail));
        await render();
    };

    const renderPlan = (holder, days) => {
        if (!holder) return;
        holder.replaceChildren();
        days.slice(0, 7).forEach((day) => {
            const item = document.createElement('a');
            item.className = `plan-checkbox-item ${day.status === 'completed' ? 'checked' : ''}`;
            item.href = day.roadmap_day_resources?.[0]?.learning_resources
                ? `learning-concept.html?concept=${encodeURIComponent(day.roadmap_day_resources[0].learning_resources.concept)}` : 'journey.html';
            item.dataset.testid = `dashboard-roadmap-day-${day.day_number}`;
            const dot = document.createElement('span'); dot.className = 'checkbox-circle'; dot.textContent = day.status === 'completed' ? '✓' : String(day.day_number);
            const label = document.createElement('span'); label.textContent = day.title;
            item.append(dot, label); holder.appendChild(item);
        });
    };

    const initDashboard = async () => {
        if (!byId('dash-plan-checklist')) return;
        const snapshot = await window.LumaData.loadDashboardSnapshot();
        setText('dash-active-career-title', snapshot.profile.active_career_name || 'Your Career Path');
        setText('dash-primary-pill-val', snapshot.profile.active_career_name || 'Career Explorer');
        setText('dash-roadmap-caption', `${snapshot.completedDays} of ${snapshot.roadmap?.roadmap_days?.length || 7} roadmap days complete`);
        setText('dash-milestone-progress-text', `${snapshot.progressPercent}%`);
        const bar = byId('dash-milestone-progress-bar'); if (bar) bar.style.width = `${snapshot.progressPercent}%`;
        document.querySelectorAll('.progress-percentage-label').forEach((label) => label.textContent = `${snapshot.progressPercent}%`);
        const circle = document.querySelector('.progress-circle-fill');
        if (circle) circle.style.strokeDashoffset = String(339.3 * (1 - snapshot.progressPercent / 100));
        renderPlan(byId('dash-plan-checklist'), snapshot.roadmap?.roadmap_days || []);
        if (snapshot.challenge) {
            setText('dash-challenge-title', snapshot.challenge.title);
            setText('dash-challenge-difficulty', snapshot.challenge.difficulty);
            setText('dash-challenge-duration', formatMinutes(snapshot.challenge.duration_minutes));
            const button = byId('dash-start-challenge');
            button.textContent = snapshot.challengeComplete ? 'Review Completed Challenge' : 'Start Challenge';
            button.onclick = () => window.location.href = `challenge.html?id=${snapshot.challenge.id}`;
            button.disabled = false;
        }
        const suggestion = await window.LumaData.loadPersonalizedSuggestion(snapshot);
        setText('dash-reminder-text', suggestion.suggestion);
        byId('dash-reminder-text').dataset.source = suggestion.source;
        const activity = byId('dash-activity-timeline');
        if (activity) {
            activity.replaceChildren();
            const entries = [
                ...snapshot.resources.filter((item) => item.completed).slice(0, 2).map((item) => `Completed ${item.title}`),
                ...(snapshot.challengeComplete ? [`Completed ${snapshot.challenge.title}`] : []),
                ...snapshot.projects.slice(0, 1).map((item) => `Published ${item.title}`)
            ];
            (entries.length ? entries : ['Your first completed activity will appear here.']).forEach((text) => {
                const row = document.createElement('div'); row.className = 'activity-item';
                const bullet = document.createElement('div'); bullet.className = 'activity-bullet';
                const detail = document.createElement('div'); detail.className = 'activity-details'; detail.textContent = text;
                row.append(bullet, detail); activity.appendChild(row);
            });
        }
    };

    const learningConcepts = [
        { id: 'design-thinking', title: 'Design Thinking', description: 'Learn user-centered frameworks to define problems and ideate creative solutions.' },
        { id: 'user-research', title: 'User Research', description: 'Master user interviews, personas, and behavioral studies to understand your audience.' },
        { id: 'wireframing', title: 'Wireframing', description: 'Translate abstract ideas into skeletal UI layouts and screen blueprints.' },
        { id: 'information-architecture', title: 'Information Architecture', description: 'Structure, label, and organize content menus logically so users find answers instantly.' },
        { id: 'visual-design', title: 'Visual Design', description: 'Apply grids, alignment, responsive color hierarchy, and typography layout systems.' },
        { id: 'prototyping', title: 'Prototyping', description: 'Create high-fidelity interactive flow connections and test realistic usage.' }
    ];

    const renderLearningConcepts = (holder, resources = []) => {
        if (!holder) return;
        const concepts = learningConcepts.map((concept) => {
            const conceptResources = resources.filter((resource) => resource.concept === concept.id);
            return {
                ...concept,
                minutes: conceptResources.reduce((total, resource) => total + Number(resource.minutes || 0), 0),
                completed: conceptResources.length > 0 && conceptResources.every((resource) => resource.completed)
            };
        });
        const currentIndex = concepts.findIndex((concept) => !concept.completed);
        holder.replaceChildren();
        concepts.forEach((concept, index) => {
            const state = concept.completed ? 'completed' : index === currentIndex ? 'current' : 'locked';
            const row = document.createElement('a');
            row.className = 'concept-node-row';
            row.href = `learning-concept.html?concept=${encodeURIComponent(concept.id)}`;
            row.dataset.testid = `learning-concept-${concept.id}`;
            const status = document.createElement('div');
            status.className = `concept-node-status ${state}`;
            if (state === 'completed') status.textContent = '✓';
            if (state === 'locked') status.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
            const card = document.createElement('div');
            card.className = `concept-node-card${state === 'current' ? ' current' : ''}`;
            const left = document.createElement('div'); left.className = 'concept-node-left';
            const title = document.createElement('h4'); title.className = 'concept-node-title'; title.textContent = concept.title;
            const desc = document.createElement('p'); desc.className = 'concept-node-desc'; desc.textContent = concept.description;
            const right = document.createElement('div'); right.className = 'concept-node-right';
            const duration = document.createElement('span'); duration.className = 'concept-node-duration'; duration.textContent = `${concept.minutes || 0} mins`;
            const badge = document.createElement('span'); badge.className = `concept-node-badge ${state}`; badge.textContent = state === 'completed' ? 'Completed' : state === 'current' ? 'Current' : 'Locked';
            left.append(title, desc); right.append(duration, badge); card.append(left, right); row.append(status, card); holder.appendChild(row);
        });
    };

    const initLearning = async () => {
        if (!byId('learning-real-concepts')) return;
        const snapshot = await window.LumaData.loadDashboardSnapshot();
        setText('learning-active-career', snapshot.profile.active_career_name || 'Career Explorer');
        setText('learning-roadmap-caption', `${snapshot.completedResources} of ${snapshot.resources.length} resources complete`);
        setText('learning-roadmap-title', `${snapshot.profile.active_career_name || 'Career'} Roadmap`);
        setText('learning-roadmap-description', `${snapshot.completedDays} of ${snapshot.roadmap?.roadmap_days?.length || 7} roadmap days are complete.`);
        renderLearningConcepts(byId('learning-real-concepts'), snapshot.resources);
        renderPlan(byId('learning-weekly-goals'), snapshot.roadmap?.roadmap_days || []);
        const suggestion = await window.LumaData.loadPersonalizedSuggestion(snapshot);
        setText('learning-ai-suggestion', suggestion.suggestion);
        byId('learning-ai-suggestion').dataset.source = suggestion.source;
    };

    const initJourneyChallenge = async () => {
        if (!byId('weekly-challenge-container')) return;
        const challenge = await window.LumaData.loadActiveChallenge();
        if (!challenge) return;
        setText('journey-challenge-title', challenge.title);
        setText('journey-challenge-description', challenge.description);
        setText('journey-challenge-duration', formatMinutes(challenge.duration_minutes));
        setText('journey-challenge-difficulty', challenge.difficulty);
        const button = byId('btn-mark-challenge');
        button.textContent = challenge.progress?.status === 'completed' ? 'Review Completed Challenge' : 'Open Challenge';
        button.onclick = () => window.location.href = `challenge.html?id=${challenge.id}`;
        button.disabled = false;
    };

    const initChallengePage = async () => {
        if (!byId('challenge-submit-form')) return;
        const id = new URLSearchParams(location.search).get('id') || '';
        const challenge = await window.LumaData.loadActiveChallenge(id);
        if (!challenge) { setText('challenge-title', 'Challenge not found'); return; }
        setText('challenge-title', challenge.title); setText('challenge-description', challenge.description);
        setText('challenge-instructions', challenge.instructions); setText('challenge-difficulty', challenge.difficulty);
        setText('challenge-duration', formatMinutes(challenge.duration_minutes)); setText('challenge-reward', challenge.reward_text);
        if (challenge.progress) {
            byId('challenge-reflection').value = challenge.progress.reflection || '';
            byId('challenge-submission-url').value = challenge.progress.submission_url || '';
            setText('challenge-submit-status', 'Completed — you can update your reflection at any time.');
            byId('challenge-submit-form').querySelector('button').textContent = 'Update Completed Challenge';
        }
        const challengeButton = byId('challenge-submit-form').querySelector('button');
        challengeButton.disabled = false;
        byId('challenge-submit-form').addEventListener('submit', async (event) => {
            event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
            try {
                await window.LumaData.completeChallenge({ challengeId: challenge.id, reflection: byId('challenge-reflection').value.trim(), submissionUrl: byId('challenge-submission-url').value.trim() });
                setText('challenge-submit-status', 'Challenge completed. Journey, Dashboard, Summary, and your profile now reflect it.');
                button.textContent = 'Completed ✓';
            } catch (error) { setText('challenge-submit-status', error.message || 'Challenge could not be completed.'); button.disabled = false; }
        });
    };

    const initProjectDetail = async () => {
        if (!byId('project-detail')) return;
        const id = new URLSearchParams(location.search).get('id');
        try {
            const project = await window.LumaData.loadProject(id);
            document.title = `${project.title} · Luma`;
            setText('project-detail-title', project.title); setText('project-detail-description', project.description);
            setText('project-detail-career', project.career?.name || 'Student Project');
            const author = byId('project-detail-author'); author.textContent = `by ${project.author?.display_name || 'Luma Student'}`; author.href = `profile.html?user=${project.user_id}`;
            const media = byId('project-detail-media');
            if (project.image_url) { const image = document.createElement('img'); image.src = project.image_url; image.alt = `${project.title} cover`; media.replaceChildren(image); }
            const chips = byId('project-detail-skills'); project.skills.forEach((skill) => { const chip = document.createElement('span'); chip.className = 'project-tag-badge'; chip.textContent = skill.name; chips.appendChild(chip); });
            const link = byId('project-detail-link');
            if (project.project_url) link.href = project.project_url; else link.hidden = true;
            byId('project-detail-share').onclick = async () => { await copyText(location.href); setText('project-detail-status', 'Project link copied.'); };
            if (project.is_owner) {
                const remove = byId('project-detail-delete'); remove.hidden = false;
                remove.onclick = async () => { if (!confirm('Delete this project?')) return; await window.LumaData.deleteProject(project.id); location.href = 'profile.html'; };
            }
        } catch (error) { setText('project-detail-title', 'Project not found'); setText('project-detail-description', error.message); }
    };

    const initProfile = async () => {
        if (!byId('prof-user-name')) return;
        const facets = await loadFacets();
        const requestedUserId = new URLSearchParams(location.search).get('user') || '';
        const bundle = await window.LumaData.loadProfile(requestedUserId);
        const profile = bundle.profile;
        setText('profile-page-title', bundle.is_owner ? 'My Profile' : `${profile.display_name || 'Student'}'s Profile`);
        setText('prof-user-name', profile.display_name || 'Luma Student');
        setText('profile-bio', profile.bio || 'Exploring careers and building practical skills with Luma.');
        setText('profile-location', profile.location ? `📍 ${profile.location}` : '📍 Location not added');
        setText('profile-joined', `📅 Joined ${formatDate(profile.created_at || new Date())}`);
        setText('prof-career-title', profile.active_career_name || 'Career Explorer');
        const avatar = byId('profile-avatar-image'); if (profile.avatar_url) avatar.src = profile.avatar_url;
        setText('profile-header-projects-count', bundle.projects.length);
        setText('profile-projects-count', bundle.projects.length);
        setText('profile-badges-count', bundle.badges.length);
        setText('profile-challenges-count', bundle.progress?.completed_challenges || 0);
        let discovery = { memberships: [], userPosts: [] };
        if (bundle.is_owner) discovery = await window.LumaData.loadDiscoveryState();
        else discovery.userPosts = (await window.LumaData.loadDiscoveryFeed()).filter((post) => post.user_id === profile.user_id);
        setText('prof-stat-posts', discovery.userPosts.length);
        setText('profile-communities-count', discovery.memberships?.length || 0);
        const projectGrid = byId('profile-projects-grid'); projectGrid.replaceChildren();
        if (!bundle.projects.length) { const empty = document.createElement('p'); empty.textContent = 'No projects shared yet.'; projectGrid.appendChild(empty); }
        bundle.projects.forEach((project) => projectGrid.appendChild(makeProjectCard(project, true)));
        const badgeList = byId('profile-badges-list'); badgeList.replaceChildren();
        if (!bundle.badges.length) { const empty = document.createElement('p'); empty.textContent = 'Complete a resource, project, challenge, or community post to earn a badge.'; badgeList.appendChild(empty); }
        bundle.badges.forEach((entry) => { const row = document.createElement('div'); row.className = 'achievement-row-item'; row.dataset.testid = `profile-badge-${entry.badge_id}`; const icon = document.createElement('span'); icon.className = 'achievement-badge-circle completed'; icon.textContent = entry.badges.icon; const label = document.createElement('strong'); label.textContent = entry.badges.title; row.append(icon, label); badgeList.appendChild(row); });
        const ownerOnly = [byId('profile-edit-button'), byId('profile-project-new-button'), byId('trigger-create-post-btn')];
        ownerOnly.forEach((node) => { if (node) node.hidden = !bundle.is_owner; });
        if (!bundle.is_owner) {
            byId('profile-avatar-trigger').style.cursor = 'default';
            const camera = byId('profile-avatar-trigger').querySelector('.profile-avatar-camera-icon');
            if (camera) camera.hidden = true;
        }
        const shareUrl = new URL('profile.html', location.origin); shareUrl.searchParams.set('user', profile.user_id);
        byId('profile-share-button').onclick = async () => { await copyText(shareUrl.href); byId('profile-share-button').textContent = 'Link Copied ✓'; };
        if (bundle.is_owner) {
            const snapshot = await window.LumaData.loadDashboardSnapshot();
            const suggestion = await window.LumaData.loadPersonalizedSuggestion(snapshot);
            setText('prof-ai-insight-val', suggestion.suggestion);
            byId('prof-ai-insight-val').dataset.source = suggestion.source;
        } else {
            setText('prof-ai-insight-val', `${profile.display_name || 'This learner'} is exploring ${profile.active_career_name || 'new career paths'} and sharing progress on Luma.`);
        }
        if (!bundle.is_owner) return;
        const editModal = byId('profile-edit-modal');
        byId('profile-edit-button').onclick = () => {
            byId('profile-edit-name').value = profile.display_name || ''; byId('profile-edit-headline').value = profile.headline || '';
            byId('profile-edit-location').value = profile.location || ''; byId('profile-edit-bio').value = profile.bio || ''; editModal.classList.add('active');
        };
        byId('profile-edit-form').onsubmit = async (event) => {
            event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
            try {
                const updated = await window.LumaData.updateProfile({ displayName: byId('profile-edit-name').value.trim(), headline: byId('profile-edit-headline').value.trim(), location: byId('profile-edit-location').value.trim(), bio: byId('profile-edit-bio').value.trim(), avatarUrl: avatar.src.includes('astronaut_on_planet') ? '' : avatar.src });
                Object.assign(profile, updated);
                setText('prof-user-name', updated.display_name); setText('profile-bio', updated.bio); setText('profile-location', updated.location ? `📍 ${updated.location}` : '📍 Location not added'); editModal.classList.remove('active');
            } catch (error) { setText('profile-edit-status', error.message); } finally { button.disabled = false; }
        };
        const avatarInput = byId('profile-avatar-input');
        byId('profile-avatar-trigger').onclick = () => avatarInput.click();
        avatarInput.onchange = async () => {
            if (!avatarInput.files?.[0]) return;
            const url = await window.LumaData.uploadImage('avatars', avatarInput.files[0]);
            await window.LumaData.updateProfile({ displayName: byId('prof-user-name').textContent, headline: profile.headline || '', location: profile.location || '', bio: byId('profile-bio').textContent, avatarUrl: url });
            avatar.src = url;
        };
        fillSelect(byId('project-career-select'), facets.careers, 'Choose a career');
        const skillSelect = byId('project-skills-select'); skillSelect.replaceChildren(); facets.skills.forEach((skill) => skillSelect.add(new Option(skill.name, skill.id)));
        const projectModal = byId('project-submit-modal'); let editingProject = null;
        const openProjectForm = (project = null) => {
            editingProject = project; byId('project-edit-id').value = project?.id || ''; byId('project-title-input').value = project?.title || '';
            byId('project-description-input').value = project?.description || ''; byId('project-career-select').value = project?.career?.id || '';
            byId('project-url-input').value = project?.project_url || ''; [...skillSelect.options].forEach((option) => option.selected = project?.skills.some((skill) => skill.id === option.value) || false);
            setText('project-form-heading', project ? 'Edit project' : 'Share a project'); projectModal.classList.add('active');
        };
        byId('profile-project-new-button').onclick = () => openProjectForm();
        byId('profile-edit-button').disabled = false;
        byId('profile-project-new-button').disabled = false;
        projectGrid.addEventListener('click', (event) => { const edit = event.target.closest('[data-project-edit]'); if (edit) openProjectForm(bundle.projects.find((item) => item.id === edit.dataset.projectEdit)); });
        byId('project-submit-form').onsubmit = async (event) => {
            event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
            try {
                const file = byId('project-image-input').files?.[0];
                const imageUrl = file ? await window.LumaData.uploadImage('project-images', file) : (editingProject?.image_url || '');
                const saved = await window.LumaData.saveProject({ id: byId('project-edit-id').value, title: byId('project-title-input').value.trim(), description: byId('project-description-input').value.trim(), careerPathId: byId('project-career-select').value, projectUrl: byId('project-url-input').value.trim(), imageUrl, skillIds: [...skillSelect.selectedOptions].map((option) => option.value) });
                location.href = `project.html?id=${saved.id}`;
            } catch (error) { setText('project-submit-status', error.message || 'Project could not be saved.'); button.disabled = false; }
        };
        document.querySelectorAll('[data-close-p0-modal]').forEach((button) => button.onclick = () => button.closest('.modal-overlay-glass').classList.remove('active'));
    };

    const page = location.pathname.split('/').pop() || 'index.html';
    try {
        if (page === 'explorer.html') await initExplorer();
        if (page === 'dashboard.html') await initDashboard();
        if (page === 'learning.html') await initLearning();
        if (page === 'journey.html') await initJourneyChallenge();
        if (page === 'challenge.html') await initChallengePage();
        if (page === 'project.html') await initProjectDetail();
        if (page === 'profile.html') await initProfile();
    } catch (error) {
        console.error('Luma P0 feature initialization failed', error);
    }

    window.addEventListener('luma:resource-completed', () => {
        if (page === 'learning.html') {
            initLearning().catch((error) => console.warn('Learning progress could not be refreshed', error));
        }
    });
});
