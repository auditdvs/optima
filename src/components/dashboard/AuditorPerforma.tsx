import { format, parseISO } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { useEffect, useState } from 'react';
import { DateRange } from "react-day-picker";
import { supabase } from '../../lib/supabaseClient';
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Card, CardContent } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

// Add this interface with your other interfaces
interface AuditorAuditCount {
  auditor_id: string;
  name: string;
  regular_count: number;
  fraud_count: number;
}

const AuditorPerforma = () => {
  // State variables
  const [auditorAuditCounts, setAuditorAuditCounts] = useState<AuditorAuditCount[]>([]);
  const [auditorSearchTerm, setAuditorSearchTerm] = useState('');
  const [supportAuditorSummary, setSupportAuditorSummary] = useState<{ auditor: string, inputAudit: number, supportingData: number }[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch functions
  const fetchSupportAuditorSummary = async () => {
    // Mapping nama lengkap ke alias auditor
    const ALIASES: Record<string, string> = {
      'Joey': 'Dede',
      'Ganjar Raharja': 'Ganjar',
      'Lise Roswati R.': 'Lise',
      'Lise Roswati Rochendi MP': 'Lise',
      'Ayu Sri Erian Agustin': 'Ayu',
      'Ayusri Erian Agustin': 'Ayu',
    };
    const AUDITORS = ['Ganjar', 'Dede', 'Lise', 'Ayu'];

    // 1. Ambil data input audit dari work_papers.inputted_by
    const { data: workPapers } = await supabase
      .from('work_papers')
      .select('inputted_by');

    // Hitung jumlah input audit per auditor
    const inputAuditCount: Record<string, number> = {};
    AUDITORS.forEach(auditor => inputAuditCount[auditor] = 0);
    workPapers?.forEach(wp => {
      if (AUDITORS.includes(wp.inputted_by)) {
        inputAuditCount[wp.inputted_by]++;
      }
    });

    // 2. Ambil data supporting dari pull_requests.uploader
    const { data: pullRequests } = await supabase
      .from('pull_requests')
      .select('uploader');

    // Hitung jumlah supporting data per auditor (mapping alias)
    const supportingDataCount: Record<string, number> = {};
    AUDITORS.forEach(auditor => supportingDataCount[auditor] = 0);
    pullRequests?.forEach(pr => {
      let mapped = pr.uploader;
      if (ALIASES[mapped]) mapped = ALIASES[mapped];
      if (AUDITORS.includes(mapped)) {
        supportingDataCount[mapped]++;
      }
    });

    // Gabungkan ke summary
    const summary = AUDITORS.map(auditor => ({
      auditor,
      inputAudit: inputAuditCount[auditor] || 0,
      supportingData: supportingDataCount[auditor] || 0,
    }));

    setSupportAuditorSummary(summary);
  };

  const fetchAuditorAuditCounts = async () => {
    try {
      // First, fetch all auditors from profiles.full_name
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('full_name')
        .not('full_name', 'is', null);
      
      if (profilesError) throw profilesError;
      console.log('Profiles fetched:', profiles?.length);
      
      // Now fetch work papers data
      let workPapersQuery = supabase
        .from('work_papers')
        .select('auditor, audit_type, branch_name, audit_start_date, audit_end_date');
    
      // Add date filters if provided
      if (startDate && endDate) {
        workPapersQuery = workPapersQuery
          .gte('audit_end_date', startDate)
          .lte('audit_end_date', endDate);
      }
    
      // Execute query
      const { data: workPapers, error } = await workPapersQuery;
      if (error) throw error;
      
      console.log('Work papers fetched:', workPapers?.length);
      
      // Initialize counts for all auditors from profiles
      const auditorCounts: Record<string, {
        auditor_id: string;
        name: string;
        regular_count: number;
        fraud_count: number;
      }> = {};
      
      profiles?.forEach(profile => {
        if (profile.full_name?.trim()) {
          const fullName = profile.full_name.trim();
          auditorCounts[fullName] = {
            auditor_id: fullName.toLowerCase().replace(/\s+/g, '_'),
            name: fullName,
            regular_count: 0,
            fraud_count: 0
          };
        }
      });
      
      // Struktur untuk melacak audit unik per auditor berdasarkan branch_name dan audit_end_date
      const uniqueRegularAudits: Record<string, Set<string>> = {};
      const uniqueFraudAudits: Record<string, Set<string>> = {};
      
      // Process work papers data dan cocokan dengan nama dari profiles
      workPapers?.forEach(record => {
        const workPaperAuditor = record.auditor?.trim();
        if (!workPaperAuditor) return;
        
        // Split auditor names by comma (karena bisa multiple auditors per record)
        const auditorNames = workPaperAuditor.split(',').map((name: string) => name.trim()).filter((name: string) => name);
        
        auditorNames.forEach((singleAuditorName: string) => {
          // Cari nama yang cocok di profiles dengan berbagai strategi matching
          let matchedProfileName = null;
          
          // 1. Exact match (case insensitive)
          matchedProfileName = Object.keys(auditorCounts).find(profileName => 
            profileName.toLowerCase() === singleAuditorName.toLowerCase()
          );
          
          // 2. If no exact match, try partial matching
          if (!matchedProfileName) {
            matchedProfileName = Object.keys(auditorCounts).find(profileName => {
              const profileLower = profileName.toLowerCase();
              const workPaperLower = singleAuditorName.toLowerCase();
              
              // Check if work_paper name contains profile name or vice versa
              return profileLower.includes(workPaperLower) || workPaperLower.includes(profileLower);
            });
          }
          
          // 3. If still no match, try matching by first name only
          if (!matchedProfileName) {
            const workPaperFirstName = singleAuditorName.split(' ')[0].toLowerCase();
            matchedProfileName = Object.keys(auditorCounts).find(profileName => {
              const profileFirstName = profileName.split(' ')[0].toLowerCase();
              return profileFirstName === workPaperFirstName;
            });
          }
          
          if (matchedProfileName) {
            // Create unique key from branch_name and audit dates
            // If audit_start_date and audit_end_date are the same, only use one date
            let uniqueKey;
            if (record.audit_start_date === record.audit_end_date) {
              uniqueKey = `${record.branch_name}|${record.audit_start_date}`;
            } else {
              uniqueKey = `${record.branch_name}|${record.audit_start_date}|${record.audit_end_date}`;
            }
            
            // Process based on audit_type
            if (record.audit_type === 'regular') {
              // Initialize set if not exists
              if (!uniqueRegularAudits[matchedProfileName]) {
                uniqueRegularAudits[matchedProfileName] = new Set();
              }
              
              // Only count if unique
              if (!uniqueRegularAudits[matchedProfileName].has(uniqueKey)) {
                uniqueRegularAudits[matchedProfileName].add(uniqueKey);
                auditorCounts[matchedProfileName].regular_count += 1;
                console.log(`✓ Regular audit: "${matchedProfileName}" <- "${singleAuditorName}"`);
              }
            } else if (record.audit_type === 'fraud') {
              // Initialize set if not exists
              if (!uniqueFraudAudits[matchedProfileName]) {
                uniqueFraudAudits[matchedProfileName] = new Set();
              }
              
              // Only count if unique
              if (!uniqueFraudAudits[matchedProfileName].has(uniqueKey)) {
                uniqueFraudAudits[matchedProfileName].add(uniqueKey);
                auditorCounts[matchedProfileName].fraud_count += 1;
                console.log(`✓ Fraud audit: "${matchedProfileName}" <- "${singleAuditorName}"`);
              }
            }
          } else {
            console.log(`❌ No match found for: "${singleAuditorName}" (from: "${workPaperAuditor}")`);
          }
        });
      });
      
      // Convert to array
      const countsArray = Object.values(auditorCounts).map(auditor => ({
        auditor_id: auditor.auditor_id,
        name: auditor.name, // Ini dari profiles.full_name
        regular_count: auditor.regular_count,
        fraud_count: auditor.fraud_count,
        total: auditor.regular_count + auditor.fraud_count
      }));
      
      console.log('Total auditors from profiles:', countsArray.length);
      console.log('Auditors with counts:', countsArray.filter(a => a.total > 0).length);
      
      // Show ALL auditors from profiles, sorted by total (those with audits first, then alphabetical)
      const sortedCounts = countsArray.sort((a, b) => {
        // First sort by total count (descending)
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
      
      setAuditorAuditCounts(sortedCounts);
    } catch (error) {
      console.error('Error fetching auditor audit counts:', error);
    }
  };

  // useEffect
  useEffect(() => {
    fetchAuditorAuditCounts();
    fetchSupportAuditorSummary();
  }, [startDate, endDate]);

  return (
    <>
      {/* Audit Counts Per Auditor */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Audit Counts Per Auditor</h2>
            <div className="flex items-center gap-4">
              {/* Date Filter Controls - Shadcn Version */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-xs h-9 px-3 py-1 w-[240px]"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {startDate && endDate ? (
                        <span>
                          {format(parseISO(startDate), "PPP")} - {format(parseISO(endDate), "PPP")}
                        </span>
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={startDate ? parseISO(startDate) : new Date()}
                      selected={{
                        from: startDate ? parseISO(startDate) : undefined,
                        to: endDate ? parseISO(endDate) : undefined,
                      }}
                      onSelect={(range: DateRange | undefined) => {
                        if (range?.from) {
                          setStartDate(format(range.from, "yyyy-MM-dd"));
                        } else {
                          setStartDate("");
                        }
                        if (range?.to) {
                          setEndDate(format(range.to, "yyyy-MM-dd"));
                        } else {
                          setEndDate("");
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                
                <Button
                  onClick={() => fetchAuditorAuditCounts()}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  size="sm"
                >
                  Apply Filter
                </Button>
                
                <Button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    fetchAuditorAuditCounts();
                  }}
                  variant="outline"
                  className="h-9 text-xs"
                  size="sm"
                >
                  Reset
                </Button>
              </div>
              
              {/* Existing Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={auditorSearchTerm}
                  onChange={(e) => setAuditorSearchTerm(e.target.value)}
                  placeholder="Search auditor..."
                  className="pl-9 pr-2 py-1.5 text-xs border rounded-md w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 w-12">
                    No.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Auditor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Regular Audits
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Special Audits
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditorAuditCounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                      No data available. Try clearing filters.
                    </td>
                  </tr>
                ) : (
                  auditorAuditCounts
                    .filter(auditor => 
                      auditor.name.toLowerCase().includes(auditorSearchTerm.toLowerCase())
                    )
                    .map((auditor, index) => (
                      <tr key={auditor.auditor_id}>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {auditor.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {auditor.regular_count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {auditor.fraud_count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          {(auditor.regular_count + auditor.fraud_count).toLocaleString()}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Support Auditor Table (TABEL TERPISAH) */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="text-md font-semibold mb-2">Support Auditor</h3>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auditor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Input Audit</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supporting Data</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supportAuditorSummary.map((row) => (
                  <tr key={row.auditor}>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.auditor}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.inputAudit.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.supportingData.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AuditorPerforma;
