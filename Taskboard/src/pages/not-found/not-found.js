import './not-found.css';
import { loadHtml } from '../../utils/loaders.js';

export async function render() {
  const html = await loadHtml(new URL('./not-found.html', import.meta.url));
  return { html };
}
