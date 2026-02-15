import './home.css';
import { loadHtml } from '../../utils/loaders.js';

export async function render() {
  const html = await loadHtml(new URL('./home.html', import.meta.url));
  return { html };
}
