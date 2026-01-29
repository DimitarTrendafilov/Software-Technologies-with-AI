// Get all tab buttons and panels
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

// Function to switch tabs
function switchTab(tabId) {
    // Remove active class from all buttons and panels
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    tabPanels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Add active class to the selected button and panel
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activePanel = document.getElementById(tabId);
    
    if (activeButton && activePanel) {
        activeButton.classList.add('active');
        activePanel.classList.add('active');
    }
}

// Add click event listeners to all tab buttons
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// Optional: Handle keyboard navigation
tabButtons.forEach((button, index) => {
    button.addEventListener('keydown', (e) => {
        let newIndex;
        
        if (e.key === 'ArrowRight') {
            newIndex = (index + 1) % tabButtons.length;
            tabButtons[newIndex].focus();
            tabButtons[newIndex].click();
        } else if (e.key === 'ArrowLeft') {
            newIndex = (index - 1 + tabButtons.length) % tabButtons.length;
            tabButtons[newIndex].focus();
            tabButtons[newIndex].click();
        }
    });
});
