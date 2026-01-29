// Dogs page component
import dogService from '../../services/dogService.js';

let currentFilters = {
  search: '',
  purpose: '',
  gender: ''
};

export async function loadDogsPage() {
  const content = document.getElementById('content');
  
  // Load HTML
  const response = await fetch('/src/pages/dogs/dogs.html');
  const html = await response.text();
  content.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/pages/dogs/dogs.css';
  document.head.appendChild(link);
  
  // Initialize
  setupEventListeners();
  renderDogs();
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const purposeFilter = document.getElementById('purposeFilter');
  const genderFilter = document.getElementById('genderFilter');
  const resetButton = document.getElementById('resetFilters');
  
  searchInput.addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    renderDogs();
  });
  
  purposeFilter.addEventListener('change', (e) => {
    currentFilters.purpose = e.target.value;
    renderDogs();
  });
  
  genderFilter.addEventListener('change', (e) => {
    currentFilters.gender = e.target.value;
    renderDogs();
  });
  
  resetButton.addEventListener('click', () => {
    currentFilters = { search: '', purpose: '', gender: '' };
    searchInput.value = '';
    purposeFilter.value = '';
    genderFilter.value = '';
    renderDogs();
  });
}

function renderDogs() {
  const dogs = dogService.filterDogs(currentFilters);
  const listingsContainer = document.getElementById('dogListings');
  const noResults = document.getElementById('noResults');
  
  if (dogs.length === 0) {
    listingsContainer.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  
  noResults.style.display = 'none';
  
  listingsContainer.innerHTML = dogs.map(dog => `
    <div class="col-md-4 mb-4">
      <div class="card dog-card">
        <div class="position-relative">
          <img src="${dog.image}" class="card-img-top" alt="${dog.breed}">
          <span class="badge ${dog.purpose === 'sale' ? 'bg-success' : 'bg-primary'} badge-purpose">
            ${dog.purpose === 'sale' ? 'For Sale' : 'For Adoption'}
          </span>
        </div>
        <div class="card-body">
          <h5 class="card-title">${dog.breed}</h5>
          <p class="card-text">
            <i class="bi bi-calendar"></i> ${dog.age} ${dog.age === 1 ? 'year' : dog.age < 1 ? 'months' : 'years'} old<br>
            <i class="bi bi-gender-${dog.gender === 'male' ? 'male' : 'female'}"></i> ${dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}
          </p>
          <p class="card-text text-truncate">${dog.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="price-tag ${dog.price === 0 ? 'free' : ''}">
              ${dog.price === 0 ? 'FREE' : '$' + dog.price}
            </span>
            <button class="btn btn-primary btn-sm" onclick="window.viewDogDetails(${dog.id})">
              ${dog.purpose === 'sale' ? 'Buy Now' : 'Adopt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Make viewDogDetails globally accessible
window.viewDogDetails = function(id) {
  const dog = dogService.getDogById(id);
  if (!dog) return;
  
  const modal = new bootstrap.Modal(document.getElementById('dogDetailModal'));
  document.getElementById('dogDetailTitle').textContent = dog.breed;
  document.getElementById('dogDetailBody').innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <img src="${dog.image}" class="img-fluid rounded" alt="${dog.breed}">
      </div>
      <div class="col-md-6">
        <h4>${dog.breed}</h4>
        <p><strong>Age:</strong> ${dog.age} ${dog.age === 1 ? 'year' : dog.age < 1 ? 'months' : 'years'} old</p>
        <p><strong>Gender:</strong> ${dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}</p>
        <p><strong>Purpose:</strong> ${dog.purpose === 'sale' ? 'For Sale' : 'For Adoption'}</p>
        <p><strong>Description:</strong> ${dog.description}</p>
        <hr>
        <h3 class="price-tag ${dog.price === 0 ? 'free' : ''}">
          ${dog.price === 0 ? 'FREE ADOPTION' : '$' + dog.price}
        </h3>
        <button class="btn btn-success btn-lg mt-3 w-100">
          <i class="bi bi-heart-fill"></i> ${dog.purpose === 'sale' ? 'Buy Now' : 'Adopt This Dog'}
        </button>
      </div>
    </div>
  `;
  modal.show();
};
