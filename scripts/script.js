let ledger = [];
let editingId = null; // replace editingIndex
let fileName = "Untitled";
let currentLedgerKey = "";
let isUsingFilter = false;
let globalFilterData = [];
let sortState = { col: null, dir: "asc" };
let sortedLedger = [];

const accounts = [
  // Assets
  "Bank",
  "Cash",
  "Accounts Receivable",
  "Fixed Assets",
  "Investments",
  "Prepaid Expenses",
  "Inventory",
  "Savings",
  
  // Liabilities
  "Accounts Payable",
  "Credit Card",
  "Loans",
  "Taxes Payable",
  
  // Equity
  "Capital",
  "Owner’s Equity",
  "Retained Earnings",
  
  // Income
  "Bonus",
  "Business Income",
  "Commission",
  "Interest Income",
  "Other Income",
  "Salary",
  
  // Expenses
  "Bills",
  "Education",
  "Entertainment",
  "Food",
  "Healthcare",
  "Insurance",
  "Miscellaneous",
  "Rent",
  "Shopping",
  "Subscriptions",
  "Taxes",
  "Travel",
  "Utilities",
  "Business Partners",
  "Refunds",
  "Repairs & Maintenance",
  "Fuel",
  "Telecom",
  "Service Charges",
  "Family Support",
"Vehicle",
"Cash Reimbursement",
"Household",
"Bank Charges"
].sort();
function buildAccountSelector() {
  const accountSelector = document.getElementById("account");
  
  accountSelector.innerHTML = `<option value="" disabled selected>Select Account</option>`;
accounts.forEach(acc => {
  const option = document.createElement("option");
  option.value = acc;
  option.textContent = acc;
  accountSelector.appendChild(option);
});
}
function buildFilterAccounts() {
  const filterAccounts = document.getElementById("filter-accounts");
  const currentValue = filterAccounts.value; // save what user selected before refresh
  
  filterAccounts.innerHTML = '';
  filterAccounts.innerHTML = `<option value="">All Accounts</option>`;
  
  // ✅ Collect unique accounts from ledger
  const uniqueAccounts = [...new Set(ledger.map(entry => entry.account))].sort();
  
  uniqueAccounts.forEach(acc => {
    const option = document.createElement("option");
    option.value = acc;
    option.textContent = acc;
    
    // ✅ restore selection if it matches
    if (currentValue === acc) {
      option.selected = true;
    }
    
    filterAccounts.appendChild(option);
  });
  
  // ✅ also restore "All Accounts" if previously selected
  if (currentValue === "") {
    filterAccounts.querySelector('option[value=""]').selected = true;
  }
}
async function generateTransactionId(date, desc, amount) {
  // Normalize values
  const normalizedDate = new Date(date).toISOString().split("T")[0]; // yyyy-mm-dd
  const normalizedDesc = desc.trim().toLowerCase();
  const normalizedAmount = parseFloat(amount).toFixed(2);
  
  // Add a salt (timestamp + random)
  const salt = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  
  // Build string
  const baseString = `${normalizedDate}|${normalizedDesc}|${normalizedAmount}|${salt}`;
  
  // Hash using SHA-256
  const buffer = new TextEncoder().encode(baseString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  // Return shorter, prefixed ID
  return "tx_" + hashHex.substring(0, 12);
}

function renderTable(data = ledger, showRecurringOnly = false) {
  const table = document.getElementById("tableBody");
  const balanceDiv = document.getElementById("balance");
  const totalIncomeSpan = document.getElementById("totalIncome");
  const totalExpenseSpan = document.getElementById("totalExpense");
  const finalBalanceSpan = document.getElementById("finalBalance");
  
  table.innerHTML = "";
  let balance = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Sort the filtered data
  const displayData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Fix: get recurring indices based on filtered & sorted displayData
  const recurringIndices = getRecurringIndices(displayData);
  
  displayData.forEach((entry, index) => {
    const isRecurring = recurringIndices.has(index);
    if (showRecurringOnly && !isRecurring) return;
    
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
      <td>${entry.account}</td>
      <td>${entry.desc} ${isRecurring ? '<span class="recurring-badge">🔁</span>' : ''}</td>
      <td>${entry.type}</td>
      <td class="${entry.type === 'income' ? 'income-label' : 'expense-label'}">
        ${entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
      </td>
      <td>${balance.toFixed(2)}</td>
      <td class="actions">
        <button onclick="editEntry('${entry.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteEntry('${entry.id}','${entry.desc}')">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
  
  balanceDiv.textContent = `Balance : ₹ ${balance.toFixed(2)}`;
  totalIncomeSpan.textContent = totalIncome.toFixed(2);
  totalExpenseSpan.textContent = totalExpense.toFixed(2);
  finalBalanceSpan.textContent = balance.toFixed(2);
  updateWealthLight(totalIncome,totalExpense);
  showLowBalancePlan(balance);
  refreshReports();
}
function getRecurringIndices(data) {
  const ledgerKeyMap = {};
  
  // Build a map of keys from the full ledger (desc + amount)
  ledger.forEach(entry => {
    const key = `${entry.desc.toLowerCase()}-${entry.amount}`;
    if (!ledgerKeyMap[key]) ledgerKeyMap[key] = 0;
    ledgerKeyMap[key]++;
  });
  
  // Now mark indices in the current display data if the key appears more than once
  const recurring = new Set();
  data.forEach((entry, index) => {
    const key = `${entry.desc.toLowerCase()}-${entry.amount}`;
    if (ledgerKeyMap[key] > 1) {
      recurring.add(index);
    }
  });
  
  return recurring;
}

// Sort function triggered from indicators
function sortTableColumn(colKey) {
  // base data should always come from your current ledger/filters
  sortedLedger = [...ledger]; // or [...filteredLedger] if you use filtering
  
  // toggle direction if same column clicked
  if (sortState.col === colKey) {
    sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
  } else {
    sortState.col = colKey;
    sortState.dir = "asc";
  }
  
  // perform sorting
  // perform sorting
sortedLedger.sort((a, b) => {
  let valA = a[colKey];
  let valB = b[colKey];
  
  // Amount and Closing Balance should always be numeric
  if (colKey === "amount" || colKey === "closingBalance") {
    valA = parseFloat(String(valA).replace(/[+,]/g, ""));
    valB = parseFloat(String(valB).replace(/[+,]/g, ""));
  }
  
  // Date
  else if (colKey === "date") {
    valA = new Date(valA);
    valB = new Date(valB);
  }
  
  // Default: compare as string (case-insensitive)
  else {
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
  }
  
  if (valA < valB) return sortState.dir === "asc" ? -1 : 1;
  if (valA > valB) return sortState.dir === "asc" ? 1 : -1;
  return 0;
});
  // update indicators
  document.querySelectorAll(".sort-indicator").forEach(el => {
    el.textContent = "⇅";
  });
  const activeIndicator = document.querySelector(`.sort-indicator[data-col="${colKey}"]`);
  if (activeIndicator) {
    activeIndicator.textContent = sortState.dir === "asc" ? "▲" : "▼";
  }
  
  // render using your existing renderTable
  renderTable(sortedLedger);
}
document.querySelectorAll(".sort-indicator").forEach(indicator => {
  indicator.addEventListener("click", () => {
    sortTableColumn(indicator.dataset.col);
  });
});
document.getElementById("entryForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  saveLastState();
  const account = document.getElementById("account").value;
  const date = document.getElementById("date").value;
  const description = document.getElementById("desc").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  
 /* if (editingId !== null) {
    // Update existing entry by ID
    const idx = ledger.findIndex(tx => tx.id === editingId);
    if (idx !== -1) {
      ledger[idx] = { ...ledger[idx], date, desc, amount, type };
    }
    editingId = null;
  } else {
    // Create new entry with ID
    const id = await generateTransactionId(date, desc, amount);
    const entry = { id, date, desc, amount, type };
    ledger.push(entry);
  }
  */

if (editingId !== null) {
  const idx = ledger.findIndex(tx => tx.id === editingId);
  if (idx !== -1) {
    ledger[idx] = { ...ledger[idx], date, account, desc : description, amount, type };
  }
  editingId = null;
} else {
  const id = await generateTransactionId(date, description, amount);
  const entry = { id, date, desc : description, account, amount, type };
  ledger.push(entry);
}
  e.target.reset();
  renderTable();
  saveToLocalStorage();
  renderCharts(ledger);
  clearFilters();
});
function clearEntry() {
  const account = document.getElementById("account");
  const date = document.getElementById("date");
  const description = document.getElementById("desc");
  const amount = document.getElementById("amount");
  const type = document.getElementById("type");
  
  account.value = "";
  date.value = "";
  description.value = "";
  amount.value = "";
  type.value = "income";
  setToday();
  
}
function formatDateForInput(dateString) {
  // Split by "-" → [DD, MM, YYYY]
  let [day, month, year] = dateString.split("-");
  return `${day.padStart(2,"0")}-${month.padStart(2,"0")}-${year}`;
}
function editEntry(id) {
  scrollToTop(300);
  // Find entry in ledger by ID
  const entry = ledger.find(tx => tx.id === id);
  if (!entry) {
    console.error("Entry not found for ID:", id);
    return;
  }
  // Fill form with entry values
  document.getElementById("date").value = formatDateForInput(entry.date);

  document.getElementById("desc").value = entry.desc;
  document.getElementById("account").value = entry.account;
  document.getElementById("amount").value = entry.amount;
  document.getElementById("type").value = entry.type.toLowerCase();
  
  // Store ID instead of index
  editingId = id;
  
  // Save state
  saveToLocalStorage();
  saveLastState();
  renderCharts(ledger);
}

function deleteEntry(id,desc) {
  if (confirm(`Delete ${desc} entry?`)) {
    saveLastState();
    // Find which ledger contains the entry
  let entry = ledger.find(tx => tx.id === id);
  if (!entry) return alert("not found"); // not found in any ledger

  if (entry.transactionType === "linked-transaction") {
    const note = `NOTE: This will also delete the transaction from both ${entry.transferredFrom} and ${entry.transferredTo} ledgers?`;
    if(!confirm(note)) return;
    
    let fromLedger = ledger;
    let toLedger = JSON.parse(localStorage.getItem(entry.transferredTo) || "[]");
    
    // Remove from both
    fromLedger = fromLedger.filter(tx => tx.id !== id);
    toLedger = toLedger.filter(tx => tx.id !== id);
    
    ledger = fromLedger;
    // Save both back
    localStorage.setItem(entry.transferredFrom, JSON.stringify(fromLedger));
    localStorage.setItem(entry.transferredTo, JSON.stringify(toLedger));
  }else {

    const idx = ledger.findIndex(tx => tx.id === id);
    // Find index of entry by ID
    if (idx !== -1) {
      ledger.splice(idx, 1);
    }
    saveToLocalStorage();
  }
  renderTable();
  renderCharts(ledger);
  clearFilters();
  }
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
// imports
async function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      const baseName = file.name.replace(/\.json$/, '');
      let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
      ledgers = [...new Set(ledgers)];
      
      // Handle duplicate ledger names
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
      
      // Normalize ledger structure (support array or object with { ledger: [...] })
      let importedLedger;
      if (Array.isArray(importedData)) {
        importedLedger = importedData;
      } else if (importedData.ledger) {
        importedLedger = importedData.ledger;
      } else {
        alert("Invalid JSON format!");
        return;
      }
      
      // Ensure every entry has an id
      for (let entry of importedLedger) {
        if (!entry.id) {
          entry.id = await generateTransactionId(entry.date, entry.desc, entry.amount);
        }
        if (!entry.account) entry.account = "Miscellaneous"; // fallback
      }
      
      ledger = importedLedger;
      
      // Save to localStorage
      localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));
      if (!ledgers.includes(currentLedgerKey)) {
        ledgers.push(currentLedgerKey);
        localStorage.setItem("ledgers", JSON.stringify(ledgers));
      }
      
      localStorage.setItem("currentLedgerKey", currentLedgerKey);
      
      // UI updates
      document.getElementById("filename").value = fileName;
      updateLedgerSelect();
      renderTable();
      renderCharts(ledger);
      
      alert(`Ledger ${currentLedgerKey}  imported successfully ✅`);
    } catch (err) {
      alert("Error importing file ❌");
      console.error(err);
    }
  };
  reader.readAsText(file);
}
// ===== TXT Import =====
async function importTXT(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const lines = e.target.result.split("\n").filter(l => l.trim() !== "");
      let importedLedger = [];

      for (let line of lines) {
        const [date, account, desc, type, amount] = line.split(",");
        importedLedger.push({
          id: await generateTransactionId(date, desc, parseFloat(amount)),
          date: date.trim(),
          account: account?.trim() || "Miscellaneous",
          desc: desc?.trim() || "",
          type: type?.trim().toLowerCase(),
          amount: parseFloat(amount) || 0
        });
      }

      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing TXT ❌");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ===== CSV Import =====
async function importCSV(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const rows = e.target.result.split("\n").map(r => r.split(","));
      const headers = rows.shift().map(h => h.trim().toLowerCase());
      let importedLedger = [];

      for (let row of rows) {
        if (row.length < 4) continue;
        const entry = {};
        headers.forEach((h, i) => {
          entry[h] = row[i]?.trim();
        });

        importedLedger.push({
          id: await generateTransactionId(entry.date, entry.description, parseFloat(entry.amount)),
          date: entry.date,
          account: entry.account || "Miscellaneous",
          desc: entry.description || "",
          type: entry.type?.toLowerCase(),
          amount: parseFloat(entry.amount) || 0
        });
      }

      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing CSV ❌");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ===== XLS / XLSX Import =====
async function importXLSX(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let importedLedger = [];
      for (let row of rows) {
        importedLedger.push({
          id: await generateTransactionId(row.Date, row.Description, parseFloat(row.Amount)),
          date: row.Date,
          account: row.Account || "Miscellaneous",
          desc: row.Description || "",
          type: row.Type?.toLowerCase(),
          amount: parseFloat(row.Amount) || 0
        });
      }

      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing Excel ❌");
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ===== PDF Import ===== (simple text extraction, not structured)
async function importPDF(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const pdfData = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

      let textContent = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        textContent += content.items.map(i => i.str).join(" ") + "\n";
      }

      // Very basic assumption: CSV-like format inside PDF text
      const lines = textContent.split("\n").filter(l => l.includes(","));
      let importedLedger = [];

      for (let line of lines) {
        const [date, account, desc, type, amount] = line.split(",");
        importedLedger.push({
          id: await generateTransactionId(date, desc, parseFloat(amount)),
          date: date?.trim(),
          account: account?.trim() || "Miscellaneous",
          desc: desc?.trim() || "",
          type: type?.trim().toLowerCase(),
          amount: parseFloat(amount) || 0
        });
      }

      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing PDF ❌");
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ===== Common Finalize Import =====
async function finalizeImport(file, importedLedger) {
  try {
    const baseName = file.name.replace(/\.[^/.]+$/, ""); // remove extension
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

    // Ensure IDs
    for (let entry of importedLedger) {
      if (!entry.id) {
        entry.id = await generateTransactionId(entry.date, entry.desc, entry.amount);
      }
      if (!entry.account) entry.account = "Miscellaneous";
    }

    ledger = importedLedger;
    localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));

    if (!ledgers.includes(currentLedgerKey)) {
      ledgers.push(currentLedgerKey);
      localStorage.setItem("ledgers", JSON.stringify(ledgers));
    }

    localStorage.setItem("currentLedgerKey", currentLedgerKey);

    document.getElementById("filename").value = fileName;
    updateLedgerSelect();
    renderTable();
    renderCharts(ledger);

    alert(`Ledger ${currentLedgerKey} imported successfully ✅`);
  } catch (err) {
    alert("Error finalizing import ❌");
    console.error(err);
  }
}

// ===== Master Import Handler =====
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  // other import formats pending
  const ext = file.name.split(".").pop().toLowerCase();
  switch (ext) {
    case "json": return importJSON(event);
   /* case "txt": return importTXT(file);
    case "csv": return importCSV(file);
    case "xls":
    case "xlsx": return importXLSX(file);
    case "pdf": return importPDF(file);
   */
   default:
      alert("Unsupported file format ❌");
  }
}

// exports 
function handleExport() {
  const format = document.getElementById("exportFormat").value;
  
  if (!format) {
    alert("Please select an export format.");
    return;
  }
  
  switch (format) {
    case "json":
      exportJSON();
      break;
    case "excel":
      exportToExcel();
      break;
    case "pdf":
      exportToPDF();
      break;
    case "png":
      exportToPNG();
      break;
    default:
      alert("Unsupported export format!");
  }
  return;
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
/*
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
*/
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
  
  // ====== TABLE (exclude Actions column) ======
  doc.autoTable({
    html: 'table',
    startY: 50,
    styles: { fontSize: 10, textColor: textColor, lineColor: primaryColor, lineWidth: 0.2 },
    headStyles: { fillColor: primaryColor, textColor: "#ffffff", fontStyle: "bold" },
    bodyStyles: { fillColor: secondaryColor },
    alternateRowStyles: { fillColor: "#ffffff" },
    
    // 🚀 keep only the first 7 columns (exclude "Actions")
    columns: [
      { header: 'Sl.No', dataKey: 0 },
      { header: 'Date', dataKey: 1 },
      { header: 'Account', dataKey: 2 },
      { header: 'Description', dataKey: 3 },
      { header: 'Type', dataKey: 4 },
      { header: 'Amount', dataKey: 5 },
      { header: 'Closing Balance', dataKey: 6 }
    ],
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
function exportToPNG() {
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
  alert('error')
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
  isUsingFilter = true;

  const desc = document.getElementById('searchDesc').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const minAmount = parseFloat(document.getElementById('minAmount').value);
  const maxAmount = parseFloat(document.getElementById('maxAmount').value);
  const selectedAccount = document.getElementById('filter-accounts').value;

  const filtered = ledger.filter(entry => {
    const matchesDesc = desc ? entry.desc.toLowerCase().includes(desc) : true;
    const matchesType = type ? entry.type === type : true;
    const matchesStart = startDate ? entry.date >= startDate : true;
    const matchesEnd = endDate ? entry.date <= endDate : true;
    const matchesMinAmount = !isNaN(minAmount) ? entry.amount >= minAmount : true;
    const matchesMaxAmount = !isNaN(maxAmount) ? entry.amount <= maxAmount : true;
    const matchesAccount = selectedAccount ? entry.account === selectedAccount : true;

    return (
      matchesDesc &&
      matchesType &&
      matchesStart &&
      matchesEnd &&
      matchesMinAmount &&
      matchesMaxAmount &&
      matchesAccount
    );
  });

  globalFilterData = filtered;
  renderTable(filtered);
  renderCharts(filtered);
  renderReports(filtered);
  renderAdvancedReports(filtered);
  renderUpcomingExpectations(filtered);
  updateSpecialInsights(filtered);
}

function clearFilters() {
  isUsingFilter = false;
  document.getElementById('searchDesc').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('minAmount').value = '';
  document.getElementById('maxAmount').value = '';
  document.getElementById('filter-accounts').value = '';

  renderTable();
  refreshReports() ;
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

async function createNewLedger() {
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
    id : await generateTransactionId(getCurrentDate(),"Opening Balance",0),
    account : 'Capital',
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
window.onload = async function() {
  buildAccountSelector();
  
  let savedLedgers = JSON.parse(localStorage.getItem("ledgers") || "[]");

  // Remove duplicates
  savedLedgers = [...new Set(savedLedgers)];

  // Save cleaned version
  localStorage.setItem("ledgers", JSON.stringify(savedLedgers));

  // If no ledgers, create only one "Untitled"
  if (savedLedgers.length === 0) {
    const defaultLedger = [{
      id : await generateTransactionId(getCurrentDate(),"Opening Balance",0),
      date: getCurrentDate(),
      account : 'Capital',
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
  buildFilterAccounts()
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




function generateReports(data ) {
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

function renderReports(data = ledger) {
  const reports = generateReports(data);
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
  
  // Top 5 incomes & expenses (with all details)
  const topIncomes = [...incomes].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  
  // Frequent transactions (by account only)
  const accountCount = {};
  data.forEach(txn => {
    let account = txn.account?.trim() || "No Account";
    accountCount[account] = (accountCount[account] || 0) + 1;
  });
  const frequentTransactions = Object.entries(accountCount)
    .filter(([account, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  // Recurring transactions (same account + amount + type)
  const recurringMap = {};
  data.forEach(txn => {
    let account = txn.account?.trim() || "No Account";
    const key = JSON.stringify({ account, amount: txn.amount, type: txn.type });
    if (!recurringMap[key]) {
      recurringMap[key] = { ...txn, count: 0 };
    }
    recurringMap[key].count++;
  });
  
  const recurringTransactions = Object.values(recurringMap).filter(r => r.count > 1);
  
  return { topIncomes, topExpenses, frequentTransactions, recurringTransactions };
}

function renderAdvancedReports(data = ledger) {
  const { topIncomes, topExpenses, frequentTransactions, recurringTransactions } = generateAdvancedReports(data);
  
  // Top incomes
  document.getElementById("topIncomesList").innerHTML = topIncomes.length ?
    topIncomes
    .map(
      txn =>
      `<li>${txn.account} | ${txn.desc} – ₹${txn.amount} on ${txn.date}</li>`
    )
    .join("") :
    "<li>No transactions found</li>";
  
  // Top expenses
  document.getElementById("topExpensesList").innerHTML = topExpenses.length ?
    topExpenses
    .map(
      txn =>
      `<li>${txn.account} | ${txn.desc} – ₹${txn.amount} on ${txn.date}</li>`
    )
    .join("") :
    "<li>No transactions found</li>";
  
  // Frequent accounts
  document.getElementById("frequentList").innerHTML = frequentTransactions.length ?
    frequentTransactions
    .map(([account, count]) => `<li>${account} – ${count} transactions</li>`)
    .join("") :
    "<li>No transactions found</li>";
  
  // Recurring
  document.getElementById("recurringList").innerHTML = recurringTransactions.length ?
    recurringTransactions
    .map(
      txn =>
      `<li>${txn.date} | ${txn.account} | ${txn.desc} – ₹${txn.amount} (${txn.count} times)</li>`
    )
    .join("") :
    "<li>No transactions found</li>";
}
function generateUpcomingExpectations(data) {
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

function renderUpcomingExpectations(data = ledger) {
  const upcoming = generateUpcomingExpectations(data);
  
  document.getElementById("upcomingList").innerHTML = upcoming.length ?
    upcoming.map(txn => `<li>${txn.desc} – ₹${txn.amount} (${txn.type})</li>`).join("") :
    "<li>No upcoming expected transactions found</li>";
}


// ===== Special Insights =====
function updateSpecialInsights(data = ledger) {
  if (!data.length) {
    document.getElementById("highestIncome").innerHTML = "<strong>Highest Income:</strong> No data found";
    document.getElementById("highestExpense").innerHTML = "<strong>Highest Expense:</strong> No data found";
    document.getElementById("zeroDays").innerHTML = "<strong>Zero Spent Days:</strong> No data found";
    document.getElementById("incomeRatio").innerHTML = "<strong>Income Ratio:</strong> No data found";
    return;
  }
  
  // Highest Income
  let highestIncome = data.filter(t => t.type === "income").sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("highestIncome").innerHTML =
    highestIncome ?
    `<strong>Highest Income:</strong> ₹${highestIncome.amount} (${highestIncome.desc} on ${highestIncome.date})` :
    "<strong>Highest Income:</strong> No data found";
  
  // Highest Expense
  let highestExpense = data.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("highestExpense").innerHTML =
    highestExpense ?
    `<strong>Highest Expense:</strong> ₹${highestExpense.amount} (${highestExpense.desc} on ${highestExpense.date})` :
    "<strong>Highest Expense:</strong> No data found";
  
  // Zero Spent Days (list format)
  let expenseDates = new Set(data.filter(t => t.type === "expense").map(t => t.date));
  let allDates = new Set(data.map(t => t.date));
  let zeroSpentDays = [...allDates].filter(d => !expenseDates.has(d));
  
  if (zeroSpentDays.length) {
    document.getElementById("zeroDays").innerHTML =
      `<strong>Zero Spent Days:</strong><ul>${zeroSpentDays.map(date => `<li>${date}</li>`).join("")}</ul>`;
  } else {
    document.getElementById("zeroDays").innerHTML = "<strong>Zero Spent Days:</strong> No data found";
  }
  
  // Income Ratio (Expense / Income * 100)
  let totalIncome = data.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  let totalExpense = data.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
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
  buildFilterAccounts();
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


function scrollToTop(top = 0) {
  window.scrollTo({ top: top, behavior: 'smooth' });
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

// === Wealth Light Update ===
function updateWealthLight(income, expenses) {
  const light = document.getElementById("wealthLight");
  const title = document.getElementById("wealthTitle");
  if (!light) return;
  
  if (income >= expenses) {
    light.className = "wealth-light green";
    title.textContent = "Good financial health";
  } else if (income >= expenses * 0.7) {
    light.className = "wealth-light yellow";
    title.textContent = "Warning: More expenses than income";
  } else {
    light.className = "wealth-light red";
    title.textContent = "Danger: Too many expenses!";
  }
}

// === Smart Plan for Low Balance ===
function showLowBalancePlan(balance) {
  const alertDiv = document.getElementById("planSection");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lowAmount = 500;
  // Get remaining days in this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = daysInMonth - today.getDate() + 1; // include today
  if(balance < 0){
    alertDiv.style.display = "block";
    alertDiv.innerHTML = `
      <h2><i class="fa-solid fa-warning"></i> Low Balance Alert</h2>
      <p>Your balance is low</p>
      <p>Suggested expense plan for this Month:</p>
      <ul>
        <li>Total Remaining Days: ${remainingDays}</li>
        <li>Daily Allowance: 00</li>
      </ul>
      <p><b>Total Planned = No expenses per day until some income is received.</b></p>
    `;
    return;
  }
  if (balance < lowAmount && remainingDays > 0) {
    const perDay = Math.floor(balance / remainingDays);
    
    alertDiv.innerHTML = `
      <h2><i class="fa-solid fa-warning"></i> Low Balance Alert</h2>
      <p>Your balance is below ₹${lowAmount}.</p>
      <p>Suggested expense plan for this Month (equal split):</p>
      <ul>
        <li>Total Remaining Days: ${remainingDays}</li>
        <li>Daily Allowance: ~₹${perDay} per day</li>
      </ul>
      <p><b>Total Planned ${perDay + " x " + remainingDays}  = ₹${perDay * remainingDays}</b></p>
    `;
    alertDiv.style.display = "block";
  } else {
    alertDiv.style.display = "none";
  }
}