// Request RegExp from background when popup opens
// Need to include the tabId in the request
const sendBackgroundMessage = ({ action, data, callback }) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    data = { ...(data || {}), tabId };
    chrome.runtime.sendMessage({ action, data }, response => {
      if (callback && response) {
        callback(response);
      }
    });
  });
};

const sendMessageToContentScript = ({ action, data }) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    data = data || {};
    data = { ...data, tabId };
    chrome.runtime.sendMessage({
      action: "forwardToContentScript",
      tabId: tabs[0].id,
      contentScriptData: { action, data },
    });
  });
};

const populateHistogramTable = (histogramData) => {
  histogramData = histogramData || {};

  updateHistogramTable(histogramData);

  const clearWrapper = document.getElementById("clearWrapper");
  clearWrapper.style.display = Object.keys(histogramData).length ? "block" : "none";
};

const handleStateUpdate = ({ regexp, histogramData, selectedText }) => {
  document.getElementById("regexInput").value = regexp || "";
  document.getElementById("selectedTextInput").value = selectedText || "";
  populateHistogramTable(histogramData);
};

const alignRegExp = (regexp) => {
  // TODO: This is terrible
  regexp = regexp.replace(/\\d\+/g, "[0-9]+");
  regexp = regexp.replace(/\[0-9\]\+/g, "[0-9a-z]+");
  regexp = regexp.replace(/\[0-9a-z\]\+/g, "[0-9a-zA-Z]+");
  regexp = regexp.replace(/\[0-9A-Z\]\+/g, "[0-9a-zA-Z]+");
  return regexp;
};

const reset = () =>
  sendBackgroundMessage({ action: "requestRegExp", callback: handleStateUpdate });

// Time to wait after requesting a change calling `reset()`
const HACK_WAIT_MILLIS = 300;

const apply = () => {
  const selectedText = document.getElementById("selectedTextInput").value;
  const regexp = document.getElementById("regexInput").value;
  const data = { regexp, selectedText };
  sendMessageToContentScript({ action: "useRegexp", data });
  setTimeout(reset, HACK_WAIT_MILLIS);
};

const main = () => {
  addHistogramWrapper(document.getElementById("histogramWrapperWrapper"));

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let { action, data } = message;
    data = data || {};

    if (action === "sendRegExp") {
      handleStateUpdate(data);
      return;
    }
  });

  const addEventListener = (id, event, handler) => {
    document.getElementById(id).addEventListener(event, () => {
      note(`handling ${event} event for element ${id}`);
      handler();
    });
  };

  addEventListener("applyRegexButton", "click", () => {
    apply();
  });

  addEventListener("saveRegexButton", "click", () => {

    // TODO
    alert("TODO: Go to options and add it there.");
  });


  addEventListener("generalizeButton", "click", () => {
    const currentRegExp = document.getElementById("regexInput").value;
    const alignedRegExp = alignRegExp(currentRegExp);
    document.getElementById("regexInput").value = alignedRegExp || "";
    apply();
  });

  addEventListener("searchButton", "click", () => {
    const text = document.getElementById("selectedTextInput").value;
    const data = { text };
    sendMessageToContentScript({ action: "findSimilar", data });
  });

  addEventListener("clearButton", "click", () => {
    sendMessageToContentScript({ action: "clear" });
    setTimeout(reset, HACK_WAIT_MILLIS);
  });

  sendMessageToContentScript({ action: "closeHistogramTable" });
  reset();
};;

main();
