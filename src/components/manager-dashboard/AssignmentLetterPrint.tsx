import { forwardRef } from 'react';

interface AssignmentLetterPrintProps {
  data: any;
  type: 'regular' | 'khusus' | 'addendum-sampel' | 'addendum-tim';
}

const AssignmentLetterPrint = forwardRef<HTMLDivElement, AssignmentLetterPrintProps>(({ data, type }, ref) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '...';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPeriod = (start: string, end: string) => {
    if (!start || !end) return '[tanggal pelaksanaan]';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startFormatted = formatDate(start);
    const endFormatted = formatDate(end);
    return `${startFormatted} - ${endFormatted}`;
  };

  const formatSmartPeriod = (start: string, end: string) => {
    if (!start || !end) return { startPart: '...', endPart: '...' };
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    const startMonth = startDate.toLocaleDateString('id-ID', { month: 'long' });
    const endMonth = endDate.toLocaleDateString('id-ID', { month: 'long' });
    
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    // Jika bulan dan tahun sama: 14 s.d. 31 Desember 2025
    if (startMonth === endMonth && startYear === endYear) {
      return {
        startPart: `${startDay}`,
        endPart: `${endDay} ${endMonth} ${endYear}`
      };
    }
    // Jika hanya tahun yang sama: 14 Oktober s.d. 31 Desember 2025
    else if (startYear === endYear) {
      return {
        startPart: `${startDay} ${startMonth}`,
        endPart: `${endDay} ${endMonth} ${endYear}`
      };
    }
    // Jika bulan dan tahun berbeda: 14 Desember 2025 s.d. 12 Januari 2026
    else {
      return {
        startPart: `${startDay} ${startMonth} ${startYear}`,
        endPart: `${endDay} ${endMonth} ${endYear}`
      };
    }
  };

  const getTeamMembers = (teamStr: string) => {
    if (!teamStr) return [];
    try {
      const parsed = JSON.parse(teamStr);
      return Array.isArray(parsed) ? parsed : [teamStr];
    } catch {
      // Handle format: "Nama Lengkap, Gelar1, Nama Lengkap2, Gelar2, ..."
      // Split by comma dan group nama dengan gelarnya
      const parts = teamStr.split(',').map(t => t.trim()).filter(t => t);
      const members: string[] = [];
      let currentName = '';
      
      for (const part of parts) {
        // Jika part adalah gelar (S.E, S.Tr, M.Si, dll), gabung dengan nama sebelumnya
        if (part.match(/^(S\.|M\.|B\.|Dr\.|Prof\.|Ir\.|Eng\.|LLC|LLB)/i)) {
          if (currentName) {
            currentName += ' ' + part;
          }
        } else {
          // Jika sudah ada currentName, push ke members
          if (currentName) {
            members.push(currentName);
          }
          currentName = part;
        }
      }
      
      // Push nama terakhir
      if (currentName) {
        members.push(currentName);
      }
      
      return members;
    }
  };

  const isAddendum = type === 'addendum-sampel' || type === 'addendum-tim';
  const isAddendumSampel = type === 'addendum-sampel';
  const isAddendumTim = type === 'addendum-tim';
  const isRegular = type === 'regular';
  const isKhusus = type === 'khusus';
  
  // Check if addendum includes team change type
  const hasTeamChange = isAddendum && data.addendum_type && 
    (data.addendum_type.includes('Perubahan Tim') || data.addendum_type.includes('Penambahan'));
  
  // Use new_team and new_leader only if addendum has team change type
  const teamMembers = hasTeamChange && data.new_team
    ? getTeamMembers(data.new_team)
    : getTeamMembers(data.team);
    
  const leaderName = hasTeamChange && data.new_leader
    ? data.new_leader
    : data.leader;

  const currentYear = new Date().getFullYear();
  const branchName = data.branch_name || '...';
  const periodString = formatPeriod(data.audit_start_date || data.start_date, data.audit_end_date || data.end_date);

  const getMenimbang = () => {
    if (isRegular) {
      return (
        <>
          <p><strong>1.</strong> Sesuai Perencanaan Audit Tahunan Internal Audit Tahun {currentYear}, maka audit reguler atas cabang {branchName} perlu dilaksanakan guna memastikan pengendalian intern atas aktivitas di KOMIDA telah dilaksanakan dengan baik.</p>
          <p><strong>2.</strong> Bahwa pelaksanaan audit diperlukan guna menilai kecukupan dan efektivitas pelaksanaan pengendalian intern serta kualitas kinerja, guna mengetahui kelemahan-kelemahan untuk diinformasikan kepada Manajemen KOMIDA dalam rangka mengambil langkah-langkah perbaikan lebih lanjut.</p>
        </>
      );
    } else if (isKhusus) {
      return (
        <>
          <p><strong>1.</strong> Sesuai kebutuhan operasional dan tindak lanjut atas temuan terdahulu, maka audit khusus atas cabang {branchName} dengan prioritas risiko tertentu (limited scope) perlu dilaksanakan guna memastikan pengendalian intern telah dilaksanakan dengan baik.</p>
          <p><strong>2.</strong> Bahwa pelaksanaan audit khusus diperlukan guna menilai kecukupan pengendalian atas area yang menjadi fokus audit dan memberikan rekomendasi perbaikan kepada Manajemen KOMIDA.</p>
        </>
      );
    } else if (isAddendumSampel) {
      return (
        <>
          <p><strong>1.</strong> Berdasarkan surat tugas sebelumnya No. {data.assignment_letter_before}, perlu dilakukan perubahan atas sampel audit pada cabang {branchName}.</p>
          <p><strong>2.</strong> Dengan adanya perubahan sampel audit ini, diharapkan dapat memberikan hasil audit yang lebih komprehensif dan sesuai dengan kebutuhan audit yang telah disusun.</p>
        </>
      );
    } else if (isAddendumTim) {
      return (
        <>
          <p><strong>1.</strong> Berdasarkan surat tugas sebelumnya No. {data.assignment_letter_before}, perlu dilakukan perubahan atas komposisi tim audit pada cabang {branchName}.</p>
          <p><strong>2.</strong> Dengan adanya perubahan tim audit ini, diharapkan dapat meningkatkan efektivitas dan efisiensi pelaksanaan audit yang telah disusun sebelumnya.</p>
        </>
      );
    }
  };

  const getMengingat = () => (
    <>
      <p><strong>1.</strong> Akta Pendirian Koperaasi Mitra Dhuafa yang dimuat dalam akta No. 84 pada tanggal 18 Mei 2005 dibuat di hadapan Notaris H. Rizul Sudarmadi SH, beserta akta perubahannya yang dimuat dalam akta No. 24 tanggal 08 September 2014 dibuat di hadapan Notaris H. Rizul Sudarmadi SH, Mkn.</p>
      <p><strong>2.</strong> Piagam Komite Audit yang disahkan pada tanggal 19 Juni 2015.</p>
      <p><strong>3.</strong> Piagam Internal Audit.</p>
      {(isAddendumSampel || isAddendumTim) && data.assignment_letter_before && (
        <p><strong>4.</strong> Surat Tugas Sebelumnya No. {data.assignment_letter_before}</p>
      )}
    </>
  );

    const getUntuk = () => {
    // Handle addendum with multiple types
    if (isAddendum && data.addendum_type) {
      const addendumTypes = data.addendum_type.split(',').map((t: string) => t.trim());
      const purposeElements: JSX.Element[] = [];
      
      // Check for Perubahan Sampel DAPA
      if (addendumTypes.some((t: string) => t.includes('Perubahan Sampel DAPA'))) {
        const keterangan = data.keterangan || 'perubahan sampel audit';
        purposeElements.push(
          <span key="sampel">
            Perubahan sampel audit pada pelaksanaan audit {data.audit_type === 'khusus' ? 'khusus' : 'reguler'} di cabang <strong>{branchName}</strong>. Adapun yang dilakukan perubahan adalah, {keterangan}.{' '}
          </span>
        );
      }
      
      // Check for Perpanjangan Waktu
      if (addendumTypes.some((t: string) => t.includes('Perpanjangan Waktu'))) {
        const { startPart, endPart } = formatSmartPeriod(data.start_date, data.end_date);
        purposeElements.push(
          <span key="waktu">
            Perpanjangan waktu mulai tanggal <strong>{startPart}</strong> s.d. <strong>{endPart}</strong>.{' '}
          </span>
        );
      }
      
      // Check for Penambahan/Perubahan Tim
      if (addendumTypes.some((t: string) => t.includes('Perubahan Tim') || t.includes('Penambahan'))) {
        purposeElements.push(
          <span key="tim">
            Perubahan atau penambahan tim.
          </span>
        );
      }
      
      return (
        <>
          <p>1.  {purposeElements}</p>
          <p>2. Melaksanakan dan mematuhi Kode Etik Audit Intern dalam setiap melaksanakan pekerjaan/ kegiatan audit.</p>
          <p>3. Tidak menerima/ memberikan gratifikasi yang berhubungan dengan jabatan dan berlawanan dengan kewajiban atau tugas yang tidak sesuai dengan peraturan yang berlaku.</p>
        </>
      );
    }

    // Handle regular/khusus letters
    if (isRegular) {
      const { startPart, endPart } = formatSmartPeriod(data.audit_start_date, data.audit_end_date);
      return (
        <>
          <p>1. Melakukan Audit Reguler atas pelaksanaan proses bisnis dan pengendalian intern yang terjadi di cabang <strong>{branchName}</strong> mulai tanggal <strong>{startPart}</strong> s.d. <strong>{endPart}</strong>.</p>
          <p>2. Melaksanakan dan mematuhi Kode Etik Audit Intern dalam setiap melaksanakan pekerjaan/ kegiatan audit.</p>
          <p>3. Tidak menerima/ memberikan gratifikasi yang berhubungan dengan jabatan dan berlawanan dengan kewajiban atau tugas yang tidak sesuai dengan peraturan yang berlaku.</p>
        </>
      );
    } else if (isKhusus) {
      const { startPart, endPart } = formatSmartPeriod(data.audit_start_date, data.audit_end_date);
      return (
        <>
          <p>1. Melakukan Audit Khusus berdasarkan proses bisnis dengan prioritas risiko (limited scope) yang terjadi di cabang <strong>{branchName}</strong> mulai tanggal <strong>{startPart}</strong> s.d. <strong>{endPart}</strong>.</p>
          <p>2. Melaksanakan dan mematuhi Kode Etik Audit Intern dalam setiap melaksanakan pekerjaan/ kegiatan audit.</p>
          <p>3. Tidak menerima/ memberikan gratifikasi yang berhubungan dengan jabatan dan berlawanan dengan kewajiban atau tugas yang tidak sesuai dengan peraturan yang berlaku.</p>
        </>
      );
    }

    return (
      <>
        <p>1. -</p>
        <p>2. Melaksanakan dan mematuhi Kode Etik Audit Intern dalam setiap melaksanakan pekerjaan/ kegiatan audit.</p>
        <p>3. Tidak menerima/ memberikan gratifikasi yang berhubungan dengan jabatan dan berlawanan dengan kewajiban atau tugas yang tidak sesuai dengan peraturan yang berlaku.</p>
      </>
    );
  };

  return (
    <div ref={ref} className="print-wrapper">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        
        html, body {
          margin: 0;
          padding: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        .print-wrapper {
          width: 210mm;
          margin: 0 auto;
          background: #fff;
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
        }
        
        /* Page container - PERBAIKAN UTAMA */
        .page {
          width: 210mm;
          min-height: 297mm;
          max-height: 297mm;
          page-break-after: always;
          page-break-inside: avoid;
          position: relative;
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 0;
        }
        
        .page:last-child {
          page-break-after: auto;
        }
        
        /* Header - fixed height */
        .doc-header {
          width: 100%;
          flex-shrink: 0;
        }
        .doc-header img {
          width: 100%;
          margin-top: 10px;
          margin-bottom: -30px;
          height: auto;
          display: block;
        }
        
        /* Body - flexible height */
        .doc-body {
          flex: 1;
          padding: 8mm 10.6mm 8mm 13.1mm;
          overflow: visible;
        }
        
        /* Footer - fixed height */
        .doc-footer {
          width: 100%;
          flex-shrink: 0;
          margin-top: auto;
        }
        .doc-footer img {
          width: 100%;
          height: auto;
          margin-bottom: 25px;
          display: block;
        }
        
        /* Title */
        .title-section {
          text-align: center;
          margin-bottom: 14pt;
        }
        .title-text {
          font-size: 12pt;
          font-weight: bold;
          letter-spacing: 1pt;
          text-decoration: underline;
          margin-bottom: 4pt;
        }
        .title-no {
          font-size: 12pt;
        }
        
        /* Section Layout dengan Table */
        .section-row {
          display: table;
          width: 100%;
          margin-bottom: 8pt;
          page-break-inside: avoid;
        }
        .section-label {
          display: table-cell;
          width: 70pt;
          font-weight: bold;
          vertical-align: top;
        }
        .section-colon {
          display: table-cell;
          width: 10pt;
          vertical-align: top;
        }
        .section-content {
          display: table-cell;
          text-align: justify;
          vertical-align: top;
        }
        .section-content p {
          margin: 0 0 6pt 0;
          text-align: justify;
        }
        
        /* MENUGASKAN */
        .menugaskan-text {
          text-align: center;
          font-weight: bold;
          margin: 10pt 0;
        }
        
        /* KEPADA */
        .kepada-leader {
          font-weight: bold;
        }
        .kepada-title {
          margin-bottom: 4pt;
        }
        .kepada-anggota-label {
          margin-top: 4pt;
          margin-bottom: 2pt;
        }
        .kepada-member {
          font-weight: bold;
          padding-left: 10pt;
        }
        
        /* Penutup & TTD */
        .penutup-text {
          margin-top: 14pt;
          text-align: justify;
        }
        .ttd-wrapper {
          margin-top: 14pt;
          page-break-inside: avoid;
        }
        .ttd-img {
          height: 90pt;
          margin-top: 3pt;
        }
        .ttd-name {
          font-weight: bold;
          text-decoration: underline;
        }
        .ttd-position {
          font-style: italic;
        }
        .tembusan-wrapper {
          margin-top: 14pt;
          page-break-inside: avoid;
        }
        .tembusan-title {
          font-weight: bold;
        }
        
        /* Print Media */
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm;
          }
          
          .print-wrapper {
            width: 210mm;
            margin: 0;
          }
          
          .page {
            margin: 0;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          .doc-body {
            padding: 8mm 10.6mm 8mm 13.1mm;
          }

        }
      `}</style>


      {/* PAGE 1 */}
      <div className="page">
        {/* HEADER */}
        <div className="doc-header">
          <img src="/header.svg" alt="Kop Surat" />
        </div>

        {/* BODY CONTENT PAGE 1 */}
        <div className="doc-body">
          {/* JUDUL */}
          <div className="title-section">
            <div className="title-text">
              {isAddendum ? 'SURAT TUGAS ADENDUM' : 'SURAT TUGAS'}
            </div>
            <div className="title-no">
              No : <strong>{data.assignment_letter_number || data.assigment_letter || '...'}</strong>
            </div>
          </div>

          {/* MENIMBANG */}
          <div className="section-row">
            <div className="section-label">Menimbang</div>
            <div className="section-colon">:</div>
            <div className="section-content">{getMenimbang()}</div>
          </div>

          {/* MENGINGAT */}
          <div className="section-row">
            <div className="section-label">Mengingat</div>
            <div className="section-colon">:</div>
            <div className="section-content">{getMengingat()}</div>
          </div>

          {/* MENUGASKAN */}
          <div className="menugaskan-text">MENUGASKAN:</div>

          {/* KEPADA */}
          <div className="section-row">
            <div className="section-label">KEPADA</div>
            <div className="section-colon">:</div>
            <div className="section-content">
              <div>
                <span className="kepada-leader">{leaderName?.toUpperCase()}</span>
                {teamMembers.length === 0 ? (
                  <span className="kepada-title"> sebagai ketua sekaligus anggota.</span>
                ) : (
                  <span className="kepada-title"> sebagai ketua,</span>
                )}
              </div>
              {teamMembers.length > 0 && (
                <div style={{ marginTop: '4pt' }}>
                  <div className="kepada-anggota-label">Dengan anggota :</div>
                  {teamMembers.map((member: string, idx: number) => (
                    <div key={idx} className="kepada-member">{idx + 1}. {member.toUpperCase()}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* UNTUK */}
          <div className="section-row">
            <div className="section-label">UNTUK</div>
            <div className="section-colon">:</div>
            <div className="section-content">{getUntuk()}</div>
          </div>
        </div>

        {/* TAMBAHKAN INI - Spacer untuk memaksa page break */}
        <div style={{ height: '20mm' }}></div>


        {/* FOOTER PAGE 1 */}
        <div className="doc-footer">
          <img src="/footer.svg" alt="Footer" />
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="page">
        {/* HEADER PAGE 2 */}
        <div className="doc-header">
          <img src="/header.svg" alt="Kop Surat" />
        </div>

        {/* BODY CONTENT PAGE 2 */}
        <div className="doc-body">
          {/* PENUTUP */}
          <p className="penutup-text">Demikian dari kami dan tugas ini hendaknya bisa dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.</p>

          {/* TTD */}
          <div className="ttd-wrapper">
            <p>Jakarta, {formatDate(data.tanggal_input || new Date().toISOString())}</p>
            <p>Yang Menugaskan,</p>
            <img src="/signature.svg" alt="TTD" className="ttd-img" />
            <p className="ttd-name">Muhammad Afan Ghafar</p>
            <p className="ttd-position">Internal Audit</p>
          </div>

          {/* TEMBUSAN */}
          <div className="tembusan-wrapper">
            <p className="tembusan-title">Tembusan :</p>
            <p>- Regional Manager</p>
            <p>- Koordinator Cabang</p>
            <p>- Manajer Cabang</p>
            <p>- Arsip</p>
          </div>
        </div>

        {/* FOOTER PAGE 2 */}
        <div className="doc-footer">
          <img src="/footer.svg" alt="Footer" />
        </div>
      </div>
    </div>
  );
});

AssignmentLetterPrint.displayName = 'AssignmentLetterPrint';

export default AssignmentLetterPrint;
