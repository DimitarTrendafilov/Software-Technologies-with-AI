import { renderHeader, mountHeader } from './components/header/header.js';
import { renderFooter } from './components/footer/footer.js';

const routes = [
  { path: '/', load: () => import('./pages/home/home.js') },
  { path: '/login', load: () => import('./pages/login/login.js') },
  { path: '/dashboard', load: () => import('./pages/dashboard/dashboard.js') },
  { path: '/projects', load: () => import('./pages/projects/projects.js') },
  { path: '/projects/:id/users', load: () => import('./pages/project-users/project-users.js') },
  { path: '/project/:id/add', load: () => import('./pages/project-form/project-form.js') },
  { path: '/project/:id/edit', load: () => import('./pages/project-form/project-form.js') },
  { path: '/project/:id/tasks', load: () => import('./pages/project-tasks/project-tasks.js') },
  { path: '/projects/:id/tasks', load: () => import('./pages/project-tasks/project-tasks.js') },
  { path: '/404', load: () => import('./pages/not-found/not-found.js') }
];

const app = document.getElementById('app');

export function initRouter() {
  window.addEventListener('popstate', handleRoute);
  document.addEventListener('click', handleLinkClick);
  handleRoute();
}

function handleLinkClick(event) {
  const link = event.target.closest('a[data-link]');
  if (!link) {
    return;
  }

  if (link.origin !== window.location.origin) {
    return;
  }

  event.preventDefault();
  navigate(link.pathname);
}

function navigate(path) {
  history.pushState({}, '', path);
  handleRoute();
}

async function handleRoute() {
  const path = normalizePath(window.location.pathname);
  let match = matchRoute(path);

  if (!match) {
    history.replaceState({}, '', '/404');
    match = { route: routes.find((route) => route.path === '/404'), params: {} };
  }

  const pageModule = await match.route.load();
  const { html, onMount } = await pageModule.render(match.params);
  const header = await renderHeader();
  const footer = await renderFooter();

  app.innerHTML = `${header}<main class="page-content">${html}</main>${footer}`;
  await mountHeader();
  setActiveNav(path);

  if (typeof onMount === 'function') {
    onMount();
  }
}

function normalizePath(pathname) {
  const trimmed = pathname.replace(/\/$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function matchRoute(path) {
  const matches = routes
    .filter((route) => route.path !== '/404')
    .map((route) => ({
      route,
      result: path.match(pathToRegex(route.path))
    }));

  const match = matches.find((matchEntry) => matchEntry.result !== null);
  if (!match) {
    return null;
  }

  return {
    route: match.route,
    params: getParams(match)
  };
}

function pathToRegex(path) {
  const normalized = path.replace(/\/$/, '');
  const target = normalized === '' ? '/' : normalized;
  return new RegExp(`^${target.replace(/\//g, '\\/').replace(/:\w+/g, '([^\\/]+)')}$`);
}

function getParams(match) {
  const values = match.result.slice(1);
  const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map((entry) => entry[1]);
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

function setActiveNav(path) {
  const links = document.querySelectorAll('[data-route]');
  links.forEach((link) => {
    const route = link.getAttribute('data-route');
    link.classList.toggle('active', route === path);
  });
}
