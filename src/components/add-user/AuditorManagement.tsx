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
}

interface EditAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditor: Auditor | null;
  onSubmit: (id: string, fullName: string, nik: string, auditorId: string, mdisId: string, area: string) => Promise<void>;
}

const EditAuditorModal: React.FC<EditAuditorModalProps> = ({ isOpen, onClose, auditor, onSubmit }) => {
  const [fullName, setFullName] = useState(auditor?.full_name || '');
  const [nik, setNik] = useState(auditor?.nik || '');
  const [auditorId, setAuditorId] = useState(auditor?.auditor_id || '');
  const [mdisId, setMdisId] = useState(auditor?.mdis_id || '');
  const [area, setArea] = useState(auditor?.area || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auditor) {
      setFullName(auditor.full_name);
      setNik(auditor.nik || '');
      setAuditorId(auditor.auditor_id || '');
      setMdisId(auditor.mdis_id || '');
      setArea(auditor.area || '');
    }
  }, [auditor]);

  if (!isOpen || !auditor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(auditor.id, fullName, nik, auditorId, mdisId, area);
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

  const { data: auditors, isLoading: isLoadingAuditors } = useQuery({
    queryKey: ['auditors'],
    queryFn: async () => {
      // Fetch auditor profiles including manual area
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, nik, auditor_id, mdis_id, area');
      if (profilesError) throw profilesError;

      const data = (profiles || []) as Auditor[];

      // Custom sort:
      // 1. Single-letter area (A, B, C...) ascending
      // 2. Multi-letter area ascending
      // 3. Null/empty area last
      data.sort((a, b) => {
        const aArea = a.area?.trim() || null;
        const bArea = b.area?.trim() || null;
        const aIsInactive = aArea?.toLowerCase().includes('innactive') || aArea?.toLowerCase().includes('inactive');
        const bIsInactive = bArea?.toLowerCase().includes('innactive') || bArea?.toLowerCase().includes('inactive');

        // Inactive goes last
        if (aIsInactive && !bIsInactive) return 1;
        if (!aIsInactive && bIsInactive) return -1;

        // Null area goes last (before inactive)
        if (!aArea && !bArea) return a.full_name.localeCompare(b.full_name, 'id');
        if (!aArea) return 1;
        if (!bArea) return -1;

        const aIsSingle = aArea.length === 1;
        const bIsSingle = bArea.length === 1;

        // Single-letter before multi-letter
        if (aIsSingle && !bIsSingle) return -1;
        if (!aIsSingle && bIsSingle) return 1;

        // Same type: sort A-Z
        const areaCompare = aArea.localeCompare(bArea, 'id');
        if (areaCompare !== 0) return areaCompare;
        return a.full_name.localeCompare(b.full_name, 'id');
      });

      return data;
    }
  });

  const updateAuditorMutation = useMutation({
    mutationFn: async ({ id, full_name, nik, auditor_id, mdis_id, area }: 
      { id: string; full_name: string; nik: string; auditor_id: string; mdis_id: string; area: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name, nik, auditor_id, mdis_id, area: area || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditors'] });
      toast.success('Auditor updated successfully');
    },
    onError: (error) => {
      console.error('Error updating auditor:', error);
      toast.error('Failed to update auditor');
    }
  });

  const handleEditAuditor = async (id: string, full_name: string, nik: string, auditor_id: string, mdis_id: string, area: string) => {
    await updateAuditorMutation.mutateAsync({ id, full_name, nik, auditor_id, mdis_id, area });
  };

  return (
    <Card className="border-gray-200 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage User Auditors</h2>
            <p className="text-sm text-gray-500 mt-1">Map users to specific auditors.</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto relative custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                <TableHead className="w-16 font-semibold text-gray-600 pl-6">No.</TableHead>
                <TableHead className="font-semibold text-gray-600">Nama Auditor</TableHead>
                <TableHead className="font-semibold text-gray-600">ID Auditor</TableHead>
                <TableHead className="font-semibold text-gray-600">Area</TableHead>
                <TableHead className="font-semibold text-gray-600">NIK</TableHead>
                <TableHead className="font-semibold text-gray-600">MDIS ID</TableHead>
                <TableHead className="font-semibold text-gray-600 text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAuditors ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                auditors?.map((auditor, index) => {
                  const isInactive = auditor.area?.toLowerCase().includes('innactive') || auditor.area?.toLowerCase().includes('inactive');
                  return (
                  <TableRow key={auditor.id} className={`transition-colors ${isInactive ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/50'}`}>
                    <TableCell className="text-sm text-gray-500 pl-6 font-medium">{index + 1}</TableCell>
                    <TableCell className="text-sm text-gray-900 font-medium">{auditor.full_name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{auditor.auditor_id || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {auditor.area || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{auditor.nik || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{auditor.mdis_id || '-'}</TableCell>
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

