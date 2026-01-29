import { getPurchases } from '../store.js';

export const PurchasesPage = {
  render(container) {
    const purchases = getPurchases();

    container.innerHTML = `
      <div class="container-fluid py-5">
        <h1 class="mb-4">Purchase History</h1>
        <p class="text-muted mb-4">View all dogs that have been purchased</p>

        ${purchases.length === 0 ? `
          <div class="alert alert-info" role="alert">
            <h4 class="alert-heading">No purchases yet</h4>
            <p>You haven't purchased any dogs yet. Visit the <a href="/dogs">Dogs page</a> to buy one!</p>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead class="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Dog Name</th>
                  <th>Price</th>
                  <th>Buyer Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Purchase Date</th>
                </tr>
              </thead>
              <tbody>
                ${purchases.map(purchase => `
                  <tr>
                    <td>${purchase.id}</td>
                    <td><strong>${purchase.dogName}</strong></td>
                    <td class="text-success"><strong>$${purchase.price}</strong></td>
                    <td>${purchase.buyerName}</td>
                    <td>${purchase.buyerEmail}</td>
                    <td>${purchase.buyerPhone}</td>
                    <td>${purchase.buyerAddress}</td>
                    <td>${purchase.purchaseDate}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="row mt-5">
            <div class="col-md-6">
              <div class="card text-center bg-light">
                <div class="card-body">
                  <h3 class="display-4 text-warning">${purchases.length}</h3>
                  <p class="card-text">Dogs Purchased</p>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card text-center bg-light">
                <div class="card-body">
                  <h3 class="display-4 text-success">$${purchases.reduce((sum, p) => sum + p.price, 0).toFixed(2)}</h3>
                  <p class="card-text">Total Spent</p>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }
};
