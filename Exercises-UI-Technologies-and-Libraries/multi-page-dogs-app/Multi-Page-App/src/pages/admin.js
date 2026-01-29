import template from './admin.html?raw';
import './admin.css';
import { getAllDogs, addDog, updateDog, deleteDog, getDogById } from '../store.js';

export const AdminPage = {
  render(container) {
    container.innerHTML = template;
  },

  init() {
    loadDogsTable();
    setupEventListeners();
  }
};

function loadDogsTable() {
  const dogs = getAllDogs();
  const tbody = document.getElementById('dogsTableBody');
  
  tbody.innerHTML = dogs.map(dog => `
    <tr>
      <td>${dog.id}</td>
      <td><strong>${dog.name}</strong></td>
      <td>${dog.breed}</td>
      <td>${dog.age}</td>
      <td>${dog.gender}</td>
      <td>
        <span class="badge ${dog.purpose === 'adoption' ? 'bg-success' : 'bg-warning text-dark'}">
          ${dog.purpose === 'adoption' ? '🏡 Adoption' : '💰 For Sale'}
        </span>
        ${dog.age <= 1 ? '<span class="badge bg-info text-dark ms-2">Puppy</span>' : ''}
      </td>
      <td>${dog.purpose === 'sale' ? '$' + dog.price : 'Free'}</td>
      <td class="text-truncate" style="max-width: 200px;">${dog.description}</td>
      <td>
        <button class="btn btn-sm btn-info edit-btn" data-dog-id="${dog.id}">Edit</button>
        <button class="btn btn-sm btn-danger delete-btn" data-dog-id="${dog.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  // Add new dog
  document.getElementById('addNewDogBtn')?.addEventListener('click', openAddDogForm);
  
  // Save dog
  document.getElementById('saveDogBtn')?.addEventListener('click', saveDog);
  
  // Availability dropdown change
  document.getElementById('purpose')?.addEventListener('change', (e) => {
    const priceField = document.getElementById('priceField');
    if (e.target.value === 'sale') {
      priceField.style.display = 'block';
      document.getElementById('dogPrice').required = true;
    } else {
      priceField.style.display = 'none';
      document.getElementById('dogPrice').required = false;
    }
  });
  
  // Edit dog
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const dogId = parseInt(e.target.dataset.dogId);
      openEditDogForm(dogId);
    }
  });
  
  // Delete dog
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const dogId = parseInt(e.target.dataset.dogId);
      openDeleteConfirmation(dogId);
    }
  });
  
  // Confirm delete
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
  
  // Image preview
  document.getElementById('dogImage')?.addEventListener('change', (e) => {
    const preview = document.getElementById('imagePreview');
    if (e.target.value) {
      preview.src = e.target.value;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });
}

function openAddDogForm() {
  document.getElementById('dogId').value = '';
  document.getElementById('dogForm').reset();
  document.getElementById('formModalLabel').textContent = 'Add New Dog';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('priceField').style.display = 'none';
  
  const modal = new bootstrap.Modal(document.getElementById('dogFormModal'));
  modal.show();
}

function openEditDogForm(dogId) {
  const dog = getDogById(dogId);
  if (!dog) return;
  
  document.getElementById('dogId').value = dog.id;
  document.getElementById('dogName').value = dog.name;
  document.getElementById('dogBreed').value = dog.breed;
  document.getElementById('dogAge').value = dog.age;
  document.getElementById('dogGender').value = dog.gender;
  document.getElementById('dogDescription').value = dog.description;
  document.getElementById('dogImage').value = dog.image;
  document.getElementById('purpose').value = dog.purpose;
  document.getElementById('dogPrice').value = dog.price || '';
  
  // Show/hide price field based on availability
  const priceField = document.getElementById('priceField');
  if (dog.purpose === 'sale') {
    priceField.style.display = 'block';
  } else {
    priceField.style.display = 'none';
  }
  
  const preview = document.getElementById('imagePreview');
  preview.src = dog.image;
  preview.style.display = 'block';
  
  document.getElementById('formModalLabel').textContent = `Edit ${dog.name}`;
  
  const modal = new bootstrap.Modal(document.getElementById('dogFormModal'));
  modal.show();
}

function saveDog() {
  const dogId = document.getElementById('dogId').value;
  const form = document.getElementById('dogForm');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const purpose = document.getElementById('purpose').value;
  let price = 0;
  
  if (purpose === 'sale') {
    price = parseFloat(document.getElementById('dogPrice').value);
    if (!price || price <= 0) {
      alert('Please enter a valid price for purchase dogs');
      return;
    }
  }
  
  const dogData = {
    name: document.getElementById('dogName').value,
    breed: document.getElementById('dogBreed').value,
    age: parseFloat(document.getElementById('dogAge').value),
    gender: document.getElementById('dogGender').value,
    description: document.getElementById('dogDescription').value,
    image: document.getElementById('dogImage').value,
    purpose: purpose,
    price: price
  };
  
  if (dogId) {
    updateDog(parseInt(dogId), dogData);
  } else {
    addDog(dogData);
  }
  
  bootstrap.Modal.getInstance(document.getElementById('dogFormModal')).hide();
  loadDogsTable();
  setupEventListeners();
}

function openDeleteConfirmation(dogId) {
  const dog = getDogById(dogId);
  if (!dog) return;
  
  document.getElementById('deleteDogName').textContent = dog.name;
  document.getElementById('confirmDeleteBtn').dataset.dogId = dogId;
  
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  modal.show();
}

function confirmDelete() {
  const dogId = parseInt(document.getElementById('confirmDeleteBtn').dataset.dogId);
  deleteDog(dogId);
  
  bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
  loadDogsTable();
  setupEventListeners();
}
