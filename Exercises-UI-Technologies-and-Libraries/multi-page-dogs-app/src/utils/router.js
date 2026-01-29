// Router for handling client-side navigation with clean URLs

class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = '';
    
    // Handle initial page load
    window.addEventListener('DOMContentLoaded', () => {
      this.handleRoute();
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    // Intercept link clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        this.navigateTo(e.target.getAttribute('href'));
      }
    });
  }

  navigateTo(path) {
    // Update browser URL without reloading
    window.history.pushState(null, null, path);
    this.handleRoute();
  }

  async handleRoute() {
    const path = window.location.pathname;
    
    // Find matching route
    let route = this.routes.find(r => r.path === path);
    
    // Default to home if no match
    if (!route) {
      route = this.routes.find(r => r.path === '/') || this.routes[0];
    }

    this.currentPath = path;
    
    // Load the page component
    if (route && route.component) {
      await route.component();
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }
}

export default Router;
