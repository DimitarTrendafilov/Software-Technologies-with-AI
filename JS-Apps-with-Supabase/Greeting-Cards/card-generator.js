// Card Generator Wizard Logic with Database Integration

let supabaseClientForCards = null;
let cardDatabase = null;
const TEMPLATE_BUCKET = "card-templates";

const getTemplatePublicUrl = (path) => {
  if (!path || !supabaseClientForCards) return "";
  const { data } = supabaseClientForCards.storage.from(TEMPLATE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
};

const resolveTemplateUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return getTemplatePublicUrl(value);
};

class CardWizard {
  constructor(supabaseClient) {
    supabaseClientForCards = supabaseClient;
    cardDatabase = new CardDatabase(supabaseClient);
    
    this.currentStep = 1;
    this.totalSteps = 4;
    this.currentCardId = null;
    this.currentShareCode = null;
    this.templates = [];
    this.state = {
      recipientName: "",
      greetingText: "",
      selectedCardPath: "",
      selectedCardUrl: "",
    };
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadTemplates();
    this.loadCards();
    this.updateUI();
    this.updateShareButtonState();
  }

  setupEventListeners() {
    const homeBrand = document.querySelector(".navbar-brand");
    if (homeBrand) {
      homeBrand.addEventListener("click", (event) => {
        event.preventDefault();
        this.resetWizard();
      });
    }

    // Wizard navigation
    document.querySelectorAll(".wizard-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const step = parseInt(tab.dataset.step);
        this.goToStep(step);
      });
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
      if (this.validateStep(this.currentStep)) {
        this.goToStep(this.currentStep + 1);
      }
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      this.goToStep(this.currentStep - 1);
    });

    // Form inputs
    document.getElementById("recipientName").addEventListener("input", (e) => {
      this.state.recipientName = e.target.value;
      this.updateMessagePreview();
    });

    document.getElementById("greetingText").addEventListener("input", (e) => {
      this.state.greetingText = e.target.value;
      this.updateMessagePreview();
    });

    // Card selection
    const gallery = document.getElementById("cardGallery");
    if (gallery) {
      gallery.addEventListener("click", (event) => {
        const item = event.target.closest(".gallery-item");
        if (!item) return;

        const path = item.dataset.cardPath || "";
        const url = item.dataset.cardUrl || "";

        this.state.selectedCardPath = path;
        this.state.selectedCardUrl = url;

        gallery.querySelectorAll(".gallery-item").forEach((entry) => {
          entry.classList.toggle("selected", entry === item);
        });

        this.updateCardPreview();
      });
    }

    // Action buttons
    document.getElementById("downloadBtn").addEventListener("click", () => {
      this.generateCard();
    });

    document.getElementById("saveBtn").addEventListener("click", () => {
      this.saveCard();
    });

    document.getElementById("deleteBtn").addEventListener("click", () => {
      this.showDeleteConfirmation();
    });

    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        this.openShareModal();
      });
    }

    document.getElementById("newCardBtn").addEventListener("click", () => {
      this.resetWizard();
    });

    // Delete confirmation
    document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
      this.confirmDelete();
    });

    const copyShareBtn = document.getElementById("copyShareBtn");
    if (copyShareBtn) {
      copyShareBtn.addEventListener("click", () => {
        this.copyShareLink();
      });
    }

    const nativeShareBtn = document.getElementById("nativeShareBtn");
    if (nativeShareBtn) {
      nativeShareBtn.addEventListener("click", () => {
        this.nativeShareLink();
      });
    }
  }

  async loadCards() {
    const cards = await cardDatabase.getCards();
    this.renderCardsList(cards);
  }

  renderCardsList(cards) {
    const cardsList = document.getElementById("cardsList");
    
    if (cards.length === 0) {
      cardsList.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-card-list"></i>
          <p>No cards yet</p>
          <small>Create your first birthday card</small>
        </div>
      `;
      return;
    }

    cardsList.innerHTML = cards.map((card) => `
      <div class="card-item" data-card-id="${card.id}">
        <p class="card-item-title">${card.person_name}</p>
        <p class="card-item-date">${new Date(card.created_at).toLocaleDateString()}</p>
      </div>
    `).join("");

    // Add click event listeners
    document.querySelectorAll(".card-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.loadCard(item.dataset.cardId);
      });
    });
  }

  async loadCard(cardId) {
    try {
      const card = await cardDatabase.getCardById(cardId);
      this.currentCardId = cardId;
      this.currentShareCode = card.share_code || null;
      
      // Update state
      this.state.recipientName = card.person_name;
      this.state.greetingText = card.greeting_text;
      this.state.selectedCardPath = card.image_template || "";
      this.state.selectedCardUrl = resolveTemplateUrl(card.image_template);

      // Update form fields
      document.getElementById("recipientName").value = card.person_name;
      document.getElementById("greetingText").value = card.greeting_text;

      // Update selected card design
      document.querySelectorAll(".gallery-item").forEach((item) => {
        const matchesPath = item.dataset.cardPath === card.image_template;
        const matchesUrl = item.dataset.cardUrl === this.state.selectedCardUrl;
        item.classList.toggle("selected", matchesPath || matchesUrl);
      });

      // Jump to last step
      this.goToStep(4);
      
      // Update UI
      this.updateCardPreview();
      this.updateActiveCardItem(cardId);
      this.showDeleteButton();
      this.updateShareButtonState();
    } catch (error) {
      alert("Error loading card: " + error.message);
    }
  }

  updateActiveCardItem(cardId) {
    document.querySelectorAll(".card-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.cardId === cardId);
    });
  }

  resetWizard() {
    this.currentCardId = null;
    this.currentShareCode = null;
    this.applyDefaultTemplateSelection();
    this.state = {
      recipientName: "",
      greetingText: "",
      selectedCardPath: this.state.selectedCardPath,
      selectedCardUrl: this.state.selectedCardUrl,
    };
    document.getElementById("recipientName").value = "";
    document.getElementById("greetingText").value = "";
    document.querySelectorAll(".card-item").forEach((item) => {
      item.classList.remove("active");
    });
    this.renderTemplateGallery();
    this.hideDeleteButton();
    this.updateShareButtonState();
    this.goToStep(1);
  }

  validateStep(step) {
    switch (step) {
      case 1:
        if (!this.state.recipientName.trim()) {
          alert("Please enter the recipient's name");
          return false;
        }
        return true;
      case 2:
      case 3:
      case 4:
        return true;
      default:
        return true;
    }
  }

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.currentStep && !this.validateStep(this.currentStep)) {
      return;
    }

    this.currentStep = step;
    this.updateUI();
  }

  updateUI() {
    // Update active tab
    document.querySelectorAll(".wizard-tab").forEach((tab) => {
      tab.classList.toggle("active", parseInt(tab.dataset.step) === this.currentStep);
    });

    // Update active step
    document.querySelectorAll(".wizard-step").forEach((step) => {
      const stepNum = parseInt(step.id.split("-")[1]);
      step.classList.toggle("active", stepNum === this.currentStep);
    });

    // Update step indicator
    document.getElementById("stepIndicator").textContent = `Step ${this.currentStep} of ${this.totalSteps}`;

    // Update button visibility
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (this.currentStep === 1) {
      prevBtn.style.display = "none";
    } else {
      prevBtn.style.display = "block";
    }

    if (this.currentStep === this.totalSteps) {
      nextBtn.style.display = "none";
    } else {
      nextBtn.innerHTML = 'Next <i class="bi bi-chevron-right ms-2"></i>';
      nextBtn.style.display = "block";
    }

    if (this.currentStep === 4) {
      this.updateCardPreview();
    }
  }

  updateMessagePreview() {
    const preview = document.getElementById("messagePreview");
    const text = this.state.greetingText.trim() || `Happy birthday, ${this.state.recipientName}!`;
    preview.textContent = text;
    this.updateCardPreview();
  }

  updateCardPreview() {
    const previewImage = document.getElementById("previewImage");
    const previewText = document.getElementById("previewText");

    const text = this.state.greetingText.trim() || `Happy birthday, ${this.state.recipientName}!`;
    const imageUrl = this.state.selectedCardUrl || "";
    previewImage.src = imageUrl;
    previewImage.classList.toggle("d-none", !imageUrl);
    previewText.textContent = text;
  }

  async saveCard() {
    if (!this.state.recipientName.trim()) {
      alert("Please enter the recipient's name");
      return;
    }

    try {
      const cardData = {
        personName: this.state.recipientName,
        imageTemplate: this.state.selectedCardPath || this.state.selectedCardUrl,
        greetingText: this.state.greetingText,
      };

      let savedCard = null;

      if (this.currentCardId) {
        savedCard = await cardDatabase.updateCard(this.currentCardId, cardData);
        alert("Card updated successfully!");
      } else {
        savedCard = await cardDatabase.saveCard(cardData);
        this.currentCardId = savedCard.id;
        alert("Card saved successfully!");
      }

      if (savedCard) {
        this.currentShareCode = savedCard.share_code || this.currentShareCode;
      }

      this.loadCards();
      this.updateShareButtonState();
    } catch (error) {
      alert("Error saving card: " + error.message);
    }
  }

  async generateCard() {
    const cardPreview = document.getElementById("cardPreview");

    // Create canvas and render the card
    html2canvas(cardPreview, {
      backgroundColor: null,
      scale: 2,
    }).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `birthday-card-${this.state.recipientName || "card"}.png`;
      link.click();
    });
  }

  showDeleteButton() {
    document.getElementById("deleteBtn").style.display = "block";
  }

  hideDeleteButton() {
    document.getElementById("deleteBtn").style.display = "none";
  }

  updateShareButtonState() {
    const shareBtn = document.getElementById("shareBtn");
    if (!shareBtn) return;
    shareBtn.disabled = !this.currentShareCode;
  }

  async loadTemplates() {
    const gallery = document.getElementById("cardGallery");
    if (gallery) {
      gallery.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-card-image"></i>
          <p>Loading templates...</p>
          <small>Please wait</small>
        </div>
      `;
    }

    const { data, error } = await supabaseClientForCards
      .from("card_templates")
      .select("id, name, image_path, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      if (gallery) {
        gallery.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-exclamation-circle"></i>
            <p>Unable to load templates</p>
            <small>${error.message}</small>
          </div>
        `;
      }
      this.templates = [];
      this.applyDefaultTemplateSelection();
      this.updateCardPreview();
      return;
    }

    this.templates = (data || []).map((template) => ({
      ...template,
      publicUrl: getTemplatePublicUrl(template.image_path),
    }));

    this.renderTemplateGallery();
  }

  applyDefaultTemplateSelection() {
    if (this.templates.length > 0) {
      const firstTemplate = this.templates[0];
      this.state.selectedCardPath = firstTemplate.image_path || "";
      this.state.selectedCardUrl = firstTemplate.publicUrl || "";
    } else {
      this.state.selectedCardPath = "";
      this.state.selectedCardUrl = "";
    }
  }

  renderTemplateGallery() {
    const gallery = document.getElementById("cardGallery");
    if (!gallery) return;

    if (!this.templates.length) {
      gallery.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-card-image"></i>
          <p>No templates yet</p>
          <small>Ask an admin to upload a template</small>
        </div>
      `;
      this.applyDefaultTemplateSelection();
      this.updateCardPreview();
      return;
    }

    let selectedTemplate = this.templates.find(
      (template) => template.image_path === this.state.selectedCardPath,
    );

    if (!selectedTemplate && this.state.selectedCardUrl) {
      selectedTemplate = this.templates.find(
        (template) => template.publicUrl === this.state.selectedCardUrl,
      );
    }

    if (!selectedTemplate) {
      selectedTemplate = this.templates[0];
      this.state.selectedCardPath = selectedTemplate.image_path || "";
      this.state.selectedCardUrl = selectedTemplate.publicUrl || "";
    }

    gallery.innerHTML = this.templates.map((template) => {
      const isSelected = template.image_path === this.state.selectedCardPath;
      return `
        <div class="gallery-item ${isSelected ? "selected" : ""}" data-card-path="${template.image_path}" data-card-url="${template.publicUrl}">
          <img src="${template.publicUrl}" alt="${template.name || "Card template"}">
          <div class="gallery-check"><i class="bi bi-check-circle-fill"></i></div>
        </div>
      `;
    }).join("");

    this.updateCardPreview();
  }

  buildShareUrl() {
    if (!this.currentShareCode) return "";
    const shareUrl = new URL("view-card.html", window.location.href);
    shareUrl.searchParams.set("code", this.currentShareCode);
    return shareUrl.toString();
  }

  async openShareModal() {
    if (!this.currentCardId) {
      alert("Please save the card before sharing.");
      return;
    }

    if (!this.currentShareCode) {
      alert("Share code is not available yet. Please save again.");
      return;
    }

    const shareUrl = this.buildShareUrl();
    const shareInput = document.getElementById("shareUrlInput");
    const shareCodeBadge = document.getElementById("shareCodeBadge");
    const shareStatus = document.getElementById("shareStatus");
    const nativeShareBtn = document.getElementById("nativeShareBtn");

    if (shareInput) shareInput.value = shareUrl;
    if (shareCodeBadge) shareCodeBadge.textContent = this.currentShareCode;
    if (shareStatus) shareStatus.textContent = "";
    if (nativeShareBtn) nativeShareBtn.style.display = navigator.share ? "block" : "none";

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("shareModal"));
    modal.show();
  }

  async copyShareLink() {
    const shareUrl = this.buildShareUrl();
    const shareStatus = document.getElementById("shareStatus");

    if (!shareUrl) {
      if (shareStatus) shareStatus.textContent = "No share link available yet.";
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      if (shareStatus) shareStatus.textContent = "Link copied to clipboard!";
    } catch (error) {
      const tempInput = document.createElement("textarea");
      tempInput.value = shareUrl;
      tempInput.setAttribute("readonly", "");
      tempInput.style.position = "absolute";
      tempInput.style.left = "-9999px";
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      if (shareStatus) shareStatus.textContent = "Link copied to clipboard!";
    }
  }

  async nativeShareLink() {
    const shareUrl = this.buildShareUrl();
    const shareStatus = document.getElementById("shareStatus");

    if (!shareUrl || !navigator.share) {
      if (shareStatus) shareStatus.textContent = "Sharing is not available on this device.";
      return;
    }

    try {
      await navigator.share({
        title: "Birthday card",
        text: `A birthday card for ${this.state.recipientName || "you"}!`,
        url: shareUrl,
      });
      if (shareStatus) shareStatus.textContent = "Shared successfully!";
    } catch (error) {
      if (shareStatus) shareStatus.textContent = "Share cancelled.";
    }
  }

  showDeleteConfirmation() {
    if (!this.currentCardId) {
      alert("Please save the card first before deleting");
      return;
    }

    document.getElementById("deleteCardName").textContent = `${this.state.recipientName} (${this.state.selectedCard})`;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteConfirmModal"));
    modal.show();
  }

  async confirmDelete() {
    if (!this.currentCardId) return;

    try {
      await cardDatabase.deleteCard(this.currentCardId);
      bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal")).hide();
      alert("Card deleted successfully!");
      this.loadCards();
      this.resetWizard();
    } catch (error) {
      alert("Error deleting card: " + error.message);
    }
  }
}

// Initialize wizard when DOM is ready and Supabase is available
document.addEventListener("DOMContentLoaded", () => {
  // Wait for supabaseClient to be set by auth.js
  const checkAndInit = () => {
    if (typeof window.supabaseClient !== "undefined") {
      new CardWizard(window.supabaseClient);
    } else {
      setTimeout(checkAndInit, 100);
    }
  };
  checkAndInit();
});
