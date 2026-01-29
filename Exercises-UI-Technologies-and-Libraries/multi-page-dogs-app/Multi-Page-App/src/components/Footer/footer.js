import footerTemplate from './footer.html?raw';
import './footer.css';

export function initFooter() {
  const footerEl = document.getElementById('footer');
  footerEl.innerHTML = footerTemplate;
}
