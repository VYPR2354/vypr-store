
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* VYPR CONFIGURATION */

const SUPABASE_URL = "https://cdkklkyiwvhpjzmqxlxp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0vYJm7VfpmfC-auHC9QRDA_yWjI5rkf";

const SITE_URL = "https://vypr2354.github.io/vypr-store/";

let supabase = null;
let currentSession = null;
let mode = "login";
let busy = false;

/* INITIALIZE SUPABASE */

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_SUPABASE") &&
  !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

if (configured) {
  supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}

/* ELEMENTS */

const authScreen = document.getElementById("auth");
const website = document.getElementById("website");
const message = document.getElementById("auth-message");
const submit = document.getElementById("auth-submit");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username");
const usernameField = document.getElementById("username-field");

/* NOTIFICATIONS */

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = "message " + type;
}

function clearMessage() {
  message.textContent = "";
  message.className = "hidden";
}

/* LOGIN / REGISTER MODE */

function setMode(nextMode) {
  mode = nextMode;
  clearMessage();

  document.getElementById("login-tab")
    .classList.toggle("active", mode === "login");

  document.getElementById("register-tab")
    .classList.toggle("active", mode === "register");

  usernameField.classList.toggle(
    "hidden",
    mode !== "register"
  );

  usernameInput.required = mode === "register";

  passwordInput.autocomplete =
    mode === "login"
      ? "current-password"
      : "new-password";

  document.getElementById("auth-title").textContent =
    mode === "login"
      ? "IDENTITY VERIFICATION"
      : "CREATE ACCOUNT";

  submit.textContent =
    mode === "login"
      ? "AUTHENTICATE ↗"
      : "CREATE ACCOUNT ↗";
}

/* EMAIL AUTHENTICATION */

document.getElementById("auth-form")
  .addEventListener("submit", async event => {

    event.preventDefault();

    if (!supabase) {
      showMessage(
        "Supabase is not configured. Add your project URL and publishable key."
      );
      return;
    }

    if (busy) return;

    busy = true;
    submit.disabled = true;
    clearMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {

      if (mode === "register") {

        const username = usernameInput.value.trim();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: SITE_URL,
            data: { username }
          }
        });

        if (error) throw error;

        if (data.session) {
          showMessage(
            "Account created successfully.",
            "success"
          );
        } else {
          showMessage(
            "Registration successful! Check your email to confirm your account.",
            "success"
          );
        }

      } else {

        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

      }

    } catch (error) {

      showMessage(error.message);

    } finally {

      busy = false;
      submit.disabled = false;

    }

  });

/* DISCORD LOGIN */

document.getElementById("discord-login")
  .addEventListener("click", async () => {

    if (!supabase) {
      showMessage("Supabase is not configured.");
      return;
    }

    clearMessage();

    try {

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo: SITE_URL,
            scopes: "identify email"
          }
        });

      if (error) throw error;

    } catch (error) {

      showMessage(error.message);

    }

  });

/* UPDATE WEBSITE DISPLAY */

function render() {

  const authenticated = !!currentSession;

  authScreen.classList.toggle(
    "hidden",
    authenticated
  );

  website.classList.toggle(
    "hidden",
    !authenticated
  );

  if (authenticated) {

    const user = currentSession.user;

    const metadata = user.user_metadata || {};

const discordIdentity = user.identities?.find(
  identity => identity.provider === "discord"
);

const discordData = discordIdentity?.identity_data || {};

const username =
  discordData.global_name ||
  metadata.full_name ||
  metadata.name ||
  metadata.user_name ||
  metadata.preferred_username ||
  "VYPR Member";

document.getElementById("account-email").textContent = username;

document.getElementById("account-id").textContent =
  "MEMBER ID: " + user.id.slice(0, 8).toUpperCase();

  }

}

/* START AUTHENTICATION */

async function initialize() {

  if (!supabase) {
    showMessage(
      "Setup required: configure your Supabase URL and publishable key in script.js."
    );
    return;
  }

  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    showMessage(error.message);
  }

  currentSession = data.session;
  render();

  supabase.auth.onAuthStateChange(
    (_event, session) => {
      currentSession = session;
      render();
    }
  );

}

/* PAGE NAVIGATION */

function navigate(page) {

  if (!currentSession) return;

  const pages = ["home", "store", "account"];

  if (!pages.includes(page)) return;

  pages.forEach(name => {
    document.getElementById(name + "-page")
      .classList.toggle(
        "hidden",
        name !== page
      );
  });

  document.querySelectorAll(".nav-links button")
    .forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.page === page
      );
    });

  document.getElementById("navigation")
    .classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

/* MOBILE MENU */

function toggleMenu() {
  document.getElementById("navigation")
    .classList.toggle("open");
}

/* LOGOUT */

async function logout() {

  if (!supabase) return;

  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
  }

}

/* BUTTON EVENTS */

document.getElementById("login-tab")
  .addEventListener("click", () => setMode("login"));

document.getElementById("register-tab")
  .addEventListener("click", () => setMode("register"));

document.querySelectorAll("[data-page]")
  .forEach(button => {
    button.addEventListener("click", () => {
      navigate(button.dataset.page);
    });
  });

document.getElementById("home-logo")
  .addEventListener("click", () => navigate("home"));

document.getElementById("mobile-toggle")
  .addEventListener("click", toggleMenu);

document.getElementById("logout")
  .addEventListener("click", logout);

document.getElementById("account-logout")
  .addEventListener("click", logout);

/* START */

initialize();
