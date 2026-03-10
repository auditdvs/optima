import { MapPin, RefreshCw, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getActiveAuditors } from '../../lib/auditorService';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";

interface AuditorTrackingData {
  auditorName: string;
  currentPosition: string;
  until: string;
  branchName?: string;
  letterNumber?: string;
  pendingBranch?: string;
  pendingType?: 'letter' | 'addendum';
  endDateRaw?: Date;
}

const AuditorTracking: React.FC = () => {
  const [trackingData, setTrackingData] = useState<AuditorTrackingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fuzzy name matching helpers (same approach as AccountSettingsPage)
  const normalize = (str: string) => str.toLowerCase().replace(/[.,]/g, '').trim();
  
  const filterShortTokens = (tokens: string[]) => tokens.filter(t => t.length > 3);

  const isNameMatch = (auditorName: string, dbName: string): boolean => {
    if (!auditorName || !dbName) return false;
    
    const normAuditor = normalize(auditorName);
    const normDb = normalize(dbName);
    
    // 0. Exact match (case insensitive)
    if (normAuditor === normDb) return true;
    
    const auditorTokens = normAuditor.split(/\s+/);
    const dbTokens = normDb.split(/\s+/);
    const auditorFiltered = filterShortTokens(auditorTokens);
    const dbFiltered = filterShortTokens(dbTokens);
    
    // 1. Contains match (min 2 meaningful words)
    if (auditorFiltered.length >= 2 && dbFiltered.length >= 2) {
      const auditorJoined = auditorFiltered.join(' ');
      const dbJoined = dbFiltered.join(' ');
      if (dbJoined.includes(auditorJoined) || auditorJoined.includes(dbJoined)) return true;
    }
    
    // 2. Initials match (only for meaningful tokens)
    if (auditorFiltered.length >= 3 && dbFiltered.length >= 3) {
      const auditorInitials = auditorFiltered.map(t => t[0]).join('');
      const dbInitials = dbFiltered.map(t => t[0]).join('');
      if (auditorInitials === dbInitials) return true;
    }
    
    // 3. Token Intersection - exact match only, need at least 2
    let exactMatchCount = 0;
    auditorFiltered.forEach(aToken => {
      if (dbFiltered.some(dToken => dToken === aToken)) {
        exactMatchCount++;
      }
    });
    if (exactMatchCount >= 2) return true;
    
    return false;
  };

  // Check if auditor is in a record's team/leader fields
  const isAuditorInRecord = (auditorName: string, record: any): boolean => {
    // Check leader
    if (record.leader && isNameMatch(auditorName, record.leader)) return true;
    
    // Check team (handle comma-separated and JSON formats)
    let teamMembers: string[] = [];
    try {
      if (record.team) {
        if (record.team.startsWith('[') || record.team.startsWith('{')) {
          const parsed = JSON.parse(record.team);
          teamMembers = Array.isArray(parsed) ? parsed : [record.team];
        } else {
          teamMembers = record.team.split(',').map((t: string) => t.trim());
        }
      }
    } catch {
      if (record.team) teamMembers = [record.team];
    }
    
    if (teamMembers.some((member: string) => isNameMatch(auditorName, member))) return true;
    
    // Check new_leader
    if (record.new_leader && isNameMatch(auditorName, record.new_leader)) return true;
    
    // Check new_team
    let newTeamMembers: string[] = [];
    try {
      if (record.new_team) {
        if (record.new_team.startsWith('[') || record.new_team.startsWith('{')) {
          const parsed = JSON.parse(record.new_team);
          newTeamMembers = Array.isArray(parsed) ? parsed : [record.new_team];
        } else {
          newTeamMembers = record.new_team.split(',').map((t: string) => t.trim());
        }
      }
    } catch {
      if (record.new_team) newTeamMembers = [record.new_team];
    }
    
    return newTeamMembers.some((member: string) => isNameMatch(auditorName, member));
  };

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all active auditors
      const validAuditors = await getActiveAuditors();

      // 2. Fetch all approved letters
      const { data: letters, error: letterError } = await supabase
        .from('letter')
        .select('id, assigment_letter, branch_name, region, team, leader, audit_end_date, status')
        .eq('status', 'approved');

      if (letterError) throw letterError;

      // 2b. Fetch all pending letters (untuk tracking pengajuan)
      const { data: pendingLetters, error: pendingLetterError } = await supabase
        .from('letter')
        .select('id, assigment_letter, branch_name, region, team, leader, status')
        .eq('status', 'pending');

      if (pendingLetterError) throw pendingLetterError;

      // 3. Fetch all approved addendums that have end_date
      const { data: addendums, error: addendumError } = await supabase
        .from('addendum')
        .select('id, letter_id, branch_name, region, team, leader, new_team, new_leader, end_date, status')
        .eq('status', 'approved');

      if (addendumError) throw addendumError;

      // 3b. Fetch all pending addendums (untuk tracking perpanjangan)
      const { data: pendingAddendums, error: pendingAddendumError } = await supabase
        .from('addendum')
        .select('id, letter_id, branch_name, region, team, leader, new_team, new_leader, status')
        .eq('status', 'pending');

      if (pendingAddendumError) throw pendingAddendumError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const results: AuditorTrackingData[] = validAuditors.map(auditor => {
        const name = auditor.name;

        // Find letters where this auditor is in the team or is the leader (fuzzy match)
        const relevantLetters = (letters || []).filter(letter => isAuditorInRecord(name, letter));

        let latestEndDate: Date | null = null;
        let branchName = '';
        let letterNumber = '';

        for (const letter of relevantLetters) {
          // Check if there's an addendum that extends the end date
          const relatedAddendums = (addendums || []).filter(a => {
            const lid = a.letter_id;
            return lid !== null && lid !== undefined && lid.toString() === letter.id.toString();
          });

          // Find the latest addendum end_date for this letter
          let effectiveEndDate = letter.audit_end_date ? new Date(letter.audit_end_date) : null;
          
          for (const addendum of relatedAddendums) {
            // Check if auditor is still in the team (after team changes via addendum)
            if (addendum.new_team || addendum.new_leader) {
              const isInNewTeam = isAuditorInRecord(name, { leader: addendum.new_leader, team: addendum.new_team });
              // If there's a team change addendum and auditor is NOT in new team, skip
              if (addendum.new_leader && !isInNewTeam) {
                effectiveEndDate = null;
                break;
              }
            }

            if (addendum.end_date) {
              const addEndDate = new Date(addendum.end_date);
              if (!effectiveEndDate || addEndDate > effectiveEndDate) {
                effectiveEndDate = addEndDate;
              }
            }
          }

          if (effectiveEndDate && (!latestEndDate || effectiveEndDate > latestEndDate)) {
            latestEndDate = effectiveEndDate;
            branchName = letter.branch_name || '';
            letterNumber = letter.assigment_letter || '';
          }
        }

        // Determine current position
        if (latestEndDate && latestEndDate >= today) {
          // Auditor is still at the branch (approved)
          const formattedDate = latestEndDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          return {
            auditorName: name,
            currentPosition: branchName,
            until: formattedDate,
            branchName,
            letterNumber,
            endDateRaw: latestEndDate,
          };
        } else {
          // Auditor is at Regional — check if there's a pending letter (fuzzy match)
          const pendingLetter = (pendingLetters || []).find(letter => isAuditorInRecord(name, letter));

          if (pendingLetter) {
            return {
              auditorName: name,
              currentPosition: 'Regional',
              until: `Mengajukan Tugas ke Cabang ${pendingLetter.branch_name || ''}`.trim(),
              pendingBranch: pendingLetter.branch_name || '',
              pendingType: 'letter' as const,
            };
          }

          // Check if there's a pending addendum (perpanjangan) — fuzzy match
          const pendingAddendum = (pendingAddendums || []).find(addendum => isAuditorInRecord(name, addendum));

          if (pendingAddendum) {
            return {
              auditorName: name,
              currentPosition: 'Regional',
              until: `Perpanjangan di cabang ${pendingAddendum.branch_name || ''}`.trim(),
              pendingBranch: pendingAddendum.branch_name || '',
              pendingType: 'addendum' as const,
            };
          }

          return {
            auditorName: name,
            currentPosition: 'Regional',
            until: 'Tentative',
          };
        }
      });

      // Sort: by Hingga column
      // Priority: 1) Has date (nearest first), 2) Mengajukan Tugas, 3) Perpanjangan, 4) Tentative
      results.sort((a, b) => {
        const getSortGroup = (item: AuditorTrackingData) => {
          if (item.endDateRaw) return 0;          // has actual date
          if (item.pendingType === 'letter') return 1;   // mengajukan tugas
          if (item.pendingType === 'addendum') return 2; // perpanjangan
          return 3;                                // tentative
        };

        const groupA = getSortGroup(a);
        const groupB = getSortGroup(b);

        if (groupA !== groupB) return groupA - groupB;

        // Within same group
        if (groupA === 0 && a.endDateRaw && b.endDateRaw) {
          // Sort by nearest date first
          return a.endDateRaw.getTime() - b.endDateRaw.getTime();
        }

        return a.auditorName.localeCompare(b.auditorName);
      });

      setTrackingData(results);
    } catch (err) {
      console.error('Error fetching auditor tracking:', err);
      toast.error('Gagal memuat data tracking auditor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, []);

  const filteredData = trackingData.filter(d =>
    d.auditorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.currentPosition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="mb-0 border-gray-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Auditor Tracking</h2>
            <p className="text-sm text-gray-500 mt-1">Posisi terkini setiap auditor berdasarkan surat tugas & addendum.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-[300px]">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari auditor atau cabang..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
            </div>
            <button
              onClick={fetchTrackingData}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary badges inline */}
        <div className="flex items-center gap-4 text-xs mb-4">
          <span className="text-gray-500">Total <span className="font-semibold text-gray-800">{trackingData.length}</span></span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5 text-cyan-700">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            Di Cabang <span className="font-semibold">{trackingData.filter(d => d.currentPosition !== 'Regional').length}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Mengajukan <span className="font-semibold">{trackingData.filter(d => d.pendingType === 'letter').length}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5 text-violet-600">
            <span className="w-2 h-2 rounded-full bg-violet-400"></span>
            Perpanjangan <span className="font-semibold">{trackingData.filter(d => d.pendingType === 'addendum').length}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Di Regional <span className="font-semibold">{trackingData.filter(d => d.currentPosition === 'Regional' && d.pendingBranch === undefined).length}</span>
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto relative custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                  <TableHead className="w-16 font-semibold text-gray-600 pl-6">No.</TableHead>
                  <TableHead className="font-semibold text-gray-600">Auditor</TableHead>
                  <TableHead className="font-semibold text-gray-600">Posisi Sekarang</TableHead>
                  <TableHead className="font-semibold text-gray-600">Hingga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <MapPin className="w-6 h-6" />
                        <span className="text-sm">Tidak ada data ditemukan</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, idx) => {
                    // Calculate days left for row coloring
                    let rowBg = 'hover:bg-gray-50/50';
                    if (item.endDateRaw) {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const diffMs = item.endDateRaw.getTime() - now.getTime();
                      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      if (daysLeft <= 1) {
                        rowBg = 'bg-red-50 hover:bg-red-100';
                      } else if (daysLeft <= 3) {
                        rowBg = 'bg-yellow-50 hover:bg-yellow-100';
                      }
                    }

                    return (
                    <TableRow key={idx} className={rowBg}>
                      <TableCell className="text-sm text-gray-500 pl-6 font-medium">{idx + 1}</TableCell>
                      <TableCell className="text-sm text-gray-900 font-medium">{item.auditorName}</TableCell>
                      <TableCell>
                        {item.currentPosition === 'Regional' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Regional
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                            {item.currentPosition}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.until === 'Tentative' ? (
                          <span className="text-xs text-gray-400 italic">Tentative</span>
                        ) : item.pendingType === 'addendum' ? (
                          <span className="text-xs font-medium text-violet-600">{item.until}</span>
                        ) : item.pendingBranch !== undefined ? (
                          <span className="text-xs font-medium text-amber-600">{item.until}</span>
                        ) : (
                          <span className="text-xs text-gray-600">{item.until}</span>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  }))
                }
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditorTracking;
