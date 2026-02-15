import './project-tasks.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { getProjectStages, getTasks } from '../../services/tasks.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';

export async function render(params) {
  const html = await loadHtml(new URL('./project-tasks.html', import.meta.url));

  return {
    html,
    async onMount() {
      const title = document.querySelector('[data-project-title]');
      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-tasks-error]');
      const emptyState = document.querySelector('[data-empty-state]');
      const boardScroll = document.querySelector('[data-board-scroll]');
      const board = document.querySelector('[data-stages-board]');

      const showInlineError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showError(message);
        }
      };

      setHidden(authRequired, true);
      setHidden(emptyState, true);
      setHidden(boardScroll, true);
      showInlineError('');

      const user = await getCurrentUser();
      if (!user) {
        setHidden(authRequired, false);
        return;
      }

      try {
        const project = await getProject(params.id);
        setText(title, project?.title ?? 'Project');

        const stages = await getProjectStages(params.id);
        if (!stages.length) {
          if (board) {
            board.innerHTML = '';
          }
          setHidden(emptyState, false);
          return;
        }

        const stageTasks = await Promise.all(stages.map((stage) => getTasks(stage.id)));

        if (board) {
          board.innerHTML = stages
            .map((stage, index) => {
              const tasks = (stageTasks[index] ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

              const cards = tasks.length
                ? tasks
                    .map(
                      (task) => `
                        <article class="task-card">
                          <h3 class="task-card__title">${task.title}</h3>
                          <p class="task-card__description">${task.description || 'No description.'}</p>
                        </article>
                      `
                    )
                    .join('')
                : '<div class="text-muted small">No tasks in this stage.</div>';

              return `
                <section class="glass-card tasks-stage">
                  <div class="tasks-stage__header">
                    <h2 class="h6 section-title mb-0">${stage.name}</h2>
                    <span class="badge bg-dark-subtle text-dark">${tasks.length}</span>
                  </div>
                  <div class="tasks-stage__list">${cards}</div>
                </section>
              `;
            })
            .join('');
        }

        setHidden(boardScroll, false);
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load project tasks.');
      }
    }
  };
}
