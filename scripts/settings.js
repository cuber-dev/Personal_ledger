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
  confirmBeforeDelete: {
    value: true,
    type: "checkbox",
    label: "Confirm Before Delete",
    desc: "Ask confirmation before deleting."
  },
  allowLinkedDelete: {
    value: false,
    type: "checkbox",
    label: "Allow Linked Delete",
    desc: "Permit deletion of ledgers with linked transactions."
  },
  undoRedoLimit: {
    value: 20,
    type: "number",
    label: "Undo/Redo Limit",
    desc: "Maximum history states to store."
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
  exportIncludeSummary: {
    value: true,
    type: "checkbox",
    label: "Export Summary",
    desc: "Include totals in exports."
  },
  exportIncludeCharts: {
    value: true,
    type: "checkbox",
    label: "Export Charts",
    desc: "Include charts in PDF export."
  },
  zipAllLedgers: {
    value: true,
    type: "checkbox",
    label: "Zip All Ledgers",
    desc: "Export all ledgers into a zip archive."
  },
  
  // Display & Charts
  defaultFilter: {
    value: "currentMonth",
    type: "select",
    options: ["currentMonth", "today", "yesterday", "last7days", "last30days"],
    label: "Default Filter",
    desc: "Default filter applied."
  },
  showClosingBalance: {
    value: true,
    type: "checkbox",
    label: "Show Closing Balance",
    desc: "Show closing balance in transaction table."
  },
  currencySymbol: {
    value: "₹",
    type: "text",
    label: "Currency Symbol",
    desc: "Symbol for amounts."
  },
  theme: {
    value: "light",
    type: "select",
    options: ["light", "dark", "system"],
    label: "Theme",
    desc: "Ledger theme."
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
  
  // Date & Time
  dateFormat: {
    value: "DD/MM/YYYY",
    type: "text",
    label: "Date Format",
    desc: "Format for displaying dates (e.g. DD/MM/YYYY)."
  },
  defaultDateRange: {
    value: "currentMonth",
    type: "select",
    options: ["currentMonth", "today", "yesterday", "last7days", "last30days"],
    label: "Default Date Range",
    desc: "Default range used for filters."
  },
  includeTodayInFilters: {
    value: true,
    type: "checkbox",
    label: "Include Today in Filters",
    desc: "Always include current day."
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

    const description = document.createElement("p");
    description.textContent = setting.desc;
    description.className = "text-sm text-gray-600";

    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    wrapper.appendChild(description);

    container.appendChild(wrapper);
  }

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Settings";
  saveBtn.className = "mt-4 px-4 py-2 bg-blue-500 text-white rounded";
  saveBtn.onclick = saveSettings;

  container.appendChild(saveBtn);
}

function saveSettings() {
  document.querySelectorAll(".setting-input").forEach(input => {
    const key = input.id;
    if (input.type === "checkbox") {
      settings[key].value = input.checked;
    } else {
      settings[key].value = input.value;
    }
  });
  alert("Settings updated:\n" + JSON.stringify(settings, null, 2));
}

buildSettingsForm();
