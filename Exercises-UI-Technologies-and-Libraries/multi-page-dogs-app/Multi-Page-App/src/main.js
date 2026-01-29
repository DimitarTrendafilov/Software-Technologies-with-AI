// Import components
import { initHeader } from './components/Header/header.js';
import { initFooter } from './components/Footer/footer.js';

// Import router
import { registerRoute, initRouter } from './router.js';

// Import pages
import { HomePage } from './pages/home.js';
import { DogsPage } from './pages/dogs.js';
import { AboutPage } from './pages/about.js';
import { ContactPage } from './pages/contact.js';
import { AdminPage } from './pages/admin.js';

// Register routes
registerRoute('/', HomePage);
registerRoute('/dogs', DogsPage);
registerRoute('/about', AboutPage);
registerRoute('/contact', ContactPage);
registerRoute('/admin', AdminPage);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initFooter();
  initRouter();
});
