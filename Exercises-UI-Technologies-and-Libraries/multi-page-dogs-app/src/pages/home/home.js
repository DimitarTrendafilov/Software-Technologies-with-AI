// Home page component

export async function loadHomePage() {
  const content = document.getElementById('content');
  
  // Load HTML
  const response = await fetch('/src/pages/home/home.html');
  const html = await response.text();
  content.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/pages/home/home.css';
  document.head.appendChild(link);
}
