import { Trash2, Upload } from 'lucide-react';
import Papa from 'papaparse';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'; // pastikan ada komponen dialog shadcn
import { Skeleton } from './ui/skeleton'; // pastikan ada komponen skeleton shadcn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface MatriksData {
  id: number;
  kc_kr_kp: string;
  judul_temuan: string;
  kode_risk_issue: string;
  judul_risk_issue: string;
  kategori: string;
  penyebab: string;
  dampak: string;
  kelemahan: string;
  rekomendasi: string;
  poin: number | null;
  perbaikan_temuan: string;
  jatuh_tempo: string;
}

interface MatriksSectionProps {
  data?: any; // Keep for backward compatibility but won't be used
}

export const MatriksSection: React.FC<MatriksSectionProps> = () => {
  const [matriksData, setMatriksData] = useState<MatriksData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null); // Tambahkan state ini

  useEffect(() => {
    fetchMatriksData();
  }, []);

  const fetchMatriksData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matriks')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching matriks data:', error);
        toast.error('Failed to fetch matriks data');
        return;
      }

      setMatriksData(data || []);

      // Ambil last_updated terbaru dari seluruh data
      if (data && data.length > 0) {
        const sorted = [...data].sort((a, b) =>
          new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime()
        );
        setLastUpdated(sorted[0].last_updated || null);
      } else {
        setLastUpdated(null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch matriks data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    toast.loading('Uploading CSV file...', { id: 'upload-toast' });

    try {
      // 1. Ambil data existing dari Supabase
      const { data: existingData, error: fetchError } = await supabase
        .from('matriks')
        .select('*');
      if (fetchError) throw fetchError;

      // 2. Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const csvData = results.data as any[];

          // Mapping kolom agar sesuai dengan struktur MatriksData
          const mappedData = csvData.map((row) => ({
            kc_kr_kp: row.kc_kr_kp || row['kc_kr_kp'] || '',
            judul_temuan: row.judul_temuan || row['judul_temuan'] || '',
            kode_risk_issue: row.kode_risk_issue || row['kode_risk_issue'] || '',
            judul_risk_issue: row.judul_risk_issue || row['judul_risk_issue'] || '',
            kategori: row.kategori || row['kategori'] || '',
            penyebab: row.penyebab || row['penyebab'] || '',
            dampak: row.dampak || row['dampak'] || '',
            kelemahan: row.kelemahan || row['kelemahan'] || '',
            rekomendasi: row.rekomendasi || row['rekomendasi'] || '',
            poin: row.poin ? parseInt(row.poin) : null,
            perbaikan_temuan: row.perbaikan_temuan || row['perbaikan_temuan'] || '',
            jatuh_tempo: row.jatuh_tempo || row['jatuh_tempo'] || '',
            last_updated: new Date().toISOString(), // tambahkan ini
          }));

          if (mappedData.length === 0) {
            throw new Error('No valid data rows found in CSV');
          }

          // 3. Remove duplikat: hanya insert data yang belum ada di Supabase
          // Bandingkan berdasarkan seluruh field kecuali id
          const isSameRow = (a: Omit<MatriksData, 'id'>, b: Omit<MatriksData, 'id'>) =>
            a.kc_kr_kp === b.kc_kr_kp &&
            a.judul_temuan === b.judul_temuan &&
            a.kode_risk_issue === b.kode_risk_issue &&
            a.judul_risk_issue === b.judul_risk_issue &&
            a.kategori === b.kategori &&
            a.penyebab === b.penyebab &&
            a.dampak === b.dampak &&
            a.kelemahan === b.kelemahan &&
            a.rekomendasi === b.rekomendasi &&
            (a.poin ?? null) === (b.poin ?? null) &&
            a.perbaikan_temuan === b.perbaikan_temuan &&
            a.jatuh_tempo === b.jatuh_tempo;

          const filteredData = mappedData.filter((row) => {
            return !existingData?.some((exist: MatriksData) =>
              isSameRow(row, exist)
            );
          });

          if (filteredData.length === 0) {
            toast.success('No new data to upload (all rows are duplicates)', { id: 'upload-toast' });
            setUploading(false);
            event.target.value = '';
            return;
          }

          // 4. Insert batch hanya data yang belum ada
          const batchSize = 100;
          for (let i = 0; i < filteredData.length; i += batchSize) {
            const batch = filteredData.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('matriks')
              .insert(batch);
            if (insertError) throw insertError;
          }

          toast.success(`Successfully uploaded ${filteredData.length} new records`, { id: 'upload-toast' });
          await fetchMatriksData();
        },
        error: (error) => {
          toast.error(`Failed to parse CSV: ${error.message}`, { id: 'upload-toast' });
        },
      });
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast.error(`Failed to upload CSV file: ${error.message}`, { id: 'upload-toast' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveAllData = async () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false); // Tutup dialog dulu agar UI responsif
    setDeleting(true);

    toast.loading('Removing all data...', { id: 'delete-toast' });

    try {
      const { error } = await supabase
        .from('matriks')
        .delete()
        .neq('id', 0);

      if (error) throw error;

      toast.success('All data removed successfully', { id: 'delete-toast' });
      setMatriksData([]);
    } catch (error) {
      console.error('Error removing data:', error);
      toast.error('Failed to remove data', { id: 'delete-toast' });
    } finally {
      setDeleting(false);
    }
  };

  // Skeleton Table
  const SkeletonTable = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Skeleton className="h-4 w-8" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="min-w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[80px]"><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-4 w-20" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(8)].map((_, idx) => (
                <TableRow key={idx}>
                  {[...Array(13)].map((_, colIdx) => (
                    <TableCell key={colIdx}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <SkeletonTable />;
  }

  return (
    <div className="space-y-4">
      {/* Confirm Delete Dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove All Matriks Data?</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p>Are you sure you want to remove <b>all matriks data</b>? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Yes, Remove All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Matriks Data</h3>
          {lastUpdated && (
            <div className="text-xs text-gray-500 mt-1">
              Terakhir update: {new Date(lastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Remove All Data Button */}
          {matriksData.length > 0 && (
            <Button
              onClick={handleRemoveAllData}
              disabled={deleting || uploading}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2 h-10"
            >
              <Trash2 className="h-4 w-4" />
              Remove All
            </Button>
          )}
          {/* Upload CSV Button */}
          <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 h-10">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading || deleting}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Skeleton saat deleting */}
      {deleting ? (
        <SkeletonTable />
      ) : matriksData.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No matriks data available. Upload a CSV file to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="min-w-[120px]">KC/KR/KP</TableHead>
                    <TableHead className="min-w-[200px]">Judul Temuan</TableHead>
                    <TableHead className="min-w-[120px]">Kode Risk Issue</TableHead>
                    <TableHead className="min-w-[200px]">Judul Risk Issue</TableHead>
                    <TableHead className="min-w-[100px]">Kategori</TableHead>
                    <TableHead className="min-w-[250px]">Penyebab</TableHead>
                    <TableHead className="min-w-[250px]">Dampak</TableHead>
                    <TableHead className="min-w-[250px]">Kelemahan</TableHead>
                    <TableHead className="min-w-[250px]">Rekomendasi</TableHead>
                    <TableHead className="min-w-[80px]">Poin</TableHead>
                    <TableHead className="min-w-[200px]">Perbaikan Temuan</TableHead>
                    <TableHead className="min-w-[120px]">Jatuh Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matriksData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center align-top">{index + 1}</TableCell>
                      <TableCell className="align-top whitespace-normal break-words">
                        {item.kc_kr_kp}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[200px]">
                        {item.judul_temuan}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words">
                        {item.kode_risk_issue}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[200px]">
                        {item.judul_risk_issue}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words">
                        {item.kategori}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                        {item.penyebab}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                        {item.dampak}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                        {item.kelemahan}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                        {item.rekomendasi}
                      </TableCell>
                      <TableCell className="text-center align-top">{item.poin || '-'}</TableCell>
                      <TableCell className="align-top whitespace-normal break-words max-w-[200px]">
                        {item.perbaikan_temuan}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal break-words">
                        {item.jatuh_tempo}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};