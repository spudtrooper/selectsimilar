chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "findSimilarText",
    title: "Find Similar Text",
    contexts: ["selection"]
  });
});

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

const setState = (tabId, newState) => {
  console.log("setState", "state", state, "newState", newState);
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
  setState(tabId, { regexp, histogramData, selectedText });
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

  console.log("unhandled background handler", "message", message, "sender", sender);
});
