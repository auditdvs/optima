import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const kategoriOptions = ['major', 'moderate', 'minor'];
const perbaikanOptions = ['null', 'sudah selesai'];

export const MatriksSection: React.FC = () => {
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'poin'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchTableNames();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedTable) fetchRows(selectedTable, search, sortBy, sortDir);
  }, [selectedTable, search, sortBy, sortDir]);

  const fetchTableNames = async () => {
    const { data } = await supabase.from('matriks_table_names').select('name');
    setTableNames(data?.map((d) => d.name) || []);
    setSelectedTable(data?.[0]?.name || '');
  };

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('name');
    setBranches(data?.map((d) => d.name) || []);
  };

  const fetchRows = async (
    tableName: string,
    searchValue: string = '',
    sortByField: string = 'created_at',
    sortDirection: 'asc' | 'desc' = 'asc'
  ) => {
    let query = supabase
      .from('matriks')
      .select('*')
      .eq('table_name', tableName)
      .order(sortByField, { ascending: sortDirection === 'asc' });

    if (searchValue) {
      query = query.ilike('judul_temuan', `%${searchValue}%`);
    }

    const { data } = await query;
    setRows(data || []);
  };

  const handleAddRow = async (row: any) => {
    if (editRow) {
      // Edit mode
      await supabase.from('matriks').update(row).eq('id', editRow.id);
      setEditRow(null);
    } else {
      // Add mode
      await supabase.from('matriks').insert([{ ...row, table_name: selectedTable }]);
    }
    fetchRows(selectedTable, search, sortBy, sortDir);
    setShowInput(false);
  };

  const handleDeleteRow = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      await supabase.from('matriks').delete().eq('id', id);
      fetchRows(selectedTable, search, sortBy, sortDir);
    }
  };

  const handleEditRow = (row: any) => {
    setEditRow(row);
    setShowInput(true);
  };

  return (
    <div>
      <div className="flex gap-4 mb-4 items-center">
        <select
          value={selectedTable}
          onChange={e => setSelectedTable(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {tableNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Cari Judul Temuan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'created_at' | 'poin')}
          className="border rounded px-2 py-1"
        >
          <option value="created_at">Tanggal Input</option>
          <option value="poin">Poin</option>
        </select>
        <button
          className="border rounded px-2 py-1 flex items-center"
          onClick={() => setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'))}
        >
          {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded"
          onClick={() => {
            setShowInput(true);
            setEditRow(null);
          }}
        >
          Tambah Data
        </button>
      </div>
      {showInput && (
        <MatriksInputCard
          branches={branches}
          onSubmit={handleAddRow}
          onCancel={() => {
            setShowInput(false);
            setEditRow(null);
          }}
          initialData={editRow}
        />
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="align-top text-left">No.</TableHead>
              <TableHead className="align-top text-left">KC/KR/KP</TableHead>
              <TableHead className="align-top text-left">Judul Temuan</TableHead>
              <TableHead className="align-top text-left">Kode Risk Issue</TableHead>
              <TableHead className="align-top text-left">Judul Risk Issue</TableHead>
              <TableHead className="align-top text-left">Kategori</TableHead>
              <TableHead className="align-top text-left">Penyebab</TableHead>
              <TableHead className="align-top text-left">Dampak</TableHead>
              <TableHead className="align-top text-left">Kelemahan</TableHead>
              <TableHead className="align-top text-left">Rekomendasi</TableHead>
              <TableHead className="align-top text-left">Poin</TableHead>
              <TableHead className="align-top text-left">Jatuh Tempo</TableHead>
              <TableHead className="align-top text-left">Perbaikan Temuan</TableHead>
              <TableHead className="align-top text-left">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const perbaikan = (row.perbaikan_temuan || '').toLowerCase();
              const isHijau =
                perbaikan.includes('sudah selesai') ||
                perbaikan.includes('sudah') ||
                perbaikan.includes('selesai');
              return (
                <TableRow
                  key={row.id}
                  className={isHijau ? 'bg-green-500' : ''}
                >
                  <TableCell className="align-top text-left">{idx + 1}</TableCell>
                  <TableCell className="align-top text-left">{row.branch_name}</TableCell>
                  <TableCell className="align-top text-left">{row.judul_temuan}</TableCell>
                  <TableCell className="align-top text-left">{row.kode_risk_issue}</TableCell>
                  <TableCell className="align-top text-left">{row.judul_risk_issue}</TableCell>
                  <TableCell className="align-top text-left">{row.kategori}</TableCell>
                  <TableCell className="align-top text-left">{row.penyebab}</TableCell>
                  <TableCell className="align-top text-left">{row.dampak}</TableCell>
                  <TableCell className="align-top text-left">{row.kelemahan}</TableCell>
                  <TableCell className="align-top text-left">{row.rekomendasi}</TableCell>
                  <TableCell className="align-top text-left">{row.poin}</TableCell>
                  <TableCell className="align-top text-left">{row.jatuh_tempo}</TableCell>
                  <TableCell className="align-top text-left">{row.perbaikan_temuan || ''}</TableCell>
                  <TableCell className="align-top text-left">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      onClick={() => handleEditRow(row)}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteRow(row.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-4 text-gray-500 align-top text-left">
                  Tidak ada data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const MatriksInputCard: React.FC<{
  branches: string[];
  onSubmit: (row: any) => void;
  onCancel: () => void;
  initialData?: any;
  selectedTable?: string;
}> = ({ branches, onSubmit, onCancel, initialData }) => {
  const [form, setForm] = useState<any>(
    initialData || {
      branch_name: '',
      judul_temuan: '',
      kode_risk_issue: '',
      judul_risk_issue: '',
      kategori: 'major',
      penyebab: '',
      dampak: '',
      kelemahan: '',
      rekomendasi: '',
      poin: 0,
      jatuh_tempo: '',
      perbaikan_temuan: '',
    }
  );

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  // Deteksi apakah table sekarang adalah Ayu khs atau Lise khs
  const isKhs = (form.table_name || initialData?.table_name || '').toLowerCase().includes('khs');

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>KC/KR/KP</label>
          <input
            type="text"
            value={form.branch_name}
            onChange={e => setForm(f => ({ ...f, branch_name: e.target.value }))}
            className="w-full border rounded"
            placeholder="Masukkan nama cabang"
          />
        </div>
        <div>
          <label>Judul Temuan</label>
          <textarea
            value={form.judul_temuan}
            onChange={e => setForm(f => ({ ...f, judul_temuan: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Judul Temuan"
          />
        </div>
        <div>
          <label>Kode Risk Issue</label>
          <input
            value={form.kode_risk_issue}
            onChange={e => setForm(f => ({ ...f, kode_risk_issue: e.target.value }))}
            className="w-full border rounded"
            placeholder="Kode Risk Issue"
          />
        </div>
        <div>
          <label>Judul Risk Issue</label>
          <textarea
            value={form.judul_risk_issue}
            onChange={e => setForm(f => ({ ...f, judul_risk_issue: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Judul Risk Issue"
          />
        </div>
        <div>
          <label>Kategori</label>
          <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))} className="w-full border rounded">
            {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label>Penyebab</label>
          <textarea
            value={form.penyebab}
            onChange={e => setForm(f => ({ ...f, penyebab: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Penyebab"
          />
        </div>
        <div>
          <label>Dampak</label>
          <textarea
            value={form.dampak}
            onChange={e => setForm(f => ({ ...f, dampak: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Dampak"
          />
        </div>
        <div>
          <label>Kelemahan</label>
          <textarea
            value={form.kelemahan}
            onChange={e => setForm(f => ({ ...f, kelemahan: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Kelemahan"
          />
        </div>
        <div>
          <label>Rekomendasi</label>
          <textarea
            value={form.rekomendasi}
            onChange={e => setForm(f => ({ ...f, rekomendasi: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Rekomendasi"
          />
        </div>
        <div>
          <label>Poin</label>
          <input type="number" value={form.poin} onChange={e => setForm(f => ({ ...f, poin: Number(e.target.value) }))} className="w-full border rounded" />
        </div>
        <div>
          <label>Jatuh Tempo</label>
          <input type="date" value={form.jatuh_tempo} onChange={e => setForm(f => ({ ...f, jatuh_tempo: e.target.value }))} className="w-full border rounded" />
        </div>
        <div>
          <label>Perbaikan Temuan</label>
          <textarea
            value={form.perbaikan_temuan || ''}
            onChange={e => setForm(f => ({ ...f, perbaikan_temuan: e.target.value }))}
            className="w-full border rounded resize"
            rows={2}
            placeholder="Isi jika sudah ada perbaikan"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={() => onSubmit(form)}>
          {initialData ? 'Update' : 'Simpan'}
        </button>
        <button className="bg-gray-300 px-4 py-2 rounded" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
};