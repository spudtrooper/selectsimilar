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

const addHistogramWrapper = (el, style) => {
  let res = document.getElementById("histogramTableWrapper");
  if (!res) {
    el.innerHTML += `
<div class="card" id="histogramTableWrapper" style="display:none; ${style || ""}">
  <table id="histogramTable">
    <thead>
      <tr>
        <th>Text</th>
        <th>Occurrences</th>
      </tr>
    </thead>
    <tbody> </tbody>
  </table>
</div>
`;
    res = document.getElementById("histogramTableWrapper");
  }
  return res;
};

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
  } else {
    tableWrapper.style.display = "none";
  }
};