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
      <td>${currentLedgerKey}</td>
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
  
  
  refreshReports();
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
  
  // ====== THEME COLORS FROM CSS ======
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryColor = rootStyles.getPropertyValue("--primary-color")?.trim() || "#6a0dad";
  const secondaryColor = rootStyles.getPropertyValue("--secondary-color")?.trim() || "#f3e8ff";
  const textColor = rootStyles.getPropertyValue("--text-color")?.trim() || "#000000";
  
  // ====== META DATA ======
  const downloadDate = new Date().toLocaleString();
  const ledgerName = document.getElementById("filename")?.value || "Untitled Ledger";
  const appURL = window.location.href;
  
  // ====== HEADER ======
  doc.setFontSize(20).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Vault Ledger Report", 14, 15);
  doc.setFontSize(12).setTextColor(textColor).setFont(undefined, "normal");
  doc.text(`Ledger Name: ${ledgerName}`, 14, 25);
  doc.text(`Date of Download: ${downloadDate}`, 14, 37);
  doc.text(`URL: ${appURL}`, 14, 43);
  
  // ====== TABLE ======
  doc.autoTable({
    html: 'table',
    startY: 50,
    styles: { fontSize: 10, textColor: textColor, lineColor: primaryColor, lineWidth: 0.2 },
    headStyles: { fillColor: primaryColor, textColor: "#ffffff", fontStyle: "bold" },
    bodyStyles: { fillColor: secondaryColor },
    alternateRowStyles: { fillColor: "#ffffff" },
  });
  
  let y = doc.lastAutoTable.finalY + 10;
  
  // ====== SUMMARY ======
  const totalIncome = document.getElementById("totalIncome")?.textContent || "0.00";
  const totalExpense = document.getElementById("totalExpense")?.textContent || "0.00";
  const finalBalance = document.getElementById("finalBalance")?.textContent || "0.00";
  
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Summary", 14, y);
  
  doc.setFontSize(12).setTextColor(textColor);
  doc.text(`Total Income: ₹${totalIncome}`, 14, y + 8);
  doc.text(`Total Expense: ₹${totalExpense}`, 14, y + 16);
  doc.text(`Final Balance: ₹${finalBalance}`, 14, y + 24);
  
  y += 40;
  

  // ====== FOOTER ======
  doc.setFontSize(10).setTextColor("#666666").setFont(undefined, "italic");
  doc.text("Generated by Vault Ledger App", 14, 290);
  
  // ====== SAVE ======
  doc.save(`${ledgerName}.pdf`);
}

function exportToPNG(param) {
  // Tab to edit
  const table = document.querySelector('table');
if (!table) {
  alert("No table found to export!");
  return;
}

html2canvas(table, { scale: 2 }).then(canvas => {
  const link = document.createElement("a");
  link.download = `${currentLedgerKey || "ledger"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}).catch(err => {
  console.error("Error exporting table as PNG:", err);
});
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
  const minAmount = parseFloat(document.getElementById('minAmount').value);
  const maxAmount = parseFloat(document.getElementById('maxAmount').value);
  
  const filtered = ledger.filter(entry => {
    const matchesDesc = desc ? entry.desc.toLowerCase().includes(desc) : true;
    const matchesType = type ? entry.type === type : true;
    const matchesStart = startDate ? entry.date >= startDate : true;
    const matchesEnd = endDate ? entry.date <= endDate : true;
    
    const matchesMinAmount = !isNaN(minAmount) ? entry.amount >= minAmount : true;
    const matchesMaxAmount = !isNaN(maxAmount) ? entry.amount <= maxAmount : true;
    
    return (
      matchesDesc &&
      matchesType &&
      matchesStart &&
      matchesEnd &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });
  
  renderTable(filtered);
  renderCharts(filtered);
}
function clearFilters() {
  document.getElementById('searchDesc').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('minAmount').value = '';
  document.getElementById('maxAmount').value = '';
  
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


document.getElementById("deleteLedgerBtn").addEventListener("click", () => {
  if (!currentLedgerKey) return alert("No ledger selected to delete.");
  
  const confirmation = confirm(`Are you sure you want to delete "${fileName}"?`);
  if (!confirmation) return;
  
  // Remove from localStorage
  localStorage.removeItem(currentLedgerKey);
  
  // Remove from ledger list
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  ledgers = ledgers.filter(key => key !== currentLedgerKey);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // Reset variables and UI
  ledger = [];
  currentLedgerKey = "";
  fileName = "";
  
  const ledgerSelect = document.getElementById("ledgerSelect");
  
  // If no ledgers left, create new untitled
  if (ledgers.length === 0) {
    const untitledKey = "ledger_Untitled";
    localStorage.setItem("ledgers", JSON.stringify([untitledKey]));
    localStorage.setItem(untitledKey, JSON.stringify([]));
    
    fileName = "Untitled";
    currentLedgerKey = untitledKey;
    ledger = [];
    renderTable();
    renderCharts();
  } else {
    // Load first remaining ledger
    currentLedgerKey = ledgers[0];
    fileName = currentLedgerKey.replace("ledger_", "");
    ledger = JSON.parse(localStorage.getItem(currentLedgerKey)) || [];
    renderTable();
    renderCharts();
  }
  
  // ✅ Update UI elements
  ledgerSelect.value = currentLedgerKey; // ← set selected <option>
  updateLedgerSelect();
  document.getElementById("filename").value = fileName; // ← update filename input
});




function generateReports(data = ledger) {
  let dailyTotals = {};
  let monthlyTotals = {};
  let yearlyTotals = {};
  let incomes = [];
  let expenses = [];

  data.forEach(txn => {
    let dateObj = new Date(txn.date);
    let dayKey = txn.date;
    let monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
    let yearKey = dateObj.getFullYear();

    // Group totals
    if (txn.type === "income") {
      incomes.push(txn.amount);
      dailyTotals[dayKey] = (dailyTotals[dayKey] || { income: 0, expense: 0 });
      dailyTotals[dayKey].income += txn.amount;

      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || { income: 0, expense: 0 });
      monthlyTotals[monthKey].income += txn.amount;

      yearlyTotals[yearKey] = (yearlyTotals[yearKey] || { income: 0, expense: 0 });
      yearlyTotals[yearKey].income += txn.amount;
    } else {
      expenses.push(txn.amount);
      dailyTotals[dayKey] = (dailyTotals[dayKey] || { income: 0, expense: 0 });
      dailyTotals[dayKey].expense += txn.amount;

      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || { income: 0, expense: 0 });
      monthlyTotals[monthKey].expense += txn.amount;

      yearlyTotals[yearKey] = (yearlyTotals[yearKey] || { income: 0, expense: 0 });
      yearlyTotals[yearKey].expense += txn.amount;
    }
  });

  // Averages
  const avgDailyIncome = (Object.values(dailyTotals).reduce((sum, day) => sum + day.income, 0) / Object.keys(dailyTotals).length) || 0;
  const avgDailyExpense = (Object.values(dailyTotals).reduce((sum, day) => sum + day.expense, 0) / Object.keys(dailyTotals).length) || 0;

  const avgMonthlyIncome = (Object.values(monthlyTotals).reduce((sum, m) => sum + m.income, 0) / Object.keys(monthlyTotals).length) || 0;
  const avgMonthlyExpense = (Object.values(monthlyTotals).reduce((sum, m) => sum + m.expense, 0) / Object.keys(monthlyTotals).length) || 0;

  const avgYearlyIncome = (Object.values(yearlyTotals).reduce((sum, y) => sum + y.income, 0) / Object.keys(yearlyTotals).length) || 0;
  const avgYearlyExpense = (Object.values(yearlyTotals).reduce((sum, y) => sum + y.expense, 0) / Object.keys(yearlyTotals).length) || 0;

  // Min/Max
  const highestIncome = incomes.length ? Math.max(...incomes) : 0;
  const lowestIncome = incomes.length ? Math.min(...incomes) : 0;
  const highestExpense = expenses.length ? Math.max(...expenses) : 0;
  const lowestExpense = expenses.length ? Math.min(...expenses) : 0;

  return {
    avgDailyIncome, avgDailyExpense,
    avgMonthlyIncome, avgMonthlyExpense,
    avgYearlyIncome, avgYearlyExpense,
    highestIncome, lowestIncome,
    highestExpense, lowestExpense
  };
}

function renderReports() {
  const reports = generateReports();
  const reportsDiv = document.getElementById("reportsOutput");
  reportsDiv.innerHTML = `
    <p class="line"><strong>Daily Avg:</strong> Income ₹${reports.avgDailyIncome.toFixed(2)}, Expense ₹${reports.avgDailyExpense.toFixed(2)}</p>
    <p class="line"><strong>Monthly Avg:</strong> Income ₹${reports.avgMonthlyIncome.toFixed(2)}, Expense ₹${reports.avgMonthlyExpense.toFixed(2)}</p>
    <p class="line"><strong>Yearly Avg:</strong> Income ₹${reports.avgYearlyIncome.toFixed(2)}, Expense ₹${reports.avgYearlyExpense.toFixed(2)}</p>
    <p class="line"><strong>Highest:</strong> Income ₹${reports.highestIncome}, Expense ₹${reports.highestExpense}</p>
    <p class="line"><strong>Lowest:</strong> Income ₹${reports.lowestIncome}, Expense ₹${reports.lowestExpense}</p>
  `;
}

function generateAdvancedReports(data = ledger) {
  // Separate income & expense transactions
  const incomes = data.filter(txn => txn.type === "income");
  const expenses = data.filter(txn => txn.type === "expense");
  
  // Top 5 incomes & expenses
  const topIncomes = [...incomes].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  
  // Frequent transactions (by description only)
  const descCount = {};
  data.forEach(txn => {
    let desc = txn.desc?.trim() || "No Description";
    descCount[desc] = (descCount[desc] || 0) + 1;
  });
  const frequentTransactions = Object.entries(descCount)
    .filter(([desc, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  // Recurring transactions (same desc + amount + type)
  const recurringMap = {};
  data.forEach(txn => {
    let desc = txn.desc?.trim() || "No Description";
    const key = JSON.stringify({ desc, amount: txn.amount, type: txn.type });
    recurringMap[key] = (recurringMap[key] || 0) + 1;
  });
  
  const recurringTransactions = Object.entries(recurringMap)
    .filter(([key, count]) => count > 1)
    .map(([key, count]) => {
      const parsed = JSON.parse(key);
      return { desc: parsed.desc, amount: parsed.amount, type: parsed.type, count };
    });
  
  return { topIncomes, topExpenses, frequentTransactions, recurringTransactions };
}

function renderAdvancedReports() {
  const { topIncomes, topExpenses, frequentTransactions, recurringTransactions } = generateAdvancedReports();
  
  // Top incomes
  document.getElementById("topIncomesList").innerHTML = topIncomes.length ?  topIncomes
    .map(txn => `<li>${txn.desc} – ₹${txn.amount}</li>`)
    .join("") : "<li>No transactions found</li>";
  
  // Top expenses
  document.getElementById("topExpensesList").innerHTML =
  topExpenses.length ? 
    topExpenses.map(txn => `<li>${txn.desc} – ₹${txn.amount}</li>`).join("") 
    : "<li>No transactions found</li>"; ;
  
  // Frequent
  document.getElementById("frequentList").innerHTML = frequentTransactions.length ? frequentTransactions
    .map(([desc, count]) => `<li>${desc} – ${count} times</li>`)
    .join("") : "<li>No transactions found</li>";
  
  // Recurring
  document.getElementById("recurringList").innerHTML = recurringTransactions.length ? recurringTransactions
    .map(txn => `<li>${txn.desc} – ₹${txn.amount} (${txn.count} times)</li>`)
    .join("") :"<li>No transactions found</li>";
}

function generateUpcomingExpectations(data = ledger) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const lastMonth = (currentMonth - 1 + 12) % 12;
  const currentYear = now.getFullYear();
  const lastMonthYear = lastMonth === 11 ? currentYear - 1 : currentYear;

  // Filter last month's transactions
  const lastMonthData = data.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate.getMonth() === lastMonth && txnDate.getFullYear() === lastMonthYear;
  });

  // Group last month's transactions by desc + amount + type
  const recurringMap = {};
  lastMonthData.forEach(txn => {
    let desc = txn.desc?.trim() || "No Description";
    const key = JSON.stringify({ desc, amount: txn.amount, type: txn.type });
    recurringMap[key] = (recurringMap[key] || 0) + 1;
  });

  // Get current month's transactions
  const currentMonthData = data.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
  });
  const currentMonthKeys = new Set(
    currentMonthData.map(txn => JSON.stringify({ desc: txn.desc?.trim() || "No Description", amount: txn.amount, type: txn.type }))
  );

  // Expected transactions for this month (not yet recorded)
  const expectedTransactions = Object.entries(recurringMap)
    .filter(([key, count]) => count >= 1 && !currentMonthKeys.has(key))
    .map(([key]) => JSON.parse(key));

  return expectedTransactions;
}

function renderUpcomingExpectations() {
  const upcoming = generateUpcomingExpectations();
  
  document.getElementById("upcomingList").innerHTML = upcoming.length ?
    upcoming.map(txn => `<li>${txn.desc} – ₹${txn.amount} (${txn.type})</li>`).join("") :
    "<li>No upcoming expected transactions found</li>";
}


// ===== Special Insights =====
function updateSpecialInsights() {
  if (!ledger.length) {
    document.getElementById("highestIncome").innerHTML = "<strong>Highest Income:</strong> No data found";
    document.getElementById("highestExpense").innerHTML = "<strong>Highest Expense:</strong> No data found";
    document.getElementById("zeroDays").innerHTML = "<strong>Zero Spent Days:</strong> No data found";
    document.getElementById("incomeRatio").innerHTML = "<strong>Income Ratio:</strong> No data found";
    return;
  }
  
  // Highest Income
  let highestIncome = ledger.filter(t => t.type === "income").sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("highestIncome").innerHTML =
    highestIncome ?
    `<strong>Highest Income:</strong> ₹${highestIncome.amount} (${highestIncome.desc} on ${highestIncome.date})` :
    "<strong>Highest Income:</strong> No data found";
  
  // Highest Expense
  let highestExpense = ledger.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("highestExpense").innerHTML =
    highestExpense ?
    `<strong>Highest Expense:</strong> ₹${highestExpense.amount} (${highestExpense.desc} on ${highestExpense.date})` :
    "<strong>Highest Expense:</strong> No data found";
  
  // Zero Spent Days (list format)
  let expenseDates = new Set(ledger.filter(t => t.type === "expense").map(t => t.date));
  let allDates = new Set(ledger.map(t => t.date));
  let zeroSpentDays = [...allDates].filter(d => !expenseDates.has(d));
  
  if (zeroSpentDays.length) {
    document.getElementById("zeroDays").innerHTML =
      `<strong>Zero Spent Days:</strong><ul>${zeroSpentDays.map(date => `<li>${date}</li>`).join("")}</ul>`;
  } else {
    document.getElementById("zeroDays").innerHTML = "<strong>Zero Spent Days:</strong> No data found";
  }
  
  // Income Ratio (Expense / Income * 100)
  let totalIncome = ledger.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  let totalExpense = ledger.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  let ratio = totalIncome ? ((totalExpense / totalIncome) * 100).toFixed(1) : null;
  document.getElementById("incomeRatio").innerHTML =
    ratio !== null ?
    `<strong>Income Ratio:</strong> ${ratio}%` :
    "<strong>Income Ratio:</strong> No income data";
}

// Auto-update on changes
function refreshReports() {
  setToday();
saveToLocalStorage();
renderCharts();
renderReports();
renderAdvancedReports();
renderUpcomingExpectations();
  updateSpecialInsights();
}

window.addEventListener("beforeunload", function() {
  let ledgersList = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  if (ledgersList.length > 0) {
    ledgersList.forEach(ledgerKey => {
      let ledgerData = localStorage.getItem(ledgerKey);
      if (ledgerData) {
        let blob = new Blob([ledgerData], { type: "application/json" });
        let url = URL.createObjectURL(blob);
        
        let a = document.createElement("a");
        a.href = url;
        a.download = `${ledgerKey}.json`; // Use ledger's actual name as filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
      }
    });
  }
});


function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show button only when scrolled down
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTopBtn');
  if (window.scrollY > 200) {
    btn.classList.remove("hide");
    btn.classList.add("show");
  } else {
    btn.classList.remove("show");
    btn.classList.add("hide");
  }
});