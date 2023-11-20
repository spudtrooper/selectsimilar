document.addEventListener("DOMContentLoaded", loadRegexps);
document.getElementById("regexpForm").addEventListener("submit", addRegexp);

class Messages {
  constructor () {
    this.messages = [];
  }

  add(msg) {
    const id = Math.random().toString(36).substring(7);
    this.messages.push({ id, msg });
    return id;
  }

  remove(id) {
    const msg = this.messages.find(({ id: msgId }) => msgId === id);
    if (!msg) {
      return;
    }
    this.messages = this.messages.filter(({ id: msgId }) => msgId !== id);
  }

  show() {
    const messages = document.getElementById("messages");
    messages.innerHTML = "";
    messages.style.display = this.messages.length ? "block" : "none";
    this.messages.forEach(({ id, msg }) => {
      const msgDiv = document.createElement("div");
      msgDiv.textContent = msg;
      messages.appendChild(msgDiv);
    });
  }
}

const msgs = new Messages();

function showMessage(msg) {
  console.log("showMessage", msg);
  const id = msgs.add(msg);
  msgs.show();
  setTimeout(() => {
    msgs.remove(id);
    msgs.show();
  }, 5000);
}

function getRegexps() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('regexps', function (data) {
      if (chrome.runtime.lastError) {
        reject(`Error retrieving regexps: ${chrome.runtime.lastError}`);
        return;
      }

      const regexps = data.regexps || {};
      resolve(regexps);
    });
  });
}

async function loadRegexps() {
  // Use Chrome"s storage API to get the saved regexps
  const regexps = await getRegexps();

  const tbody = document.getElementById("regexpTable").getElementsByTagName("tbody")[0];

  Object.keys(regexps).forEach(name => {
    const tr = document.createElement("tr");

    // Create name cell
    const nameTd = document.createElement("td");
    nameTd.className = "name";
    nameTd.textContent = name;
    tr.appendChild(nameTd);

    // Create regexp cell
    const regexpTd = document.createElement("td");
    regexpTd.className = "regexp";
    regexpTd.textContent = regexps[name];
    tr.appendChild(regexpTd);

    // Create actions cell
    const actionsTd = document.createElement("td");
    const editButton = createButton("Edit", () => editRegexp(name));
    const deleteButton = createButton("Delete", async () => (await deleteRegexp(name)));
    actionsTd.appendChild(editButton);
    actionsTd.appendChild(deleteButton);
    tr.appendChild(actionsTd);

    // Append the row to the table
    tbody.appendChild(tr);
  });

  const statusEl = document.getElementById("status");
  statusEl.textContent = Object.keys(regexps).length ? "" : "No regular expressions saved.";
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function addRegexp(event) {
  event.preventDefault();

  // Get the values from the input fields
  const name = document.getElementById("name").value.trim();
  const regexp = document.getElementById("regexp").value.trim();

  // Validate input
  if (!name || !regexp) {
    alert("Both name and regular expression are required.");
    return;
  }

  // Add to the table
  addToTable(name, regexp);

  // Save to Chrome storage
  await saveRegexp(name, regexp);

  // Clear the form fields
  document.getElementById("name").value = "";
  document.getElementById("regexp").value = "";
}

function addToTable(name, regexp) {
  const tbody = document.getElementById("regexpTable").getElementsByTagName("tbody")[0];
  const tr = document.createElement("tr");

  // Name cell
  const nameTd = document.createElement("td");
  nameTd.textContent = name;
  tr.appendChild(nameTd);

  // Regexp cell
  const regexpTd = document.createElement("td");
  regexpTd.textContent = regexp;
  tr.appendChild(regexpTd);

  // Actions cell
  const actionsTd = document.createElement("td");
  const editButton = createButton("Edit", () => editRegexp(name));
  const deleteButton = createButton("Delete", () => deleteRegexp(name));
  actionsTd.appendChild(editButton);
  actionsTd.appendChild(deleteButton);
  tr.appendChild(actionsTd);

  tbody.appendChild(tr);
}

async function saveRegexp(name, regexp) {
  const regexps = await getRegexps();
  regexps[name] = regexp;

  // Save back to Chrome storage
  chrome.storage.local.set({ regexps }, function () {
    if (chrome.runtime.lastError) {
      showMessager(`Error saving regexps: ${chrome.runtime.lastError}`);
    } else {
      showMessage(`Saved ${name}`);
    }
    chrome.runtime.sendMessage({ action: "updateContextMenu" });
  });
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function editRegexp(name) {
  const regexps = await getRegexps();
  const oldValue = regexps[name];

  const newValue = prompt("Enter the new regular expression for " + name, oldValue);
  if (newValue === null || newValue.trim() === "" || newValue === oldValue) {
    showMessage("No change made.");
    return; // User cancelled the edit
  }

  // Find the row with this name and update it
  const rows = document.getElementById("regexpTable").getElementsByTagName("tbody")[0].rows;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].cells[0].textContent === name) {
      rows[i].cells[1].textContent = newValue;
      break;
    }
  }

  // Save the updated regexp to Chrome storage
  await saveRegexp(name, newValue);
}

async function deleteRegexp(name) {
  if (!confirm("Are you sure you want to delete the regular expression for " + name + "?")) {
    showMessage(`Cancelled deleting ${name}`);
    return;
  }

  // Remove the row from the table
  const tbody = document.getElementById("regexpTable").getElementsByTagName("tbody")[0];
  const rows = tbody.rows;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].cells[0].textContent === name) {
      tbody.removeChild(rows[i]);
      break;
    }
  }

  // Remove from Chrome storage
  const regexps = await getRegexps();
  delete regexps[name];
  chrome.storage.local.set({ regexps });
  showMessage(`Removed ${name}`);
  chrome.runtime.sendMessage({ action: "updateContextMenu" });
}
