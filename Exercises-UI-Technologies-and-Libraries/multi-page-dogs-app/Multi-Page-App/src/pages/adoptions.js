import { getAdoptions } from '../store.js';

export const AdoptionsPage = {
  render(container) {
    const adoptions = getAdoptions();

    container.innerHTML = `
      <div class="container-fluid py-5">
        <h1 class="mb-4">Adoption Records</h1>
        <p class="text-muted mb-4">View all dogs that have been successfully adopted</p>

        ${adoptions.length === 0 ? `
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No adoptions yet</h4>
            <p>Be the first to adopt one of our wonderful dogs!</p>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead class="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Dog Name</th>
                  <th>Adopter Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Adoption Date</th>
                </tr>
              </thead>
              <tbody>
                ${adoptions.map(adoption => `
                  <tr>
                    <td>${adoption.id}</td>
                    <td><strong>${adoption.dogName}</strong></td>
                    <td>${adoption.adopterName}</td>
                    <td>${adoption.adopterEmail}</td>
                    <td>${adoption.adopterPhone}</td>
                    <td>${adoption.adopterAddress}</td>
                    <td>${adoption.adoptedDate}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="row mt-5">
            <div class="col-md-3">
              <div class="card text-center bg-light">
                <div class="card-body">
                  <h3 class="display-4 text-success">${adoptions.length}</h3>
                  <p class="card-text">Dogs Adopted</p>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }
};
