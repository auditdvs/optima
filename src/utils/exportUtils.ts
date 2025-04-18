import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  // Convert checkbox states to readable text
  const formattedData = data.map(row => {
    const newRow = { ...row };
    Object.keys(newRow).forEach(key => {
      if (typeof newRow[key] === 'boolean' || newRow[key] === null) {
        newRow[key] = newRow[key] === true ? '✓' : 
                      newRow[key] === false ? '✗' : 
                      '-';
      }
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Save file
  saveAs(dataBlob, `${filename}.xlsx`);
};