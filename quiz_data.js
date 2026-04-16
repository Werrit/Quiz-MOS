function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  }).filter(row => row.id);
}

// Load and initialize
fetch('quiz_data.csv')
  .then(response => response.text())
  .then(data => {
    const csvData = parseCSV(data);
    QUIZ_DATA = csvData.map(row => ({
      id: row.id,
      module: row.module,
      question: row.question,
      option_a: row.option_a,
      option_b: row.option_b,
      option_c: row.option_c,
      option_d: row.option_d,
      correct: row.correct.toUpperCase()
    }));
    
    showMenu();
  });
