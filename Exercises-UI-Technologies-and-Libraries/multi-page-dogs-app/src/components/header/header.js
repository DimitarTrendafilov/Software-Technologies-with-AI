// Header component

export async function loadHeader() {
  const headerContainer = document.getElementById('header');
  
  // Load HTML
  const response = await fetch('/src/components/header/header.html');
  const html = await response.text();
  headerContainer.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/components/header/header.css';
  document.head.appendChild(link);
  
  // Set active link based on current path
  updateActiveLink();
}

export function updateActiveLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}
