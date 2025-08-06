let ledger = [];
let editingIndex = null;

window.onload = async function () {
  try {
    const response = await fetch("records.json");
    if (!response.ok) throw new Error("Failed to load JSON");
    ledger = await response.json();
    renderTable();
  } catch (err) {
    alert("Could not load records.json. Please make sure the file exists.");
  }
};

function renderTable() {
  const table = document.getElementById("tableBody");
  const balanceDiv = document.getElementById("balance");
  table.innerHTML = "";
  let balance = 0;

  ledger.forEach((entry, index) => {
    if (entry.type === "income") balance += entry.amount;
    else balance -= entry.amount;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.desc}</td>
      <td>${entry.type}</td>
      <td>₹${entry.amount.toFixed(2)}</td>
      <td class="actions">
        <button onclick="editEntry(${index})">Edit</button>
        <button onclick="deleteEntry(${index})">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });

  balanceDiv.textContent = `Balance: ₹${balance.toFixed(2)}`;
}

document.getElementById("entryForm").addEventListener("submit", function (e) {
  e.preventDefault();
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
}

function deleteEntry(index) {
  if (confirm("Delete this entry?")) {
    ledger.splice(index, 1);
    renderTable();
  }
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "records.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      ledger = JSON.parse(e.target.result);
      renderTable();
    } catch (error) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}