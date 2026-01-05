import { format, parseISO } from "date-fns";
import { CalendarIcon, Search, UsersIcon } from "lucide-react";
import { useEffect, useState } from 'react';
import { DateRange } from "react-day-picker";
import { supabase } from '../../lib/supabaseClient';
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Card, CardContent } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import TimelineView from './TimelineView';

// Add this interface with your other interfaces
interface AuditorAuditCount {
  auditor_id: string;
  name: string;
  regular_count: number;
  fraud_count: number;
}

const AuditorPerforma = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'auditor_counts' | 'timeline'>('auditor_counts');
  
  // State variables for Auditor Counts
  const [auditorAuditCounts, setAuditorAuditCounts] = useState<AuditorAuditCount[]>([]);
  const [auditorSearchTerm, setAuditorSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data for Timeline
  const [letters, setLetters] = useState<any[]>([]);
  const [addendums, setAddendums] = useState<any[]>([]);


  const fetchAuditorAuditCounts = async () => {
    try {
      // First, fetch all auditors from profiles.full_name
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('full_name')
        .not('full_name', 'is', null);
      
      if (profilesError) throw profilesError;
      
      // Now fetch audit_master data
      let auditMasterQuery = supabase
        .from('audit_master')
        .select('team, leader, audit_type, branch_name, audit_start_date, audit_end_date');
    
      // Add date filters if provided
      if (startDate && endDate) {
        auditMasterQuery = auditMasterQuery
          .gte('audit_end_date', startDate)
          .lte('audit_end_date', endDate);
      }
    
      // Execute query
      const { data: audits, error } = await auditMasterQuery;
      if (error) throw error;
      
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
      
      // Helper to clean name
      const cleanName = (name: string) => {
          const titlesToIgnore = [
            'S.E', 'S.E.', 'SE', 
            'S.Kom', 'S.Kom.', 'S.Ko', 
            'S.H', 'S.H.', 'SH',
            'S.Ak', 'S.Ak.', 
            'M.M', 'M.M.', 'MM',
            'Ak', 'Ak.', 'CA', 'CPA',
            'S.T', 'S.T.',
            'S.Si', 'S.Si.',
            'A.Md', 'A.Md.'
        ];
        const trimmed = name.trim();
        if (titlesToIgnore.includes(trimmed) || trimmed.length <= 2) return null;
        return trimmed;
      };

      // Process audits data
      audits?.forEach(record => {
        let teamMembers: string[] = [];
        
        // Parse team
        try {
            if (record.team) {
                // Check if JSON
                if (record.team.startsWith('[') || record.team.startsWith('{')) {
                    const parsed = JSON.parse(record.team);
                    if (Array.isArray(parsed)) teamMembers = parsed;
                    else teamMembers = [record.team];
                } else {
                    teamMembers = record.team.split(',').map((t: string) => t.trim());
                }
            }
        } catch {
            if (record.team) teamMembers = [record.team];
        }

        // Add leader
        if (record.leader) teamMembers.push(record.leader);

        // Deduplicate
        teamMembers = [...new Set(teamMembers)];

        teamMembers.forEach((rawName: string) => {
          const singleAuditorName = cleanName(rawName);
          if (!singleAuditorName) return;

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
            let uniqueKey;
            if (record.audit_start_date === record.audit_end_date) {
              uniqueKey = `${record.branch_name}|${record.audit_start_date}`;
            } else {
              uniqueKey = `${record.branch_name}|${record.audit_start_date}|${record.audit_end_date}`;
            }
            
            // Normalize audit type
            const type = record.audit_type?.toLowerCase() || '';

            // Process based on audit_type
            if (type.includes('reguler') || type === 'regular' || type === 'general') {
              // Initialize set if not exists
              if (!uniqueRegularAudits[matchedProfileName]) {
                uniqueRegularAudits[matchedProfileName] = new Set();
              }
              
              // Only count if unique
              if (!uniqueRegularAudits[matchedProfileName].has(uniqueKey)) {
                uniqueRegularAudits[matchedProfileName].add(uniqueKey);
                auditorCounts[matchedProfileName].regular_count += 1;
              }
            } else if (type.includes('fraud') || type.includes('special') || type.includes('investigasi') || type.includes('khusus')) {
              // Initialize set if not exists
              if (!uniqueFraudAudits[matchedProfileName]) {
                uniqueFraudAudits[matchedProfileName] = new Set();
              }
              
              // Only count if unique
              if (!uniqueFraudAudits[matchedProfileName].has(uniqueKey)) {
                uniqueFraudAudits[matchedProfileName].add(uniqueKey);
                auditorCounts[matchedProfileName].fraud_count += 1;
              }
            }
          }
        });
      });
      
      // Convert to array
      const countsArray = Object.values(auditorCounts).map(auditor => ({
        auditor_id: auditor.auditor_id,
        name: auditor.name,
        regular_count: auditor.regular_count,
        fraud_count: auditor.fraud_count,
        total: auditor.regular_count + auditor.fraud_count
      }));
       
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

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('letter')
        .select('*')
        .order('tanggal_input', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
    }
  };

  const fetchAddendums = async () => {
    try {
      const { data, error } = await supabase
        .from('addendum')
        .select('*')
        .order('tanggal_input', { ascending: false });

      if (error) throw error;
      setAddendums(data || []);
    } catch (error) {
      console.error('Error fetching addendums:', error);
    }
  };

  // useEffect
  useEffect(() => {
    fetchAuditorAuditCounts();
    fetchLetters();
    fetchAddendums();
  }, [startDate, endDate]);

  return (
    <>
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex px-6">
            <button
              onClick={() => setActiveTab('auditor_counts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'auditor_counts'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } mr-8`}
            >
              <UsersIcon className="w-4 h-4 inline mr-2" />
              Auditor Performa
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Timeline
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'auditor_counts' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Audit Counts Per Auditor</h2>
              <div className="flex items-center gap-4">
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
      ) : (
        <TimelineView letters={letters} addendums={addendums} />
      )}
    </>
  );
};

export default AuditorPerforma;
