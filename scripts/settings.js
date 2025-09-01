const settings = {
  // Core
  overrideFiles: {
    value: false,
    type: "checkbox",
    label: "Override Files",
    desc: "Overwrite existing ledgers when importing."
  },
  autoSave: {
    value: true,
    type: "checkbox",
    label: "Auto Save",
    desc: "Automatically save changes to local storage."
  },
  allowLinkedDelete: {
    value: false,
    type: "checkbox",
    label: "Allow Linked Delete",
    desc: "Permit deletion of ledgers with linked transactions,it will also remove linked transactions from other ledge."
  },
  
  // Import/Export
  defaultFileName: {
    value: "ledger",
    type: "text",
    label: "Default File Name",
    desc: "File name used during export."
  },
  exportFormat: {
    value: "xlsx",
    type: "select",
    options: ["xlsx", "pdf", "json"],
    label: "Export Format",
    desc: "Default export format."
  },
  // Display & Charts
  defaultFilter: {
    value: "currentMonth",
    type: "select",
    options: [
      "custom",
      "today",
      "yesterday",
      "thisWeek",
      "prevWeek",
      "thisMonth",
      "prevMonth",
      "thisQuarter",
      "prevQuarter",
      "thisHalfYear",
      "prevHalfYear",
      "thisFY",
      "prevFY",
      "thisCY",
      "prevCY",
      "tillDate"
    ],
    label: "Default Filter",
    desc: "Default filter applied."
  },
  currencySymbol: {
    value: "₹",
    type: "select",
    options: [
      "$", // US Dollar
      "€", // Euro
      "£", // British Pound
      "₹", // Indian Rupee
      "¥", // Yen/Yuan
      "₩", // South Korean Won
      "₽", // Russian Ruble
      "₺", // Turkish Lira
      "R$", // Brazilian Real
      "₱", // Philippine Peso
      "฿", // Thai Baht
      "₦", // Nigerian Naira
      "₫", // Vietnamese Dong
      "₴", // Ukrainian Hryvnia
      "₡", // Costa Rican Colón
      "₲", // Paraguayan Guaraní
      "₵", // Ghanaian Cedi
      "₸", // Kazakhstani Tenge
      "₪" // Israeli Shekel
    ],
    label: "Currency Symbol",
    desc: "Symbol for amounts."
  },
  
  chartShowPie: {
    value: true,
    type: "checkbox",
    label: "Show Pie Chart",
    desc: "Enable or disable pie chart."
  },
  chartShowBar: {
    value: true,
    type: "checkbox",
    label: "Show Bar Chart",
    desc: "Enable or disable bar chart."
  },
  chartShowLine: {
    value: true,
    type: "checkbox",
    label: "Show Line Chart",
    desc: "Enable or disable line chart."
  },
  
  // Security
  requirePassword: {
    value: false,
    type: "checkbox",
    label: "Require Password",
    desc: "Protect vault with a password."
  },
  encryptStorage: {
    value: false,
    type: "checkbox",
    label: "Encrypt Storage",
    desc: "Encrypt ledger data in local storage."
  },
  autoLockMinutes: {
    value: 10,
    type: "number",
    label: "Auto Lock (Minutes)",
    desc: "Auto lock vault after inactivity."
  }
};



const SETTINGS_KEY = "vaultSettings";

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      for (const key in parsed) {
        if (settings[key] !== undefined) {
          settings[key].value = parsed[key].value;
        }
      }
    } catch (e) {
      console.error("Failed to parse settings from storage", e);
    }
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function buildSettingsForm() {
  const container = document.getElementById("settingsContainer");
  container.innerHTML = "";
  
  for (const key in settings) {
    const setting = settings[key];
    
    const wrapper = document.createElement("div");
    wrapper.className = "mb-4 p-3 border rounded";
    
    const lbl = document.createElement("label");
    lbl.textContent = setting.label;
    lbl.className = "block font-semibold mb-1";
    
    let input;
    
    if (setting.type === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = setting.value;
    } else if (setting.type === "number" || setting.type === "text") {
      input = document.createElement("input");
      input.type = setting.type;
      input.value = setting.value;
      input.className = "border p-1 w-full";
    } else if (setting.type === "select") {
      input = document.createElement("select");
      input.className = "border p-1 w-full";
      setting.options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (opt === setting.value) option.selected = true;
        input.appendChild(option);
      });
    }
    
    input.id = key;
    input.classList.add("setting-input");
    
    // Auto-save whenever changed
    input.addEventListener("change", () => {
      if (input.type === "checkbox") {
        settings[key].value = input.checked;
      } else {
        settings[key].value = input.value;
      }
      saveSettings();
    });
    
    const description = document.createElement("p");
    description.textContent = setting.desc;
    description.className = "text-sm text-gray-600";
    
    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    wrapper.appendChild(description);
    
    container.appendChild(wrapper);
      }
      const note = document.createElement("p");
    note.textContent = "NOTE: Settings are saved on input!";
    note.className = "text-sm text-gray-600";
    container.appendChild(note);

}

// Save once more on unload (backup)
window.addEventListener("beforeunload", saveSettings);

// ==== INIT ====
loadSettings();
buildSettingsForm();