document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('learning-library-grid');
    if (!grid || !window.LumaData?.loadLearningCatalog) return;

    const modeButtons = [...document.querySelectorAll('[data-learning-mode]')];
    const careerSelect = document.getElementById('learning-career-filter');
    const skillSelect = document.getElementById('learning-skill-filter');
    const searchInput = document.getElementById('learning-resource-search');
    const status = document.getElementById('learning-library-status');
    const selectedExperience = window.LumaCareerExperience?.getActive?.();
    let mode = 'personalized';
    let searchTimer;

    const resourceCard = (resource) => {
        const card = document.createElement('article');
        card.className = 'learning-library-card';
        card.dataset.testid = `learning-resource-${resource.id}`;

        const meta = document.createElement('div');
        meta.className = 'learning-library-card-meta';
        meta.textContent = `${resource.resource_type || resource.type || 'Resource'} • ${resource.minutes} mins • ${resource.difficulty || 'Beginner'}`;

        const title = document.createElement('h3');
        title.textContent = resource.title;
        const description = document.createElement('p');
        description.textContent = resource.description || resource.desc || resource.concept;

        const tags = document.createElement('div');
        tags.className = 'learning-library-tags';
        const resourceTags = [...(resource.careers || []), ...(resource.skills || resource.tags || [])];
        resourceTags.slice(0, 5).forEach((tag) => {
            const chip = document.createElement('span');
            chip.textContent = tag.name || tag;
            tags.appendChild(chip);
        });

        const actions = document.createElement('div');
        actions.className = 'learning-library-actions';
        const explore = document.createElement('a');
        explore.href = `learning-concept.html?concept=${encodeURIComponent(resource.concept)}&resource=${encodeURIComponent(resource.id)}`;
        explore.className = 'btn btn-outline';
        explore.textContent = 'Explore';
        explore.dataset.testid = `learning-resource-explore-${resource.id}`;
        const complete = document.createElement('button');
        complete.type = 'button';
        complete.className = `resource-library-complete${resource.completed ? ' completed' : ''}`;
        complete.textContent = resource.completed ? 'Completed ✓' : 'Mark Complete';
        complete.disabled = resource.completed;
        complete.dataset.testid = `learning-resource-complete-${resource.id}`;
        complete.addEventListener('click', async () => {
            complete.disabled = true;
            complete.textContent = 'Saving…';
            try {
                if (resource.local) {
                    if (typeof window.completeLearningResource !== 'function') throw new Error('Progress tracking is not available yet.');
                    window.completeLearningResource(resource.id, resource.title, Number(resource.minutes || 0), resource.concept);
                    complete.classList.add('completed');
                    complete.textContent = 'Completed ✓';
                    status.textContent = 'Saved on this device.';
                    return;
                }
                await window.LumaData.completeResource(resource.id);
                complete.classList.add('completed');
                complete.textContent = 'Completed ✓';
                window.dispatchEvent(new CustomEvent('luma:resource-completed', { detail: resource }));
            } catch (error) {
                if (typeof window.completeLearningResource !== 'function') {
                    complete.disabled = false;
                    complete.textContent = 'Try Again';
                    status.textContent = error.message || 'Progress could not be saved.';
                    return;
                }
                window.completeLearningResource(resource.id, resource.title, Number(resource.minutes || 0), resource.concept);
                complete.classList.add('completed');
                complete.textContent = 'Completed ✓';
                status.textContent = 'Saved on this device.';
            }
        });
        actions.append(explore, complete);
        card.append(meta, title, description, tags, actions);
        return card;
    };

    if (selectedExperience?.isCustom) {
        const completedIds = (() => {
            try {
                const progress = JSON.parse(localStorage.getItem('luma_progress_state') || '{}');
                return new Set(Array.isArray(progress.completedResourceIds) ? progress.completedResourceIds : []);
            } catch (error) {
                return new Set();
            }
        })();
        const localResources = selectedExperience.resources.map((resource) => ({
            ...resource,
            local: true,
            completed: completedIds.has(resource.id),
            careers: [{ name: selectedExperience.title }],
            difficulty: 'Beginner'
        }));
        grid.replaceChildren(...localResources.map(resourceCard));
        status.textContent = `${localResources.length} resources for ${selectedExperience.title}`;
        careerSelect.disabled = true;
        skillSelect.disabled = true;
        searchInput.disabled = true;
        modeButtons.forEach((button) => {
            button.disabled = button.dataset.learningMode === 'browse';
        });
        return;
    }

    const render = async () => {
        status.textContent = 'Loading resources…';
        grid.replaceChildren();
        try {
            const { resources, activeCareer } = await window.LumaData.loadLearningCatalog({
                mode,
                career: mode === 'browse' ? careerSelect.value : '',
                skill: skillSelect.value,
                search: searchInput.value
            });
            resources.forEach((resource) => grid.appendChild(resourceCard(resource)));
            status.textContent = resources.length
                ? `${resources.length} resource${resources.length === 1 ? '' : 's'}${mode === 'personalized' && activeCareer ? ` for ${activeCareer}` : ''}`
                : 'No resources match these filters.';
        } catch (error) {
            status.textContent = 'Resources could not be loaded. Please try again.';
        }
    };

    try {
        const facets = await window.LumaData.loadLearningFacets();
        facets.careers.forEach((career) => careerSelect.add(new Option(career.name, career.slug)));
        facets.skills.forEach((skill) => skillSelect.add(new Option(skill.name, skill.slug)));
    } catch (error) {
        status.textContent = 'Filters could not be loaded.';
    }

    modeButtons.forEach((button) => button.addEventListener('click', () => {
        mode = button.dataset.learningMode;
        modeButtons.forEach((item) => item.classList.toggle('active', item === button));
        careerSelect.disabled = mode === 'personalized';
        render();
    }));
    careerSelect.addEventListener('change', render);
    skillSelect.addEventListener('change', render);
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(render, 220);
    });
    await render();
});
