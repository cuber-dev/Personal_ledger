let ledger = [];
let editingIndex = null;
let fileName = "Untitled Ledger";

/*
function renderTable(data = ledger) {
  const table = document.getElementById("tableBody");
  const balanceDiv = document.getElementById("balance");
  table.innerHTML = "";
  let balance = 0;
  
  // Always sort the full ledger for consistency
  ledger.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Sort filtered data separately if needed
  const displayData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  displayData.forEach((entry, index) => {
    if (entry.type === "income") balance += entry.amount;
    else balance -= entry.amount;
    
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
  setToday();
  saveToLocalStorage();

} */
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
  anchor.download = fileName + ".json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  name = file.name.split(".")[0];
    
  // Show heading
  updateFileHeading(name);
  // Here you would read and render the file data into the table
  // Assume you also compute the closing balance
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      ledger = JSON.parse(e.target.result);
 ledger.sort((a, b) => new Date(a.date) - new Date(b.date));
      renderTable();
    } catch (error) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
  saveToLocalStorage();
  renderCharts(ledger);


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
  XLSX.writeFile(wb, fileName + ".xlsx");
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
  
  doc.save(fileName + ".pdf");
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
}
function clearFilters() {
  document.getElementById('searchDesc').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  
  renderTable(ledger);
}


function saveToLocalStorage() {
  localStorage.setItem("ledgerData", JSON.stringify(ledger));
}
window.onload = async function() {
  const savedData = localStorage.getItem("ledgerData");
  
  if (savedData) {
    ledger = JSON.parse(savedData);
    if (ledger.length === 0) {
      // If the saved data is empty, insert opening balance
      ledger = [{
        "date": new Date().toISOString().split("T")[0],
        "desc": "Opening balance",
        "amount": 0,
        "type": "income"
      }];
      saveToLocalStorage(); // Save this new default
    }
    renderTable();
  } else {
    // No saved data at all
    ledger = [{
      "date": new Date().toISOString().split("T")[0],
      "desc": "Opening balance",
      "amount": 0,
      "type": "income"
    }];
    renderTable();
    saveToLocalStorage();
  }
  renderCharts(ledger);

};
function updateFileHeading(file = null) {
  const heading =document.getElementById("filename");
  const name = file || heading.value.trim();
  document.getElementById("ledgerName").textContent = name || "Untitled";
  fileName =name;
  if(file) heading.value = name
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

