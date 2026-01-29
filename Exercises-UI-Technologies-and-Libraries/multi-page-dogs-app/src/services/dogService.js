// Dog service for managing dog data using localStorage

class DogService {
  constructor() {
    this.storageKey = 'dogs-marketplace-data';
    this.initializeData();
  }

  initializeData() {
    // Check if data exists, if not create sample data
    if (!localStorage.getItem(this.storageKey)) {
      const sampleDogs = [
        {
          id: 1,
          breed: 'Golden Retriever',
          age: 2,
          gender: 'male',
          description: 'Friendly and energetic golden retriever, great with kids and families.',
          purpose: 'sale',
          price: 800,
          image: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400'
        },
        {
          id: 2,
          breed: 'Labrador',
          age: 3,
          gender: 'female',
          description: 'Sweet and loyal lab looking for a loving home.',
          purpose: 'adoption',
          price: 0,
          image: 'https://images.unsplash.com/photo-1579863440364-c8bd9b814e26?w=400'
        },
        {
          id: 3,
          breed: 'German Shepherd',
          age: 1,
          gender: 'male',
          description: 'Well-trained German Shepherd, excellent guard dog.',
          purpose: 'sale',
          price: 1200,
          image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=400'
        },
        {
          id: 4,
          breed: 'Beagle Puppy',
          age: 0.5,
          gender: 'female',
          description: 'Adorable beagle puppy, playful and curious.',
          purpose: 'sale',
          price: 600,
          image: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=400'
        },
        {
          id: 5,
          breed: 'Bulldog',
          age: 4,
          gender: 'male',
          description: 'Calm and friendly bulldog, great apartment companion.',
          purpose: 'adoption',
          price: 0,
          image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400'
        },
        {
          id: 6,
          breed: 'Poodle Puppy',
          age: 0.3,
          gender: 'female',
          description: 'Cute toy poodle puppy, hypoallergenic breed.',
          purpose: 'sale',
          price: 900,
          image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400'
        }
      ];
      this.saveDogs(sampleDogs);
    }
  }

  getAllDogs() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getDogById(id) {
    const dogs = this.getAllDogs();
    return dogs.find(dog => dog.id === parseInt(id));
  }

  saveDogs(dogs) {
    localStorage.setItem(this.storageKey, JSON.stringify(dogs));
  }

  addDog(dog) {
    const dogs = this.getAllDogs();
    const newId = dogs.length > 0 ? Math.max(...dogs.map(d => d.id)) + 1 : 1;
    dog.id = newId;
    dogs.push(dog);
    this.saveDogs(dogs);
    return dog;
  }

  updateDog(id, updatedDog) {
    const dogs = this.getAllDogs();
    const index = dogs.findIndex(dog => dog.id === parseInt(id));
    if (index !== -1) {
      dogs[index] = { ...dogs[index], ...updatedDog, id: parseInt(id) };
      this.saveDogs(dogs);
      return dogs[index];
    }
    return null;
  }

  deleteDog(id) {
    const dogs = this.getAllDogs();
    const filtered = dogs.filter(dog => dog.id !== parseInt(id));
    this.saveDogs(filtered);
    return filtered.length < dogs.length;
  }

  filterDogs(filters) {
    let dogs = this.getAllDogs();
    
    if (filters.purpose) {
      dogs = dogs.filter(dog => dog.purpose === filters.purpose);
    }
    
    if (filters.gender) {
      dogs = dogs.filter(dog => dog.gender === filters.gender);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      dogs = dogs.filter(dog => 
        dog.breed.toLowerCase().includes(searchLower) ||
        dog.description.toLowerCase().includes(searchLower)
      );
    }
    
    return dogs;
  }
}

export default new DogService();
