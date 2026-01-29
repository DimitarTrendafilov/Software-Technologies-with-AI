// Sample dog data
let dogDatabase = [
  {
    id: 1,
    name: 'Daisy',
    breed: 'Labrador Mix',
    age: 2,
    gender: 'female',
    description: 'Sweet and gentle, loves to play with toys and cuddle',
    image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=300&fit=crop',
    adopted: false,
    price: 0,
    sold: false,
    purpose: 'adoption'
  },
  {
    id: 2,
    name: 'Luna',
    breed: 'Husky',
    age: 2,
    gender: 'female',
    description: 'Playful and loyal, enjoys snow and outdoor activities',
    image: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400&h=300&fit=crop',
    adopted: false,
    price: 1200,
    sold: false,
    purpose: 'sale'
  },
  {
    id: 3,
    name: 'Max',
    breed: 'German Shepherd',
    age: 4,
    gender: 'male',
    description: 'Intelligent and protective, great family companion',
    image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=300&fit=crop',
    adopted: false,
    price: 1000,
    sold: false,
    purpose: 'sale'
  },
  {
    id: 4,
    name: 'Bella',
    breed: 'Dachshund',
    age: 5,
    gender: 'female',
    description: 'Small but mighty, loves cuddles and snacks',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop',
    adopted: false,
    price: 0,
    sold: false,
    purpose: 'adoption'
  },
  {
    id: 5,
    name: 'Charlie',
    breed: 'Labrador',
    age: 1,
    gender: 'male',
    description: 'Gentle giant, great with kids and other dogs',
    image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=300&fit=crop',
    adopted: false,
    price: 900,
    sold: false,
    purpose: 'sale'
  }
];

// Adoptions list
let adoptions = [];

// Purchases list
let purchases = [];

export function getAllDogs() {
  return dogDatabase;
}

export function getDogById(id) {
  return dogDatabase.find(dog => dog.id === id);
}

export function addDog(dog) {
  const newId = Math.max(...dogDatabase.map(d => d.id), 0) + 1;
  const newDog = { ...dog, id: newId };
  dogDatabase.push(newDog);
  return newDog;
}

export function updateDog(id, updates) {
  const dog = dogDatabase.find(d => d.id === id);
  if (dog) {
    Object.assign(dog, updates);
  }
  return dog;
}

export function deleteDog(id) {
  const index = dogDatabase.findIndex(d => d.id === id);
  if (index > -1) {
    dogDatabase.splice(index, 1);
    return true;
  }
  return false;
}

export function getAvailableDogs() {
  return dogDatabase.filter(dog => !dog.adopted && !dog.sold);
}

export function adoptDog(dogId, adoptionDetails) {
  const dog = getDogById(dogId);
  if (!dog || dog.purpose !== 'adoption') return null;
  
  dog.adopted = true;
  const adoption = {
    id: adoptions.length + 1,
    dogId,
    dogName: dog.name,
    adoptedDate: new Date().toLocaleDateString(),
    ...adoptionDetails
  };
  adoptions.push(adoption);
  return adoption;
}

export function getAdoptions() {
  return adoptions;
}

export function returnDog(dogId) {
  const dog = getDogById(dogId);
  if (dog) {
    dog.adopted = false;
    adoptions = adoptions.filter(a => a.dogId !== dogId);
    return true;
  }
  return false;
}

export function getAvailableDogsForSale() {
  return dogDatabase.filter(dog => dog.purpose === 'sale' && !dog.sold && !dog.adopted);
}

export function buyDog(dogId, buyerDetails) {
  const dog = getDogById(dogId);
  if (!dog || dog.purpose !== 'sale') return null;
  
  dog.sold = true;
  const purchase = {
    id: purchases.length + 1,
    dogId,
    dogName: dog.name,
    price: dog.price,
    purchaseDate: new Date().toLocaleDateString(),
    ...buyerDetails
  };
  purchases.push(purchase);
  return purchase;
}

export function getPurchases() {
  return purchases;
}

export function updateDogPrice(dogId, newPrice) {
  const dog = getDogById(dogId);
  if (dog) {
    dog.price = newPrice;
  }
  return dog;
}
