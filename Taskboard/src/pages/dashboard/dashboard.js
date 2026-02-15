import './dashboard.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { createBoard, getBoards } from '../../services/boards.js';
import { setHidden, setText } from '../../utils/dom.js';

export async function render() {
  const html = await loadHtml(new URL('./dashboard.html', import.meta.url));
  return {
    html,
    onMount() {
      const list = document.querySelector('[data-board-list]');
      const authRequired = document.querySelector('[data-auth-required]');
      const emptyState = document.querySelector('[data-empty-state]');
      const errorBox = document.querySelector('[data-board-error]');
      const formWrapper = document.querySelector('[data-board-form]');
      const form = document.querySelector('[data-board-create-form]');
      const feedback = document.querySelector('[data-board-feedback]');
      const createButton = document.querySelector('[data-create-board]');
      const cancelButton = document.querySelector('[data-board-cancel]');

      const showError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
      };

      const renderBoards = (boards) => {
        if (!list) {
          return;
        }

        list.innerHTML = boards
          .map(
            (board) => `
            <div class="col-md-6 col-xl-4">
              <article class="glass-card board-card">
                <div class="board-card__meta">
                  <span class="badge-tag">Board</span>
                  <span class="text-muted">${new Date(board.created_at).toLocaleDateString()}</span>
                </div>
                <h3 class="h5 section-title">${board.name}</h3>
                <p>${board.description || 'No description yet.'}</p>
                <a class="stretched-link" href="/projects/${board.id}/tasks" data-link>View tasks</a>
              </article>
            </div>
          `
          )
          .join('');
      };

      const toggleForm = (show) => {
        setHidden(formWrapper, !show);
        if (show) {
          form?.querySelector('#board-name')?.focus();
        }
      };

      const loadBoards = async () => {
        showError('');
        setHidden(authRequired, true);
        setHidden(emptyState, true);

        const user = await getCurrentUser();
        if (!user) {
          setHidden(authRequired, false);
          renderBoards([]);
          return;
        }

        try {
          const boards = await getBoards();
          renderBoards(boards);
          setHidden(emptyState, boards.length > 0);
        } catch (error) {
          showError(error?.message ?? 'Unable to load boards.');
        }
      };

      createButton?.addEventListener('click', () => toggleForm(true));
      cancelButton?.addEventListener('click', () => toggleForm(false));

      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        showError('');
        setText(feedback, 'Saving...');

        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        const description = String(formData.get('description') || '').trim();

        const user = await getCurrentUser();
        if (!user) {
          showError('Please sign in before creating a board.');
          setText(feedback, '');
          return;
        }

        if (!name) {
          showError('Board name is required.');
          setText(feedback, '');
          return;
        }

        try {
          await createBoard({ name, description, ownerId: user.id });
          form.reset();
          toggleForm(false);
          setText(feedback, '');
          await loadBoards();
        } catch (error) {
          showError(error?.message ?? 'Unable to create board.');
          setText(feedback, '');
        }
      });

      window.addEventListener('auth:changed', loadBoards);
      loadBoards();
    }
  };
}
