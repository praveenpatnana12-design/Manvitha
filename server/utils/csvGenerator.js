/**
 * Converts an array of objects to a CSV string.
 * @param {Array<string>} headers - Column headers
 * @param {Array<Object>} data - Array of records
 * @param {Array<string>} keys - Keys in objects corresponding to headers
 * @returns {string} CSV formatted string
 */
const generateCSV = (headers, data, keys) => {
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
  
  // Add data rows
  for (const row of data) {
    const values = keys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) {
        val = '';
      } else if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

module.exports = { generateCSV };
