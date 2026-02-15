import './footer.css';
import { loadHtml } from '../../utils/loaders.js';

export async function renderFooter() {
  return loadHtml(new URL('./footer.html', import.meta.url));
}
