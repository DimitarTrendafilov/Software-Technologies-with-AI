import template from './contact.html?raw';
import './contact.css';

export const ContactPage = {
  render(container) {
    container.innerHTML = template;
  },

  init() {
    const form = document.getElementById('contactForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for your message! We will contact you soon.');
        form.reset();
      });
    }
  }
};
