// Contact page component

export async function loadContactPage() {
  const content = document.getElementById('content');
  
  // Load HTML
  const response = await fetch('/src/pages/contact/contact.html');
  const html = await response.text();
  content.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/pages/contact/contact.css';
  document.head.appendChild(link);
  
  // Setup form handler
  setupContactForm();
}

function setupContactForm() {
  const form = document.getElementById('contactForm');
  const successMessage = document.getElementById('successMessage');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Show success message
    successMessage.style.display = 'block';
    form.reset();
    
    // Hide message after 5 seconds
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 5000);
  });
}
