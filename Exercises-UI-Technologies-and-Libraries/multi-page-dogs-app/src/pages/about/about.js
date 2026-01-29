// About page component

export async function loadAboutPage() {
  const content = document.getElementById('content');
  
  // Load HTML
  const response = await fetch('/src/pages/about/about.html');
  const html = await response.text();
  content.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/pages/about/about.css';
  document.head.appendChild(link);
}
