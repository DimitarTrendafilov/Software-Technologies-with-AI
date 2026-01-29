// Main application entry point
import Router from './utils/router.js';
import { loadHeader, updateActiveLink } from './components/header/header.js';
import { loadFooter } from './components/footer/footer.js';
import { loadHomePage } from './pages/home/home.js';
import { loadDogsPage } from './pages/dogs/dogs.js';
import { loadAboutPage } from './pages/about/about.js';
import { loadContactPage } from './pages/contact/contact.js';
import { loadAdminPage } from './pages/admin/admin.js';

// Define routes
const routes = [
  { path: '/', component: loadHomePage },
  { path: '/dogs', component: loadDogsPage },
  { path: '/about', component: loadAboutPage },
  { path: '/contact', component: loadContactPage },
  { path: '/admin', component: loadAdminPage }
];

// Initialize the application
async function initApp() {
  // Load header and footer (these remain persistent)
  await loadHeader();
  await loadFooter();
  
  // Initialize router
  const router = new Router(routes);
  
  // Update active navigation link when route changes
  window.addEventListener('popstate', () => {
    updateActiveLink();
  });
  
  // Also update on initial load
  updateActiveLink();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
