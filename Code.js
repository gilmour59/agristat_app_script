function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('DA Commodity Analytics & Yield Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper function to evaluate and embed HTML partial files.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Fetches dashboard dataset dynamically based on target sheet selection.
 */
function getDashboardData(prodSheetName, areaSheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  prodSheetName = prodSheetName || 'Palay&Corn';
  
  var prodSheet = ss.getSheetByName(prodSheetName) || ss.getSheets()[0];
  var prodData = prodSheet.getDataRange().getValues();

  if (prodData.length < 3) {
    return { metadata: [], timeColumns: [], rows: [] };
  }

  var yearsRow = prodData[0];
  var periodsRow = prodData[1];
  
  var metadataHeaders = [
    cleanString(yearsRow[0]) || 'Commodity',
    cleanString(yearsRow[1]) || 'Name',
    cleanString(yearsRow[2]) || 'Level'
  ];

  var timeColumns = [];
  for (var j = 3; j < yearsRow.length; j++) {
    var yr = cleanString(yearsRow[j]);
    var prd = cleanString(periodsRow[j]);

    if (!yr && timeColumns.length > 0 && j > 3) {
      yr = timeColumns[timeColumns.length - 1].year;
    }

    if (yr || prd) {
      timeColumns.push({
        index: j,
        year: yr,
        period: prd
      });
    }
  }

  var areaMap = {};
  if (areaSheetName) {
    var areaSheet = ss.getSheetByName(areaSheetName);
    if (areaSheet) {
      var areaData = areaSheet.getDataRange().getValues();
      for (var a = 2; a < areaData.length; a++) {
        var aRow = areaData[a];
        if (!aRow[0] && !aRow[1]) continue;

        var aKey = buildKey(aRow[0], aRow[1], aRow[2]);
        var areaValues = [];
        for (var k = 0; k < timeColumns.length; k++) {
          var colIdx = timeColumns[k].index;
          areaValues.push(parseNumericValue(aRow[colIdx]));
        }
        areaMap[aKey] = areaValues;
      }
    }
  }

  var rows = [];
  for (var i = 2; i < prodData.length; i++) {
    var row = prodData[i];
    
    var comm = cleanString(row[0]);
    var name = cleanString(row[1]);
    var level = cleanString(row[2]);

    if (!comm && !name && !level) continue;

    var rowKey = buildKey(comm, name, level);
    var prodValues = [];
    var harvestValues = areaMap[rowKey] || new Array(timeColumns.length).fill(0);
    var yieldValues = [];

    for (var c = 0; c < timeColumns.length; c++) {
      var cIdx = timeColumns[c].index;
      var pVal = parseNumericValue(row[cIdx]);
      prodValues.push(pVal);

      var aVal = harvestValues[c] || 0;
      var yVal = aVal > 0 ? (pVal / aVal) : 0;
      yieldValues.push(yVal);
    }

    rows.push({
      commodity: comm,
      name: name,
      level: level,
      production: prodValues,
      area: harvestValues,
      yield: yieldValues
    });
  }

  return {
    metadata: metadataHeaders,
    timeColumns: timeColumns,
    rows: rows
  };
}

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildKey(comm, name, level) {
  return (cleanString(comm) + '|' + cleanString(name) + '|' + cleanString(level)).toLowerCase();
}

function parseNumericValue(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  var cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}