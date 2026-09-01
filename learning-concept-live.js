document.addEventListener('DOMContentLoaded', async () => {
    if (!window.LumaData?.loadLearningCatalog) return;
    const params = new URLSearchParams(window.location.search);
    const concept = params.get('concept') || 'user-research';
    const resourceId = params.get('resource');
    const container = document.getElementById('resources-container');
    if (!container) return;

    try {
        const { resources } = await window.LumaData.loadLearningCatalog({ mode: 'browse', concept });
        const visibleResources = resourceId ? resources.filter((resource) => resource.id === resourceId) : resources;
        if (!visibleResources.length) return;
        container.replaceChildren();
        visibleResources.forEach((resource) => {
            const card = document.createElement('article');
            card.className = 'resource-premium-card';
            card.dataset.testid = `concept-resource-${resource.id}`;
            const info = document.createElement('div');
            info.className = 'resource-left-info';
            const text = document.createElement('div');
            const title = document.createElement('h4');
            title.className = 'resource-title';
            title.textContent = resource.title;
            const description = document.createElement('p');
            description.className = 'resource-desc';
            description.textContent = resource.description || resource.concept;
            const tags = document.createElement('div');
            tags.className = 'learning-library-tags';
            resource.skills.slice(0, 4).forEach((skill) => {
                const chip = document.createElement('span');
                chip.textContent = skill.name;
                tags.appendChild(chip);
            });
            text.append(title, description, tags);
            info.appendChild(text);

            const action = document.createElement('div');
            action.className = 'resource-right-action';
            const duration = document.createElement('span');
            duration.className = 'resource-duration';
            duration.textContent = `${resource.minutes} mins`;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `resource-library-complete${resource.completed ? ' completed' : ''}`;
            button.textContent = resource.completed ? 'Completed ✓' : 'Mark Complete';
            button.disabled = resource.completed;
            button.dataset.testid = `concept-resource-complete-${resource.id}`;
            button.addEventListener('click', async () => {
                button.disabled = true;
                button.textContent = 'Saving…';
                try {
                    await window.LumaData.completeResource(resource.id);
                    window.dispatchEvent(new CustomEvent('luma:resource-completed', { detail: resource }));
                    button.classList.add('completed');
                    button.textContent = 'Completed ✓';
                } catch (error) {
                    if (typeof window.completeLearningResource !== 'function') {
                        button.disabled = false;
                        button.textContent = 'Try Again';
                        button.title = error.message || 'Progress could not be saved.';
                        return;
                    }
                    window.completeLearningResource(resource.id, resource.title, Number(resource.minutes || 0), resource.concept);
                    button.classList.add('completed');
                    button.textContent = 'Completed ✓';
                    button.title = 'Saved on this device.';
                }
            });
            action.append(duration, button);
            card.append(info, action);
            container.appendChild(card);
        });
    } catch (error) {
        console.warn('Live learning resources could not be loaded', error);
    }
});
