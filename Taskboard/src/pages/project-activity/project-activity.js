import './project-activity.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { getProjectUsers } from '../../services/project-members.js';
import { getProjectStages } from '../../services/tasks.js';
import { getProjectActivity } from '../../services/task-activity.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';

const FILTERS = {
  all: () => true,
  task: (entry) => entry.action.startsWith('task_'),
  comment: (entry) => entry.action.startsWith('comment_'),
  checklist: (entry) => entry.action.startsWith('checklist_'),
  label: (entry) => entry.action.startsWith('label_'),
  attachment: (entry) => entry.action.startsWith('attachment_')
};

const ACTION_LABELS = {
  task_created: 'Task created',
  task_updated: 'Task updated',
  task_deleted: 'Task deleted',
  comment_added: 'Comment added',
  comment_deleted: 'Comment deleted',
  checklist_item_added: 'Checklist item added',
  checklist_item_updated: 'Checklist item updated',
  checklist_item_deleted: 'Checklist item deleted',
  label_added: 'Label added',
  label_removed: 'Label removed',
  attachment_added: 'Attachment added',
  attachment_deleted: 'Attachment deleted'
};

export async function render(params) {
  const html = await loadHtml(new URL('./project-activity.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        activity: [],
        filter: 'all',
        userEmailById: new Map(),
        stageNameById: new Map()
      };

      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-activity-error]');
      const activityList = document.querySelector('[data-activity-list]');
      const emptyState = document.querySelector('[data-empty-state]');
      const filtersWrap = document.querySelector('[data-activity-filters]');
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

      const formatTimestamp = (value) => {
        if (!value) {
          return '';
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return '';
        }
        return parsed.toLocaleString();
      };

      const formatValue = (value) => {
        if (value === null || value === undefined || value === '') {
          return 'None';
        }
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        return String(value);
      };

      const getActorName = (userId) => state.userEmailById.get(userId) ?? 'Unknown user';

      const getStageName = (stageId) => state.stageNameById.get(stageId) ?? 'Stage';

      const renderDetails = (entry) => {
        const details = entry.details ?? {};
        const lines = [];

        if (Array.isArray(details.changes)) {
          details.changes.forEach((change) => {
            if (!change?.field) {
              return;
            }

            if (change.field === 'stage_id') {
              lines.push(`Stage: ${getStageName(change.old)} → ${getStageName(change.new)}`);
              return;
            }

            if (change.field === 'assignee_id') {
              lines.push(`Responsible: ${getActorName(change.old)} → ${getActorName(change.new)}`);
              return;
            }

            if (change.field === 'due_date') {
              lines.push(`Due date: ${formatValue(change.old)} → ${formatValue(change.new)}`);
              return;
            }

            lines.push(`${change.field}: ${formatValue(change.old)} → ${formatValue(change.new)}`);
          });
        }

        if (details.label_name) {
          lines.push(`Label: ${details.label_name}`);
        }

        if (details.file_name) {
          lines.push(`Attachment: ${details.file_name}`);
        }

        if (details.content) {
          lines.push(`Content: ${details.content}`);
        }

        if (!lines.length) {
          return '';
        }

        return `
          <div class="activity-item__details">
            ${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
          </div>
        `;
      };

      const renderActivity = () => {
        if (!activityList) {
          return;
        }

        const filterFn = FILTERS[state.filter] ?? FILTERS.all;
        const filtered = state.activity.filter(filterFn);
        const hasItems = filtered.length > 0;

        setHidden(emptyState, hasItems);

        activityList.innerHTML = hasItems
          ? filtered
              .map((entry) => {
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                const actor = entry.actor_id ? getActorName(entry.actor_id) : 'System';
                const timestamp = formatTimestamp(entry.created_at);
                const taskTitle = entry.task_title ?? 'Task';

                return `
                  <article class="activity-item">
                    <div class="d-flex align-items-center justify-content-between">
                      <h3 class="activity-item__title">${escapeHtml(taskTitle)}</h3>
                      <span class="activity-item__badge">${escapeHtml(actionLabel)}</span>
                    </div>
                    <div class="activity-item__meta">${escapeHtml(actor)} · ${escapeHtml(timestamp)}</div>
                    ${renderDetails(entry)}
                  </article>
                `;
              })
              .join('')
          : '';
      };

      const setActiveFilter = (filterKey) => {
        state.filter = filterKey;
        filtersWrap?.querySelectorAll('[data-activity-filter]').forEach((button) => {
          button.classList.toggle('is-active', button.getAttribute('data-activity-filter') === filterKey);
        });
        renderActivity();
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

        try {
          const stages = await getProjectStages(params.id);
          state.stageNameById = new Map(stages.map((stage) => [stage.id, stage.name]));
        } catch {
          state.stageNameById = new Map();
        }

        state.activity = await getProjectActivity(params.id);
        renderActivity();
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load activity.');
      }

      filtersWrap?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-activity-filter]');
        if (!button) {
          return;
        }

        const filterKey = button.getAttribute('data-activity-filter');
        if (!filterKey || !FILTERS[filterKey]) {
          return;
        }

        setActiveFilter(filterKey);
      });
    }
  };
}
