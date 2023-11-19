const convertToRegex = (inputString) => {
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const determinePattern = (cluster) => {
    if (/^\d+$/.test(cluster)) {
      return '\\d+';
    } else if (/^[0-9a-z]+$/.test(cluster)) {
      return '[0-9a-z]+';
    } else if (/^[0-9A-Z]+$/.test(cluster)) {
      return '[0-9A-Z]+';
    } else if (/^[0-9a-zA-Z]+$/.test(cluster)) {
      return '[0-9a-zA-Z]+';
    } else if (/^\w+$/.test(cluster)) {
      return '\\w+';
    }
    return escapeRegExp(cluster);
  };

  // Match word clusters and non-word characters
  const segments = inputString.match(/(\w+|\W+)/g);

  // Convert each segment to its regex pattern
  const regexParts = segments.map(segment =>
    /\w/.test(segment) ? determinePattern(segment) : escapeRegExp(segment)
  );

  return regexParts.join('');
};

const HIGHLIGHT_CLASS_NAME = "__highlight";

const highlightMatchingText = (regexPattern) => {
  const findHistogramData = () => {
    const histogramData = {};

    const count = (text) => {
      if (!histogramData[text]) {
        histogramData[text] = 0;
      }
      histogramData[text]++;
    };

    const search = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragments = node.textContent.split(new RegExp(`(${regexPattern})`, 'gi'));
        if (fragments.length > 1) {
          fragments.filter(fragment => fragment.match(new RegExp(regexPattern, 'gi')))
            .forEach(count);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.nodeName)) {
        Array.from(node.childNodes).forEach(search);
      }
    };

    search(document.body);

    return histogramData;
  };

  const histogramData = findHistogramData();
  const colorFinder = new ColorFinder(histogramData);

  const highlight = (text) => {
    const span = document.createElement('span');
    span.className = HIGHLIGHT_CLASS_NAME;
    const backgroundColor = colorFinder.colorForText(text);
    span.style.backgroundColor = backgroundColor;
    span.textContent = text;
    return span;
  };

  const searchAndHighlight = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragments = node.textContent.split(new RegExp(`(${regexPattern})`, 'gi'));
      if (fragments.length > 1) {
        const parent = node.parentNode;
        fragments.forEach(fragment => {
          parent.insertBefore(fragment.match(new RegExp(regexPattern, 'gi')) ? highlight(fragment) : document.createTextNode(fragment), node);
        });
        parent.removeChild(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.nodeName)) {
      Array.from(node.childNodes).forEach(searchAndHighlight);
    }
  };

  searchAndHighlight(document.body);

  return histogramData;
};

const clearHighlights = () => {
  const els = document.querySelectorAll(`.${HIGHLIGHT_CLASS_NAME}`);
  els.forEach(span => {
    const textNode = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(textNode, span);
  });
};

const searchAndHighlightSelectedText = (selectedText) => {
  const regexp = convertToRegex(selectedText);
  return searchAndHighlightSelectedTextAndRegexp(selectedText, regexp);
};

const showHistogramTable = (histogramData) => {
  const showing = updateHistogramTable(histogramData);
  updateState({ histogramShowing: showing });

};

const closeHistogramTable = () => {
  closeHistogramTableWrapper();
  updateState({
    histogramShowing: false,
  });
};


const searchAndHighlightSelectedTextAndRegexp = (selectedText, regexp) => {
  note("selectedText", selectedText);
  note("regexp", regexp);
  const histogramData = highlightMatchingText(regexp);
  updateHistogramTable(histogramData);
  const data = { regexp, histogramData, selectedText };
  return data;
};

const findSimilar = (text, tabId) => {
  const selectedText = text;
  clearHighlights();
  const dataFromSearch = searchAndHighlightSelectedText(selectedText);
  const dataToSend = { ...dataFromSearch, tabId };
  return dataToSend;
};

const useRegexp = (regexp, selectedText, tabId) => {
  clearHighlights();
  const dataFromSearch = searchAndHighlightSelectedTextAndRegexp(selectedText, regexp);
  const dataToSend = { ...dataFromSearch, tabId };
  return dataToSend;
};

const clear = () => {
  clearHighlights();
  chrome.runtime.sendMessage({ action: "clearStateForTab" });
};

const state = {
  contentState: {
    histogramShowing: false,
  },
};

const updateState = (newState) => {
  console.log("updateState", "state", state, "newState", newState);
  state.contentState = { ...state.contentState, ...newState };
};

const main = () => {
  const histWrap = addHistogramWrapper(document.body, `
    position: absolute;
    left: 10px;
    top: 10px; 
    z-index:1000000; 
    background-color:#fff;
    border: 1px solid black;  
    padding:10px;
  `);

  const clearButton = document.createElement("button");
  clearButton.innerText = "Clear";
  histWrap.appendChild(clearButton);
  clearButton.addEventListener("click", (e) => {
    e.preventDefault();
    updateHistogramTable({});
    clear();
  });

  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  histWrap.appendChild(closeButton);
  closeButton.addEventListener("click", (e) => {
    e.preventDefault();
    closeHistogramTable();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    note("content handler", "message", message, "sender", sender);

    let { action, data } = message;
    data = data || {};

    if (action === "findSimilar") {
      const { text, tabId } = data;
      const dataToSend = findSimilar(text, tabId);
      sendResponse(dataToSend);
      chrome.runtime.sendMessage({ action: "sendRegExp", data: dataToSend });
      return;
    }

    if (action === "useRegexp") {
      const { regexp, selectedText, tabId } = data;
      const dataToSend = useRegexp(regexp, selectedText, tabId);
      sendResponse(dataToSend);
      chrome.runtime.sendMessage({ action: "sendRegExp", data: dataToSend });
      return;
    }

    if (action === "clear") {
      clear();
      return;
    }

    if (action === "closeHistogramTable") {
      closeHistogramTable();
      return;
    }

    note("unhandled content handler", "message", message, "sender", sender);
  });
};

main();