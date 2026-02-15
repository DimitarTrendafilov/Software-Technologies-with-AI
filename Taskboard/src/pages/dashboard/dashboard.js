import './dashboard.css';
import { loadHtml } from '../../utils/loaders.js';

export async function render() {
  const html = await loadHtml(new URL('./dashboard.html', import.meta.url));
  return { html };
}
