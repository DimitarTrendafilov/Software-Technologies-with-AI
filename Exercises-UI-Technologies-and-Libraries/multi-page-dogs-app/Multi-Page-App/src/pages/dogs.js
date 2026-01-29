import template from './dogs.html?raw';
import './dogs.css';
import { getAvailableDogs, getDogById, adoptDog, buyDog, addDog } from '../store.js';

export const DogsPage = {
  render(container) {
    container.innerHTML = template;
    renderDogsList();
  },

  init() {
    const dogModalEl = document.getElementById('dogModal');
    const adoptionModalEl = document.getElementById('adoptionModal');
    const purchaseModalEl = document.getElementById('purchaseModal');
    const sellModalEl = document.getElementById('sellModal');
    let currentDogId = null;

    document.getElementById('openSellModalBtn')?.addEventListener('click', () => {
      document.getElementById('sellForm').reset();
      const modal = new bootstrap.Modal(sellModalEl);
      modal.show();
    });

    document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
      renderDogsList(getFilters());
    });

    document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
      resetFilters();
      renderDogsList();
    });

    document.getElementById('searchQuery')?.addEventListener('input', () => {
      renderDogsList(getFilters());
    });

    // Handle view details button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('view-details-btn')) {
        const card = e.target.closest('[data-dog-id]');
        const dogId = parseInt(card.dataset.dogId);
        currentDogId = dogId;
        const dog = getDogById(dogId);
        
        if (dog) {
          showDogModal(dog);
        }
      }
    });

    // Handle adopt button from cards
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('adopt-btn')) {
        const card = e.target.closest('[data-dog-id]');
        currentDogId = parseInt(card.dataset.dogId);
        const dog = getDogById(currentDogId);
        if (dog && dog.purpose === 'adoption') {
          showAdoptionForm(dog);
        } else {
          alert('This dog is not available for adoption');
        }
      }
    });

    // Handle buy button from cards
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('buy-btn')) {
        const card = e.target.closest('[data-dog-id]');
        currentDogId = parseInt(card.dataset.dogId);
        const dog = getDogById(currentDogId);
        if (dog && dog.purpose === 'sale') {
          showPurchaseForm(dog);
        } else {
          alert('This dog is not available for purchase');
        }
      }
    });

    // Handle adopt button from modal
    document.getElementById('adoptFromModalBtn')?.addEventListener('click', () => {
      const dog = getDogById(currentDogId);
      if (dog && dog.purpose === 'adoption') {
        bootstrap.Modal.getInstance(dogModalEl).hide();
        showAdoptionForm(dog);
      } else {
        alert('This dog is not available for adoption');
      }
    });

    // Handle buy button from modal
    document.getElementById('buyFromModalBtn')?.addEventListener('click', () => {
      const dog = getDogById(currentDogId);
      if (dog && dog.purpose === 'sale') {
        bootstrap.Modal.getInstance(dogModalEl).hide();
        showPurchaseForm(dog);
      } else {
        alert('This dog is not available for purchase');
      }
    });

    // Handle adoption submission
    document.getElementById('submitAdoptionBtn')?.addEventListener('click', () => {
      const form = document.getElementById('adoptionForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const adoptionDetails = {
        adopterName: document.getElementById('adopterName').value,
        adopterEmail: document.getElementById('adopterEmail').value,
        adopterPhone: document.getElementById('adopterPhone').value,
        adopterAddress: document.getElementById('adopterAddress').value
      };

      adoptDog(currentDogId, adoptionDetails);
      bootstrap.Modal.getInstance(adoptionModalEl).hide();
      
      alert('🎉 Congratulations! You have successfully adopted a dog! Redirecting...');
      window.location.reload();
    });

    // Handle purchase submission
    document.getElementById('submitPurchaseBtn')?.addEventListener('click', () => {
      const form = document.getElementById('purchaseForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const purchaseDetails = {
        buyerName: document.getElementById('buyerName').value,
        buyerEmail: document.getElementById('buyerEmail').value,
        buyerPhone: document.getElementById('buyerPhone').value,
        buyerAddress: document.getElementById('buyerAddress').value,
        cardNumber: '****' + document.getElementById('cardNumber').value.slice(-4)
      };

      buyDog(currentDogId, purchaseDetails);
      bootstrap.Modal.getInstance(purchaseModalEl).hide();
      alert('🎉 Purchase successful! You now own a dog! Redirecting...');
      window.location.reload();
    });

    document.getElementById('submitSellBtn')?.addEventListener('click', () => {
      const form = document.getElementById('sellForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const price = parseFloat(document.getElementById('sellDogPrice').value);
      if (!price || price <= 0) {
        alert('Please enter a valid price for sale listings');
        return;
      }

      addDog({
        name: document.getElementById('sellDogName').value,
        breed: document.getElementById('sellDogBreed').value,
        age: parseFloat(document.getElementById('sellDogAge').value),
        gender: document.getElementById('sellDogGender').value,
        description: document.getElementById('sellDogDescription').value,
        image: document.getElementById('sellDogImage').value,
        purpose: 'sale',
        price
      });

      bootstrap.Modal.getInstance(sellModalEl).hide();
      renderDogsList(getFilters());
      alert('✅ Listing published!');
    });
  }
};

function renderDogsList(filters = {}) {
  const listEl = document.getElementById('dogs-list');
  const dogs = applyFilters(getAvailableDogs(), filters);

  listEl.innerHTML = dogs.length === 0
    ? `
      <div class="alert alert-info" role="alert">
        <h4 class="alert-heading">No dogs available</h4>
        <p>All our wonderful dogs have found their forever homes! Check back soon for new arrivals.</p>
      </div>
    `
    : `
      <div class="row g-4">
        ${dogs.map(dog => {
          const isPuppy = dog.age <= 1;
          const purposeLabel = dog.purpose === 'sale' ? 'For Sale' : 'Adoption';
          const purposeBadge = dog.purpose === 'sale' ? 'bg-warning text-dark' : 'bg-success';

          return `
            <div class="col-md-6 col-lg-4">
              <div class="card dog-card h-100 shadow-sm" data-dog-id="${dog.id}">
                <img src="${dog.image}" class="card-img-top" alt="${dog.name}">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <h5 class="card-title">${dog.name}</h5>
                    <span class="badge ${purposeBadge} dog-badge">${purposeLabel}</span>
                  </div>
                  <p class="card-text text-muted">${dog.breed}</p>
                  <p class="card-text small mb-1"><strong>Age:</strong> ${dog.age} ${dog.age === 1 ? 'year' : 'years'}</p>
                  <p class="card-text small"><strong>Gender:</strong> ${formatGender(dog.gender)}</p>
                  ${isPuppy ? '<span class="badge bg-info text-dark mb-2 dog-badge">Puppy</span>' : ''}
                  ${dog.purpose === 'sale' ? `
                    <p class="card-text">
                      <strong class="text-success">$${dog.price}</strong>
                    </p>
                  ` : `
                    <p class="card-text text-success"><strong>Free Adoption</strong></p>
                  `}
                  <div class="d-grid gap-2">
                    <button class="btn btn-primary btn-sm view-details-btn">View Details</button>
                    ${dog.purpose === 'adoption' ? `
                      <button class="btn btn-success btn-sm adopt-btn">🏡 Adopt</button>
                    ` : ''}
                    ${dog.purpose === 'sale' ? `
                      <button class="btn btn-warning btn-sm buy-btn">🛒 Buy $${dog.price}</button>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
}

function getFilters() {
  return {
    query: document.getElementById('searchQuery')?.value.trim().toLowerCase() || '',
    purpose: document.getElementById('purposeFilter')?.value || '',
    gender: document.getElementById('genderFilter')?.value || '',
    age: document.getElementById('ageFilter')?.value || ''
  };
}

function resetFilters() {
  const form = document.getElementById('dogsFilterForm');
  form?.reset();
}

function applyFilters(dogs, filters) {
  return dogs.filter(dog => {
    const matchesQuery = filters.query
      ? `${dog.name} ${dog.breed}`.toLowerCase().includes(filters.query)
      : true;

    const matchesPurpose = filters.purpose ? dog.purpose === filters.purpose : true;
    const matchesGender = filters.gender ? dog.gender === filters.gender : true;
    const matchesAge = filters.age
      ? (filters.age === 'puppy' ? dog.age <= 1 : dog.age > 1)
      : true;

    return matchesQuery && matchesPurpose && matchesGender && matchesAge;
  });
}

function showDogModal(dog) {
  const modalLabel = document.getElementById('dogModalLabel');
  const modalBody = document.getElementById('dogModalBody');
  const adoptBtn = document.getElementById('adoptFromModalBtn');
  const buyBtn = document.getElementById('buyFromModalBtn');
  const isPuppy = dog.age <= 1;
  const purposeLabel = dog.purpose === 'sale' ? 'For Sale' : 'Adoption';
  
  modalLabel.textContent = dog.name;
  modalBody.innerHTML = `
    <img src="${dog.image}" class="img-fluid rounded mb-3" alt="${dog.name}">
    <p><strong>Breed:</strong> ${dog.breed}</p>
    <p><strong>Age:</strong> ${dog.age} ${dog.age === 1 ? 'year' : 'years'} old</p>
    <p><strong>Gender:</strong> ${formatGender(dog.gender)}</p>
    <p><strong>Purpose:</strong> ${purposeLabel}</p>
    ${isPuppy ? '<span class="badge bg-info text-dark mb-2">Puppy</span>' : ''}
    ${dog.purpose === 'sale' ? `
      <p><strong>Price:</strong> <span class="text-success">$${dog.price}</span></p>
    ` : '<p><strong>Price:</strong> <span class="text-success">Free</span></p>'}
    <p><strong>Description:</strong></p>
    <p>${dog.description}</p>
  `;
  
  // Show/hide buttons based on availability
  if (dog.purpose === 'adoption') {
    adoptBtn.style.display = 'block';
  } else {
    adoptBtn.style.display = 'none';
  }
  
  if (dog.purpose === 'sale') {
    buyBtn.style.display = 'block';
  } else {
    buyBtn.style.display = 'none';
  }
  
  const modal = new bootstrap.Modal(document.getElementById('dogModal'));
  modal.show();
}

function showAdoptionForm(dog) {
  document.getElementById('adoptDogName').textContent = dog.name;
  document.getElementById('adoptionForm').reset();
  
  const modal = new bootstrap.Modal(document.getElementById('adoptionModal'));
  modal.show();
}

function showPurchaseForm(dog) {
  document.getElementById('buyDogName').textContent = dog.name;
  document.getElementById('dogPrice').textContent = dog.price;
  document.getElementById('purchaseForm').reset();
  
  const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
  modal.show();
}

function formatGender(gender) {
  if (!gender) return '';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}
