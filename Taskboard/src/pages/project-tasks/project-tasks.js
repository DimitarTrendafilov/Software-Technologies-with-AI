import './project-tasks.css';
import { loadHtml } from '../../utils/loaders.js';

export async function render(params) {
  const html = await loadHtml(new URL('./project-tasks.html', import.meta.url));
  return {
    html,
    onMount() {
      const label = document.querySelector('[data-project-id]');
      if (label) {
        label.textContent = params.id;
      }
    }
  };
}
