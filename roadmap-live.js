document.addEventListener('DOMContentLoaded', async () => {
    if (!window.LumaData?.loadRoadmapWithResources) return;
    try {
        const roadmap = await window.LumaData.loadRoadmapWithResources();
        if (!roadmap?.roadmap_days?.length) return;
        const currentCareer = document.querySelector('.dash-header-row h4');
        if (currentCareer) currentCareer.textContent = roadmap.career_name;
        const rows = [...document.querySelectorAll('.schedule-plan-item')];
        roadmap.roadmap_days.slice(0, 7).forEach((day, index) => {
            const row = rows[index];
            if (!row) return;
            const links = [...(day.roadmap_day_resources || [])].sort((a, b) => a.position - b.position);
            const resources = links.map((link) => link.learning_resources).filter(Boolean);
            const resource = resources[0];
            const completedResources = resources.filter((item) => item.user_resource_progress?.some((progress) => progress.status === 'completed')).length;
            const progressPercent = resources.length ? Math.round((completedResources / resources.length) * 100) : 0;
            const dayCompleted = day.status === 'completed' || (resources.length > 0 && completedResources === resources.length);
            row.removeAttribute('onclick');
            row.dataset.testid = `roadmap-day-${day.day_number}`;
            row.dataset.roadmapDayId = day.id;
            row.classList.toggle('roadmap-day-completed', dayCompleted);
            const title = row.querySelector('.schedule-item-title');
            title.textContent = day.title;
            row.querySelector('.schedule-item-duration').textContent = `${day.duration_minutes} mins`;
            const left = row.querySelector('.schedule-item-left');
            const dayTag = left.querySelector('.schedule-item-day-tag');
            const copy = document.createElement('div');
            copy.className = 'roadmap-day-copy';
            const summary = document.createElement('p');
            summary.className = 'roadmap-day-summary';
            summary.dataset.testid = `roadmap-day-summary-${day.day_number}`;
            summary.textContent = resource?.description || day.objective || day.activity || 'A focused step toward your selected career.';
            const resourceLabel = document.createElement('span');
            resourceLabel.className = 'roadmap-linked-resource';
            resourceLabel.dataset.testid = `roadmap-day-resources-${day.day_number}`;
            resourceLabel.textContent = resources.length
                ? `${resources.length === 1 ? 'Linked resource' : `${resources.length} linked resources`}: ${resources.map((item) => item.title).join(' • ')}`
                : 'No linked resource yet';
            copy.append(title, summary, resourceLabel);
            left.replaceChildren(dayTag, copy);
            const right = row.querySelector('.schedule-item-right');
            const progress = document.createElement('div');
            progress.className = 'roadmap-day-progress';
            progress.dataset.testid = `roadmap-day-progress-${day.day_number}`;
            const progressLabel = document.createElement('span');
            progressLabel.textContent = `${completedResources}/${resources.length || 1} complete`;
            const progressTrack = document.createElement('span');
            progressTrack.className = 'roadmap-day-progress-track';
            const progressFill = document.createElement('span');
            progressFill.className = 'roadmap-day-progress-fill';
            progressFill.style.width = `${progressPercent}%`;
            progressTrack.appendChild(progressFill);
            progress.append(progressLabel, progressTrack);
            const indicator = row.querySelector('.schedule-item-indicator');
            right.insertBefore(progress, indicator);
            indicator.className = `schedule-item-indicator ${dayCompleted ? 'completed' : index === 0 ? 'current' : 'upcoming'}`;
            indicator.innerHTML = dayCompleted ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '';
            if (resource) {
                row.tabIndex = 0;
                row.setAttribute('role', 'link');
                const destination = `learning-concept.html?concept=${encodeURIComponent(resource.concept)}&resource=${encodeURIComponent(resource.id)}`;
                row.addEventListener('click', () => { window.location.href = destination; });
                row.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') window.location.href = destination;
                });
            }
        });
    } catch (error) {
        console.warn('Live roadmap resources could not be loaded', error);
    }
});