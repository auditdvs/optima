import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPen, X } from 'lucide-react';
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
}

interface EditAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditor: Auditor | null;
  onSubmit: (id: string, fullName: string, nik: string, auditorId: string) => Promise<void>;
}

const EditAuditorModal: React.FC<EditAuditorModalProps> = ({ isOpen, onClose, auditor, onSubmit }) => {
  const [fullName, setFullName] = useState(auditor?.full_name || '');
  const [nik, setNik] = useState(auditor?.nik || '');
  const [auditorId, setAuditorId] = useState(auditor?.auditor_id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auditor) {
      setFullName(auditor.full_name);
      setNik(auditor.nik || '');
      setAuditorId(auditor.auditor_id || '');
    }
  }, [auditor]);

  if (!isOpen || !auditor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(auditor.id, fullName, nik, auditorId);
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

export default function AuditorManagement() {
  const queryClient = useQueryClient();
  const [showEditAuditorModal, setShowEditAuditorModal] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);

  const { data: auditors, isLoading: isLoadingAuditors } = useQuery({
    queryKey: ['auditors'],
    queryFn: async () => {
      console.log('Fetching auditors data...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nik, auditor_id')
        .order('full_name', { ascending: true });
    
      console.log('Auditors query result:', { data, error });
      if (error) {
        console.error('Auditors query error:', error);
        throw error;
      }
      return data as Auditor[];
    }
  });

  const updateAuditorMutation = useMutation({
    mutationFn: async ({ id, full_name, nik, auditor_id }: 
      { id: string; full_name: string; nik: string; auditor_id: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name, nik, auditor_id })
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

  const handleEditAuditor = async (id: string, full_name: string, nik: string, auditor_id: string) => {
    await updateAuditorMutation.mutateAsync({ id, full_name, nik, auditor_id });
  };

  return (
    <Card className="mb-0 border-gray-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage User Auditors</h2>
            <p className="text-sm text-gray-500 mt-1">Map users to specific auditors.</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto relative custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                <TableHead className="w-16 font-semibold text-gray-600 pl-6">No.</TableHead>
                <TableHead className="font-semibold text-gray-600">ID UUID</TableHead>
                <TableHead className="font-semibold text-gray-600">Nama Auditor</TableHead>
                <TableHead className="font-semibold text-gray-600">NIK</TableHead>
                <TableHead className="font-semibold text-gray-600">ID Auditor</TableHead>
                <TableHead className="font-semibold text-gray-600 text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAuditors ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                auditors?.map((auditor, index) => (
                  <TableRow key={auditor.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="text-sm text-gray-500 pl-6 font-medium">{index + 1}</TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">{auditor.id}</TableCell>
                    <TableCell className="text-sm text-gray-900 font-medium">{auditor.full_name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{auditor.nik || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{auditor.auditor_id || '-'}</TableCell>
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
                ))
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
