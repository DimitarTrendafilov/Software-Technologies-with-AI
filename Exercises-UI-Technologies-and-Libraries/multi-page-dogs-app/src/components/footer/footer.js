// Footer component

export async function loadFooter() {
  const footerContainer = document.getElementById('footer');
  
  // Load HTML
  const response = await fetch('/src/components/footer/footer.html');
  const html = await response.text();
  footerContainer.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/components/footer/footer.css';
  document.head.appendChild(link);
}
