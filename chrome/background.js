chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "findSimilarText",
    title: "Find Similar Text",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "searchRegexp",
    title: "Search RegExp",
    contexts: ["all"]
  });
  updateContextMenu();
});

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

async function updateContextMenu() {
  const regexps = await getRegexps();

  // Remove existing submenu items
  chrome.contextMenus.removeAll();

  // Add a parent menu item
  chrome.contextMenus.create({
    id: "searchRegexp",
    title: "Search RegExp",
    contexts: ["all"]
  });

  // Add submenu items for each regexp
  Object.keys(regexps).forEach(name => {
    chrome.contextMenus.create({
      id: name,
      title: name,
      parentId: "searchRegexp",
      contexts: ["all"]
    });
  });
}

// Add onClicked event listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "searchRegexp") {
    const regexps = await getRegexps();

    const regexp = regexps[info.menuItemId],
      regexpName = info.menuItemId;
    performSearch(regexpName, regexp, tab);
  }
});

function performSearch(regexpName, regexp, tab) {
  const tabId = tab.id,
    action = "useRegexp",
    data = { regexp, selectedText: "", regexpName, tabId };
  chrome.tabs.sendMessage(tab.id, { action, data }, (response) => {
    if (response) {
      handleStateUpdate(tab.id, response);
    } else {
      console.log("No response from content script for ",
        "action", action,
        "data", data);
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "findSimilarText") {
    const action = "findSimilar",
      data = { text: info.selectionText };
    chrome.tabs.sendMessage(tab.id, { action, data }, (response) => {
      if (response) {
        handleStateUpdate(tab.id, response);
      } else {
        console.log("No response from content script for ",
          "action", action,
          "data", data);
      }
    });
  }
});

const state = {
  tabState: {},
};

const updateState = (tabId, newState) => {
  console.log("updateState", "state", state, "newState", newState);
  const tabState = getState(tabId);
  state[tabId] = { ...tabState, ...newState };
};

const emptyState = () => ({
  regexp: "",
  histogramData: {},
  selectedText: "",
});

const getState = (tabId) => state[tabId] || emptyState();
const clearState = (tabId) => state[tabId] = emptyState();

const handleStateUpdate = (tabId, data) => {
  const { regexp, histogramData, selectedText } = data;
  updateState(tabId, { regexp, histogramData, selectedText });
  // TODO: This doesn't work
  const res = chrome.notifications.create(`textAnalysisComplete-${tabId}`, {
    type: "basic",
    iconUrl: "images/icon.png",
    title: "Text Analysis Complete",
    message: "Click the extension icon to refine your search and view the histogram."
  }, function (notificationId) {
    console.log("Notification created with ID:", notificationId);
  });
  console.log("chrome.notifications.create =>", res);

  const numResults = Object.keys(histogramData).length;
  chrome.action.setBadgeText({ text: `${numResults}` });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("background handler", "message", message, "sender", sender);

  let { action, data } = message;
  data = data || {};

  if (action === "forwardToContentScript") {
    const { tabId, contentScriptData } = message;
    chrome.tabs.sendMessage(tabId, contentScriptData);
    return;
  }

  if (action === "sendRegExp") {
    let { tabId } = data;
    if (!tabId) tabId = sender.tab.id;
    handleStateUpdate(tabId, data);
    return;
  }

  if (action == "clearStateForTab") {
    let { tabId } = data;
    if (!tabId) tabId = sender.tab.id;
    clearState(tabId);
    chrome.action.setBadgeText({ text: "" });
    sendResponse("cleared");
    return;

  }

  if (action === "requestRegExp") {
    let { tabId } = data;
    if (!tabId) tabId = sender.tab.id;
    const tabState = getState(tabId);
    sendResponse(tabState);
    return;
  }

  if (action == "findSimilar") {
    const { text } = data;
    chrome.runtime.sendMessage({ action: "findSimilar", text }, response => {
      const tabId = "";
      handleStateUpdate(tabId, response);
      sendResponse(response);
    });
    return;
  }

  if (action === "updateContextMenu") {
    updateContextMenu();
    return;
  }

  console.log("unhandled background handler", "message", message, "sender", sender);
});
