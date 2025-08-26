import { supabase } from '../lib/supabaseClient';

// Format tanggal Indonesia
const formatDateIndonesian = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Format tanggal audit range dengan logika yang diperbaiki
const formatAuditDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const startDay = start.getDate().toString().padStart(2, '0');
  const startMonth = months[start.getMonth()];
  const startYear = start.getFullYear();
  
  const endDay = end.getDate().toString().padStart(2, '0');
  const endMonth = months[end.getMonth()];
  const endYear = end.getFullYear();
  
  // Jika tahun dan bulan sama
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} s.d. ${endDay} ${endMonth} ${endYear}`;
  } 
  // Jika tahun sama tapi bulan beda
  else if (startYear === endYear) {
    return `${startDay} ${startMonth} s.d. ${endDay} ${endMonth} ${endYear}`;
  } 
  // Jika tahun beda
  else {
    return `${startDay} ${startMonth} ${startYear} s.d. ${endDay} ${endMonth} ${endYear}`;
  }
};

// Format branch name dengan title case dan singkatan jika terlalu panjang
const formatBranchName = (branchName: string): string => {
  if (!branchName) return '';
  
  // Helper function untuk title case
  const toTitleCase = (str: string): string => {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const words = branchName.trim().split(' ');
  
  // Apply title case to all words first
  const titleCaseWords = words.map(word => toTitleCase(word));
  
  // Jika hanya 1 kata atau sudah pendek, return with title case
  if (titleCaseWords.length <= 1 || branchName.length <= 20) {
    return titleCaseWords.join(' ');
  }
  
  // Jika 2 kata, singkat kata pertama jadi initial + titik
  if (titleCaseWords.length === 2) {
    const firstInitial = titleCaseWords[0].charAt(0).toUpperCase();
    const secondWord = titleCaseWords[1];
    return `${firstInitial}. ${secondWord}`;
  }
  
  // Jika lebih dari 2 kata, singkat kata-kata awal
  const lastWord = titleCaseWords[titleCaseWords.length - 1];
  const initials = titleCaseWords.slice(0, -1).map(word => word.charAt(0).toUpperCase()).join('. ');
  return `${initials}. ${lastWord}`;
};

// Format tanggal input dengan padding
const formatTanggalInput = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Format team dengan spasi setelah koma dan line break untuk kerapian
const formatTeamNames = (teamStr: string): string => {
  if (!teamStr) return '';
  
  // Coba parsing sebagai JSON array terlebih dahulu
  try {
    const parsedTeam = JSON.parse(teamStr);
    if (Array.isArray(parsedTeam)) {
      // Jika array kosong, kembalikan string kosong
      if (parsedTeam.length === 0) return '';
      
      // Untuk array kecil (1-3 orang), tampilkan dalam satu baris
      if (parsedTeam.length <= 3) {
        return parsedTeam.join(', ');
      }
      
      // Untuk array lebih besar, format dengan pemisahan baris yang lebih baik
      // Pisahkan setiap 3-4 nama ke baris baru
      const result: string[] = [];
      let currentLine: string[] = [];
      const namesPerLine = 3; // Jumlah nama per baris
      
      parsedTeam.forEach((name, index) => {
        currentLine.push(name);
        
        // Setiap namesPerLine nama atau jika ini nama terakhir, buat baris baru
        if (currentLine.length === namesPerLine || index === parsedTeam.length - 1) {
          result.push(currentLine.join(', '));
          currentLine = [];
        }
      });
      
      return result.join(',\n');
    }
  } catch (e) {
    // Bukan JSON, lanjut handle sebagai string biasa
  }
  
  // Penanganan string biasa
  // 1. Normalisasi koma (tambah spasi setelah koma jika tidak ada)
  let normalizedStr = teamStr.replace(/,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  
  // 2. Parse nama-nama dengan mempertimbangkan gelar akademik
  const names = [];
  let buffer = '';
  let inDegree = false;
  
  // Split berdasarkan koma
  const parts = normalizedStr.split(',');
  
  // Iterasi setiap bagian dan deteksi nama vs gelar
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    
    // Deteksi apakah ini gelar (S.E., S.Kom., dll)
    const isDegree = /^[A-Z](\.[A-Z])*\.?$/.test(part) || 
                     (part.length <= 5 && part.includes('.'));
    
    if (isDegree) {
      // Ini adalah gelar, tambahkan ke buffer dengan koma
      buffer += `, ${part}`;
      inDegree = true;
    } else if (buffer && !inDegree) {
      // Ini nama baru dan buffer sudah berisi nama sebelumnya
      names.push(buffer.trim());
      buffer = part;
    } else {
      // Ini nama baru atau lanjutan dari nama+gelar
      if (buffer) buffer += `, ${part}`;
      else buffer = part;
      inDegree = false;
    }
  }
  
  // Tambahkan buffer terakhir jika tidak kosong
  if (buffer) {
    names.push(buffer.trim());
  }
  
  // 3. Format nama-nama dengan line break yang lebih terkontrol
  // Jika hanya ada sedikit nama (1-3), tampilkan dalam satu baris
  if (names.length <= 3) {
    return names.join(', ');
  }
  
  // Untuk banyak nama, format dengan nama terakhir di baris terpisah
  if (names.length >= 4) {
    const lastTwoNames = names.slice(-2);
    const otherNames = names.slice(0, -2);
    
    return otherNames.join(', ') + ',\n' + lastTwoNames.join(', ');
  }
  
  return names.join(', ');
};

// Generate PDF untuk Surat Tugas - FORM FILL ONLY
export const generateAssignmentLetterPDF = async (letterId: string): Promise<Blob> => {
  try {
    // Fetch data surat tugas
    const { data: letter, error } = await supabase
      .from('letter')
      .select('*')
      .eq('id', letterId)
      .single();

    if (error) throw error;
    if (!letter) throw new Error('Surat tugas tidak ditemukan');

    // Template dari Supabase storage berdasarkan audit_type
    const isRegulerTemplate = letter.audit_type === 'reguler';
    
    // TAMBAHKAN CACHE BUSTING PARAMETER
    const timestamp = Date.now();
    const templateUrl = isRegulerTemplate 
      ? `https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/letter/Surat%20Tugas%20Reguler.pdf?t=${timestamp}`
      : `https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/letter/Surat%20Tugas%20Khusus.pdf?t=${timestamp}`;

    console.log('Using template URL:', templateUrl);
    console.log('Letter data:', letter);

    // Load PDF template dengan no-cache headers
    const response = await fetch(templateUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Template PDF tidak ditemukan: ${templateUrl}`);
    }

    const pdfBytes = await response.arrayBuffer();
    
    // Import PDF-lib
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Load custom fonts
    let timesRomanFont;
    let timesRomanBoldFont;
    
    try {
      console.log('🔄 Attempting to load custom fonts...');
      
      // Import fontkit module
      const fontkit = await import('fontkit');
      console.log('✅ Fontkit module imported successfully');
      
      // Register fontkit dengan PDF-lib
      pdfDoc.registerFontkit(fontkit as any);
      console.log('✅ Fontkit registered with PDF-lib');
      
      // Load regular Times font
      const fontResponse = await fetch('/times.ttf');
      console.log('Regular font response status:', fontResponse.status, fontResponse.ok);
      
      if (fontResponse.ok) {
        const fontBytes = await fontResponse.arrayBuffer();
        console.log('Regular font bytes loaded:', fontBytes.byteLength, 'bytes');
        
        timesRomanFont = await pdfDoc.embedFont(fontBytes);
        console.log('✅ Successfully loaded Times New Roman regular font');
      } else {
        throw new Error(`Regular font file not found - HTTP ${fontResponse.status}`);
      }
      
      // Load bold Times font
      try {
        const boldFontResponse = await fetch('/times-bold.ttf');
        console.log('Bold font response status:', boldFontResponse.status, boldFontResponse.ok);
        
        if (boldFontResponse.ok) {
          const boldFontBytes = await boldFontResponse.arrayBuffer();
          console.log('Bold font bytes loaded:', boldFontBytes.byteLength, 'bytes');
          
          timesRomanBoldFont = await pdfDoc.embedFont(boldFontBytes);
          console.log('✅ Successfully loaded Times New Roman bold font');
        } else {
          console.warn('⚠️ Bold font not found, using regular font for bold text');
          timesRomanBoldFont = timesRomanFont; // fallback to regular
        }
      } catch (boldError) {
        console.warn('⚠️ Failed to load bold font, using regular font:', boldError);
        timesRomanBoldFont = timesRomanFont; // fallback to regular
      }
      
    } catch (fontError) {
      console.warn('⚠️ Failed to load custom fonts, falling back to standard fonts:');
      console.error(fontError);
      // Fallback ke standard fonts
      timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      console.log('✅ Fallback to standard Times fonts completed');
    }
    
    // Get form dari PDF
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (!fields || fields.length === 0) {
      throw new Error('PDF template tidak memiliki form fields');
    }

    // Debug: log semua field names dengan detail lebih lengkap
    console.log('PDF Form Fields Found:');
    fields.forEach((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      // Extra debug untuk branch fields
      if (fieldName.toLowerCase().includes('branch') || fieldName.toLowerCase().includes('cabang')) {
        console.log(`🌿 BRANCH FIELD ${index + 1}. "${fieldName}" (Type: ${fieldType})`);
        
        // Coba akses informasi halaman
        try {
          const acroField = (field as any).acroField;
          if (acroField && acroField.getWidgets) {
            const widgets = acroField.getWidgets();
            console.log(`   📄 Widgets count: ${widgets.length}`);
            
            widgets.forEach((widget: any, widgetIndex: number) => {
              try {
                if (widget.getPageIndex) {
                  const pageIndex = widget.getPageIndex();
                  console.log(`   📄 Widget ${widgetIndex + 1} is on page ${pageIndex + 1}`);
                }
              } catch (e) {
                console.log(`   📄 Widget ${widgetIndex + 1} page info not available`);
              }
            });
          }
        } catch (e) {
          console.log(`   📄 Could not get page info for ${fieldName}`);
        }
      } else {
        console.log(`${index + 1}. "${fieldName}" (Type: ${fieldType})`);
      }
    });

    // Siapkan data untuk mengisi form
    const currentYear = letter.tahun_input?.toString() || new Date().getFullYear().toString();
    
    const auditDateRange = letter.audit_start_date && letter.audit_end_date 
      ? formatAuditDateRange(letter.audit_start_date, letter.audit_end_date)
      : '';

    const tanggalInput = letter.created_at 
      ? formatTanggalInput(letter.created_at) 
      : formatTanggalInput(new Date().toISOString());

    const formattedBranchName = formatBranchName(letter.branch_name || '');
    
    // Format region untuk template khusus
    const regionText = letter.region ? `Regional ${letter.region}` : '';

    // Format team dengan spasi setelah koma
    const formattedTeam = formatTeamNames(letter.team || '');

    // Mapping data ke form fields
    const fieldValues: Record<string, string> = {
      // Nomor surat (akan bold dan center)
      'assignment_letter': letter.assigment_letter || '',
      'assigment_letter': letter.assigment_letter || '',
      'nomor_surat': letter.assigment_letter || '',
      'no_surat': letter.assigment_letter || '',
      'surat_tugas': letter.assigment_letter || '',
      
      // Tahun audit
      'tahun_input': currentYear,
      'tahun': currentYear,
      'audit_year': currentYear,
      'internal_audit_year': currentYear,
      'year': currentYear,
      'tahun_audit': currentYear,
      'th_input': currentYear,
      'th_audit': currentYear,
      'input_year': currentYear,
      'audit_internal_year': currentYear,
      'thn_input': currentYear,
      'thn': currentYear,
      'TAHUN': currentYear,
      'Year': currentYear,
      'YEAR': currentYear,
      'tahun_pelaksanaan': currentYear,
      'audit_tahun': currentYear,
      'internal_audit_tahun': currentYear,
      'perencanaan_audit_tahun': currentYear,
      
      // Nama cabang (akan center align)
      'branch_name': formattedBranchName,
      'cabang': formattedBranchName,
      'nama_cabang': formattedBranchName,
      'CABANG': formattedBranchName,
      'Branch': formattedBranchName,
      'nm_cabang': formattedBranchName,
      
      // Regional (akan center align)
      'region': regionText,
      'regional': regionText,
      'REGIONAL': regionText,
      'Regional': regionText,
      
      // Leader/Ketua tim
      'leader': letter.leader || '',
      'ketua': letter.leader || '',
      'ketua_tim': letter.leader || '',
      'KETUA': letter.leader || '',
      'Leader': letter.leader || '',
      'pimpinan': letter.leader || '',
      
      // Team/Anggota tim - dengan formatting spasi setelah koma
      'team': formattedTeam,
      'tim': formattedTeam,
      'anggota_tim': formattedTeam,
      'TIM': formattedTeam,
      'Team': formattedTeam,
      'anggota': formattedTeam,
      
      // Tanggal audit range
      'audit_date_range': auditDateRange,
      'tanggal_audit': auditDateRange,
      'periode_audit': auditDateRange,
      'audit_period': auditDateRange,
      'tgl_audit': auditDateRange,
      'date_range': auditDateRange,
      'audit_range': auditDateRange,
      'waktu_audit': auditDateRange,
      'TANGGAL_AUDIT': auditDateRange,
      'periode': auditDateRange,
      'audit_start_end': auditDateRange,
      'start_end_date': auditDateRange,
      'mulai_selesai': auditDateRange,
      'dari_sampai': auditDateRange,
      'mulai_tanggal': auditDateRange,
      'mulai tanggal': auditDateRange,
      'mulaitanggal': auditDateRange,
      'start_date_end_date': auditDateRange,
      'periode_pelaksanaan': auditDateRange,
      'waktu_pelaksanaan': auditDateRange,
      'jadwal_audit': auditDateRange,
      
      // Tanggal input (Jakarta)
      'tanggal_input': tanggalInput,
      'jakarta': tanggalInput,
      'tanggal': tanggalInput,
      'date_input': tanggalInput,
      'JAKARTA': tanggalInput,
      'Jakarta': tanggalInput,
      'tgl_input': tanggalInput,
      'input_date': tanggalInput,
      'dibuat_tanggal': tanggalInput,
    };

    console.log('Field values to fill:', fieldValues);

    // Helper function untuk menentukan apakah field perlu bold
    const shouldBeBold = (fieldName: string): boolean => {
      const lowerName = fieldName.toLowerCase();
      return lowerName.includes('assignment') || 
             lowerName.includes('assigment') ||
             lowerName.includes('nomor_surat') ||
             lowerName.includes('no_surat') ||
             lowerName.includes('surat_tugas');
    };

    // Helper function untuk menentukan apakah field perlu center align - SEMENTARA DISABLE BRANCH CENTER
    const shouldBeCenter = (fieldName: string): boolean => {
      const lowerName = fieldName.toLowerCase();
      
      // Assignment letter selalu center
      if (lowerName.includes('assignment') || 
          lowerName.includes('assigment') ||
          lowerName.includes('nomor_surat') ||
          lowerName.includes('no_surat') ||
          lowerName.includes('surat_tugas')) {
        return true;
      }
      
      // Region selalu center
      if (lowerName.includes('region')) {
        return true;
      }
      
      // Branch name - SEMENTARA SET KE LEFT KARENA FIELD SAMA UNTUK 2 HALAMAN
      // Prioritas format halaman 2 (tembusan)
      if (lowerName.includes('branch') || lowerName.includes('cabang')) {
        console.log(`   👈 LEFT alignment for "${fieldName}" (shared field - prioritas halaman 2)`);
        return false;
      }
      
      return false;
    };

    // Fill form fields dengan styling yang konsisten
    let filledCount = 0;
    let unmatchedFields: string[] = [];
    
    console.log('\n=== FILLING FORM FIELDS WITH CONSISTENT STYLING ===');
    
    fields.forEach(field => {
      try {
        const fieldName = field.getName();
        let fieldFilled = false;
        
        // Cari value yang cocok
        let matchedValue = null;
        let matchedKey = null;
        
        // Exact match dulu
        if (fieldValues[fieldName]) {
          matchedValue = fieldValues[fieldName];
          matchedKey = fieldName;
        } else {
          // Partial match (case insensitive)
          const lowerFieldName = fieldName.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
          
          for (const [key, value] of Object.entries(fieldValues)) {
            const lowerKey = key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
            
            if (lowerKey === lowerFieldName || 
                lowerFieldName.includes(lowerKey) ||
                lowerKey.includes(lowerFieldName) ||
                (lowerFieldName.includes('tahun') && lowerKey.includes('tahun')) ||
                (lowerFieldName.includes('tanggal') && lowerKey.includes('tanggal')) ||
                (lowerFieldName.includes('mulai') && lowerKey.includes('mulai')) ||
                (lowerFieldName.includes('periode') && lowerKey.includes('periode')) ||
                (lowerFieldName.includes('audit') && lowerKey.includes('audit') && lowerKey.includes('date'))) {
              matchedValue = value;
              matchedKey = key;
              console.log(`   🎯 PARTIAL MATCH: "${fieldName}" matched with "${key}"`);
              break;
            }
          }
        }
        
        if (matchedValue && matchedValue.trim() !== '') {
          console.log(`\n🎯 PROCESSING: "${fieldName}" with "${matchedValue}"`);
          console.log(`   Matched with key: "${matchedKey}"`);
          
          // Tentukan styling dengan field object yang benar
          const isBold = shouldBeBold(fieldName);
          const isCenter = shouldBeCenter(fieldName); // Pass field name only
          const fontSize = 11;
          
          console.log(`   Styling: Bold=${isBold}, Center=${isCenter}, FontSize=${fontSize}`);
          
          try {
            const textField = form.getTextField(fieldName);
            textField.setText(matchedValue);
            
            // Apply consistent styling
            try {
              // Pilih font berdasarkan apakah perlu bold
              const selectedFont = isBold ? timesRomanBoldFont : timesRomanFont;
              
              // Set font dan size - KONSISTEN SIZE 11
              textField.updateAppearances(selectedFont);
              textField.setFontSize(fontSize);
              
              console.log(`   ✅ Applied ${isBold ? 'BOLD' : 'regular'} Times font, size ${fontSize}`);
              
              // Set alignment
              if (isCenter) {
                textField.setAlignment(1); // center
                console.log(`   ✅ Applied CENTER alignment`);
              } else {
                textField.setAlignment(0); // left (default)
                console.log(`   ✅ Applied LEFT alignment`);
              }
              
            } catch (styleError: any) {
              console.log(`   ⚠️ Could not apply styling: ${styleError?.message || 'Unknown style error'}`);
            }
            
            fieldFilled = true;
            filledCount++;
            console.log(`   ✅ SUCCESS with consistent styling`);
            
          } catch (textError: any) {
            console.log(`   ❌ Failed as text field: ${textError?.message || 'Unknown error'}`);
            
            // Fallback to generic field
            try {
              const genericField = form.getField(fieldName);
              
              if ((genericField as any).setText) {
                (genericField as any).setText(matchedValue);
                
                // Try to apply styling to generic field
                try {
                  const selectedFont = isBold ? timesRomanBoldFont : timesRomanFont;
                  
                  if ((genericField as any).updateAppearances) {
                    (genericField as any).updateAppearances(selectedFont);
                  }
                  if ((genericField as any).setFontSize) {
                    (genericField as any).setFontSize(fontSize);
                  }
                  if ((genericField as any).setAlignment) {
                    if (isCenter) {
                      (genericField as any).setAlignment(1); // center
                    } else {
                      (genericField as any).setAlignment(0); // left
                    }
                  }
                  
                  console.log(`   ✅ Applied styling to generic field`);
                } catch (genericStyleError) {
                  console.log(`   ⚠️ Could not style generic field`);
                }
                
                fieldFilled = true;
                filledCount++;
                console.log(`   ✅ SUCCESS as generic field with styling attempt`);
              }
            } catch (genericError: any) {
              console.log(`   ❌ Generic field also failed: ${genericError?.message || 'Unknown error'}`);
            }
          }
        }
        
        if (!fieldFilled) {
          unmatchedFields.push(fieldName);
          console.log(`\n🔍 UNMATCHED: "${fieldName}" - no value found`);
        }
        
      } catch (error) {
        console.error(`💥 CRITICAL ERROR processing field "${field.getName()}":`, error);
      }
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`✅ Total fields filled: ${filledCount} out of ${fields.length}`);
    console.log(`🔍 Unmatched fields: ${unmatchedFields.length}`);
    
    if (unmatchedFields.length > 0) {
      console.log(`\n📝 UNMATCHED FIELD NAMES:`);
      unmatchedFields.forEach((fieldName, index) => {
        console.log(`${index + 1}. "${fieldName}"`);
      });
    }

    // Update field appearances dengan font custom
    try {
      form.updateFieldAppearances(timesRomanFont);
      console.log('✅ Successfully updated all field appearances');
    } catch (e) {
      console.log('⚠️ Failed to update field appearances globally:', e);
    }

    // FLATTEN FORM - Hilangkan kotak form fields dan buat PDF flat
    try {
      form.flatten();
      console.log('✅ Successfully flattened form - form fields converted to static text');
    } catch (flattenError) {
      console.warn('⚠️ Failed to flatten form, PDF will still have editable fields:', flattenError);
    }

    // Save PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Gagal generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Download PDF
export const downloadAssignmentLetterPDF = async (letterId: string, fileName?: string) => {
  try {
    // Fetch data surat tugas untuk mendapatkan branch_name, assigment_letter, dan audit_type
    const { data: letter, error } = await supabase
      .from('letter')
      .select('branch_name, assigment_letter, audit_type')
      .eq('id', letterId)
      .single();

    if (error) throw error;
    if (!letter) throw new Error('Surat tugas tidak ditemukan');

    const pdfBlob = await generateAssignmentLetterPDF(letterId);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Format nama file sesuai permintaan
    let downloadFileName;
    
    if (fileName) {
      // Jika fileName sudah diberikan, gunakan itu
      downloadFileName = fileName;
    } else {
      // Generate nama file berdasarkan data surat
      const branchName = letter.branch_name || 'UNKNOWN';
      const assignmentLetter = letter.assigment_letter || 'NO-NUMBER';
      
      // Tentukan jenis audit: REGULER atau KHUSUS
      const auditType = letter.audit_type && letter.audit_type.toLowerCase().includes('khusus') ? 'KHUSUS' : 'REGULER';
      
      // Format branch name menjadi uppercase
      const formattedBranchName = branchName.toUpperCase();
      
      // Format: SURAT TUGAS [REGULER/KHUSUS] [BRANCH_NAME] - [ASSIGNMENT_LETTER]
      downloadFileName = `SURAT TUGAS ${auditType} ${formattedBranchName} - ${assignmentLetter}`;
    }
    
    // Clean filename - hapus karakter yang tidak valid untuk nama file
    const cleanFileName = downloadFileName
      .replace(/[<>:"/\\|?*]/g, '-') // Ganti karakter invalid dengan dash
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    link.download = `${cleanFileName}.pdf`;
    
    console.log('📥 Downloading PDF with filename:', `${cleanFileName}.pdf`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

// Download Addendum PDF
// Generate PDF untuk Addendum
export const generateAddendumPDF = async (addendumId: string): Promise<Blob> => {
  try {
    // Fetch data addendum
    const { data: addendum, error } = await supabase
      .from('addendum')
      .select('*')
      .eq('id', addendumId)
      .single();

    if (error) throw error;
    if (!addendum) throw new Error('Addendum tidak ditemukan');

    // Template dari Supabase storage untuk addendum
    const timestamp = Date.now();
    const templateUrl = `https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/letter/Addendum.pdf?t=${timestamp}`;

    console.log('Using template URL:', templateUrl);
    console.log('Addendum data:', addendum);

    // Load PDF template dengan no-cache headers
    const response = await fetch(templateUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Template PDF tidak ditemukan: ${templateUrl}`);
    }

    const pdfBytes = await response.arrayBuffer();
    
    // Import PDF-lib
    const { PDFDocument } = await import('pdf-lib');
    
    // Load template PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Set nilai pada form fields berdasarkan data addendum
    // Field names disesuaikan dengan form fields di PDF template
    
    // Basic info
    form.getTextField('addendum_number').setText(addendum.assigment_letter || '');
    form.getTextField('original_letter').setText(addendum.assignment_letter_before || '');
    form.getTextField('branch_name').setText(addendum.branch_name || '');
    form.getTextField('region').setText(addendum.region || '');
    form.getTextField('addendum_type').setText(addendum.addendum_type || '');
    
    // Tanggal dan periode
    if (addendum.tanggal_input) {
      form.getTextField('tanggal_input').setText(formatTanggalInput(addendum.tanggal_input));
    }
    
    // Perubahan audit dates jika ada
    if (addendum.audit_start_date && addendum.audit_end_date) {
      form.getTextField('audit_period').setText(formatAuditDateRange(addendum.audit_start_date, addendum.audit_end_date));
    }
    
    // Description of changes
    if (addendum.description) {
      form.getTextField('description').setText(addendum.description);
    }
    
    // Tim auditor (jika ada perubahan)
    if (addendum.team) {
      form.getTextField('team').setText(formatTeamNames(addendum.team));
    }
    
    // Flatten form fields
    form.flatten();
    
    // Save the PDF
    const pdfBytesModified = await pdfDoc.save();
    
    // Return as Blob with proper type conversion
    return new Blob([new Uint8Array(pdfBytesModified)], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error generating Addendum PDF:', error);
    throw error;
  }
};

export const downloadAddendumPDF = async (addendumId: string, fileName?: string) => {
  try {
    // Fetch data addendum untuk mendapatkan branch_name, assigment_letter, dan addendum_type
    const { data: addendum, error } = await supabase
      .from('addendum')
      .select('branch_name, assigment_letter, addendum_type')
      .eq('id', addendumId)
      .single();

    if (error) throw error;
    if (!addendum) throw new Error('Addendum tidak ditemukan');

    const pdfBlob = await generateAddendumPDF(addendumId);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Format nama file sesuai permintaan
    let downloadFileName;
    
    if (fileName) {
      // Jika fileName sudah diberikan, gunakan itu
      downloadFileName = fileName;
    } else {
      // Generate nama file berdasarkan data addendum
      const branchName = addendum.branch_name || 'UNKNOWN';
      const assignmentLetter = addendum.assigment_letter || 'NO-NUMBER';
      
      // Format addendum type jika ada
      const addendumType = addendum.addendum_type ? ` ${addendum.addendum_type.toUpperCase()}` : '';
      
      // Format branch name menjadi uppercase
      const formattedBranchName = branchName.toUpperCase();
      
      // Format: ADDENDUM[TYPE] [BRANCH_NAME] - [ASSIGNMENT_LETTER]
      downloadFileName = `ADDENDUM${addendumType} ${formattedBranchName} - ${assignmentLetter}`;
    }
    
    // Clean filename - hapus karakter yang tidak valid untuk nama file
    const cleanFileName = downloadFileName
      .replace(/[<>:"/\\|?*]/g, '-') // Ganti karakter invalid dengan dash
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    link.download = `${cleanFileName}.pdf`;
    
    console.log('📥 Downloading PDF with filename:', `${cleanFileName}.pdf`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};