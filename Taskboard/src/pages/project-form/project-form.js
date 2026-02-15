import './project-form.css';
import { loadHtml } from '../../utils/loaders.js';
import { createProject, getProject, updateProject } from '../../services/projects.js';
import { getCurrentUser } from '../../services/auth.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError, showSuccess } from '../../services/toast.js';
import { navigateTo } from '../../utils/navigation.js';

export async function render(params) {
  const html = await loadHtml(new URL('./project-form.html', import.meta.url));

  return {
    html,
    async onMount() {
      const path = window.location.pathname;
      const isEdit = path.endsWith('/edit');

      const titleEl = document.querySelector('[data-form-title]');
      const subtitleEl = document.querySelector('[data-form-subtitle]');
      const submitEl = document.querySelector('[data-form-submit]');
      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-form-error]');
      const form = document.querySelector('[data-project-form]');
      const titleInput = form?.querySelector('#project-title');
      const descriptionInput = form?.querySelector('#project-description');

      const showInlineError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showError(message);
        }
      };

      setText(titleEl, isEdit ? 'Edit Project' : 'Create Project');
      setText(subtitleEl, isEdit ? 'Update title and description.' : 'Create a new project workspace.');
      setText(submitEl, isEdit ? 'Update project' : 'Create project');

      const user = await getCurrentUser();
      if (!user) {
        setHidden(authRequired, false);
        if (form) {
          form.classList.add('d-none');
        }
        return;
      }

      setHidden(authRequired, true);

      if (isEdit) {
        try {
          const project = await getProject(params.id);
          if (titleInput) {
            titleInput.value = project.title ?? '';
          }
          if (descriptionInput) {
            descriptionInput.value = project.description ?? '';
          }
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to load project.');
          if (form) {
            form.classList.add('d-none');
          }
          return;
        }
      }

      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        showInlineError('');

        const projectTitle = String(titleInput?.value ?? '').trim();
        const projectDescription = String(descriptionInput?.value ?? '').trim();

        if (!projectTitle) {
          showInlineError('Project title is required.');
          return;
        }

        try {
          if (isEdit) {
            await updateProject(params.id, {
              title: projectTitle,
              description: projectDescription
            });
            showSuccess('Project updated successfully.');
          } else {
            await createProject({
              title: projectTitle,
              description: projectDescription,
              userId: user.id
            });
            showSuccess('Project created successfully.');
          }

          navigateTo('/projects');
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to save project.');
        }
      });
    }
  };
}
