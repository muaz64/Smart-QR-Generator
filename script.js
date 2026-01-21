// DOM REFERENCES (Cached once on init)

const refs = {};
const initRefs = () => {
  // Containers
  refs.qrcode = document.getElementById("qrcode");
  refs.qrMobile = document.getElementById("qrMobile");
  refs.toast = document.getElementById("toast");
  refs.inputs = document.getElementById("inputs");

  // Input fields
  refs.inputUrl = document.getElementById("inputUrl");
  refs.inputText = document.getElementById("inputText");
  refs.inputEmail = document.getElementById("inputEmail");
  refs.inputEmailSubject = document.getElementById("inputEmailSubject");
  refs.inputEmailBody = document.getElementById("inputEmailBody");
  refs.inputPhone = document.getElementById("inputPhone");
  refs.inputSmsPhone = document.getElementById("inputSmsPhone");
  refs.inputSmsMsg = document.getElementById("inputSmsMsg");
  refs.inputSsid = document.getElementById("inputSsid");
  refs.inputWifiPass = document.getElementById("inputWifiPass");
  refs.inputWifiType = document.getElementById("inputWifiType");

  // Colors
  refs.colorFg = document.getElementById("colorFg");
  refs.colorBg = document.getElementById("colorBg");

  // Logo
  refs.logoFile = document.getElementById("logoFile");
  refs.logoLabel = document.getElementById("logoLabel");
  refs.logoSize = document.getElementById("logoSize");
  refs.logoSizeVal = document.getElementById("logoSizeVal");
  refs.logoSizeBox = document.getElementById("logoSizeBox");
  refs.removeLogoBtn = document.getElementById("removeLogoBtn");

  // Buttons
  refs.types = document.querySelectorAll("#types button");
  refs.sizes = document.querySelectorAll("#sizes button");
  refs.presets = document.querySelectorAll("#presets button");
  refs.togglePass = document.getElementById("togglePass");
  refs.eyeIcon = document.getElementById("eyeIcon");

  // Warnings
  refs.warningDesktop = document.getElementById("warningDesktop");
  refs.warningDesktopText = document.getElementById("warningDesktopText");
  refs.warningMobile = document.getElementById("warningMobile");
  refs.warningMobileText = document.getElementById("warningMobileText");
  refs.statusBadge = document.getElementById("statusBadge");

  // Action buttons
  refs.downloadDesktop = document.getElementById("downloadDesktop");
  refs.downloadMobile = document.getElementById("downloadMobile");
  refs.copyDesktop = document.getElementById("copyDesktop");
  refs.copyMobile = document.getElementById("copyMobile");

  // Input panels
  refs.inputPanels = document.querySelectorAll("#inputs > div");

  // All form inputs for event binding
  refs.allInputs = document.querySelectorAll(
    'input:not([type="file"]):not([type="color"]), textarea, select',
  );
};

// REACTIVE STATE

const createReactiveState = (initial, onChange) => {
  return new Proxy(initial, {
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;
      if (oldValue !== value) onChange(prop, value, oldValue);
      return true;
    },
  });
};

const state = createReactiveState(
  {
    type: "url",
    size: 200,
    colorFg: "#000000",
    colorBg: "#FFFFFF",
    logoImage: null,
    logoSize: 25,
    // Content fields
    url: "https://example.com",
    text: "",
    email: "",
    emailSubject: "",
    emailBody: "",
    phone: "",
    smsPhone: "",
    smsMsg: "",
    ssid: "",
    wifiPass: "",
    wifiType: "WPA",
  },
  onStateChange,
);


// STATE CHANGE HANDLER (Single Watcher)

let generateTimeout = null;

function onStateChange(prop, newValue, oldValue) {
  // Debounced QR generation for any state change
  clearTimeout(generateTimeout);
  generateTimeout = setTimeout(render, 150);

  // Handle specific UI updates
  if (prop === "type") updateInputVisibility();
  if (prop === "logoSize") updateLogoSizeUI();
  if (prop === "logoImage") updateLogoUI();
}

// CONTENT GENERATOR (Pure function)

const getContent = () => {
  const s = state;
  switch (s.type) {
    case "url":
      return s.url || "https://example.com";
    case "text":
      return s.text || "Hello World";
    case "email":
      const params = [];
      if (s.emailSubject)
        params.push(`subject=${encodeURIComponent(s.emailSubject)}`);
      if (s.emailBody) params.push(`body=${encodeURIComponent(s.emailBody)}`);
      return `mailto:${s.email}${params.length ? "?" + params.join("&") : ""}`;
    case "phone":
      return `tel:${s.phone}`;
    case "sms":
      return `sms:${s.smsPhone}${s.smsMsg ? "?body=" + encodeURIComponent(s.smsMsg) : ""}`;
    case "wifi":
      return `WIFI:T:${s.wifiType};S:${s.ssid};P:${s.wifiPass};;`;
    default:
      return "";
  }
};

// RENDER FUNCTION
const render = () => {
  const content = getContent();
  if (!content) return;

  // Check safe zone and update warnings
  checkSafeZone();

  // Render to both containers
  [refs.qrcode, refs.qrMobile].forEach((el, idx) => {
    if (!el) return;
    el.innerHTML = "";

    const size = idx === 1 ? Math.min(state.size, 180) : state.size;

    new QRCode(el, {
      text: content,
      width: size,
      height: size,
      colorDark: state.colorFg,
      colorLight: state.colorBg,
      correctLevel: QRCode.CorrectLevel.H,
    });

    if (state.logoImage) {
      setTimeout(() => addLogoToCanvas(el, size), 50);
    }
  });
};

// SAFE ZONE CHECK
const checkSafeZone = () => {
  const hasLogo = !!state.logoImage;
  const isUnsafe = hasLogo && state.logoSize > 25;

  // Update warning visibility
  refs.warningDesktop.classList.toggle("hidden", !isUnsafe);
  refs.warningMobile.classList.toggle("hidden", !isUnsafe);

  if (isUnsafe) {
    const msg = `Logo size ${state.logoSize}% exceeds safe zone (25%). QR may not scan reliably.`;
    refs.warningDesktopText.textContent = msg;
    refs.warningMobileText.textContent = msg;

    // Update status badge
    refs.statusBadge.className =
      "text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full";
    refs.statusBadge.innerHTML =
      '<i class="fa-solid fa-exclamation mr-1"></i>Warning';
  } else {
    refs.statusBadge.className =
      "text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full";
    refs.statusBadge.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Ready';
  }

  // Update slider visual
  refs.logoSizeVal.classList.toggle("text-amber-400", isUnsafe);
  refs.logoSizeVal.classList.toggle("text-purple-400", !isUnsafe);
};

// LOGO HANDLING
const addLogoToCanvas = (container, size) => {
  const canvas = container.querySelector("canvas");
  if (!canvas || !state.logoImage) return;

  const ctx = canvas.getContext("2d");
  const logoPercent = state.logoSize / 100;
  const logoSize = size * logoPercent;
  const pos = (size - logoSize) / 2;
  const pad = size * 0.02;

  // White background padding
  ctx.fillStyle = state.colorBg;
  ctx.beginPath();
  ctx.roundRect(
    pos - pad,
    pos - pad,
    logoSize + pad * 2,
    logoSize + pad * 2,
    8,
  );
  ctx.fill();

  // Draw logo with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pos, pos, logoSize, logoSize, 6);
  ctx.clip();
  ctx.drawImage(state.logoImage, pos, pos, logoSize, logoSize);
  ctx.restore();
};

const updateLogoUI = () => {
  const hasLogo = !!state.logoImage;
  refs.logoSizeBox.classList.toggle("hidden", !hasLogo);
  refs.removeLogoBtn.classList.toggle("hidden", !hasLogo);
  refs.logoLabel.textContent = hasLogo ? "Logo Added" : "Upload Logo";
};

const updateLogoSizeUI = () => {
  refs.logoSizeVal.textContent = state.logoSize + "%";
};

const removeLogo = () => {
  state.logoImage = null;
  refs.logoFile.value = "";
};

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
const updateInputVisibility = () => {
  refs.inputPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.input !== state.type);
  });
};

const togglePassword = () => {
  const isPassword = refs.inputWifiPass.type === "password";
  refs.inputWifiPass.type = isPassword ? "text" : "password";
  refs.eyeIcon.className = isPassword
    ? "fa-regular fa-eye-slash"
    : "fa-regular fa-eye";
};

// ============================================
// ACTIONS
// ============================================
const download = () => {
  const canvas =
    refs.qrcode.querySelector("canvas") ||
    refs.qrMobile.querySelector("canvas");
  if (!canvas) return;

  const a = document.createElement("a");
  a.download = `qr-${Date.now()}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
  showToast("Downloaded successfully!", "success");
};

const copyToClipboard = async () => {
  const canvas =
    refs.qrcode.querySelector("canvas") ||
    refs.qrMobile.querySelector("canvas");
  if (!canvas) return;

  try {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showToast("Copied to clipboard!", "success");
  } catch {
    showToast("Copy failed", "error");
  }
};

// ============================================
// TOAST NOTIFICATION
// ============================================
const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast flex items-center gap-2 px-4 py-3 rounded-xl ${
    type === "success" ? "bg-green-500" : "bg-red-500"
  } text-white text-sm font-medium mb-2`;

  const icon = document.createElement("i");
  icon.className = `fa-solid fa-${type === "success" ? "check" : "xmark"}`;

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  refs.toast.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
};

// EVENT BINDING
const bindEvents = () => {
  // Type selection
  refs.types.forEach((btn) => {
    btn.addEventListener("click", () => {
      refs.types.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.type = btn.dataset.type;
    });
  });

  // Size selection
  refs.sizes.forEach((btn) => {
    btn.addEventListener("click", () => {
      refs.sizes.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.size = parseInt(btn.dataset.size);
    });
  });

  // Color presets
  refs.presets.forEach((btn) => {
    btn.addEventListener("click", () => {
      refs.colorFg.value = btn.dataset.fg;
      refs.colorBg.value = btn.dataset.bg;
      state.colorFg = btn.dataset.fg;
      state.colorBg = btn.dataset.bg;
    });
  });

  // Color pickers
  refs.colorFg.addEventListener(
    "input",
    (e) => (state.colorFg = e.target.value),
  );
  refs.colorBg.addEventListener(
    "input",
    (e) => (state.colorBg = e.target.value),
  );

  // Input field mappings
  const inputMap = {
    inputUrl: "url",
    inputText: "text",
    inputEmail: "email",
    inputEmailSubject: "emailSubject",
    inputEmailBody: "emailBody",
    inputPhone: "phone",
    inputSmsPhone: "smsPhone",
    inputSmsMsg: "smsMsg",
    inputSsid: "ssid",
    inputWifiPass: "wifiPass",
    inputWifiType: "wifiType",
  };

  Object.entries(inputMap).forEach(([refKey, stateKey]) => {
    if (refs[refKey]) {
      refs[refKey].addEventListener("input", (e) => {
        state[stateKey] = e.target.value;
      });
    }
  });

  // Logo file upload
  refs.logoFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("File too large (max 2MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        state.logoImage = img;
        showToast("Logo added!", "success");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Logo size slider
  refs.logoSize.addEventListener("input", (e) => {
    state.logoSize = parseInt(e.target.value);
  });

  // Remove logo
  refs.removeLogoBtn.addEventListener("click", removeLogo);

  // Password toggle
  refs.togglePass.addEventListener("click", togglePassword);

  // Download & Copy buttons
  refs.downloadDesktop.addEventListener("click", download);
  refs.downloadMobile.addEventListener("click", download);
  refs.copyDesktop.addEventListener("click", copyToClipboard);
  refs.copyMobile.addEventListener("click", copyToClipboard);
};

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initRefs();
  bindEvents();
  render();
});
