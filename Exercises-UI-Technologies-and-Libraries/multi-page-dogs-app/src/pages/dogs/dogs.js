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
<<<<<<< HEAD
        <button class="btn btn-success btn-lg mt-3 w-100" onclick="window.openPurchaseForm(${dog.id})">
=======
        <button class="btn btn-success btn-lg mt-3 w-100">
>>>>>>> 6f480daa881ab57703ef556d8c0a228caacc7601
          <i class="bi bi-heart-fill"></i> ${dog.purpose === 'sale' ? 'Buy Now' : 'Adopt This Dog'}
        </button>
      </div>
    </div>
  `;
  modal.show();
};
<<<<<<< HEAD

// Open purchase/adoption form
window.openPurchaseForm = function(dogId) {
  const dog = dogService.getDogById(dogId);
  if (!dog) return;
  
  // Close detail modal first
  const detailModal = bootstrap.Modal.getInstance(document.getElementById('dogDetailModal'));
  if (detailModal) {
    detailModal.hide();
  }
  
  // Open purchase form
  const purchaseModal = new bootstrap.Modal(document.getElementById('purchaseFormModal'));
  document.getElementById('purchaseFormTitle').textContent = 
    dog.purpose === 'sale' ? `Buy ${dog.breed}` : `Adopt ${dog.breed}`;
  
  // Set dog info in form
  document.getElementById('purchaseDogInfo').innerHTML = `
    <div class="alert alert-info">
      <strong>${dog.breed}</strong> - ${dog.purpose === 'sale' ? '$' + dog.price : 'FREE Adoption'}
    </div>
  `;
  
  document.getElementById('purchaseDogId').value = dogId;
  document.getElementById('purchaseForm').reset();
  
  purchaseModal.show();
};

// Handle purchase form submission
window.submitPurchaseForm = function() {
  const form = document.getElementById('purchaseForm');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const dogId = document.getElementById('purchaseDogId').value;
  const dog = dogService.getDogById(parseInt(dogId));
  
  const formData = {
    dogId: dogId,
    name: document.getElementById('buyerName').value,
    email: document.getElementById('buyerEmail').value,
    phone: document.getElementById('buyerPhone').value,
    address: document.getElementById('buyerAddress').value,
    message: document.getElementById('buyerMessage').value
  };
  
  // Show success message
  const purchaseModal = bootstrap.Modal.getInstance(document.getElementById('purchaseFormModal'));
  purchaseModal.hide();
  
  const successModal = new bootstrap.Modal(document.getElementById('successModal'));
  document.getElementById('successMessage').innerHTML = `
    <div class="text-center">
      <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
      <h4 class="mt-3">${dog.purpose === 'sale' ? 'Purchase' : 'Adoption'} Request Submitted!</h4>
      <p>Thank you, ${formData.name}! We will contact you shortly at ${formData.email} to complete the process.</p>
      <p class="text-muted">Reference: ${dog.breed} (#${dogId})</p>
    </div>
  `;
  successModal.show();
};
=======
>>>>>>> 6f480daa881ab57703ef556d8c0a228caacc7601
