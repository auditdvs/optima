import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, UserPen, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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

interface Auditor {
  id: string;
  full_name: string;
  nik: string | null;
  auditor_id: string | null;
  mdis_id: string | null;
  area?: string | null;
  phone_number?: string | null;
}

interface EditAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditor: Auditor | null;
  onSubmit: (id: string, fullName: string, nik: string, auditorId: string, mdisId: string, area: string, phoneNumber: string) => Promise<void>;
}

const EditAuditorModal: React.FC<EditAuditorModalProps> = ({ isOpen, onClose, auditor, onSubmit }) => {
  const [fullName, setFullName] = useState(auditor?.full_name || '');
  const [nik, setNik] = useState(auditor?.nik || '');
  const [auditorId, setAuditorId] = useState(auditor?.auditor_id || '');
  const [mdisId, setMdisId] = useState(auditor?.mdis_id || '');
  const [area, setArea] = useState(auditor?.area || '');
  const [phoneNumber, setPhoneNumber] = useState(auditor?.phone_number || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auditor) {
      setFullName(auditor.full_name);
      setNik(auditor.nik || '');
      setAuditorId(auditor.auditor_id || '');
      setMdisId(auditor.mdis_id || '');
      setArea(auditor.area || '');
      setPhoneNumber(auditor.phone_number || '');
    }
  }, [auditor]);

  if (!isOpen || !auditor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(auditor.id, fullName, nik, auditorId, mdisId, area, phoneNumber);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Auditor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Auditor</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">NIK</label>
            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ID Auditor</label>
            <input
              type="text"
              value={auditorId}
              onChange={(e) => setAuditorId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">MDIS ID</label>
            <input
              type="text"
              value={mdisId}
              onChange={(e) => setMdisId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Area / Regional</label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Contoh: Regional 1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nomor HP (WhatsApp)</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('0')) {
                  setPhoneNumber('62' + val.substring(1));
                } else {
                  setPhoneNumber(val);
                }
              }}
              placeholder="Contoh: 628123456789"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="mt-1 text-[10px] text-gray-400 italic">* Awalan 0 otomatis diubah ke 62</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Helper: fuzzy name match (same logic as AuditorTracking) ──────────────────
const normalize = (s: string) => s.toLowerCase().replace(/[.,]/g, '').trim();
const filterShort = (tokens: string[]) => tokens.filter(t => t.length > 3);

function isNameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  const ta = filterShort(na.split(/\s+/));
  const tb = filterShort(nb.split(/\s+/));
  if (ta.length >= 2 && tb.length >= 2) {
    const ja = ta.join(' '), jb = tb.join(' ');
    if (ja.includes(jb) || jb.includes(ja)) return true;
  }
  let exact = 0;
  ta.forEach(t => { if (tb.includes(t)) exact++; });
  return exact >= 2;
}

function isAuditorInLetter(name: string, letter: any): boolean {
  if (letter.leader && isNameMatch(name, letter.leader)) return true;
  let members: string[] = [];
  try {
    if (letter.team) {
      members = letter.team.startsWith('[')
        ? JSON.parse(letter.team)
        : letter.team.split(',').map((s: string) => s.trim());
    }
  } catch { members = letter.team ? [letter.team] : []; }
  return members.some((m: string) => isNameMatch(name, m));
}

export default function AuditorManagement() {
  const queryClient = useQueryClient();
  const [showEditAuditorModal, setShowEditAuditorModal] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);
  
  // Inline Editing States
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [localAuditors, setLocalAuditors] = useState<Auditor[]>([]);

  const { data: auditors, isLoading: isLoadingAuditors } = useQuery({
    queryKey: ['auditors'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, nik, auditor_id, mdis_id, area, phone_number');
      if (profilesError) throw profilesError;

      const data = (profiles || []) as Auditor[];

      data.sort((a, b) => {
        const aArea = a.area?.toLowerCase() || '';
        const bArea = b.area?.toLowerCase() || '';
        const aIsInactive = aArea.includes('inactive') || aArea.includes('innactive');
        const bIsInactive = bArea.includes('inactive') || bArea.includes('innactive');
        if (aIsInactive && !bIsInactive) return 1;
        if (!aIsInactive && bIsInactive) return -1;
        return a.full_name.localeCompare(b.full_name, 'id');
      });

      return data;
    }
  });

  // Sync local state when data or edit mode changes
  useEffect(() => {
    if (auditors && isBulkEditing) {
      setLocalAuditors(JSON.parse(JSON.stringify(auditors)));
    }
  }, [auditors, isBulkEditing]);

  const updateAuditorMutation = useMutation({
    mutationFn: async (updatedList: Auditor[]) => {
      // Only update if changed (optimized)
      const updates = updatedList.map(a => ({
        id: a.id,
        full_name: a.full_name,
        nik: a.nik || null,
        auditor_id: a.auditor_id || null,
        mdis_id: a.mdis_id || null,
        area: a.area || null,
        phone_number: a.phone_number || null
      }));

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditors'] });
      toast.success('Semua perubahan berhasil disimpan');
      setIsBulkEditing(false);
    },
    onError: (error) => {
      console.error('Error bulk updating auditors:', error);
      toast.error('Gagal menyimpan perubahan');
    }
  });

  const handleEditAuditor = async (id: string, full_name: string, nik: string, auditor_id: string, mdis_id: string, area: string, phone_number: string) => {
     // Keep for compatibility if needed, but bulk update is preferred now
     const { error } = await supabase
        .from('profiles')
        .update({ full_name, nik, auditor_id, mdis_id, area: area || null, phone_number: phone_number || null })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['auditors'] });
      toast.success('Auditor updated');
  };

  const handleInputChange = (index: number, field: keyof Auditor, value: string) => {
    const updated = [...localAuditors];
    let finalValue = value;
    
    // Auto-format phone number
    if (field === 'phone_number' && value.startsWith('0')) {
      finalValue = '62' + value.substring(1);
    }
    
    updated[index] = { ...updated[index], [field]: finalValue };
    setLocalAuditors(updated);
  };

  const handleSaveBulk = () => {
    toast.promise(updateAuditorMutation.mutateAsync(localAuditors), {
      loading: 'Menyimpan perubahan...',
      success: 'Tersimpan!',
      error: 'Gagal simpan',
    });
  };

  return (
    <Card className="border-gray-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage User Auditors</h2>
            <p className="text-sm text-gray-500 mt-1">Map users to specific auditors.</p>
          </div>

          <div className="flex items-center gap-2">
            {!isBulkEditing ? (
              <button
                onClick={() => setIsBulkEditing(true)}
                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-2 text-sm font-semibold border border-indigo-200"
              >
                <UserPen className="h-4 w-4" />
                Bulk Edit Mode
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                  onClick={() => setIsBulkEditing(false)}
                  className="bg-white text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all text-sm font-semibold border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBulk}
                  disabled={updateAuditorMutation.isPending}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                >
                  {updateAuditorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save All Changes
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto relative custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                <TableHead className="w-16 font-semibold text-gray-600 pl-6 text-center">No.</TableHead>
                <TableHead className="font-semibold text-gray-600 min-w-[200px]">Nama Auditor</TableHead>
                <TableHead className="font-semibold text-gray-600 w-32">ID Auditor</TableHead>
                <TableHead className="font-semibold text-gray-600 w-44">Nomor HP</TableHead>
                <TableHead className="font-semibold text-gray-600 w-32">Area</TableHead>
                <TableHead className="font-semibold text-gray-600 w-32">NIK</TableHead>
                <TableHead className="font-semibold text-gray-600 w-32">MDIS ID</TableHead>
                {!isBulkEditing && <TableHead className="font-semibold text-gray-600 text-right pr-6">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAuditors ? (
                <TableRow>
                  <TableCell colSpan={isBulkEditing ? 7 : 8} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                (isBulkEditing ? localAuditors : auditors)?.map((auditor, index) => {
                  const isInactive = auditor.area?.toLowerCase().includes('innactive') || auditor.area?.toLowerCase().includes('inactive');
                  
                  return (
                  <TableRow key={auditor.id} className={`transition-colors ${isInactive ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/50'}`}>
                    <TableCell className="text-sm text-gray-400 pl-6 font-mono text-center">{index + 1}</TableCell>
                    
                    {/* Nama Auditor */}
                    <TableCell className="p-2">
                      {isBulkEditing ? (
                        <input
                          type="text"
                          value={auditor.full_name}
                          onChange={(e) => handleInputChange(index, 'full_name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 font-medium px-2">{auditor.full_name}</span>
                      )}
                    </TableCell>

                    {/* ID Auditor */}
                    <TableCell className="p-2">
                      {isBulkEditing ? (
                        <input
                          type="text"
                          value={auditor.auditor_id || ''}
                          onChange={(e) => handleInputChange(index, 'auditor_id', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                        />
                      ) : (
                        <span className="text-sm text-gray-600 px-2 font-mono">{auditor.auditor_id || '-'}</span>
                      )}
                    </TableCell>

                    {/* Nomor HP */}
                    <TableCell className="p-2">
                      {isBulkEditing ? (
                        <input
                          type="text"
                          value={auditor.phone_number || ''}
                          onChange={(e) => handleInputChange(index, 'phone_number', e.target.value)}
                          placeholder="62..."
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                        />
                      ) : (
                        <span className="text-sm text-gray-600 px-2 font-mono">{auditor.phone_number || '-'}</span>
                      )}
                    </TableCell>

                    {/* Area */}
                    <TableCell className="p-2">
                      {isBulkEditing ? (
                        <input
                          type="text"
                          value={auditor.area || ''}
                          onChange={(e) => handleInputChange(index, 'area', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      ) : (
                        <span className="text-sm text-gray-600 px-2">{auditor.area || '-'}</span>
                      )}
                    </TableCell>

                    {/* NIK */}
                    <TableCell className="p-2">
                      {isBulkEditing ? (
                        <input
                          type="text"
                          value={auditor.nik || ''}
                          onChange={(e) => handleInputChange(index, 'nik', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                        />
                      ) : (
                        <span className="text-sm text-gray-600 px-2 font-mono">{auditor.nik || '-'}</span>
                      )}
                    </TableCell>

                    {/* MDIS ID */}
                    <TableCell className="p-2">
                      {isBulkEditing ? (
                        <input
                          type="text"
                          value={auditor.mdis_id || ''}
                          onChange={(e) => handleInputChange(index, 'mdis_id', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                        />
                      ) : (
                        <span className="text-sm text-gray-600 px-2 font-mono">{auditor.mdis_id || '-'}</span>
                      )}
                    </TableCell>

                    {!isBulkEditing && (
                      <TableCell className="text-right pr-6">
                        <button
                          onClick={() => {
                            setSelectedAuditor(auditor);
                            setShowEditAuditorModal(true);
                          }}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                          title="Edit Auditor"
                        >
                          <UserPen className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        <EditAuditorModal
          isOpen={showEditAuditorModal}
          onClose={() => setShowEditAuditorModal(false)}
          auditor={selectedAuditor}
          onSubmit={handleEditAuditor}
        />
      </CardContent>
    </Card>
  );
}

