const form = document.getElementById('bmiForm');
const heightInput = document.getElementById('height');
const weightInput = document.getElementById('weight');
const resultDiv = document.getElementById('result');
const bmiValueDisplay = document.getElementById('bmiValue');
const bmiCategoryDisplay = document.getElementById('bmiCategory');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    calculateBMI();
});

function calculateBMI() {
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);

    if (!height || !weight || height <= 0 || weight <= 0) {
        alert('Please enter valid height and weight');
        return;
    }

    // Convert height from cm to meters
    const heightInMeters = height / 100;
    
    // Calculate BMI: weight (kg) / (height (m))^2
    const bmi = weight / (heightInMeters * heightInMeters);
    
    // Display the result
    displayResult(bmi);
}

function displayResult(bmi) {
    // Round to 1 decimal place
    const bmiRounded = bmi.toFixed(1);
    
    bmiValueDisplay.textContent = bmiRounded;
    
    let category = '';
    let categoryClass = '';
    let categoryText = '';
    
    if (bmi < 18.5) {
        category = 'Underweight';
        categoryClass = 'category-underweight';
        categoryText = '📉 Underweight: BMI less than 18.5';
    } else if (bmi >= 18.5 && bmi < 25) {
        category = 'Normal Weight';
        categoryClass = 'category-normal';
        categoryText = '✓ Normal Weight: BMI 18.5 - 24.9';
    } else if (bmi >= 25 && bmi < 30) {
        category = 'Overweight';
        categoryClass = 'category-overweight';
        categoryText = '⚠️ Overweight: BMI 25 - 29.9';
    } else {
        category = 'Obese';
        categoryClass = 'category-obese';
        categoryText = '⚠️ Obese: BMI 30 or higher';
    }
    
    bmiCategoryDisplay.className = `bmi-category ${categoryClass}`;
    bmiCategoryDisplay.textContent = categoryText;
    
    resultDiv.classList.remove('hidden');
    
    // Smooth scroll to result on mobile
    if (window.innerWidth < 768) {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function resetCalculator() {
    form.reset();
    resultDiv.classList.add('hidden');
    heightInput.focus();
}

// Optional: Calculate on Enter key press
heightInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        weightInput.focus();
    }
});

weightInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        calculateBMI();
    }
});
