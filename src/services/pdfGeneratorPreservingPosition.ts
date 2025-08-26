import { supabase } from '../lib/supabaseClient';

// Generate PDF untuk Surat Addendum dengan menjaga posisi field tetap presisi
export const generateAddendumPDFPreservingPosition = async (addendumId: string): Promise<Blob> => {
  try {
    console.log('🔄 Starting addendum PDF generation with position preservation');
    
    // Fetch data addendum dengan new_team dan new_leader
    const { data: addendum, error } = await supabase
      .from('addendum')
      .select('*')
      .eq('id', addendumId)
      .single();

    if (error) throw error;
    if (!addendum) throw new Error('Addendum tidak ditemukan');
    
    // Tentukan template berdasarkan addendum_type
    // Jika mengandung 'Perubahan Tim' atau 'Penambahan/Perubahan Tim', gunakan template tim
    const isTeamChange = addendum.addendum_type.includes('Perubahan Tim') || 
                         addendum.addendum_type.includes('Penambahan/Perubahan Tim');
    
    // TAMBAHKAN CACHE BUSTING PARAMETER
    const timestamp = Date.now();
    const templateUrl = isTeamChange 
      ? `https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/letter/Surat%20Tugas%20Adendum%20Tim.pdf?t=${timestamp}`
      : `https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/letter/Surat%20Tugas%20Adendum.pdf?t=${timestamp}`;

    console.log('Using addendum template URL:', templateUrl);
    
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
    
    // Load custom fonts - PENTING untuk menjaga font tetap Times New Roman
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

    // Debug: log semua field names
    console.log('PDF Form Fields Found:', fields.length);
    
    // Format addendum_type (dengan spasi setelah koma)
    // Untuk addendum_type, kita perlu perlakuan khusus untuk "Perubahan Sampel DAPA"
    let formattedAddendumType = '-';
    let perubahanSampelDapa = '';  // Khusus untuk field Perubahan Sampel DAPA
    let adaPDFFieldPerubahanSampelDapa = false; // Flag untuk mengecek apakah ada field khusus
    
    if (addendum.addendum_type) {
      const types = addendum.addendum_type.split(',').map((type: string) => type.trim());
      
      // Cek apakah ini kasus khusus "Perubahan Sampel DAPA"
      const hasSampelDAPAType = types.some(
        (type: string) => type.toLowerCase().includes('sampel') && type.toLowerCase().includes('dapa')
      );
      
      // Jika ini kasus khusus, gunakan string tersebut langsung untuk ditampilkan di field Adapun
      if (hasSampelDAPAType) {
        formattedAddendumType = types.join(', ');
        perubahanSampelDapa = 'Perubahan Sampel DAPA';
        
        // Periksa apakah ini adalah addendum dengan jenis perubahan sampel DAPA
        console.log('🔍 Ini adalah addendum Perubahan Sampel DAPA');
      } else {
        formattedAddendumType = types.join(', ');
      }
    }
      
    // Format tanggal untuk tanggal pelaksanaan
    let auditDateRange = '-'; // Default to dash for empty dates
    
    if (addendum.start_date && addendum.end_date) {
      try {
        const startDate = new Date(addendum.start_date);
        const endDate = new Date(addendum.end_date);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          // Format tanggal Indonesia
          const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          
          const startDay = startDate.getDate().toString().padStart(2, '0');
          const startMonth = months[startDate.getMonth()];
          const startYear = startDate.getFullYear();
          
          const endDay = endDate.getDate().toString().padStart(2, '0');
          const endMonth = months[endDate.getMonth()];
          const endYear = endDate.getFullYear();
          
          // Format tanggal sesuai pola
          if (startYear === endYear && startMonth === endMonth) {
            auditDateRange = `${startDay} s.d. ${endDay} ${startMonth} ${endYear}`;
          } else if (startYear === endYear) {
            auditDateRange = `${startDay} ${startMonth} s.d. ${endDay} ${endMonth} ${endYear}`;
          } else {
            auditDateRange = `${startDay} ${startMonth} ${startYear} s.d. ${endDay} ${endMonth} ${endYear}`;
          }
        }
      } catch (e) {
        console.error('Error formatting dates:', e);
        // Keep the default dash value
      }
    }
    
    // Format tanggal input (Jakarta)
    const formatTanggalInput = (dateStr: string): string => {
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '-';
        
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
      } catch (e) {
        console.error('Error formatting date:', e);
        return '-';
      }
    };
    
    const tanggalInput = addendum.tanggal_input 
      ? formatTanggalInput(addendum.tanggal_input) 
      : formatTanggalInput(new Date().toISOString());
    
    // Format team names dengan TETAP menampilkan gelar dan memisahkan anggota tim ke baris baru sesuai kebutuhan
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
    
    // Format branch name dengan title case (kapital di awal kata)
    const formatBranchName = (name: string): string => {
      if (!name) return '-';
      
      // Fungsi untuk mengubah ke title case (kapital di awal kata)
      return name.trim().split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    // Format team
    const formattedTeam = formatTeamNames(addendum.team || '');

    // Format new_team jika ada
    let formattedNewTeam = '';
    if (isTeamChange && addendum.new_team) {
      formattedNewTeam = formatTeamNames(addendum.new_team);
    }
    
    // Mapping data ke form fields
    const fieldValues: Record<string, string> = {
      // Nomor surat
      'assignment_letter': addendum.assigment_letter || '',
      'assigment_letter': addendum.assigment_letter || '',
      'nomor_surat': addendum.assigment_letter || '',
      'no_surat': addendum.assigment_letter || '',
      'surat_tugas': addendum.assigment_letter || '',
      
      // Nomor surat sebelumnya
      'assignment_letter_before': addendum.assignment_letter_before || '',
      'assigment_letter_before': addendum.assignment_letter_before || '',
      'nomor_surat_before': addendum.assignment_letter_before || '',
      'no_surat_before': addendum.assignment_letter_before || '',
      'surat_tugas_before': addendum.assignment_letter_before || '',
      'surat_tugas_sebelumnya': addendum.assignment_letter_before || '',
      
      // Branch name
      'branch_name': formatBranchName(addendum.branch_name || ''),
      'cabang': formatBranchName(addendum.branch_name || ''),
      'nama_cabang': formatBranchName(addendum.branch_name || ''),
      
      // Audit type
      'audit_type': addendum.audit_type || '',
      'jenis_audit': addendum.audit_type || '',
      'tipe_audit': addendum.audit_type || '',
      
      // Leader
      'leader': addendum.leader || '',
      'ketua': addendum.leader || '',
      'ketua_tim': addendum.leader || '',
      
      // New Leader
      'new_leader': addendum.new_leader || '',
      'ketua_baru': addendum.new_leader || '',
      'ketua_tim_baru': addendum.new_leader || '',
      
      // Team
      'team': formattedTeam,
      'tim': formattedTeam,
      'anggota_tim': formattedTeam,
      
      // New team
      'new_team': formattedNewTeam,
      'tim_baru': formattedNewTeam,
      'anggota_tim_baru': formattedNewTeam,
      
      // Tipe addendum
      'addendum_type': formattedAddendumType,
      'tipe_addendum': formattedAddendumType,
      'jenis_addendum': formattedAddendumType,
      'perubahan_sampel_dapa': perubahanSampelDapa,
      'adapun_yang_dilakukan_perubahan_adalah': perubahanSampelDapa,
      'perubahan_adalah': perubahanSampelDapa,
      'Adapun yang dilakukan perubahan adalah:': perubahanSampelDapa,
      'Perubahan Sampel DAPA': perubahanSampelDapa,
      
      // Tanggal pelaksanaan
      'audit_date_range': auditDateRange,
      'tanggal_audit': auditDateRange,
      'periode_audit': auditDateRange,
      'audit_period': auditDateRange,
      'tgl_audit': auditDateRange,
      'date_range': auditDateRange,
      'audit_range': auditDateRange,
      'periode': auditDateRange,
      'start_date_end_date': auditDateRange,
      'tanggal_pelaksanaan': auditDateRange,
      'waktu_pelaksanaan': auditDateRange,
      'periode_pelaksanaan': auditDateRange,
      'start_date s.d. end_date': auditDateRange,
      'start_date sd end_date': auditDateRange,
      'start_date s.d end_date': auditDateRange,
      'mulai_sampai': auditDateRange,
      'mulai_selesai': auditDateRange,
      'tanggal_pelaksanaan_audit': auditDateRange,
      'tanggal_mulai_selesai': auditDateRange,
      
      // Tanggal input (Jakarta)
      'tanggal_input': tanggalInput,
      'jakarta': tanggalInput,
      'tanggal': tanggalInput,
      'date_input': tanggalInput,
      'tgl_input': tanggalInput,
    };

    console.log('Form filling starting with value preservation...');
    
    // Fungsi untuk menentukan field yang perlu center alignment
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
      
      // Audit type juga center align
      if (lowerName.includes('audit_type') || 
          lowerName.includes('jenis_audit') ||
          lowerName.includes('tipe_audit')) {
        return true;
      }
      
      return false;
    };

    // Fill form fields dengan minimal styling untuk menjaga posisi
    let filledCount = 0;
    
    // Special case: handle fields related to "Perubahan Sampel DAPA" or other specific changes
    for (const field of fields) {
      try {
        const fieldName = field.getName();
        
        // Handle special case for "Perubahan Sampel DAPA" fields
        if (perubahanSampelDapa && (
            fieldName.toLowerCase().includes('perubahan') || 
            fieldName.toLowerCase().includes('dapa') || 
            fieldName.toLowerCase().includes('adapun') || 
            fieldName.toLowerCase().includes('dilakukan') ||
            fieldName.toLowerCase().includes('sampel')
          )) {
          console.log(`Found special field for perubahan: ${fieldName}`);
          
          try {
            // Try to fill this field directly with our special text
            const textField = form.getTextField(fieldName);
            textField.setText(perubahanSampelDapa);
            textField.setFontSize(11);
            textField.updateAppearances(timesRomanFont);
            console.log(`✅ Special handling applied to field ${fieldName} for Perubahan Sampel DAPA`);
            continue; // Skip the regular field handling
          } catch (e) {
            console.log(`❌ Could not apply special handling to ${fieldName}:`, e);
            // Continue with normal processing
          }
        }
        
        // Cari value yang cocok - exact match dulu
        let matchedValue = fieldValues[fieldName];
        
        // Jika tidak ditemukan, coba partial match
        if (!matchedValue) {
          const lowerFieldName = fieldName.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
          
          for (const [key, value] of Object.entries(fieldValues)) {
            const lowerKey = key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
            
            if (lowerKey === lowerFieldName || 
                lowerFieldName.includes(lowerKey) ||
                lowerKey.includes(lowerFieldName) ||
                (lowerFieldName.includes('start') && lowerFieldName.includes('end') && lowerKey.includes('tanggal_pelaksanaan')) ||
                (lowerFieldName.includes('tanggal') && lowerFieldName.includes('pelaksana') && lowerKey.includes('audit_date_range'))) {
              matchedValue = value;
              break;
            }
          }
        }
        
        if (matchedValue && matchedValue.trim() !== '') {
          // Isi teks dengan styling yang sama seperti assignment letter
          try {
            const textField = form.getTextField(fieldName);
            textField.setText(matchedValue);
            
            // Tentukan apakah field perlu di-bold
            const isBold = fieldName.toLowerCase().includes('assignment') || 
                           fieldName.toLowerCase().includes('assigment') ||
                           fieldName.toLowerCase().includes('nomor_surat') ||
                           fieldName.toLowerCase().includes('no_surat') ||
                           fieldName.toLowerCase().includes('surat_tugas');
            
            // Set alignment
            const isCenter = shouldBeCenter(fieldName);
            if (isCenter) {
              textField.setAlignment(1); // center
            } else {
              textField.setAlignment(0); // left (default)
            }
            
            // Pilih font berdasarkan bold/tidak, tetapi JANGAN update appearance!
            // Hanya set font size ke 11
            textField.setFontSize(11);
            
            // Set appearance dengan font Times New Roman sebelum flattening
            try {
              const selectedFont = isBold ? timesRomanBoldFont : timesRomanFont;
              
              // Ini penting untuk memastikan tampilan text setelah flattening
              textField.updateAppearances(selectedFont);
              
              console.log(`✅ Applied ${isBold ? 'BOLD' : 'regular'} Times New Roman font to field`);
            } catch (fontError) {
              console.error('Font update error:', fontError);
            }
            
            filledCount++;
            console.log(`Field "${fieldName}" filled with "${matchedValue}", size=11, center=${isCenter}, bold=${isBold}`);
          } catch (e) {
            console.error(`Could not fill field ${fieldName}:`, e);
          }
        }
      } catch (error) {
        console.error(`Error processing field:`, error);
      }
    }

    console.log(`Fields filled: ${filledCount} out of ${fields.length}`);
    
    // Update appearances untuk seluruh form dengan Times New Roman font
    try {
      form.updateFieldAppearances(timesRomanFont);
      console.log('✅ Updated all fields with Times New Roman font');
    } catch (e) {
      console.error('Error updating field appearances:', e);
    }
    
    // PENTING: Flatten form untuk membuat non-editable final PDF
    try {
      // Convert semua form fields menjadi regular text (non-editable)
      form.flatten();
      console.log('✅ Successfully flattened form - all fields converted to static text');
    } catch (flattenError) {
      console.error('Failed to flatten form:', flattenError);
    }
    
    // Save PDF dengan pengaturan yang menjaga layout original
    const modifiedPdfBytes = await pdfDoc.save({
      useObjectStreams: false, // Membantu menjaga posisi konten
      addDefaultPage: false    // Jangan tambah halaman default
    });
    
    return new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error generating addendum PDF with position preservation:', error);
    throw new Error(`Gagal generate PDF addendum: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Download PDF Addendum dengan menjaga posisi presisi
export const downloadAddendumPDFPreservingPosition = async (addendumId: string, fileName?: string) => {
  try {
    // Fetch data addendum untuk mendapatkan branch_name, assigment_letter, dan audit_type
    const { data: addendum, error } = await supabase
      .from('addendum')
      .select('branch_name, assigment_letter, audit_type')
      .eq('id', addendumId)
      .single();

    if (error) throw error;
    if (!addendum) throw new Error('Addendum tidak ditemukan');

    const pdfBlob = await generateAddendumPDFPreservingPosition(addendumId);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    
    // Format nama file sesuai permintaan
    let downloadFileName;
    
    if (fileName) {
      // Jika fileName sudah diberikan, gunakan itu
      downloadFileName = fileName;
    } else {
      // Generate nama file berdasarkan data addendum
      const branchName = addendum.branch_name || 'UNKNOWN';
      const assignmentLetter = addendum.assigment_letter || 'NO-NUMBER';
      
      // Tentukan jenis audit: REGULER atau KHUSUS
      const auditType = addendum.audit_type && addendum.audit_type.toLowerCase().includes('khusus') ? 'KHUSUS' : 'REGULER';
      
      // Format branch name menjadi uppercase
      const formattedBranchName = branchName.toUpperCase();
      
      // Format: ADDENDUM [REGULER/KHUSUS] [BRANCH_NAME] - [ASSIGNMENT_LETTER]
      downloadFileName = `ADDENDUM ${auditType} ${formattedBranchName} - ${assignmentLetter}`;
    }
    
    // Clean filename - hapus karakter yang tidak valid untuk nama file
    const cleanFileName = downloadFileName
      .replace(/[<>:"/\\|?*]/g, '-') // Ganti karakter invalid dengan dash
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    link.download = `${cleanFileName}.pdf`;
    
    console.log('📥 Downloading Addendum PDF with position preservation:', `${cleanFileName}.pdf`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading Addendum PDF:', error);
    throw error;
  }
};
