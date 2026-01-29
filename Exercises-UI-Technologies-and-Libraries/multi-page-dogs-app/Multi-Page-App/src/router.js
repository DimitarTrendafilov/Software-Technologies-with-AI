// Simple client-side router without hashes
const routes = {};

export function registerRoute(path, component) {
  routes[path] = component;
}

export async function navigate(path) {
  // Update browser URL
  window.history.pushState({ path }, '', path);
  
  // Load and render page
  await renderPage(path);
}

export async function renderPage(path) {
  const component = routes[path];
  const mainContent = document.getElementById('main-content');
  
  if (!component) {
    mainContent.innerHTML = '<div class="container"><div class="alert alert-danger mt-5">Page not found</div></div>';
    return;
  }
  
  try {
    mainContent.innerHTML = '';
    await component.render(mainContent);
    component.init?.();
    
    // Update active nav link
    const { updateActiveNav } = await import('./components/Header/header.js');
    updateActiveNav();
  } catch (error) {
    console.error('Error rendering page:', error);
    mainContent.innerHTML = '<div class="container"><div class="alert alert-danger mt-5">Error loading page</div></div>';
  }
}

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
  const path = event.state?.path || '/';
  renderPage(path);
});

// Handle link clicks
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="/"]');
  if (link && !link.hasAttribute('target')) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
  }
});

// Initial page load
export function initRouter() {
  const currentPath = window.location.pathname || '/';
  renderPage(currentPath);
}
