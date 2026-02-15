import './login.css';
import { loadHtml } from '../../utils/loaders.js';

export async function render() {
  const html = await loadHtml(new URL('./login.html', import.meta.url));
  return {
    html,
    onMount() {
      const form = document.getElementById('login-form');
      if (!form) {
        return;
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        alert('Demo only. Auth is not wired yet.');
      });
    }
  };
}
