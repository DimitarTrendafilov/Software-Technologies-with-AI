import headerTemplate from './header.html?raw';
import './header.css';

export function initHeader() {
  const headerEl = document.getElementById('header');

  headerEl.innerHTML = headerTemplate;
  updateActiveNav();
}

export function updateActiveNav() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '/' && currentPath === '/') {
      link.classList.add('active');
    } else if (href !== '/' && currentPath.startsWith(href)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
