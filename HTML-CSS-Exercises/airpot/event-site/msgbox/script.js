const messageInput = document.getElementById('message');
const charCountDisplay = document.getElementById('charCount');
const charStatusDisplay = document.getElementById('charStatus');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');

const MAX_CHARACTERS = 200;

// Update character count in real-time
messageInput.addEventListener('input', function() {
    // Count only non-space characters
    const textWithoutSpaces = this.value.replace(/\s/g, '');
    const charCount = textWithoutSpaces.length;
    
    // Prevent input if limit exceeded
    if (charCount > MAX_CHARACTERS) {
        // Remove the excess characters
        const allowedText = this.value;
        let charCounter = 0;
        let truncatedText = '';
        
        for (let char of allowedText) {
            if (char !== ' ') {
                if (charCounter < MAX_CHARACTERS) {
                    truncatedText += char;
                    charCounter++;
                }
            } else {
                truncatedText += char;
            }
        }
        
        this.value = truncatedText;
        const finalCount = truncatedText.replace(/\s/g, '').length;
        charCountDisplay.textContent = finalCount;
        updateStatus(finalCount);
        return;
    }
    
    // Update the display
    charCountDisplay.textContent = charCount;
    
    // Update status message and styling
    updateStatus(charCount);
    
    // Enable/disable submit button
    submitBtn.disabled = charCount === 0;
});

function updateStatus(charCount) {
    const charsLeft = MAX_CHARACTERS - charCount;
    
    // Clear previous status classes
    charStatusDisplay.classList.remove('warning', 'error', 'success');
    
    if (charCount === 0) {
        charStatusDisplay.textContent = '';
    } else if (charCount > MAX_CHARACTERS) {
        charStatusDisplay.textContent = `⚠ Limit exceeded by ${charCount - MAX_CHARACTERS} character(s)`;
        charStatusDisplay.classList.add('error');
    } else if (charsLeft <= 20) {
        charStatusDisplay.textContent = `⚠ ${charsLeft} character(s) left`;
        charStatusDisplay.classList.add('warning');
    } else {
        charStatusDisplay.textContent = `✓ ${charsLeft} character(s) left`;
        charStatusDisplay.classList.add('success');
    }
}

// Handle form submission
document.getElementById('messageForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get the message
    const message = messageInput.value;
    const charCount = message.replace(/\s/g, '').length;
    
    // Validate before sending
    if (charCount === 0 || charCount > MAX_CHARACTERS) {
        alert('Please check your message length!');
        return;
    }
    
    // Show success message
    successMessage.classList.add('show');
    successMessage.classList.remove('hidden');
    
    // Log the message (in a real app, this would send to a server)
    console.log('Message sent:', message);
    console.log('Character count:', charCount);
    
    // Reset form after 2 seconds
    setTimeout(() => {
        messageInput.value = '';
        charCountDisplay.textContent = '0';
        charStatusDisplay.textContent = '';
        charStatusDisplay.classList.remove('warning', 'error', 'success');
        successMessage.classList.remove('show');
        successMessage.classList.add('hidden');
        submitBtn.disabled = true;
    }, 2000);
});
