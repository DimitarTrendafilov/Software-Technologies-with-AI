import './header.css';
import { loadHtml } from '../../utils/loaders.js';

export async function renderHeader() {
  return loadHtml(new URL('./header.html', import.meta.url));
}
