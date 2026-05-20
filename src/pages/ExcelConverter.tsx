import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Download, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import * as XLSX from 'xlsx';

type TargetFormat = 'xlsx' | 'xls' | 'xlsb' | 'csv';

interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'converting' | 'success' | 'error';
  progress: number;
}

const sheetToAoA = (sheet: XLSX.WorkSheet) => {
    const aoa: any[][] = [];
    if (!sheet['!ref']) return aoa;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const row: any[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            const cell = sheet[cellRef];
            row.push(cell ? { ...cell } : null);
        }
        aoa.push(row);
    }
    return aoa;
};

const createSheetFromAoA = (aoa: any[][]) => {
    const ws: XLSX.WorkSheet = {};
    let maxR = -1;
    let maxC = -1;
    
    aoa.forEach((row, R) => {
        if (R > maxR) maxR = R;
        row.forEach((cell, C) => {
            if (C > maxC) maxC = C;
            if (cell === null || cell === undefined || cell === '') return;
            
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            if (typeof cell === 'object' && cell !== null && !Array.isArray(cell) && !(cell instanceof Date)) {
                ws[cellRef] = cell;
            } else {
                const newCell: any = { v: cell };
                if (typeof cell === 'number') newCell.t = 'n';
                else if (typeof cell === 'boolean') newCell.t = 'b';
                else {
                    newCell.t = 's';
                    newCell.v = String(cell);
                }
                ws[cellRef] = newCell;
            }
        });
    });
    
    if (maxR >= 0 && maxC >= 0) {
        ws['!ref'] = XLSX.utils.encode_range({ s: {c:0, r:0}, e: {c:maxC, r:maxR} });
    }
    return ws;
};

export default function ExcelConverter() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('xlsx');
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: 'pending' as const,
        progress: 0
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleConvert = async () => {
    setIsConverting(true);
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'success') continue;
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'converting', progress: 15 } : f
      ));
      await new Promise(r => setTimeout(r, 50));

      try {
        const file = files[i].file;
        let workbook: XLSX.WorkBook | null = null;
        
        // Auto Fix Logic for HTML-disguised XLS files (System Exports)
        let autoFixEnabled = true;
        if (autoFixEnabled) {
          try {
            const text = await file.text();
            
            setFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, progress: 40 } : f
            ));
            await new Promise(r => setTimeout(r, 50));
            
            const prefix = text.substring(0, 2000).trim().toLowerCase();
            
            // Detect if the file is actually HTML disguised as XLS
            if ((prefix.startsWith('<html') || prefix.startsWith('<!doctype') || prefix.includes('<body') || prefix.includes('<table')) && 
                !prefix.includes('<?xml')) {
                
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const aoa: any[][] = [];
                
                const traverse = (node: Node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const content = node.textContent?.trim();
                        if (content) aoa.push([content]);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node as HTMLElement;
                        // Skip scripts and styles
                        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'META') return;
                        
                        if (el.tagName === 'TABLE') {
                            try {
                                const sheet = XLSX.utils.table_to_sheet(el);
                                const rows = sheetToAoA(sheet);
                                if (rows.length > 0) {
                                  aoa.push(...rows);
                                  aoa.push([]); // Empty row separator
                                }
                            } catch (e) {
                                console.error("Table parse error", e);
                            }
                        } else {
                            if (!el.querySelector('table')) {
                                const content = el.innerText?.trim();
                                if (content) {
                                    content.split('\n').forEach(line => {
                                        if (line.trim()) aoa.push([line.trim()]);
                                    });
                                }
                            } else {
                                Array.from(el.childNodes).forEach(traverse);
                            }
                        }
                    }
                };
                
                if (doc.body) {
                    Array.from(doc.body.childNodes).forEach(traverse);
                }
                
                setFiles(prev => prev.map((f, idx) => 
                  idx === i ? { ...f, progress: 75 } : f
                ));
                await new Promise(r => setTimeout(r, 50));
                
                if (aoa.length > 0) {
                    const newSheet = createSheetFromAoA(aoa);
                    workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, newSheet, "Data");
                }
            }
          } catch (e) {
            console.error("Smart fix error", e);
          }
        }
        
        // Fallback to normal SheetJS parsing if Smart Fix didn't create a workbook
        if (!workbook) {
          const arrayBuffer = await file.arrayBuffer();
          
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: 50 } : f
          ));
          await new Promise(r => setTimeout(r, 50));
          
          workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: 75 } : f
          ));
          await new Promise(r => setTimeout(r, 50));
          
          // Additional fix: if the result has multiple sheets, merge them
          // because often system exports separate header and data into different tables/sheets
          if (autoFixEnabled && workbook.SheetNames.length > 1) {
             const allRows: any[][] = [];
             for (const sheetName of workbook.SheetNames) {
                 const sheet = workbook.Sheets[sheetName];
                 const rows = sheetToAoA(sheet);
                 if (rows.length > 0) {
                     allRows.push(...rows);
                     allRows.push([]); // Spacer
                 }
             }
             if (allRows.length > 0) {
                 const newSheet = createSheetFromAoA(allRows);
                 workbook = XLSX.utils.book_new();
                 XLSX.utils.book_append_sheet(workbook, newSheet, "MergedData");
             }
          }
        }
        
        const originalName = file.name.substring(0, file.name.lastIndexOf('.'));
        const newFilename = `${originalName}_converted.${targetFormat}`;
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 90 } : f
        ));
        await new Promise(r => setTimeout(r, 50));
        
        XLSX.writeFile(workbook, newFilename, { bookType: targetFormat });
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success', progress: 100 } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', progress: 0 } : f
        ));
      }
    }
    
    setIsConverting(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl h-full overflow-auto">
      <div className="mb-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <FileSpreadsheet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Excel Converter
          </h1>
        </div>
        <p className="text-slate-500 max-w-2xl text-base leading-relaxed mt-2">
          Seamlessly convert multiple Excel or CSV files directly in your browser. Powered by local processing to ensure your data never leaves your device.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="lg:col-span-2 space-y-8">
          {/* Upload Area */}
          <div 
            className={`relative overflow-hidden border-2 border-dashed border-slate-300 rounded-[2rem] p-12 flex flex-col items-center justify-center bg-white hover:bg-slate-50/50 hover:border-indigo-400 transition-all duration-500 cursor-pointer group shadow-sm hover:shadow-md ${files.length === 0 ? 'min-h-[366px]' : 'min-h-[250px]'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Decorative background blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700 pointer-events-none"></div>
            
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xls,.xlsx,.xlsb,.csv"
            />
            
            <div className="relative z-10 bg-gradient-to-b from-white to-slate-50 p-5 rounded-full mb-6 shadow-sm group-hover:scale-110 group-hover:shadow-indigo-500/20 transition-all duration-500 ring-1 ring-slate-200/60 group-hover:ring-indigo-300">
              <Upload className="w-8 h-8 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
            </div>
            
            <h3 className="relative z-10 text-slate-900 font-bold text-xl text-center mb-2">
              Click to upload or drag & drop
            </h3>
            <p className="relative z-10 text-slate-500 text-sm font-medium bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
              Supports XLS, XLSX, XLSB, CSV
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/40 animate-in fade-in duration-500">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></div>
                  Selected Files
                  <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2.5 rounded-full text-xs font-bold ml-1">{files.length}</span>
                </h3>
                <button 
                  onClick={() => setFiles([])}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-3.5 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              <ul className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-2">
                {files.map((f, index) => (
                  <li 
                    key={f.id} 
                    className="relative overflow-hidden p-3 px-4 m-1 flex flex-col justify-center hover:bg-slate-50 rounded-2xl transition-colors animate-in slide-in-from-right-4 fade-in duration-500 border border-transparent hover:border-slate-100"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl shrink-0 border border-emerald-200/50 shadow-sm">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex flex-col min-w-0 gap-0.5">
                          <span className="text-sm font-bold text-slate-700 truncate">
                            {f.file.name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {(f.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 pl-4">
                        {f.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in" />}
                        {f.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 animate-in zoom-in" />}
                        {f.status === 'converting' && (
                           <div className="flex items-center gap-2">
                             <span className="text-[11px] font-bold text-indigo-500">{f.progress}%</span>
                             <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                           </div>
                        )}
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar Bottom */}
                    {f.status === 'converting' && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                        <div 
                           className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out" 
                           style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] p-7 shadow-xl shadow-slate-200/40 h-fit sticky top-8">
          <div className="flex items-center gap-3 mb-7 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center shadow-sm">
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">Settings</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2.5">Target Format</label>
              <select 
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value as TargetFormat)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 transition-all hover:bg-white cursor-pointer shadow-sm"
              >
                <option value="xlsx">Excel Workbook (.xlsx)</option>
                <option value="xls">Excel 97-2003 (.xls)</option>
                <option value="xlsb">Excel Binary (.xlsb)</option>
                <option value="csv">CSV (Comma delimited) (.csv)</option>
              </select>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <button 
                onClick={handleConvert}
                disabled={files.length === 0 || isConverting}
                className="relative overflow-hidden w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 group"
              >
                {isConverting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    Convert & Download
                  </>
                )}
                
                {/* Subtle highlight effect instead of custom animation */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />
              </button>
              
              <div className="flex items-center justify-center gap-1.5 mt-5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                  100% SECURE LOCAL PROCESSING
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
