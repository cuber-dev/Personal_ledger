let ledger = [];
let editingIndex = null;
let fileName = "Untitled";
let currentLedgerKey = "";


function renderTable(data = ledger) {
  const table = document.getElementById("tableBody");
  const balanceDiv = document.getElementById("balance");
  const totalIncomeSpan = document.getElementById("totalIncome");
  const totalExpenseSpan = document.getElementById("totalExpense");
  const finalBalanceSpan = document.getElementById("finalBalance");
  
  table.innerHTML = "";
  let balance = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Always sort the full ledger for consistency
  ledger.sort((a, b) => new Date(a.date) - new Date(b.date));
  

  // Sort filtered data separately if needed
  const displayData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  displayData.forEach((entry, index) => {
    if (entry.type === "income") {
      balance += entry.amount;
      totalIncome += entry.amount;
    } else {
      balance -= entry.amount;
      totalExpense += entry.amount;
    }
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.date}</td>
      <td>${entry.desc}</td>
      <td>${entry.type}</td>
      <td class="${entry.type === 'income' ? 'income-label' : 'expense-label'}">
        ${entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
      </td>
      <td>${balance.toFixed(2)}</td>
      <td class="actions">
        <button onclick="editEntry(${index})">Edit</button>
        <button class="delete-btn" onclick="deleteEntry(${index})">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
  
  balanceDiv.textContent = `Balance : ₹ ${balance.toFixed(2)}`;
  
  // Update the summary section
  totalIncomeSpan.textContent = totalIncome.toFixed(2);
  totalExpenseSpan.textContent = totalExpense.toFixed(2);
  finalBalanceSpan.textContent = balance.toFixed(2);
  
  setToday();
  saveToLocalStorage();
  renderCharts(ledger);

}
document.getElementById("entryForm").addEventListener("submit", function (e) {
  e.preventDefault();
  saveLastState();
  const date = document.getElementById("date").value;
  const desc = document.getElementById("desc").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const entry = { date, desc, amount, type };

  if (editingIndex !== null) {
    ledger[editingIndex] = entry;
    editingIndex = null;
  } else {
    ledger.push(entry);
  }

  e.target.reset();
  renderTable();
});

function editEntry(index) {
  const entry = ledger[index];
  document.getElementById("date").value = entry.date;
  document.getElementById("desc").value = entry.desc;
  document.getElementById("amount").value = entry.amount;
  document.getElementById("type").value = entry.type;
  editingIndex = index;
  saveToLocalStorage();
  saveLastState();
  renderCharts(ledger);

}

function deleteEntry(index) {
  if (confirm("Delete this entry?")) {
    saveLastState();
    ledger.splice(index, 1);
    renderTable();
  }
saveToLocalStorage();
  renderCharts(ledger);

}

function exportJSON() {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = currentLedgerKey + ".json";
  anchor.click();
  URL.revokeObjectURL(url);
}
/*
function importJSON(event) {
  const file = event.target.files[0];
  console.log(file)
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // 1. Ask user for ledger name or use file name (without .json)
      const baseName = file.name.replace(/\.json$/, '');
      const newLedgerName = baseName;
      
      // 2. Save to localStorage
      localStorage.setItem(newLedgerName, JSON.stringify(importedData));
      
      // 3. Update ledger list
      let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
      if (!ledgers.includes(newLedgerName)) {
        ledgers.push(newLedgerName);
        localStorage.setItem("ledgers", JSON.stringify(ledgers));
      }
      
      // 4. Set currentLedgerKey and update UI
      currentLedgerKey = newLedgerName;
      localStorage.setItem("currentLedgerKey", currentLedgerKey);
      ledger = importedData;
      
      // 5. Update UI elements
      document.getElementById("filename").value = newLedgerName;

      updateLedgerSelect();
      renderTable(ledger);
      renderCharts(ledger);
      
    } catch (err) {
      alert("Invalid JSON file.");
      console.error(err);
    }
  };
  
  reader.readAsText(file);
}
*/
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      const baseName = file.name.replace(/\.json$/, '');
      let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
      ledgers = [...new Set(ledgers)];
      
      if (ledgers.includes(baseName)) {
        let newName = prompt(`A ledger named "${baseName}" already exists. Enter a different name:`);
        if (!newName || ledgers.includes(newName)) {
          alert("Import cancelled or name already exists.");
          return;
        }
        currentLedgerKey = newName;
        fileName = newName;
      } else {
        currentLedgerKey = baseName;
        fileName = baseName;
      }
      
      localStorage.setItem(currentLedgerKey, JSON.stringify(importedData));
      if (!ledgers.includes(currentLedgerKey)) {
        ledgers.push(currentLedgerKey);
        localStorage.setItem("ledgers", JSON.stringify(ledgers));
      }
      
      localStorage.setItem("currentLedgerKey", currentLedgerKey);
      ledger = importedData;
      document.getElementById("filename").value = fileName;
      
      updateLedgerSelect();
      renderTable();
      renderCharts(ledger);
      
    } catch (err) {
      alert("Invalid JSON file.");
      console.error(err);
    }
  };
  
  reader.readAsText(file);
}
function exportToExcel() {
  const table = document.querySelector('table');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);

  // Calculate closing balance
  let closingBalance = 0;
  ledger.forEach(entry => {
    if (entry.type === "income") closingBalance += entry.amount;
    else closingBalance -= entry.amount;
  });

  // Add closing balance row after table
  const rowIndex = XLSX.utils.decode_range(ws['!ref']).e.r + 2;
  const cellRef = `A${rowIndex + 1}`;
  ws[cellRef] = {
    v: `Closing Balance: ₹ ${closingBalance.toFixed(2)}`,
    t: 's',
    s: {
      font: { bold: true, sz: 14 }
    }
  };

  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, currentLedgerKey + ".xlsx");
}
async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Table first
  doc.autoTable({ html: 'table' });
  
  // Calculate closing balance
  let closingBalance = 0;
  ledger.forEach(entry => {
    if (entry.type === "income") closingBalance += entry.amount;
    else closingBalance -= entry.amount;
  });
  
  // Format as currency string
  const formattedBalance = `₹ ${closingBalance.toFixed(2)}`;
  
  // Set font and add closing balance cleanly
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(`Closing Balance: ${formattedBalance}`, 14, doc.lastAutoTable.finalY + 20);
  
  doc.save(currentLedgerKey + ".pdf");
}
function setToday() {
  const dateInput = document.getElementById('date');
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;
  return today;

}
// Set today's date as default in the date input
window.addEventListener('DOMContentLoaded', () => {
  setToday();
});
 
function applyFilters() {
  const desc = document.getElementById('searchDesc').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  const filtered = ledger.filter(entry => {
    const matchesDesc = desc ? entry.desc.toLowerCase().includes(desc) : true;
    const matchesType = type ? entry.type === type : true;
    const matchesStart = startDate ? entry.date >= startDate : true;
    const matchesEnd = endDate ? entry.date <= endDate : true;
    return matchesDesc && matchesType && matchesStart && matchesEnd;
  });
  
  renderTable(filtered);
  renderCharts(filtered);

}
function clearFilters() {
  document.getElementById('searchDesc').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  
  renderTable(ledger);
  renderCharts(ledger);

}
function saveToLocalStorage() {
  localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));
  localStorage.setItem("fileName_" + currentLedgerKey, fileName);
}

function saveLastState() {
  lastState = JSON.stringify(ledger);
  redoState = null; // Clear redo history on new action
}
function undoChange() {
  if (lastState) {
    redoState = JSON.stringify(ledger);
    ledger = JSON.parse(lastState);
    lastState = null;
    renderTable();
  } else {
    alert("Nothing to undo");
  }
}

function redoChange() {
  if (redoState) {
    lastState = JSON.stringify(ledger);
    ledger = JSON.parse(redoState);
    redoState = null;
    renderTable();
  } else {
    alert("Nothing to redo");
  }
}



let pieChart, barChart, lineChart;

function renderCharts(data = ledger) {
  const ctxPie = document.getElementById("pieChart").getContext("2d");
  const ctxBar = document.getElementById("barChart").getContext("2d");
  const ctxLine = document.getElementById("lineChart").getContext("2d");

  let totalIncome = 0;
  let totalExpense = 0;
  let balance = 0;
  let monthlyTotals = {};
  let balanceOverTime = [];

  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedData.forEach(entry => {
    const month = new Date(entry.date).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 };

    if (entry.type === "income") {
      totalIncome += entry.amount;
      monthlyTotals[month].income += entry.amount;
      balance += entry.amount;
    } else {
      totalExpense += entry.amount;
      monthlyTotals[month].expense += entry.amount;
      balance -= entry.amount;
    }

    balanceOverTime.push({ date: entry.date, balance });
  });

  // Destroy old charts if exist
  pieChart?.destroy();
  barChart?.destroy();
  lineChart?.destroy();

  pieChart = new Chart(ctxPie, {
    type: "pie",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [totalIncome, totalExpense],
        backgroundColor: ["#4caf50", "#f44336"]
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Income vs Expense" } }
    }
  });

  barChart = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: Object.keys(monthlyTotals),
      datasets: [
        {
          label: "Income",
          data: Object.values(monthlyTotals).map(m => m.income),
          backgroundColor: "#4caf50"
        },
        {
          label: "Expense",
          data: Object.values(monthlyTotals).map(m => m.expense),
          backgroundColor: "#f44336"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Monthly Totals" } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  lineChart = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: balanceOverTime.map(item => item.date),
      datasets: [{
        label: "Balance Over Time",
        data: balanceOverTime.map(item => item.balance),
        borderColor: "#2196f3",
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Balance Trend" } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function downloadChart(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  
  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = `${fileName || "chart"}_${chartId}.png`;
  link.click();
}

document.getElementById("filename").addEventListener("input", function() {
  fileName = this.value; // Update global var
});
/*
function updateLedgerSelect() {
  const select = document.getElementById("ledgerSelect");
  const ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  ledgers.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === currentLedgerKey) {
      option.selected = true;
    }
    select.appendChild(option);
  });
document.getElementById("filename").value = currentLedgerKey;

}*/
function updateLedgerSelect() {
  const select = document.getElementById("ledgerSelect");
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  // ✅ Remove duplicates
  ledgers = [...new Set(ledgers)];
  
  // ✅ Save cleaned list
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // ✅ Clear existing options
  select.innerHTML = "";
  
  // ✅ Re-populate options
  ledgers.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === currentLedgerKey) option.selected = true;
    select.appendChild(option);
  });
  
  // ✅ Update global var + UI
  fileName = currentLedgerKey;
  document.getElementById("filename").value = currentLedgerKey;
}
// 🆕 Create New Ledger
/*
function createNewLedger() {
  
  if (!ledgerName) {
    alert("Please enter a valid ledger name.");
    return;
  }

  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  if (ledgers.includes(ledgerName)) {
    alert("Ledger already exists.");
    return;
  }
  
  // Add ledger to list
  ledgers.push(ledgerName);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // Create initial entry
  const newLedger = [{
    date: getCurrentDate(),
    desc: "Opening Balance",
    type: "Income",
    amount: 0
  }];
  localStorage.setItem(ledgerName, JSON.stringify(newLedger));
  
  // Set active ledger
  currentLedgerKey = ledgerName;
  localStorage.setItem("currentLedgerKey", currentLedgerKey);
  ledger = newLedger;
  document.getElementById("filename").value = currentLedgerKey;

  updateLedgerSelect();
  renderTable();
  renderCharts(ledger);
}
*/
function createNewLedger() {
  const ledgerName = prompt("Enter new ledger name:");
  if (!ledgerName) {
    alert("Please enter a valid ledger name.");
    return;
  }
  
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  ledgers = [...new Set(ledgers)];
  
  if (ledgers.includes(ledgerName)) {
    alert("A ledger with that name already exists. Choose a different name.");
    return;
  }
  
  const newLedger = [{
    date: getCurrentDate(),
    desc: "Opening Balance",
    type: "Income",
    amount: 0
  }];
  
  ledgers.push(ledgerName);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  localStorage.setItem(ledgerName, JSON.stringify(newLedger));
  
  currentLedgerKey = ledgerName;
  fileName = ledgerName;
  document.getElementById("filename").value = fileName;
  
  localStorage.setItem("currentLedgerKey", currentLedgerKey);
  ledger = newLedger;
  
  updateLedgerSelect();
  renderTable();
  renderCharts(ledger);
}
// 📥 Change selected ledger
document.getElementById("ledgerSelect").addEventListener("change", function(e) {
  const selected = e.target.value;
  if (!selected) return;

  const data = JSON.parse(localStorage.getItem(selected) || "[]");
  currentLedgerKey = selected;
  localStorage.setItem("currentLedgerKey", currentLedgerKey);
  ledger = data;
  document.getElementById("filename").value = currentLedgerKey;

  renderTable();
  renderCharts(ledger);
});

// ▶️ Init on load
/*
window.onload = function() {
  const savedLedgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  currentLedgerKey = localStorage.getItem("currentLedgerKey") || savedLedgers[0] || "Untitled";
  
  if (!savedLedgers.includes(currentLedgerKey)) {
    savedLedgers.push(currentLedgerKey);
    localStorage.setItem("ledgers", JSON.stringify(savedLedgers));
  }

  ledger = JSON.parse(localStorage.getItem(currentLedgerKey) || "[]");
  if (ledger.length === 0) {
    ledger.push({
      date: getCurrentDate(),
      type: "Income",
      desc: "Opening balance",
      amount: 0
    });
    localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));
  }
  
  updateLedgerSelect();
  renderTable();
  renderCharts(ledger);
};
*/
window.onload = function() {
  let savedLedgers = JSON.parse(localStorage.getItem("ledgers") || "[]");

  // Remove duplicates
  savedLedgers = [...new Set(savedLedgers)];

  // Save cleaned version
  localStorage.setItem("ledgers", JSON.stringify(savedLedgers));

  // If no ledgers, create only one "Untitled"
  if (savedLedgers.length === 0) {
    const defaultLedger = [{
      date: getCurrentDate(),
      desc: "Opening Balance",
      type: "Income",
      amount: 0
    }];
    const defaultName = "Untitled";
    savedLedgers.push(defaultName);
    localStorage.setItem("ledgers", JSON.stringify(savedLedgers));
    localStorage.setItem(defaultName, JSON.stringify(defaultLedger));
    localStorage.setItem("currentLedgerKey", defaultName);
  }

  // Load the current ledger
  currentLedgerKey = localStorage.getItem("currentLedgerKey") || "Untitled";
  ledger = JSON.parse(localStorage.getItem(currentLedgerKey) || "[]");

  fileName = currentLedgerKey;
  document.getElementById("filename").value = fileName;

  updateLedgerSelect();
  renderTable();
  renderCharts(ledger);
};
// 🧠 Bind + New Ledger button
document.getElementById("newLedgerBtn").addEventListener("click", createNewLedger);

// 🕒 Helper: get today's date in yyyy-mm-dd
function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

document.getElementById("filename").addEventListener("change", function() {
  const newName = this.value.trim();
  if (!newName) return alert("Filename can't be empty.");
  if (newName === currentLedgerKey) return; // No change
  
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  if (ledgers.includes(newName)) {
    alert("Ledger name already exists.");
    this.value = currentLedgerKey;
    return;
  }
  
  // Rename in localStorage
  const data = localStorage.getItem(currentLedgerKey);
  localStorage.setItem(newName, data);
  localStorage.removeItem(currentLedgerKey);
  
  // Update ledger list
  ledgers = ledgers.map(name => name === currentLedgerKey ? newName : name);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // Update key trackers
  currentLedgerKey = newName;
  fileName = newName;
  localStorage.setItem("currentLedgerKey", newName);
  
  // Update UI
  updateLedgerSelect();
});