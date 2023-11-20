class ColorFinder {
  constructor (histogramData) {
    this.histogramData = histogramData;
    const sortedEntries = Object.entries(histogramData || {}).sort((a, b) => b[1] - a[1]);
    if (sortedEntries.length) {
      this.max = sortedEntries[0][1];
      this.min = sortedEntries[sortedEntries.length - 1][1];
    } else {
      this.max = 0;
      this.min = 0;
    }
  }

  colorForText = (text) => {
    const cval = this.max === this.min ?
      0xee :
      Math.floor(0xff - 0xf0 * (this.max - this.histogramData[text]) / (this.max - this.min));
    return `rgba(${cval}, 0, 0, 0.3)`;
  };
}

const note = (...args) => console.log(...args);

const getHistogramTableWrapper = () =>
  document.getElementById("histogramTableWrapper");

const closeHistogramTableWrapper = () =>
  getHistogramTableWrapper().style.display = "none";

const showHistogramTableWrapper = () =>
  getHistogramTableWrapper().style.display = "block";

const addHistogramWrapper = (el, style) => {
  let res = document.getElementById("histogramTableWrapper");
  if (!res) {
    // Create the outer div
    const div = document.createElement('div');
    div.classList.add('card');
    div.id = 'histogramTableWrapper';
    div.style.display = 'none';
    if (style) {
      div.style.cssText += style;
    }

    // Create the table
    const table = document.createElement('table');
    table.id = 'histogramTable';

    // Create the table head and its contents
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    const th1 = document.createElement('th');
    th1.textContent = 'Text';
    const th2 = document.createElement('th');
    th2.textContent = 'Occurrences';

    // Append the th elements to the tr, and tr to thead
    tr.appendChild(th1);
    tr.appendChild(th2);
    thead.appendChild(tr);

    // Create the table body
    const tbody = document.createElement('tbody');

    // Append thead and tbody to the table
    table.appendChild(thead);
    table.appendChild(tbody);

    // Append the table to the div
    div.appendChild(table);

    // Append the div to the provided element
    el.appendChild(div);

    res = document.getElementById("histogramTableWrapper");
  }
  return res;
};

// Returns whether we show the table.
const updateHistogramTable = (histogramData) => {
  histogramData = histogramData || {};

  const tableWrapper = document.getElementById("histogramTableWrapper");

  const tableBody = document.getElementById("histogramTable").querySelector("tbody");
  tableBody.innerHTML = "";

  if (Object.keys(histogramData).length) {
    const colorFinder = new ColorFinder(histogramData);
    const sortedEntries = Object.entries(histogramData).sort((a, b) => b[1] - a[1]);
    sortedEntries.forEach(item => {
      const
        text = item[0],
        count = item[1],
        row = tableBody.insertRow(),
        textCell = row.insertCell(0),
        countCell = row.insertCell(1),
        backgroundColor = colorFinder.colorForText(text);
      textCell.textContent = text;
      textCell.style.backgroundColor = backgroundColor;
      countCell.textContent = count;
    });
    tableWrapper.style.display = "block";
    return true;
  }
  tableWrapper.style.display = "none";
  return false;
};