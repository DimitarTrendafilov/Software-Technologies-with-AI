// Admin page component
import dogService from '../../services/dogService.js';

let editingDogId = null;
let deletingDogId = null;

export async function loadAdminPage() {
  const content = document.getElementById('content');
  
  // Load HTML
  const response = await fetch('/src/pages/admin/admin.html');
  const html = await response.text();
  content.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/pages/admin/admin.css';
  document.head.appendChild(link);
  
  // Initialize
  setupEventListeners();
  renderDogsTable();
}

function setupEventListeners() {
  const saveDogBtn = document.getElementById('saveDogBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const addDogModal = document.getElementById('addDogModal');
  
  saveDogBtn.addEventListener('click', handleSaveDog);
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  
  // Reset form when modal is closed
  addDogModal.addEventListener('hidden.bs.modal', () => {
    resetForm();
  });
}

function renderDogsTable() {
  const dogs = dogService.getAllDogs();
  const tbody = document.getElementById('dogsTableBody');
  
  if (dogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No dogs found. Add your first dog!</td></tr>';
    return;
  }
  
  tbody.innerHTML = dogs.map(dog => `
    <tr>
      <td>${dog.id}</td>
      <td>${dog.breed}</td>
      <td>${dog.age} ${dog.age === 1 ? 'year' : dog.age < 1 ? 'months' : 'years'}</td>
      <td>
        <span class="badge ${dog.gender === 'male' ? 'bg-primary' : 'bg-danger'} badge-gender">
          <i class="bi bi-gender-${dog.gender === 'male' ? 'male' : 'female'}"></i>
          ${dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}
        </span>
      </td>
      <td>
        <span class="badge ${dog.purpose === 'sale' ? 'bg-success' : 'bg-info'}">
          ${dog.purpose === 'sale' ? 'For Sale' : 'For Adoption'}
        </span>
      </td>
      <td>${dog.price === 0 ? 'FREE' : '$' + dog.price}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-warning" onclick="window.editDog(${dog.id})">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteDog(${dog.id})">
          <i class="bi bi-trash"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function resetForm() {
  document.getElementById('dogForm').reset();
  document.getElementById('dogId').value = '';
  document.getElementById('modalTitle').textContent = 'Add New Dog';
  editingDogId = null;
}

function handleSaveDog() {
  const form = document.getElementById('dogForm');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const dogData = {
    breed: document.getElementById('breed').value,
    age: parseFloat(document.getElementById('age').value),
    gender: document.getElementById('gender').value,
    description: document.getElementById('description').value,
    purpose: document.getElementById('purpose').value,
    price: parseInt(document.getElementById('price').value),
    image: document.getElementById('image').value
  };
  
  if (editingDogId) {
    dogService.updateDog(editingDogId, dogData);
  } else {
    dogService.addDog(dogData);
  }
  
  // Close modal and refresh table
  const modal = bootstrap.Modal.getInstance(document.getElementById('addDogModal'));
  modal.hide();
  renderDogsTable();
  resetForm();
}

function handleConfirmDelete() {
  if (deletingDogId) {
    dogService.deleteDog(deletingDogId);
    
    // Close modal and refresh table
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    modal.hide();
    renderDogsTable();
    deletingDogId = null;
  }
}

// Make functions globally accessible
window.editDog = function(id) {
  const dog = dogService.getDogById(id);
  if (!dog) return;
  
  editingDogId = id;
  document.getElementById('modalTitle').textContent = 'Edit Dog';
  document.getElementById('dogId').value = dog.id;
  document.getElementById('breed').value = dog.breed;
  document.getElementById('age').value = dog.age;
  document.getElementById('gender').value = dog.gender;
  document.getElementById('description').value = dog.description;
  document.getElementById('purpose').value = dog.purpose;
  document.getElementById('price').value = dog.price;
  document.getElementById('image').value = dog.image;
  
  const modal = new bootstrap.Modal(document.getElementById('addDogModal'));
  modal.show();
};

window.deleteDog = function(id) {
  deletingDogId = id;
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
};
