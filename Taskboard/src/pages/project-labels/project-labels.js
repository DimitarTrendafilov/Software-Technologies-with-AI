import './project-labels.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { getProjectUsers } from '../../services/project-members.js';
import { createLabel, deleteLabel, getProjectLabels, getTasksByLabel } from '../../services/task-labels.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError, showSuccess } from '../../services/toast.js';
import Modal from 'bootstrap/js/dist/modal';

export async function render(params) {
  const html = await loadHtml(new URL('./project-labels.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        project: null,
        currentUser: null,
        labels: [],
        selectedLabelId: '',
        tasks: [],
        userEmailById: new Map(),
        deleteLabelId: ''
      };

      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-labels-error]');
      const labelsLayout = document.querySelector('[data-labels-layout]');
      const labelsList = document.querySelector('[data-labels-list]');
      const emptyLabels = document.querySelector('[data-empty-labels]');
      const tasksList = document.querySelector('[data-labels-tasks-list]');
      const emptyTasks = document.querySelector('[data-empty-tasks]');
      const selectedLabelName = document.querySelector('[data-selected-label-name]');
      const selectedLabelMeta = document.querySelector('[data-selected-label-meta]');
      const selectedLabelCount = document.querySelector('[data-selected-label-count]');
      const backToTasks = document.querySelector('[data-back-tasks]');
      const addLabelBtn = document.querySelector('[data-add-label-btn]');
      const addLabelForm = document.querySelector('[data-add-label-form]');
      const addLabelError = document.querySelector('[data-add-label-error]');
      const labelNameInput = document.querySelector('[data-label-name]');
      const labelColorInput = document.querySelector('[data-label-color]');
      const deleteLabelName = document.querySelector('[data-delete-label-name]');
      const confirmDeleteLabel = document.querySelector('[data-confirm-delete-label]');

      const addLabelModal = new Modal(document.getElementById('addLabelModal'));
      const deleteLabelModal = new Modal(document.getElementById('deleteLabelModal'));

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

      const showAddLabelError = (message) => {
        setText(addLabelError, message);
        setHidden(addLabelError, !message);
      };

      const getDisplayName = (userId) => state.userEmailById.get(userId) ?? 'Unassigned';

      const renderLabels = () => {
        if (!labelsList) {
          return;
        }

        if (!state.labels.length) {
          labelsList.innerHTML = '';
          setHidden(emptyLabels, false);
          setHidden(labelsLayout, true);
          return;
        }

        setHidden(emptyLabels, true);
        setHidden(labelsLayout, false);

        labelsList.innerHTML = state.labels
          .map((label) => {
            const isActive = label.id === state.selectedLabelId;
            return `
              <div class="label-item${isActive ? ' is-active' : ''}" data-label-id="${escapeHtml(label.id)}">
                <div class="label-item__info">
                  <span class="label-color" style="background: ${escapeHtml(label.color)}"></span>
                  <span class="label-name">${escapeHtml(label.name)}</span>
                </div>
                <button class="btn btn-sm btn-outline-danger" type="button" data-delete-label="${escapeHtml(label.id)}" data-delete-label-name="${escapeHtml(label.name)}">Delete</button>
              </div>
            `;
          })
          .join('');
      };

      const renderTasks = () => {
        if (!tasksList) {
          return;
        }

        if (!state.selectedLabelId) {
          tasksList.innerHTML = '';
          setHidden(emptyTasks, false);
          setText(selectedLabelName, 'Tasks');
          setText(selectedLabelMeta, 'Select a label to see its tasks.');
          setText(selectedLabelCount, '0');
          return;
        }

        const selectedLabel = state.labels.find((label) => label.id === state.selectedLabelId);
        const labelName = selectedLabel?.name ?? 'Label';
        setText(selectedLabelName, `Tasks for ${labelName}`);
        setText(selectedLabelMeta, selectedLabel ? 'Tasks assigned with this label.' : 'Select a label to see its tasks.');
        setText(selectedLabelCount, String(state.tasks.length));

        if (!state.tasks.length) {
          tasksList.innerHTML = '';
          setHidden(emptyTasks, false);
          return;
        }

        tasksList.innerHTML = state.tasks
          .map((task) => {
            const stageName = task.project_stages?.name ?? 'Stage';
            const assignee = task.assignee_id ? getDisplayName(task.assignee_id) : 'Unassigned';

            return `
              <article class="label-task-card">
                <h3 class="label-task-card__title">${escapeHtml(task.title)}</h3>
                <p class="label-task-card__meta">Stage: ${escapeHtml(stageName)} | Responsible: ${escapeHtml(assignee)}</p>
                <p class="label-task-card__desc">${escapeHtml(task.description || 'No description.')}</p>
              </article>
            `;
          })
          .join('');

        setHidden(emptyTasks, true);
      };

      const loadTasksForLabel = async (labelId) => {
        if (!labelId) {
          state.tasks = [];
          renderTasks();
          return;
        }

        try {
          state.tasks = await getTasksByLabel(params.id, labelId);
          renderTasks();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to load tasks for this label.');
        }
      };

      const loadLabels = async () => {
        state.labels = await getProjectLabels(params.id);
        if (!state.labels.length) {
          state.selectedLabelId = '';
          renderLabels();
          renderTasks();
          return;
        }

        if (!state.selectedLabelId || !state.labels.find((label) => label.id === state.selectedLabelId)) {
          state.selectedLabelId = state.labels[0].id;
        }

        renderLabels();
        await loadTasksForLabel(state.selectedLabelId);
      };

      setHidden(authRequired, true);
      setHidden(emptyLabels, true);
      setHidden(emptyTasks, true);
      showInlineError('');

      const user = await getCurrentUser();
      if (!user) {
        setHidden(authRequired, false);
        return;
      }
      state.currentUser = user;

      try {
        state.project = await getProject(params.id);
        if (backToTasks) {
          backToTasks.href = `/projects/${params.id}/tasks`;
        }

        try {
          const projectUsers = await getProjectUsers(params.id);
          state.userEmailById = new Map(projectUsers.map((entry) => [entry.user_id, entry.email ?? 'Unknown user']));
        } catch {
          state.userEmailById = new Map();
        }

        await loadLabels();
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load labels.');
      }

      labelsList?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('[data-delete-label]');
        if (deleteButton) {
          state.deleteLabelId = deleteButton.getAttribute('data-delete-label') ?? '';
          const name = deleteButton.getAttribute('data-delete-label-name') ?? '';
          setText(deleteLabelName, name);
          deleteLabelModal.show();
          return;
        }

        const labelItem = event.target.closest('[data-label-id]');
        if (!labelItem) {
          return;
        }

        const labelId = labelItem.getAttribute('data-label-id');
        if (!labelId || labelId === state.selectedLabelId) {
          return;
        }

        state.selectedLabelId = labelId;
        renderLabels();
        await loadTasksForLabel(labelId);
      });

      addLabelBtn?.addEventListener('click', () => {
        showAddLabelError('');
        if (labelNameInput) {
          labelNameInput.value = '';
        }
        if (labelColorInput) {
          labelColorInput.value = '#6c757d';
        }
        addLabelModal.show();
      });

      addLabelForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        showAddLabelError('');

        const name = String(labelNameInput?.value ?? '').trim();
        const color = String(labelColorInput?.value ?? '').trim() || '#6c757d';

        if (!name) {
          showAddLabelError('Label name is required.');
          return;
        }

        try {
          await createLabel(params.id, { name, color });
          addLabelModal.hide();
          await loadLabels();
          showSuccess('Label created.');
        } catch (error) {
          showAddLabelError(error?.message ?? 'Unable to create label.');
        }
      });

      confirmDeleteLabel?.addEventListener('click', async () => {
        if (!state.deleteLabelId) {
          return;
        }

        try {
          await deleteLabel(state.deleteLabelId);
          deleteLabelModal.hide();
          state.deleteLabelId = '';
          await loadLabels();
          showSuccess('Label deleted.');
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete label.');
        }
      });
    }
  };
}
