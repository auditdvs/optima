const SHEET_ID = '17o01929ZP5jkHupJkOU5XhnPU72HrOfx';
const GID = '461974411';

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export async function fetchSpreadsheetData() {
  try {
    console.log('Fetching data from:', CSV_URL);
    
    const response = await fetch(CSV_URL, {
      mode: 'cors',
      headers: {
        'Accept': 'text/csv',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('Raw CSV length:', csvText.length);
    console.log('First 500 chars:', csvText.substring(0, 500));
    
    return parseCSV(csvText);
  } catch (error) {
    console.error('Direct access failed:', error);
    return fetchViaProxy();
  }
}

async function fetchViaProxy() {
  try {
    console.log('Trying proxy access...');
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const targetUrl = encodeURIComponent(CSV_URL);
    
    const response = await fetch(proxyUrl + targetUrl);
    const data = await response.json();
    
    if (data.contents) {
      console.log('Proxy data length:', data.contents.length);
      return parseCSV(data.contents);
    }
    throw new Error('No data from proxy');
  } catch (error) {
    console.error('Proxy access failed:', error);
    return [];
  }
}

function parseCSV(csvText) {
  if (!csvText || csvText.trim().length === 0) {
    console.error('Empty CSV text');
    return [];
  }

  // Handle different line endings
  const lines = csvText.trim().split(/\r?\n/);
  console.log('Total lines:', lines.length);
  
  if (lines.length === 0) return [];
  
  // Parse header dengan lebih robust
  const headerLine = lines[0];
  console.log('Header line:', headerLine);
  
  const headers = parseCSVLine(headerLine);
  console.log('Parsed headers:', headers);
  
  const data = [];
  
  // Parse semua baris data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    
    // Pastikan jumlah kolom sesuai atau lebih
    if (values.length > 0) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || ''; // Default empty string jika tidak ada value
      });
      data.push(row);
    }
  }
  
  console.log('Parsed data count:', data.length);
  console.log('Sample data:', data.slice(0, 3));
  
  return data;
}

// Function untuk parse CSV line yang lebih robust
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}