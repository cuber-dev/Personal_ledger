function setToday() {
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  return today;
}

document.addEventListener("DOMContentLoaded", () => {
  setToday();

  const fromLedger = document.getElementById("fromLedger");
  const toLedger = document.getElementById("toLedger");
  const txnAccount = document.getElementById("txnAccount");
  const transferForm = document.getElementById("transferForm");
  const ledgerTableBody = document.querySelector("#ledgerTable tbody");
  const finalBalanceCell = document.getElementById("finalBalance");

  // ✅ Your transaction accounts
  const accounts = [
    "Bank","Cash","Accounts Receivable","Fixed Assets","Investments","Prepaid Expenses","Inventory","Savings",
    "Accounts Payable","Credit Card","Loans","Taxes Payable",
    "Capital","Owner’s Equity","Retained Earnings",
    "Bonus","Business Income","Commission","Interest Income","Other Income","Salary",
    "Bills","Education","Entertainment","Food","Healthcare","Insurance","Miscellaneous","Rent","Shopping",
    "Subscriptions","Taxes","Travel","Utilities","Business Partners","Refunds","Repairs & Maintenance","Fuel",
    "Telecom","Service Charges","Family Support","Vehicle","Cash Reimbursement","Household","Bank Charges"
  ].sort();

  // ✅ Populate transaction accounts dropdown
  function populateAccounts() {
    txnAccount.innerHTML = "<option value=''>Select Transaction Account</option>";
    accounts.forEach(acc => txnAccount.add(new Option(acc, acc)));
  }

  // ✅ Load ledgers
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");

  // Populate ledger dropdowns
  function populateDropdowns() {
    fromLedger.innerHTML = "<option value=''>Select From Ledger</option>";
    toLedger.innerHTML = "<option value=''>Select To Ledger</option>";
    ledgers.forEach(l => {
      fromLedger.add(new Option(l, l));
      toLedger.add(new Option(l, l));
    });
  }

  populateAccounts();
  populateDropdowns();

  // ✅ Balance calculation
  function getLedgerBalance(ledgerName) {
    try {
      let data = JSON.parse(localStorage.getItem(ledgerName) || "[]");
      if (!Array.isArray(data)) return 0;

      let income = 0, expense = 0;
      data.forEach(tx => {
        let amt = parseFloat(tx.amount) || 0;
        if (tx.type === "income") income += amt;
        if (tx.type === "expense") expense += amt;
      });
      return income - expense;
    } catch {
      return 0;
    }
  }

  // ✅ Refresh balances table
  function refreshLedgerTable() {
    ledgerTableBody.innerHTML = "";
    let total = 0;
    ledgers.forEach(l => {
      let bal = getLedgerBalance(l);
      total += bal;
      let row = document.createElement("tr");
      row.innerHTML = `<td>${l}</td><td>${bal.toFixed(2)}</td>`;
      ledgerTableBody.appendChild(row);
    });
    finalBalanceCell.textContent = total.toFixed(2);
  }
  refreshLedgerTable();

  // ✅ Handle transfer
  transferForm.addEventListener("submit", e => {
    e.preventDefault();

    const from = fromLedger.value;
    const to = toLedger.value;
    const amount = parseFloat(document.getElementById("amount").value);
    const date = document.getElementById("date").value;
    const desc = document.getElementById("desc").value;
    const acc = txnAccount.value;

    if (!from || !to || from === to || !acc || isNaN(amount) || amount <= 0) {
      return alert("Please fill all fields correctly.");
    }

    // Create transaction objects
    const txOut = {
      id: Date.now() + "-out",
      date,
      account: acc,
      type: "expense",
      transactionType: "transfer-out",
      transferredTo : to,
      amount,
      desc: desc + ` To Ledger: ${to}`
    };

    const txIn = {
      id: Date.now() + "-in",
      date,
      account: acc,
      type: "income",
      transactionType: "transfer-in",
      transferredFrom : from,
      amount,
      desc: desc + ` From Ledger: ${from}`
    };
    console.log(txOut,txIn)
    // Save to localStorage
    let fromData = JSON.parse(localStorage.getItem(from) || "[]");
    fromData.push(txOut);
    localStorage.setItem(from, JSON.stringify(fromData));

    let toData = JSON.parse(localStorage.getItem(to) || "[]");
    toData.push(txIn);
    localStorage.setItem(to, JSON.stringify(toData));

    alert(`Transferred ${amount} (${acc}) from ${from} ➝ ${to}`);

    transferForm.reset();
    populateAccounts();
    populateDropdowns();
    refreshLedgerTable();
    setToday();
  });

  // ✅ Clear button
  document.getElementById("clearBtn").addEventListener("click", () => {
    transferForm.reset();
    setToday();
  });

});