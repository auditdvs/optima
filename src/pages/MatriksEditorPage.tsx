import { ArrowLeft, Loader2, Plus, RefreshCw, Save } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { Button } from '../components/ui/button';
import type { MatriksData } from '../components/qa-management/MatriksSection';
import { supabase } from '../lib/supabaseClient';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type EditableField = Exclude<keyof MatriksData, 'id' | 'last_updated'>;
type TabulatorRowLike = { getData(): MatriksData };
type TabulatorCellLike = {
  getRow(): TabulatorRowLike;
  getField(): string;
  getOldValue(): unknown;
  getValue(): unknown;
  setValue(value: unknown): void;
};
type TabulatorValueCellLike = { getValue(): string | number | null | undefined };
type TabulatorInstanceLike = {
  destroy(): void;
  replaceData(data: MatriksData[]): void;
  scrollToRow(id: number, position: string, ifVisible: boolean): void;
};

const createBlankMatriksRow = () => ({
  kc_kr_kp: '',
  judul_temuan: '',
  kode_risk_issue: '',
  judul_risk_issue: '',
  kategori: '',
  penyebab: '',
  dampak: '',
  kelemahan: '',
  rekomendasi: '',
  poin: null as number | null,
  perbaikan_temuan: '',
  jatuh_tempo: '',
  last_updated: new Date().toISOString(),
});

export default function MatriksEditorPage() {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<TabulatorInstanceLike | null>(null);
  const revertingCellRef = useRef(false);

  const [rows, setRows] = useState<MatriksData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRow, setAddingRow] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('Autosave aktif');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const rowCountLabel = useMemo(() => `${rows.length} baris`, [rows.length]);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matriks')
        .select('*')
        .order('id');

      if (error) throw error;
      setRows(data || []);
    } catch (error) {
      console.error('Error fetching matriks rows:', error);
      toast.error('Gagal memuat data matriks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const persistCellChange = async (cell: TabulatorCellLike) => {
    if (revertingCellRef.current) {
      revertingCellRef.current = false;
      return;
    }

    const rowData = cell.getRow().getData() as MatriksData;
    const field = cell.getField() as EditableField;
    const oldValue = cell.getOldValue();
    const rawValue = cell.getValue();
    const normalizedValue = field === 'poin'
      ? (rawValue === '' || rawValue == null ? null : Number(rawValue))
      : String(rawValue ?? '');

    setSaveState('saving');
    setSaveMessage(`Menyimpan perubahan kolom ${String(field)}...`);

    const payload = {
      [field]: normalizedValue,
      last_updated: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('matriks')
        .update(payload)
        .eq('id', rowData.id);

      if (error) throw error;

      setRows((prev) => prev.map((row) => (
        row.id === rowData.id
          ? { ...row, ...payload }
          : row
      )));
      setSaveState('saved');
      setSaveMessage('Semua perubahan tersimpan otomatis');
      setLastSavedAt(payload.last_updated);
    } catch (error) {
      console.error('Error saving matriks cell:', error);
      revertingCellRef.current = true;
      cell.setValue(oldValue);
      setSaveState('error');
      setSaveMessage('Gagal menyimpan perubahan terakhir');
      toast.error('Gagal menyimpan perubahan matriks');
    }
  };

  useEffect(() => {
    if (!tableContainerRef.current || tableRef.current) return;

    tableRef.current = new Tabulator(tableContainerRef.current, {
      data: rows,
      index: 'id',
      layout: 'fitDataStretch',
      reactiveData: false,
      height: 'calc(100vh - 220px)',
      history: true,
      clipboard: true,
      clipboardCopyStyled: false,
      rowHeader: {
        formatter: 'rownum',
        width: 60,
        hozAlign: 'center',
        headerSort: false,
        frozen: true,
      },
      columnDefaults: {
        headerSort: false,
        resizable: true,
        vertAlign: 'middle',
        tooltip: true,
      },
      columns: [
        { title: 'KC/KR/KP', field: 'kc_kr_kp', editor: 'input', width: 140, frozen: true },
        { title: 'Judul Temuan', field: 'judul_temuan', editor: 'textarea', width: 240 },
        { title: 'Kode Risk Issue', field: 'kode_risk_issue', editor: 'input', width: 160 },
        { title: 'Judul Risk Issue', field: 'judul_risk_issue', editor: 'textarea', width: 240 },
        { title: 'Kategori', field: 'kategori', editor: 'input', width: 160 },
        { title: 'Penyebab', field: 'penyebab', editor: 'textarea', width: 280 },
        { title: 'Dampak', field: 'dampak', editor: 'textarea', width: 280 },
        { title: 'Kelemahan', field: 'kelemahan', editor: 'textarea', width: 280 },
        { title: 'Rekomendasi', field: 'rekomendasi', editor: 'textarea', width: 280 },
        {
          title: 'Poin',
          field: 'poin',
          editor: 'number',
          hozAlign: 'center',
          width: 100,
          formatter: (cell: TabulatorValueCellLike) => cell.getValue() ?? '',
        },
        { title: 'Perbaikan Temuan', field: 'perbaikan_temuan', editor: 'textarea', width: 280 },
        { title: 'Jatuh Tempo', field: 'jatuh_tempo', editor: 'input', width: 140 },
        {
          title: 'Last Updated',
          field: 'last_updated',
          width: 180,
          editor: false,
          formatter: (cell: TabulatorValueCellLike) => {
            const value = cell.getValue();
            if (!value) return '-';
            return new Date(value).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          },
        },
      ],
      cellEditing: () => {
        setSaveState('idle');
        setSaveMessage('Mengedit sel...');
      },
      cellEdited: persistCellChange,
    });

    return () => {
      tableRef.current?.destroy();
      tableRef.current = null;
    };
  }, [rows]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.replaceData(rows);
  }, [rows]);

  const handleAddRow = async () => {
    try {
      setAddingRow(true);
      const payload = createBlankMatriksRow();
      const { data, error } = await supabase
        .from('matriks')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setRows((prev) => [...prev, data]);
      setSaveState('saved');
      setSaveMessage('Baris baru ditambahkan');
      setLastSavedAt(payload.last_updated);

      requestAnimationFrame(() => {
        tableRef.current?.scrollToRow(data.id, 'bottom', false);
      });
    } catch (error) {
      console.error('Error adding matriks row:', error);
      toast.error('Gagal menambah baris baru');
    } finally {
      setAddingRow(false);
    }
  };

  const statusColor = saveState === 'error'
    ? 'text-red-600'
    : saveState === 'saving'
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              <Save className="h-4 w-4" />
              Matriks Editor
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Spreadsheet Matriks</h1>
            <p className="text-sm text-slate-600">
              Edit langsung per sel. Perubahan akan tersimpan otomatis ke database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {rowCountLabel}
            </span>
            <span className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-medium ${statusColor}`}>
              {saveMessage}
            </span>
            {lastSavedAt && (
              <span className="text-xs text-slate-500">
                {new Date(lastSavedAt).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAddRow} disabled={addingRow}>
              {addingRow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Row
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/qa-management">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke QA
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] p-4">
        <div className="mb-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm lg:grid-cols-3">
          <div>
            <span className="font-semibold text-slate-900">Cara pakai:</span> klik sel untuk edit seperti spreadsheet.
          </div>
          <div>
            <span className="font-semibold text-slate-900">Autosave:</span> tersimpan saat edit selesai atau pindah sel.
          </div>
          <div>
            <span className="font-semibold text-slate-900">Tambah data:</span> gunakan tombol `Add Row`, lalu isi kolom yang dibutuhkan.
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-[60vh] items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat editor matriks...
            </div>
          ) : (
            <div
              ref={tableContainerRef}
              className="matriks-sheet tabulator-google-like"
            />
          )}
        </div>
      </div>

      <style>{`
        .tabulator-google-like .tabulator {
          border: 0;
          font-size: 13px;
        }

        .tabulator-google-like .tabulator-header {
          border-bottom: 1px solid #dbe3f0;
          background: #f8fafc;
        }

        .tabulator-google-like .tabulator-col {
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          font-weight: 600;
          color: #334155;
        }

        .tabulator-google-like .tabulator-row {
          min-height: 42px;
        }

        .tabulator-google-like .tabulator-cell {
          border-right: 1px solid #eef2f7;
          border-bottom: 1px solid #eef2f7;
          padding: 10px 12px;
          white-space: pre-wrap;
          background: #fff;
        }

        .tabulator-google-like .tabulator-cell.tabulator-editing {
          outline: 2px solid #2563eb;
          outline-offset: -2px;
          background: #eff6ff;
        }

        .tabulator-google-like .tabulator-row:hover .tabulator-cell {
          background: #f8fbff;
        }

        .tabulator-google-like .tabulator-cell input,
        .tabulator-google-like .tabulator-cell textarea {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font-size: 13px;
          line-height: 1.5;
        }

        .tabulator-google-like .tabulator-cell textarea {
          min-height: 88px;
          resize: vertical;
        }
      `}</style>
    </div>
  );
}
