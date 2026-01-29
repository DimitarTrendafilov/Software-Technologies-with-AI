const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG;

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Expose supabaseClient globally for other scripts
window.supabaseClient = supabaseClient;

// Auth elements and functions
const authMessage = document.getElementById("authMessage");
const authModalEl = document.getElementById("authModal");
let authModal = null;

// Only create modal if element exists
if (authModalEl && typeof bootstrap !== 'undefined') {
  authModal = new bootstrap.Modal(authModalEl);
}

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const authActionBtn = document.getElementById("authActionBtn");
const adminBtn = document.getElementById("adminBtn");
const resendConfirmBtn = document.getElementById("resendConfirmBtn");
let pendingConfirmEmail = "";

const normalizeEmail = (value) => value.trim().toLowerCase();

const setMessage = (message, isError = false) => {
  if (authMessage) {
    authMessage.textContent = message;
    authMessage.style.color = isError ? "#ff9ccf" : "#ffe06b";
  }
};

const clearMessage = () => {
  if (authMessage) {
    authMessage.textContent = "";
  }
};

const showResendConfirm = (email) => {
  pendingConfirmEmail = email || "";
  if (resendConfirmBtn) {
    resendConfirmBtn.classList.toggle("d-none", !pendingConfirmEmail);
  }
};

const hideResendConfirm = () => {
  pendingConfirmEmail = "";
  if (resendConfirmBtn) {
    resendConfirmBtn.classList.add("d-none");
  }
};

const isInvalidLoginError = (error) => {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("invalid login credentials");
};

const updateAuthState = (session) => {
  console.log("Updating auth state. Logged in:", !!session?.user);
  const isLoggedIn = Boolean(session?.user);
  const homeScreen = document.getElementById("homeScreen");
  const generateScreen = document.getElementById("generateScreen");
  
  if (homeScreen) {
    if (isLoggedIn) {
      homeScreen.classList.remove("active");
    } else {
      homeScreen.classList.add("active");
    }
  }
  
  if (generateScreen) {
    if (isLoggedIn) {
      generateScreen.classList.add("active");
    } else {
      generateScreen.classList.remove("active");
    }
  }

  if (logoutBtn) logoutBtn.classList.toggle("d-none", !isLoggedIn);
  if (authActionBtn) authActionBtn.classList.toggle("d-none", isLoggedIn);
};

const updateAdminButton = async (session) => {
  if (!adminBtn) return;

  if (!session?.user) {
    adminBtn.classList.add("d-none");
    return;
  }

  const { data, error } = await supabaseClient.rpc("is_admin");

  if (error) {
    console.error("Admin check error:", error);
    adminBtn.classList.add("d-none");
    return;
  }

  adminBtn.classList.toggle("d-none", !data);
};

// Register form handler
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const email = normalizeEmail(document.getElementById("registerEmail").value);
    const password = document.getElementById("registerPassword").value;

    if (!email || !password) {
      setMessage("Please fill in all fields", true);
      return;
    }

    setMessage("Creating account...", false);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Registration error:", error);
      setMessage(error.message, true);
      hideResendConfirm();
      return;
    }

    if (data?.session?.user) {
      setMessage("Account created and signed in.");
      hideResendConfirm();
    } else {
      setMessage("Account created. Please confirm your email, then login.");
      showResendConfirm(email);
    }

    registerForm.reset();
  });
}

// Login form handler
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const email = normalizeEmail(document.getElementById("loginEmail").value);
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      setMessage("Please fill in all fields", true);
      return;
    }

    setMessage("Logging in...", false);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      if (isInvalidLoginError(error)) {
        setMessage("Login failed. Check your email/password or confirm your email.", true);
        showResendConfirm(email);
      } else {
        setMessage(error.message, true);
        hideResendConfirm();
      }
      return;
    }

    console.log("Login successful!");
    setMessage("Welcome back!", false);
    hideResendConfirm();
    loginForm.reset();
    
    setTimeout(() => {
      if (authModal) {
        authModal.hide();
      }
    }, 800);
  });
}

// Logout button handler
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
  });
}

if (resendConfirmBtn) {
  resendConfirmBtn.addEventListener("click", async () => {
    if (!pendingConfirmEmail) {
      setMessage("Please enter your email first.", true);
      return;
    }

    setMessage("Sending confirmation email...", false);

    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email: pendingConfirmEmail,
    });

    if (error) {
      setMessage(error.message, true);
      return;
    }

    setMessage("Confirmation email sent. Check your inbox.");
  });
}

// Check initial session
supabaseClient.auth.getSession().then(({ data }) => {
  console.log("Initial session:", !!data.session);
  updateAuthState(data.session);
  updateAdminButton(data.session);
});

// Listen for auth changes
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("Auth changed:", event);
  updateAuthState(session);
  updateAdminButton(session);
});
