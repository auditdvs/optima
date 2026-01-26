import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TimelineColumn {
  id: string;
  label: string;
  subLabel?: string;
  start: Date;
  end: Date;
  width: number;
  isWeekend?: boolean;
  isFirstDay?: boolean;
}

interface TimelineViewProps {
  letters: any[];
  addendums: any[];
}

const TimelineView = ({ letters, addendums }: TimelineViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timelineViewMode, setTimelineViewMode] = useState<'month' | 'year' | 'range'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  // Timeline Helper Functions
  // Helper to get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const getVisibleColumns = (): TimelineColumn[] => {
    if (timelineViewMode === 'year') {
      const year = selectedYear;
      const columns: TimelineColumn[] = [];
      
      // Generate 4 weeks per month for cleaner view
      for (let m = 0; m < 12; m++) {
        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Split into 4 segments corresponding to user request "Minggu 1, Minggu 2..."
        const segments = [
          { label: 'M1', start: 1, end: 7 },
          { label: 'M2', start: 8, end: 14 },
          { label: 'M3', start: 15, end: 21 },
          { label: 'M4', start: 22, end: daysInMonth }
        ];

        segments.forEach(seg => {
           columns.push({
             id: `${year}-${m}-${seg.label}`,
             label: seg.label,
             subLabel: firstDay.toLocaleDateString('id-ID', { month: 'short' }),
             start: new Date(year, m, seg.start),
             end: new Date(year, m, seg.end, 23, 59, 59),
             width: 40 // Consistent width
           });
        });
      }
      return columns;
    } 
    
    // Daily View (Month/Range)
    let dates: Date[] = [];
    if (timelineViewMode === 'range') {
       if (dateRangeStart && dateRangeEnd) {
          const start = new Date(dateRangeStart);
          const end = new Date(dateRangeEnd);
          let current = new Date(start);
          let safety = 0;
          while (current <= end && safety < 1000) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
            safety++;
          }
       } else {
         dates = getDaysInMonth(new Date());
       }
    } else {
       dates = getDaysInMonth(currentDate);
    }

    return dates.map((date, i) => ({
      id: date.toISOString(),
      label: date.getDate().toString(),
      subLabel: (date.getDate() === 1 || i === 0) ? date.toLocaleDateString('id-ID', { month: 'short' }) : undefined,
      start: new Date(date.setHours(0,0,0,0)),
      end: new Date(date.setHours(23,59,59,999)),
      width: 40,
      isWeekend: [0, 6].includes(date.getDay()),
      isFirstDay: date.getDate() === 1 || i === 0
    }));
  };

  const getTimelineWidth = (columns: TimelineColumn[]) => Math.max(1000, columns.reduce((acc, col) => acc + col.width, 0));

  const calculateDatePosition = (date: Date, columns: TimelineColumn[], totalWidth: number, snapToEnd: boolean = false) => {
     // Find column index that contains the date
     const dateTime = date.getTime();
     const colIndex = columns.findIndex(c => dateTime >= c.start.getTime() && dateTime <= c.end.getTime());
     
     if (colIndex !== -1) {
       // Found direct match column
       const col = columns[colIndex];
       const colLeft = colIndex * col.width; 
       
       // For cleaner grid alignment:
       // - If snapToEnd is true (end date), snap to end of column (100%)
       // - If snapToEnd is false (start date), snap to start of column (0%)
       if (snapToEnd) {
         // End date: snap to end of the column
         return colLeft + col.width;
       } else {
         // Start date: snap to start of the column
         return colLeft;
       }
     }
     
     // Date out of range handling
     if (columns.length === 0) return 0;
     if (date < columns[0].start) return 0;
     if (date > columns[columns.length - 1].end) return columns.length * 40; 
     
     return 0;
  };

  const getTimelineData = () => {
    const auditorsMap = new Map<string, any[]>();
    
    // First, create a map of letters by their assignment letter number for quick lookup
    const lettersByNo = new Map<string, any>();
    letters.forEach(letter => {
      if (letter.assigment_letter) {
        lettersByNo.set(letter.assigment_letter, letter);
      }
    });
    
    // Helper to process items (letters or addendums)
    const processItem = (item: any, isAddendum: boolean) => {
      // Skip rejected items
      if (item.status?.toLowerCase() === 'rejected') return;
      
      // Use audit_start_date/audit_end_date (Pelaksanaan Audit) as priority
      let startStr: string | null = null;
      let endStr: string | null = null;
      
      if (isAddendum) {
        // Addendum uses start_date/end_date for the new period
        endStr = item.end_date || item.new_audit_end_date || item.audit_end_date;
        
        // Find the original letter using assignment_letter_before field
        const originalLetterNo = item.assignment_letter_before || item.assigment_letter;
        const originalLetter = lettersByNo.get(originalLetterNo);
        
        if (originalLetter) {
          const origEndStr = originalLetter.audit_end_date || originalLetter.audit_period_end;
          if (origEndStr) {
            // Addendum bar starts on the same day as original letter ends (for visual connection)
            startStr = origEndStr;
          }
        }
        
        // If we couldn't find original letter, fall back to the full date range
        if (!startStr) {
          startStr = item.start_date || item.new_audit_start_date || item.audit_start_date;
        }
      } else {
        startStr = item.audit_start_date || item.audit_period_start;
        endStr = item.audit_end_date || item.audit_period_end;
      }
      
      if (!startStr || !endStr) return;
      
      const start = new Date(startStr);
      const end = new Date(endStr);
      
      // Skip if start is after end (can happen if addendum end date is same as original)
      if (start > end) return;
      
      // Parse team
      let teamMembers: string[] = [];
      try {
        // Handle new_team for addendums if it exists, otherwise use team
        const teamSource = (isAddendum && item.new_team) ? item.new_team : item.team;
        if (teamSource) {
          // Check if it's JSON string or comma-separated string
          if (teamSource.startsWith('[') || teamSource.startsWith('{')) {
             const parsed = JSON.parse(teamSource);
             if (Array.isArray(parsed)) teamMembers = parsed;
             else teamMembers = [teamSource];
          } else {
             teamMembers = teamSource.split(',').map((t: string) => t.trim());
          }
        }
      } catch {
         const teamSource = (isAddendum && item.new_team) ? item.new_team : item.team;
         if (teamSource) teamMembers = [teamSource];
      }
      
      // Handle leader
      const leaderSource = (isAddendum && item.new_leader) ? item.new_leader : item.leader;
      if (leaderSource) teamMembers.push(leaderSource);
      
      // Unique members only
      teamMembers = [...new Set(teamMembers.filter(m => m))];
      
      teamMembers.forEach(member => {
        let cleanName = member.trim();
        
        // Remove academic degrees if they were split incorrectly
        // List of common Indonesian academic titles to ignore if they appear as standalone names
        const titlesToIgnore = [
          'S.E', 'S.E.', 'SE', 
          'S.Kom', 'S.Kom.', 'S.Ko', 
          'S.H', 'S.H.', 'SH',
          'S.Ak', 'S.Ak.', 'SAk',
          'S.Tr.Akun', 'S.Tr.Akun.', 'S.Tr', 'S.Tr.',
          'M.M', 'M.M.', 'MM', 'M.Ak', 'M.Ak.',
          'Ak', 'Ak.', 'CA', 'CPA', 'BKP',
          'S.T', 'S.T.', 'ST',
          'S.Si', 'S.Si.', 'SSi',
          'S.Pd', 'S.Pd.', 'SPd',
          'S.Sos', 'S.Sos.', 'SSos',
          'S.I.Kom', 'S.I.Kom.',
          'A.Md', 'A.Md.', 'AMD', 'Amd',
          'M.Si', 'M.Si.', 'MSi',
          'M.Pd', 'M.Pd.', 'MPd',
          'Dr', 'Dr.', 'Drs', 'Drs.', 'Dra', 'Dra.',
          'Ir', 'Ir.', 'Prof', 'Prof.'
        ];

        if (titlesToIgnore.includes(cleanName) || cleanName.length <= 2) {
            return;
        }

        // Normalize name to handle variations (remove extra spaces, normalize case, etc.)
        const normalizeName = (name: string): string => {
          return name
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .toLowerCase();
        };

        const normalizedName = normalizeName(cleanName);
        
        // Check if auditor already exists with similar name
        let matchedKey: string | null = null;
        
        // Try to find exact match first (normalized)
        for (const existingKey of auditorsMap.keys()) {
          if (normalizeName(existingKey) === normalizedName) {
            matchedKey = existingKey;
            break;
          }
        }
        
        // If no exact match, try fuzzy matching (for truncated names or slight variations)
        if (!matchedKey) {
          for (const existingKey of auditorsMap.keys()) {
            const normalizedExisting = normalizeName(existingKey);
            
            // Check if one name is a prefix of another (truncation case)
            if (normalizedExisting.startsWith(normalizedName) || normalizedName.startsWith(normalizedExisting)) {
              // Use the longer name as the canonical one
              matchedKey = existingKey.length >= cleanName.length ? existingKey : cleanName;
              
              // If we're switching to a longer name, migrate the data
              if (matchedKey !== existingKey) {
                const existingData = auditorsMap.get(existingKey) || [];
                auditorsMap.delete(existingKey);
                auditorsMap.set(matchedKey, existingData);
              }
              break;
            }
          }
        }
        
        // Use matched key or original cleaned name
        const finalKey = matchedKey || cleanName;
        
        if (!auditorsMap.has(finalKey)) {
          auditorsMap.set(finalKey, []);
        }
        
        // Get letter number
        const letterNo = isAddendum 
          ? (item.addendum_letter_no || item.addendum_number || '-')
          : (item.assigment_letter || item.letter_no || '-');
        
        // Add (Addendum) label to branch name for addendums
        const branchLabel = isAddendum ? `${item.branch_name} (Addendum)` : item.branch_name;
        
        auditorsMap.get(finalKey)?.push({
          id: item.id,
          branch: branchLabel,
          letterNo,
          type: isAddendum ? `Addendum: ${item.addendum_type}` : item.audit_type,
          start,
          end,
          status: item.status,
          isAddendum
        });
      });
    };

    // Process Letters first
    letters.forEach(letter => processItem(letter, false));
    
    // Process Addendums
    addendums.forEach(addendum => processItem(addendum, true));
    
    return Array.from(auditorsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 overflow-hidden">
      {/* Timeline Header with Flexible Filter Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Tampilan:</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button 
                onClick={() => setTimelineViewMode('month')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  timelineViewMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Bulan
              </button>
              <button 
                onClick={() => setTimelineViewMode('year')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-r ${
                  timelineViewMode === 'year' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tahun
              </button>
              <button 
                onClick={() => setTimelineViewMode('range')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  timelineViewMode === 'range' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Range
              </button>
            </div>
          </div>
          
          {/* Date Controls based on View Mode */}
          <div className="flex items-center gap-3">
            {timelineViewMode === 'month' && (
              <>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <select 
                    value={currentDate.getMonth()}
                    onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
                    className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select 
                    value={currentDate.getFullYear()}
                    onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
                    className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={new Date().getFullYear() - 2 + i}>
                        {new Date().getFullYear() - 2 + i}
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Hari Ini
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </>
            )}
            
            {timelineViewMode === 'year' && (
              <>
                <button 
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-200 rounded-md px-4 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={new Date().getFullYear() - 2 + i}>
                      {new Date().getFullYear() - 2 + i}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => setSelectedYear(new Date().getFullYear())}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Tahun Ini
                </button>
                <button 
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </>
            )}
            
            {timelineViewMode === 'range' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Dari:</span>
                <input 
                  type="date" 
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">s.d.</span>
                <input 
                  type="date" 
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div> <span>Reguler</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div> <span>Khusus/Fraud</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm flex flex-col h-[600px]">
         {/* Top Scrollbar - syncs with body */}
        <div className="flex-none">
          <div className="flex">
            <div className="w-[280px] flex-none"></div>
            <div 
              id="timeline-top-scroll"
              className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
              style={{ height: '12px' }}
              onScroll={(e) => {
                const body = document.getElementById('timeline-body');
                const header = document.getElementById('timeline-header');
                if (body) body.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                if (header) header.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
              }}
            >
              <div style={{ width: `${getTimelineWidth(getVisibleColumns())}px`, height: '1px' }}></div>
            </div>
          </div>
        </div>
        
         {/* Header Section - Sticky */}
        <div className="flex-none overflow-hidden border-b border-gray-200 bg-gray-50 z-20">
          <div className="flex">
            <div className="w-[280px] flex-none p-3 font-semibold text-gray-700 border-r border-gray-200 bg-gray-50 flex items-center z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              Auditor
            </div>
            <div className="flex-1 overflow-hidden relative" ref={(el) => {
              // Sync scroll header with body
              const body = document.getElementById('timeline-body');
              if (el && body) {
                el.scrollLeft = body.scrollLeft;
              }
            }} id="timeline-header">
              <div className="flex" style={{ width: `${getTimelineWidth(getVisibleColumns())}px` }}> 
                {getVisibleColumns().map((col, i) => (
                  <div 
                    key={i} 
                    className={`flex-none border-r border-gray-200 text-center flex flex-col justify-center py-2 ${
                      col.isWeekend ? 'bg-gray-100/50' : 'bg-transparent'
                    }`}
                    style={{ width: `${col.width}px` }}
                  >
                    {col.subLabel && (
                      <span className="text-[9px] font-bold text-indigo-600 block leading-tight mb-0.5 uppercase tracking-tighter">
                        {col.subLabel}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium ${col.isWeekend ? 'text-red-500' : 'text-gray-600'}`}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div 
          id="timeline-body"
          className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          style={{ scrollbarWidth: 'none' }}
          onScroll={(e) => {
            const header = document.getElementById('timeline-header');
            const topScroll = document.getElementById('timeline-top-scroll');
            const scrollLeft = (e.target as HTMLDivElement).scrollLeft;
            if (header) header.scrollLeft = scrollLeft;
            if (topScroll) topScroll.scrollLeft = scrollLeft;
          }}
        >
          <div className="relative min-h-full">
            <div className="flex flex-col" style={{ width: `${getTimelineWidth(getVisibleColumns())}px` }}>
              {getTimelineData().map(([auditorName, assignments]) => {
                const columns = getVisibleColumns();
                const viewStart = columns[0].start;
                const viewEnd = columns[columns.length - 1].end;
                
                const visibleAssignments = assignments.filter(a => 
                  (a.start <= viewEnd && a.end >= viewStart)
                );
                
                if (visibleAssignments.length === 0) return null;

                // Calculate row for each assignment to avoid overlap
                const assignmentsWithRows: Array<typeof visibleAssignments[0] & { row: number }> = [];
                
                visibleAssignments.forEach((assignment) => {
                  // Find which row this assignment should be on
                  let row = 0;
                  
                  while (true) {
                    // Check if there's any overlap with assignments already placed in this row
                    const hasOverlapInRow = assignmentsWithRows.some((prev) => {
                      if (prev.row !== row) return false;
                      
                      // Check date overlap
                      return !(assignment.end < prev.start || assignment.start > prev.end);
                    });
                    
                    if (!hasOverlapInRow) break;
                    row++;
                  }
                  
                  assignmentsWithRows.push({ ...assignment, row });
                });
                
                // Calculate max rows needed
                const maxRows = Math.max(1, ...assignmentsWithRows.map(a => a.row + 1));
                const rowHeight = maxRows > 1 ? Math.max(20, 40 / maxRows) : 32; // Dynamic height based on number of rows
                const containerHeight = Math.max(50, maxRows * (rowHeight + 4) + 8); // 4px gap between rows, 8px padding

                return (
                  <div key={auditorName} className="flex border-b border-gray-100 hover:bg-gray-50/80 transition-colors group/row" style={{ minHeight: `${containerHeight}px` }}>
                    {/* Sticky Auditor Name - z-30 to stay above bars */}
                    <div className="sticky left-0 w-[280px] flex-none border-r border-gray-200 p-3 text-sm font-medium text-gray-900 flex items-center z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]" style={{ backgroundColor: 'white' }}>
                      <span className="truncate" title={auditorName}>{auditorName}</span>
                    </div>

                    {/* Bars Area */}
                    <div className="flex-1 relative" style={{ height: `${containerHeight}px` }}>
                       {/* Vertical Grid Lines - rendered on top of bars */}
                       <div className="absolute inset-0 flex pointer-events-none z-20">
                          {columns.map((col, i) => (
                            <div 
                              key={i} 
                              className={`flex-none border-r border-gray-200/50 h-full ${
                                col.isWeekend ? 'bg-gray-50/30' : ''
                              }`}
                              style={{ width: `${col.width}px` }}
                            />
                          ))}
                       </div>

                       {/* Assignments Bars */}
                       {assignmentsWithRows.map((assignment, idx) => {
                         const startPx = calculateDatePosition(assignment.start, columns, 0, false);
                         const endPx = calculateDatePosition(assignment.end, columns, 0, true);
                         
                         // Min width 10px if start/end are same or very close
                         const widthPx = Math.max(10, endPx - startPx); 
                         
                         // Adjust start if before view
                         const safeStartPx = Math.max(0, startPx);
                         
                         // Calculate final width based on safe start
                         // If start was negative, we subtract that cutoff from width
                         let displayWidth = widthPx;
                         if (startPx < 0) {
                           displayWidth = endPx; // from 0 to end
                         }
                         
                         // Cap at max width
                         displayWidth = Math.min(displayWidth, getTimelineWidth(columns) - safeStartPx);

                         if (displayWidth <= 0) return null;

                         const colorClass = assignment.type?.toLowerCase().includes('fraud') || 
                           assignment.type?.toLowerCase().includes('special') || 
                            assignment.type?.toLowerCase().includes('investigasi') ||
                            assignment.type?.toLowerCase().includes('khusus')
                           ? 'bg-gradient-to-r from-red-500 to-red-600 border border-red-600' 
                           : 'bg-gradient-to-r from-blue-500 to-blue-600 border border-blue-600';
                         
                         // Calculate vertical position based on row
                         const topPosition = 4 + assignment.row * (rowHeight + 4); // 4px initial padding, 4px gap between rows

                         return (
                           <div
                             key={`${assignment.id}-${idx}`}
                             className={`absolute rounded-md shadow-sm ${colorClass} cursor-pointer group/bar z-10 flex items-center justify-center overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all`}
                             style={{ 
                               left: `${safeStartPx}px`, 
                               width: `${displayWidth}px`,
                               top: `${topPosition}px`,
                               height: `${rowHeight}px`
                             }}
                           >
                             {displayWidth > 30 && (
                               <span className="text-[9px] text-white font-semibold truncate px-1 w-full text-center drop-shadow-sm">
                                 {assignment.branch}
                               </span>
                             )}
                             
                             {/* Minimalist Tooltip */}
                             <div className="invisible group-hover/bar:visible opacity-0 group-hover/bar:opacity-100 fixed z-[9999] pointer-events-none transition-opacity duration-150 bg-gray-900 text-white text-xs rounded-md shadow-xl p-2 min-w-[200px]"
                                  style={{ 
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%) translateY(-8px)',
                                    width: 'max-content',
                                    maxWidth: '300px'
                                  }}>
                                  <div className="font-bold border-b border-gray-700 pb-1 mb-1 text-center">{assignment.branch}</div>
                                  <div className="space-y-1">
                                     <div className="flex justify-between gap-3"><span className="text-gray-400">No:</span> <span>{assignment.letterNo}</span></div>
                                     <div className="flex justify-between gap-3"><span className="text-gray-400">Tgl:</span> <span>{assignment.start.toLocaleDateString('id-ID', {day: 'numeric', month:'short'})} - {assignment.end.toLocaleDateString('id-ID', {day: 'numeric', month:'short'})}</span></div>
                                     <div className="flex justify-between gap-3"><span className="text-gray-400">Status:</span> <span className="capitalize text-yellow-400">{assignment.status}</span></div>
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-gray-900"></div>
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                );
               })}
               
               {/* Empty State */}
               {getTimelineData().every(([_, assignments]) => {
                  const columns = getVisibleColumns();
                  if (columns.length === 0) return true;
                  const viewStart = columns[0].start;
                  const viewEnd = columns[columns.length - 1].end;
                  return !assignments.some(a => a.start <= viewEnd && a.end >= viewStart);
               }) && (
                 <div className="flex items-center justify-center h-[200px] text-gray-400 italic">
                   Tidak ada proses audit pada rentang tanggal ini.
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
