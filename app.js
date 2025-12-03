// app.js
const BACKEND_URL = "http://localhost:5000"; // change to your deployed URL later

// simple userId (in real app you get from login/auth)
function getUserId() {
  // if you already save user in localStorage, reuse that
  const u = JSON.parse(localStorage.getItem("silentaid_user") || "null");
  if (u && u.id) return u.id;

  // fallback fake id
  return "user_demo_001";
}


// ---------- Storage Helpers ----------
const STORAGE_KEYS = {
  USER: "sa_user",
  CONTACTS: "sa_contacts",
  LAST_ALERT: "sa_lastAlert",
  LAST_LOCATION: "sa_lastLocation",
};

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadJSON(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function loadUser() {
  return loadJSON(STORAGE_KEYS.USER, null);
}

function saveUser(user) {
  saveJSON(STORAGE_KEYS.USER, user);
}

function loadContacts() {
  return loadJSON(STORAGE_KEYS.CONTACTS, []);
}

function saveContacts(contacts) {
  saveJSON(STORAGE_KEYS.CONTACTS, contacts);
}

function saveLastAlert(alert) {
  saveJSON(STORAGE_KEYS.LAST_ALERT, alert);
}

function loadLastAlert() {
  return loadJSON(STORAGE_KEYS.LAST_ALERT, null);
}

function saveLastLocation(loc) {
  saveJSON(STORAGE_KEYS.LAST_LOCATION, loc);
}

function loadLastLocation() {
  return loadJSON(STORAGE_KEYS.LAST_LOCATION, null);
}

function formatTimeHM(date) {
  const d = new Date(date);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ---------- Location Tracking ----------
function startLocationTracking(elementId, intervalMs = 30000) {
  const el = document.getElementById(elementId);
  if (!el) return;

  async function update() {
    if (!navigator.geolocation) {
      const last = loadLastLocation();
      if (last) {
        el.textContent = `Lat: ${last.lat.toFixed(4)}, Lng: ${last.lng.toFixed(4)} (saved)`;
      } else {
        el.textContent = "Location not available";
      }
      return;
    }

    el.textContent = "Getting location...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = {
          lat: latitude,
          lng: longitude,
          accuracy,
          updatedAt: new Date().toISOString(),
        };
        saveLastLocation(loc);
        el.textContent = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(
          4
        )} (±${Math.round(accuracy)} m)`;
      },
      () => {
        const last = loadLastLocation();
        if (last) {
          el.textContent = `Lat: ${last.lat.toFixed(4)}, Lng: ${last.lng.toFixed(4)} (cached)`;
        } else {
          el.textContent = "Location permission denied";
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  update();
  setInterval(update, intervalMs);
}

// ---------- Page 1 ----------
function initPage1() {
  const btn = document.getElementById("btnGetStarted");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.location.href = "page2.html";
  });
}

// ---------- Page 2 (Login) ----------
function initPage2() {
  const form = document.getElementById("loginForm");
  const nameInput = document.getElementById("userName");
  const phoneInput = document.getElementById("userPhone");
  const bloodInput = document.getElementById("userBlood");
  const statusEl = document.getElementById("loginStatus");

  // Prefill if user exists
  const existing = loadUser();
  if (existing) {
    nameInput.value = existing.name || "";
    phoneInput.value = existing.phone || "";
    bloodInput.value = existing.bloodGroup || "";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const blood = bloodInput.value.trim();

    if (!name || !phone) {
      statusEl.textContent = "Name and phone are required.";
      statusEl.style.color = "red";
      return;
    }

    saveUser({ name, phone, bloodGroup: blood });
    statusEl.textContent = "Saved! Redirecting...";
    statusEl.style.color = "green";

    setTimeout(() => {
      window.location.href = "page3.html";
    }, 800);
  });
}

// ---------- Page 3 (Contacts) ----------
function renderContactsList() {
  const listEl = document.getElementById("contactsList");
  const emptyEl = document.getElementById("contactsEmpty");
  const contacts = loadContacts();

  if (!listEl || !emptyEl) return;

  listEl.innerHTML = "";
  if (contacts.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  contacts.forEach((c, index) => {
    const div = document.createElement("div");
    div.className = "contact-item";
    div.innerHTML = `
      <div>
        <div><strong>${c.name}</strong> ${c.isPrimary ? "<span class='badge'>PRIMARY</span>" : ""}</div>
        <div class="contact-phone">${c.phone}</div>
      </div>
      <button class="btn-small btn-danger" data-index="${index}">Delete</button>
    `;
    listEl.appendChild(div);
  });

  listEl.querySelectorAll(".btn-danger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-index"));
      const all = loadContacts();
      all.splice(idx, 1);
      saveContacts(all);
      renderContactsList();
    });
  });
}

function initPage3() {
  // Grab DOM elements from page3.html
  const form = document.getElementById("contactForm");
  const nameInput = document.getElementById("contactName");
  const phoneInput = document.getElementById("contactPhone");
  const primaryInput = document.getElementById("contactPrimary");
  const contactsListEl = document.getElementById("contactsList");
  const contactsEmptyEl = document.getElementById("contactsEmpty");
  const statusEl = document.getElementById("contactsStatus");
  const btnToSOS = document.getElementById("btnToSOS");

  // Load existing contacts from localStorage
  let contacts = [];
  try {
    contacts = JSON.parse(localStorage.getItem("silentaid_contacts") || "[]");
  } catch (_) {
    contacts = [];
  }

  renderContacts();

  // ----- form submit: save contact locally + send to backend -----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const isPrimary = primaryInput.checked;

    if (!name || !phone) {
      statusEl.textContent = "Please enter both name and phone.";
      statusEl.style.color = "#f97316";
      return;
    }

    // build contact object for local UI
    const contact = {
      id: Date.now().toString(),
      name,
      phone,
      isPrimary,
    };

    // 1) Save locally
    contacts.push(contact);
    localStorage.setItem("silentaid_contacts", JSON.stringify(contacts));
    renderContacts();

    // reset form
    form.reset();
    statusEl.textContent = "Contact saved locally ✔";
    statusEl.style.color = "#22c55e";

    // 2) Send to backend (Firebase via Node server)
    try {
      const userId = getUserId();
      await fetch(`${BACKEND_URL}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: contact.name,
          phone: contact.phone,
          isEmergency: true,
          photo: null,
        }),
      });
      statusEl.textContent = "Contact synced with server ✔";
      statusEl.style.color = "#22c55e";
    } catch (err) {
      console.error("Error sending contact to backend:", err);
      statusEl.textContent =
        "Saved on device, but failed to sync to server (check backend).";
      statusEl.style.color = "#f97316";
    }
  });

  // ----- delete contact (local only for now) -----
  function deleteContact(id) {
    contacts = contacts.filter((c) => c.id !== id);
    localStorage.setItem("silentaid_contacts", JSON.stringify(contacts));
    renderContacts();
  }

  // ----- render contacts on screen -----
  function renderContacts() {
    contactsListEl.innerHTML = "";

    if (!contacts.length) {
      contactsEmptyEl.style.display = "block";
      return;
    }

    contactsEmptyEl.style.display = "none";

    contacts.forEach((c) => {
      const row = document.createElement("div");
      row.className = "contact-item";
      row.innerHTML = `
        <div>
          <div>${c.name}${c.isPrimary ? ' <span class="badge">PRIMARY</span>' : ""}</div>
          <div class="contact-phone">${c.phone}</div>
        </div>
        <button class="btn-small btn-danger" data-id="${c.id}">Remove</button>
      `;
      contactsListEl.appendChild(row);
    });

    // attach delete handlers
    contactsListEl.querySelectorAll(".btn-danger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        deleteContact(id);
      });
    });
  }

  // ----- Continue button → go to SOS page (page4.html) -----
  if (btnToSOS) {
    btnToSOS.addEventListener("click", () => {
      window.location.href = "page4.html"; // change if your SOS file name is different
    });
  }
}

// ---------- Page 4 (SOS) ----------
function initPage4() {
  const user = loadUser();
  const userNameEl = document.getElementById("sosUserName");
  const userPhoneEl = document.getElementById("sosUserPhone");
  const userBloodEl = document.getElementById("sosUserBlood");
  const statusEl = document.getElementById("sosStatus");
  const sosBtn = document.getElementById("sosButton");
  const progressEl = document.getElementById("sosProgress");
  const contactsListEl = document.getElementById("sosContactsList");

  if (user) {
    userNameEl.textContent = user.name;
    userPhoneEl.textContent = user.phone;
    userBloodEl.textContent = user.bloodGroup || "-";
  } else {
    userNameEl.textContent = "Guest";
    userPhoneEl.textContent = "-";
    userBloodEl.textContent = "-";
  }async function triggerSOS() {
  const loc = loadLastLocation();
  const user = loadUser();
  const userId = user?.id || "demoUser"; // you decide how to store userId

  const payload = {
    userId,
    userName: user?.name || "",
    phone: user?.phone || "",
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    accuracy: loc?.accuracy ?? null,
    emergencyType: "MEDICAL", // or from selected type
    extraMessage: "SilentAid SOS triggered from web app",
  };

  try {
    await fetch("http://localhost:5000/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Error sending SOS to backend:", err);
  }

  // ... rest of your redirect to page5 logic
}


  // Show contacts list
  const contacts = loadContacts();
  if (contacts.length === 0) {
    contactsListEl.innerHTML = "<li>No emergency contacts saved.</li>";
  } else {
    contactsListEl.innerHTML = "";
    contacts.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = `${c.name} (${c.phone})${c.isPrimary ? " • PRIMARY" : ""}`;
      contactsListEl.appendChild(li);
    });
  }

  // Location tracking
  startLocationTracking("sosLocationText");

  // Hold logic
  const HOLD_MS = 3000;
  let holdStart = 0;
  let holdInterval = null;

  function resetHold() {
    holdStart = 0;
    progressEl.style.width = "0%";
    sosBtn.classList.remove("holding");
    statusEl.textContent = "Ready. Hold button for 3 seconds to send SOS.";
  }

  function startHold() {
    if (holdInterval) return;
    holdStart = Date.now();
    sosBtn.classList.add("holding");
    statusEl.textContent = "Hold...";

    holdInterval = setInterval(() => {
      const elapsed = Date.now() - holdStart;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      progressEl.style.width = `${pct}%`;
      if (elapsed >= HOLD_MS) {
        completeHold();
      }
    }, 50);
  }

  function cancelHold() {
    if (!holdInterval) return;
    clearInterval(holdInterval);
    holdInterval = null;
    statusEl.textContent = "Hold cancelled.";
    setTimeout(resetHold, 1000);
  }

  function completeHold() {
    clearInterval(holdInterval);
    holdInterval = null;
    progressEl.style.width = "100%";
    statusEl.textContent = "Sending SOS...";
    sosBtn.classList.add("sending");
    triggerSOS();
  }

  function triggerSOS() {
    const loc = loadLastLocation();
    const contacts = loadContacts();
    const user = loadUser();

    const alertObj = {
      id: `ALERT-${Date.now()}`,
      time: new Date().toISOString(),
      user: user || null,
      location: loc || null,
      contacts: contacts,
    };

    saveLastAlert(alertObj);

    // Show who "received" the alert
    const summaryEl = document.getElementById("sosSummary");
    if (contacts.length > 0) {
      summaryEl.textContent = `SOS sent to ${contacts.length} contact(s).`;
    } else {
      summaryEl.textContent = "SOS created (no contacts to notify).";
    }

    // Redirect to page5 after short delay
    setTimeout(() => {
      window.location.href = "page5.html";
    }, 1500);
  }

  // Attach events
  sosBtn.addEventListener("mousedown", startHold);
  sosBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startHold();
  });

  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) => {
    sosBtn.addEventListener(ev, cancelHold);
  });
}

// ---------- Page 5 (Call screen) ----------
function initPage5() {
  const alertInfoEl = document.getElementById("alertInfo");
  const timerEl = document.getElementById("callTimer");
  const locEl = document.getElementById("callLocation");
  const lastAlert = loadLastAlert();

  if (!lastAlert) {
    alertInfoEl.textContent = "No SOS alert found. Trigger an SOS first.";
  } else {
    const t = new Date(lastAlert.time);
    const timeStr = t.toLocaleString();
    const name = lastAlert.user?.name || "Unknown user";
    alertInfoEl.textContent = `Active SOS from ${name} at ${timeStr}`;

    const loc = lastAlert.location;
    if (loc) {
      locEl.textContent = `Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(
        4
      )} (±${Math.round(loc.accuracy)} m)`;
    } else {
      locEl.textContent = "Location not available.";
    }
  }

  // Start timer
  let seconds = 0;
  timerEl.textContent = formatDuration(seconds);
  setInterval(() => {
    seconds += 1;
    timerEl.textContent = formatDuration(seconds);
  }, 1000);

  // Emergency call buttons
  function bindCall(id, number) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      // On mobile this will open dialer
      window.location.href = `tel:${number}`;
    });
  }

  bindCall("btnCall100", "100"); // Police
  bindCall("btnCall108", "108"); // Ambulance
  bindCall("btnCall112", "112"); // Single emergency
}

// ---------- Router ----------
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "page1") initPage1();
  if (page === "page2") initPage2();
  if (page === "page3") initPage3();
  if (page === "page4") initPage4();
  if (page === "page5") initPage5();
});

