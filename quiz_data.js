let QUIZ_DATA = [];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  let currentLine = '';
  
  for (let i = 1; i < lines.length; i++) {
    currentLine += lines[i];
    
    // Count quotes - if odd, line continues
    const quoteCount = (currentLine.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      currentLine += '\n';
      continue;
    }
    
    // Parse complete row
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < currentLine.length; j++) {
      const char = currentLine[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    
    if (row.id) data.push(row);
    currentLine = '';
  }
  
  return data;
}

// Load CSV
fetch('quiz_data.csv')
  .then(response => {
    if (!response.ok) throw new Error('Failed to load quiz data');
    return response.text();
  })
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
      correct: row.correct.toUpperCase().trim()
    }));
    
    console.log(`✅ Loaded ${QUIZ_DATA.length} questions`);
    showMenu();
  })
  .catch(error => {
    console.error('❌ Error loading quiz:', error);
    alert('Failed to load quiz data. Please refresh the page.');
  });
