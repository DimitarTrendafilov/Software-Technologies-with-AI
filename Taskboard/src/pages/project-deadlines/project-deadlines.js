import './project-deadlines.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { getProjectUsers } from '../../services/project-members.js';
import { getProjectTasksForDeadlines } from '../../services/tasks.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';

const FILTER_KEYS = ['all', 'overdue', 'today', 'next7', 'later', 'none'];

export async function render(params) {
  const html = await loadHtml(new URL('./project-deadlines.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        tasks: [],
        filter: 'all',
        userEmailById: new Map()
      };

      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-deadlines-error]');
      const filtersWrap = document.querySelector('[data-deadline-filters]');
      const content = document.querySelector('[data-deadlines-content]');
      const emptyState = document.querySelector('[data-empty-state]');
      const backToTasks = document.querySelector('[data-back-tasks]');

      const escapeHtml = (value) =>
        String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');

      const showInlineError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showError(message);
        }
      };

      const getDisplayName = (userId) => state.userEmailById.get(userId) ?? 'Unassigned';

      const formatDate = (value) => {
        if (!value) {
          return '';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return '';
        }

        return parsed.toLocaleDateString();
      };

      const toDateOnly = (value) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return null;
        }
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      };

      const buildSections = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const buckets = {
          overdue: [],
          today: [],
          next7: [],
          later: [],
          none: []
        };

        state.tasks.forEach((task) => {
          if (!task.due_date) {
            buckets.none.push(task);
            return;
          }

          const due = toDateOnly(task.due_date);
          if (!due) {
            buckets.none.push(task);
            return;
          }

          if (due < today) {
            buckets.overdue.push(task);
            return;
          }

          if (due.getTime() === today.getTime()) {
            buckets.today.push(task);
            return;
          }

          if (due <= nextWeek) {
            buckets.next7.push(task);
            return;
          }

          buckets.later.push(task);
        });

        return [
          { key: 'overdue', title: 'Overdue', items: buckets.overdue },
          { key: 'today', title: 'Today', items: buckets.today },
          { key: 'next7', title: 'Next 7 days', items: buckets.next7 },
          { key: 'later', title: 'Later', items: buckets.later },
          { key: 'none', title: 'No deadline', items: buckets.none }
        ];
      };

      const renderSections = () => {
        if (!content) {
          return;
        }

        const sections = buildSections();
        const filtered = state.filter === 'all'
          ? sections
          : sections.filter((section) => section.key === state.filter);

        const hasTasks = filtered.some((section) => section.items.length > 0);
        setHidden(emptyState, hasTasks);

        content.innerHTML = filtered
          .map((section) => {
            const cards = section.items.length
              ? section.items
                  .map((task) => {
                    const dueLabel = formatDate(task.due_date);
                    const isOverdue = section.key === 'overdue' && !task.done;
                    const pillClass = task.due_date
                      ? isOverdue
                        ? 'deadline-pill deadline-pill--overdue'
                        : 'deadline-pill'
                      : 'deadline-pill deadline-pill--none';

                    const stageName = task.project_stages?.name ?? 'Stage';
                    const assignee = task.assignee_id ? getDisplayName(task.assignee_id) : 'Unassigned';
                    const doneLabel = task.done ? ' | Done' : '';

                    return `
                      <article class="deadline-card">
                        <h3 class="deadline-card__title">${escapeHtml(task.title)}</h3>
                        <p class="deadline-card__meta">
                          Stage: ${escapeHtml(stageName)} | Responsible: ${escapeHtml(assignee)}${escapeHtml(doneLabel)}
                        </p>
                        <p class="deadline-card__meta">
                          <span class="${pillClass}">${task.due_date ? `Due ${escapeHtml(dueLabel)}` : 'No deadline'}</span>
                        </p>
                        <p class="deadline-card__desc">${escapeHtml(task.description || 'No description.')}</p>
                      </article>
                    `;
                  })
                  .join('')
              : '<p class="text-muted small mb-0">No tasks in this section.</p>';

            return `
              <section class="deadline-section">
                <div class="deadline-section__header">
                  <h2 class="deadline-section__title">${escapeHtml(section.title)}</h2>
                  <span class="badge bg-dark-subtle text-dark">${section.items.length}</span>
                </div>
                <div class="deadline-cards">${cards}</div>
              </section>
            `;
          })
          .join('');
      };

      const setActiveFilter = (key) => {
        if (!FILTER_KEYS.includes(key)) {
          return;
        }
        state.filter = key;
        filtersWrap?.querySelectorAll('[data-deadline-filter]').forEach((button) => {
          button.classList.toggle('is-active', button.getAttribute('data-deadline-filter') === key);
        });
        renderSections();
      };

      setHidden(authRequired, true);
      setHidden(emptyState, true);
      showInlineError('');

      const user = await getCurrentUser();
      if (!user) {
        setHidden(authRequired, false);
        return;
      }

      if (backToTasks) {
        backToTasks.href = `/projects/${params.id}/tasks`;
      }

      try {
        await getProject(params.id);
        try {
          const projectUsers = await getProjectUsers(params.id);
          state.userEmailById = new Map(projectUsers.map((entry) => [entry.user_id, entry.email ?? 'Unknown user']));
        } catch {
          state.userEmailById = new Map();
        }

        state.tasks = await getProjectTasksForDeadlines(params.id);
        renderSections();
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load deadlines.');
      }

      filtersWrap?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-deadline-filter]');
        if (!button) {
          return;
        }

        const key = button.getAttribute('data-deadline-filter');
        if (key) {
          setActiveFilter(key);
        }
      });
    }
  };
}
