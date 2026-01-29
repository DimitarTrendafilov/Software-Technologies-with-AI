const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG;

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
const cardDatabase = new CardDatabase(supabaseClient);

const TEMPLATE_BUCKET = "card-templates";

const getTemplatePublicUrl = (path) => {
  if (!path) return "";
  const { data } = supabaseClient.storage.from(TEMPLATE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
};

const resolveTemplateUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return getTemplatePublicUrl(value);
};

const viewTitle = document.getElementById("viewTitle");
const viewSubtitle = document.getElementById("viewSubtitle");
const viewCode = document.getElementById("viewCode");
const viewImage = document.getElementById("viewImage");
const viewMessage = document.getElementById("viewMessage");
const viewMessageBlock = document.getElementById("viewMessageBlock");
const viewError = document.getElementById("viewError");

const setError = (message) => {
  viewError.textContent = message;
  viewError.classList.remove("d-none");
  viewMessageBlock.classList.add("d-none");
};

const setLoading = (isLoading) => {
  if (viewTitle) viewTitle.textContent = isLoading ? "Loading card..." : "Shared card";
  if (viewSubtitle) viewSubtitle.textContent = isLoading ? "Please wait while we fetch the card." : "Here's a birthday card shared with you.";
};

const getShareCodeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  return code ? code.trim().toUpperCase() : "";
};

const renderCard = (card) => {
  viewCode.textContent = card.share_code || "—";
  viewTitle.textContent = `Happy Birthday, ${card.person_name || "Friend"}!`;
  viewSubtitle.textContent = "Here's a birthday card shared with you.";

  const message = card.greeting_text?.trim() || `Happy birthday, ${card.person_name || "friend"}!`;
  viewMessage.textContent = message;
  viewMessageBlock.textContent = message;
  viewMessageBlock.classList.remove("d-none");

  const templateUrl = resolveTemplateUrl(card.image_template);
  viewImage.src = templateUrl;
  viewImage.classList.toggle("d-none", !templateUrl);
};

const loadSharedCard = async () => {
  const shareCode = getShareCodeFromUrl();

  if (!shareCode || shareCode.length !== 5) {
    setError("Invalid share code. Please check the link and try again.");
    return;
  }

  setLoading(true);

  try {
    const card = await cardDatabase.getCardByShareCode(shareCode);

    if (!card) {
      setError("We couldn't find a card for this share code.");
      return;
    }

    renderCard(card);
  } catch (error) {
    setError("Something went wrong while loading the card.");
  } finally {
    setLoading(false);
  }
};

document.addEventListener("DOMContentLoaded", loadSharedCard);
