// Constants
const CHARSET = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

const STORAGE_KEYS = {
    generatedPasswords: 'passworthy_generated',
    testHistory: 'passworthy_test_history'
};

// DOM Elements
const passwordOutput = document.getElementById('passwordOutput');
const copyBtn = document.getElementById('copyBtn');
const passwordLength = document.getElementById('passwordLength');
const lengthValue = document.getElementById('lengthValue');
const useUppercase = document.getElementById('useUppercase');
const useLowercase = document.getElementById('useLowercase');
const useNumbers = document.getElementById('useNumbers');
const useSymbols = document.getElementById('useSymbols');
const generateBtn = document.getElementById('generateBtn');
const passwordsList = document.getElementById('passwordsList');
const generatedPasswords = document.getElementById('generatedPasswords');

const testPasswordInput = document.getElementById('testPasswordInput');
const toggleVisibility = document.getElementById('toggleVisibility');
const strengthBar = document.getElementById('strengthBar');
const strengthLabel = document.getElementById('strengthLabel');
const testList = document.getElementById('testList');
const testHistory = document.getElementById('testHistory');

const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializePasswordGenerator();
    initializePasswordTester();
    initializeNavigation();
    loadGeneratedPasswords();
    loadTestHistory();
});

// ==================== Password Generator ====================

function initializePasswordGenerator() {
    generateBtn.addEventListener('click', generatePassword);
    copyBtn.addEventListener('click', copyToClipboard);
    passwordLength.addEventListener('input', updateLengthValue);

    // Generate initial password
    generatePassword();
}

function generatePassword() {
    const length = parseInt(passwordLength.value);
    const useUpper = useUppercase.checked;
    const useLower = useLowercase.checked;
    const useNum = useNumbers.checked;
    const useSym = useSymbols.checked;

    // Ensure at least one option is selected
    if (!useUpper && !useLower && !useNum && !useSym) {
        alert('Please select at least one character type!');
        return;
    }

    // Build character set
    let charset = '';
    let guaranteedChars = [];

    if (useUpper) {
        charset += CHARSET.uppercase;
        guaranteedChars.push(CHARSET.uppercase[Math.floor(Math.random() * CHARSET.uppercase.length)]);
    }
    if (useLower) {
        charset += CHARSET.lowercase;
        guaranteedChars.push(CHARSET.lowercase[Math.floor(Math.random() * CHARSET.lowercase.length)]);
    }
    if (useNum) {
        charset += CHARSET.numbers;
        guaranteedChars.push(CHARSET.numbers[Math.floor(Math.random() * CHARSET.numbers.length)]);
    }
    if (useSym) {
        charset += CHARSET.symbols;
        guaranteedChars.push(CHARSET.symbols[Math.floor(Math.random() * CHARSET.symbols.length)]);
    }

    // Generate password
    let password = guaranteedChars;
    for (let i = guaranteedChars.length; i < length; i++) {
        password.push(charset[Math.floor(Math.random() * charset.length)]);
    }

    // Shuffle password
    password = password.sort(() => Math.random() - 0.5).join('');

    passwordOutput.value = password;

    // Save to local storage
    saveGeneratedPassword(password);
}

function updateLengthValue() {
    lengthValue.textContent = passwordLength.value;
    const percentage = (passwordLength.value / passwordLength.max) * 100;
    passwordLength.style.setProperty('--value', percentage + '%');
}

function copyToClipboard() {
    if (!passwordOutput.value) return;

    navigator.clipboard.writeText(passwordOutput.value).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        copyBtn.style.backgroundColor = 'var(--success)';

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    });
}

function saveGeneratedPassword(password) {
    const passwords = getGeneratedPasswords();
    const entry = {
        password: password,
        timestamp: new Date().toISOString(),
        length: password.length
    };

    passwords.unshift(entry);
    // Keep only last 50 passwords
    if (passwords.length > 50) {
        passwords.pop();
    }

    localStorage.setItem(STORAGE_KEYS.generatedPasswords, JSON.stringify(passwords));
    displayGeneratedPasswords();
}

function getGeneratedPasswords() {
    const stored = localStorage.getItem(STORAGE_KEYS.generatedPasswords);
    return stored ? JSON.parse(stored) : [];
}

function loadGeneratedPasswords() {
    displayGeneratedPasswords();
}

function displayGeneratedPasswords() {
    const passwords = getGeneratedPasswords();
    
    if (passwords.length === 0) {
        passwordsList.innerHTML = '<div class="no-results">No passwords generated yet</div>';
        return;
    }

    passwordsList.innerHTML = passwords.map((entry, index) => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleTimeString();
        return `
            <li class="password-item">
                <span class="password-item-text">${escapeHtml(entry.password)}</span>
                <span class="password-item-time">${timeStr}</span>
                <div class="password-item-actions">
                    <button class="password-item-btn" onclick="copyPasswordItem('${escapeHtml(entry.password)}')">Copy</button>
                    <button class="password-item-btn delete" onclick="deletePassword(${index})">Delete</button>
                </div>
            </li>
        `;
    }).join('');
}

function copyPasswordItem(password) {
    navigator.clipboard.writeText(password).then(() => {
        alert('Password copied!');
    });
}

function deletePassword(index) {
    const passwords = getGeneratedPasswords();
    passwords.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.generatedPasswords, JSON.stringify(passwords));
    displayGeneratedPasswords();
}

// ==================== Password Tester ====================

function initializePasswordTester() {
    testPasswordInput.addEventListener('input', testPasswordStrength);
    toggleVisibility.addEventListener('click', togglePasswordVisibility);
}

function togglePasswordVisibility() {
    if (testPasswordInput.type === 'password') {
        testPasswordInput.type = 'text';
        toggleVisibility.classList.add('active');
    } else {
        testPasswordInput.type = 'password';
        toggleVisibility.classList.remove('active');
    }
}

function testPasswordStrength() {
    const password = testPasswordInput.value;

    if (!password) {
        strengthBar.style.width = '0%';
        strengthLabel.textContent = 'No password';
        strengthLabel.style.color = 'var(--text-secondary)';
        resetCriteria();
        return;
    }

    const criteria = checkPasswordCriteria(password);
    const strength = calculateStrength(criteria);

    updateStrengthBar(strength);
    updateCriteriaChecklist(criteria);
    saveTestEntry(password, strength.label);
}

function checkPasswordCriteria(password) {
    return {
        hasLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /[0-9]/.test(password),
        hasSymbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    };
}

function calculateStrength(criteria) {
    let score = 0;
    let maxScore = 5;

    if (criteria.hasLength) score++;
    if (criteria.hasUppercase) score++;
    if (criteria.hasLowercase) score++;
    if (criteria.hasNumbers) score++;
    if (criteria.hasSymbols) score++;

    const percentage = (score / maxScore) * 100;

    let label = 'Very Weak';
    let color = 'var(--danger)';

    if (percentage >= 80) {
        label = 'Very Strong';
        color = 'var(--success)';
    } else if (percentage >= 60) {
        label = 'Strong';
        color = 'var(--success)';
    } else if (percentage >= 40) {
        label = 'Moderate';
        color = 'var(--warning)';
    } else if (percentage >= 20) {
        label = 'Weak';
        color = 'var(--danger)';
    }

    return { percentage, label, color, score };
}

function updateStrengthBar(strength) {
    strengthBar.style.width = strength.percentage + '%';
    strengthBar.style.backgroundColor = strength.color.replace('var(', '').replace(')', '');
    strengthLabel.textContent = strength.label;
    strengthLabel.style.color = strength.color;
}

function updateCriteriaChecklist(criteria) {
    document.getElementById('criteriaLength').checked = criteria.hasLength;
    document.getElementById('criteriaUppercase').checked = criteria.hasUppercase;
    document.getElementById('criteriaLowercase').checked = criteria.hasLowercase;
    document.getElementById('criteriaNumbers').checked = criteria.hasNumbers;
    document.getElementById('criteriaSymbols').checked = criteria.hasSymbols;
}

function resetCriteria() {
    document.getElementById('criteriaLength').checked = false;
    document.getElementById('criteriaUppercase').checked = false;
    document.getElementById('criteriaLowercase').checked = false;
    document.getElementById('criteriaNumbers').checked = false;
    document.getElementById('criteriaSymbols').checked = false;
}

function saveTestEntry(password, strength) {
    const history = getTestHistory();
    const entry = {
        password: password,
        strength: strength,
        timestamp: new Date().toISOString()
    };

    history.unshift(entry);
    // Keep only last 50 entries
    if (history.length > 50) {
        history.pop();
    }

    localStorage.setItem(STORAGE_KEYS.testHistory, JSON.stringify(history));
    displayTestHistory();
}

function getTestHistory() {
    const stored = localStorage.getItem(STORAGE_KEYS.testHistory);
    return stored ? JSON.parse(stored) : [];
}

function loadTestHistory() {
    displayTestHistory();
}

function displayTestHistory() {
    const history = getTestHistory();

    if (history.length === 0) {
        testList.innerHTML = '<div class="no-results">No password tests yet</div>';
        return;
    }

    testList.innerHTML = history.map((entry, index) => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleTimeString();
        const strengthColor = getStrengthColor(entry.strength);
        return `
            <li class="password-item">
                <span class="password-item-text">${escapeHtml(entry.password)}</span>
                <span class="password-item-time">${timeStr} - <strong style="color: ${strengthColor}">${entry.strength}</strong></span>
                <div class="password-item-actions">
                    <button class="password-item-btn delete" onclick="deleteTestEntry(${index})">Delete</button>
                </div>
            </li>
        `;
    }).join('');
}

function getStrengthColor(strength) {
    switch (strength) {
        case 'Very Strong':
        case 'Strong':
            return 'var(--success)';
        case 'Moderate':
            return 'var(--warning)';
        case 'Weak':
        case 'Very Weak':
            return 'var(--danger)';
        default:
            return 'var(--text-secondary)';
    }
}

function deleteTestEntry(index) {
    const history = getTestHistory();
    history.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.testHistory, JSON.stringify(history));
    displayTestHistory();
}

// ==================== Navigation ====================

function initializeNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.dataset.page;
            navigateToPage(pageName);
        });
    });
}

function navigateToPage(pageName) {
    // Hide all pages
    pages.forEach(page => page.classList.remove('active'));

    // Show selected page
    const selectedPage = document.getElementById(pageName);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Update active link
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // Update range slider styling
    if (pageName === 'home') {
        setTimeout(updateLengthValue, 0);
    }
}

// ==================== Utility Functions ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    updateLengthValue();
});
