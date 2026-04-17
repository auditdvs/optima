import { Loader2, Plus, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import type { RiskIssueData } from '../components/qa-management/RiskIssueSection';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type EditorTab = 'regular' | 'special';
type EditableField = Exclude<keyof RiskIssueData, 'id' | 'last_updated' | 'audit_type' | 'created_by' | 'created_by_name'>;
type TabulatorRowLike = { getData(): RiskIssueData };
type TabulatorValueCellLike = { getValue(): string | number | null | undefined };
type TabulatorInstanceLike = {
  destroy(): void;
  getData(): RiskIssueData[];
  scrollToRow(id: number, position: string, ifVisible: boolean): Promise<void>;
  addRow(data: any): Promise<void>;
};

const getRiskIssueTableSetupMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;

  const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
  const combined = [
    maybeError.message,
    maybeError.details,
    maybeError.hint,
    maybeError.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    combined.includes('risk_issue') ||
    combined.includes('created_by') ||
    combined.includes('audit_type') ||
    combined.includes('relation') ||
    combined.includes('schema cache') ||
    combined.includes('404')
  ) {
    return 'Struktur risk_issue belum lengkap. Jalankan ulang SQL `sql/setup_risk_issue_editor.sql` di Supabase SQL Editor.';
  }

  return null;
};

const createBlankRiskIssueRow = (createdBy: string, auditType: EditorTab) => ({
  audit_type: auditType,
  created_by: createdBy,
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
  tanggal_audit: '',
  last_updated: new Date().toISOString(),
});

export default function RiskIssueEditorPage() {
  const { user } = useAuth();
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<TabulatorInstanceLike | null>(null);

  const [rows, setRows] = useState<RiskIssueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRow, setAddingRow] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('regular');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('Data siap diedit');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const rowCountLabel = useMemo(() => `${rows.length} baris`, [rows.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !['TEXTAREA', 'INPUT'].includes(target.tagName)) return;
      if (!target.closest('.risk-issue-sheet')) return;
      if (target.closest('.tabulator-header')) return;

      const key = e.key.toLowerCase();
      const isFormatKey = e.ctrlKey && (key === 'b' || key === 'i' || key === 'u');

      if (isFormatKey) {
        e.preventDefault();
        
        const el = target as HTMLTextAreaElement | HTMLInputElement;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = el.value;
        const selectedText = val.substring(start, end);
        
        let openTag = '';
        let closeTag = '';
        if (key === 'b') { openTag = '<b>'; closeTag = '</b>'; }
        if (key === 'i') { openTag = '<i>'; closeTag = '</i>'; }
        if (key === 'u') { openTag = '<u>'; closeTag = '</u>'; }

        el.value = val.substring(0, start) + openTag + selectedText + closeTag + val.substring(end);
        el.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchRows = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('risk_issue')
        .select('*')
        .eq('created_by', user.id)
        .eq('audit_type', editorTab)
        .order('id');

      if (error) throw error;
      setRows(data || []);
    } catch (error) {
      console.error('Error fetching risk issue rows:', error);
      toast.error(getRiskIssueTableSetupMessage(error) || 'Gagal memuat data risk issue');
    } finally {
      setLoading(false);
    }
  }, [editorTab, user?.id]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleManualSave = async () => {
    if (!tableRef.current || !user?.id) return;

    try {
      setSaveState('saving');
      setSaveMessage('Menyimpan data...');

      const currentData = tableRef.current.getData();
      
      if (currentData.length === 0) {
        setSaveState('saved');
        setSaveMessage('Tidak ada data');
        return;
      }

      const now = new Date().toISOString();
      const payload = currentData.map(row => ({
        ...row,
        last_updated: now,
        poin: row.poin === '' || row.poin == null ? null : Number(row.poin),
      }));

      const { error } = await supabase
        .from('risk_issue')
        .upsert(payload);

      if (error) throw error;

      setSaveState('saved');
      setSaveMessage(`Tersimpan (${currentData.length} baris)`);
      setLastSavedAt(now);
      toast.success('Data risk issue berhasil disimpan');
    } catch (error) {
      console.error('Error saving risk issues:', error);
      setSaveState('error');
      setSaveMessage('Gagal menyimpan');
      toast.error(getRiskIssueTableSetupMessage(error) || 'Gagal menyimpan data');
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
        headerSort: true,
        resizable: true,
        vertAlign: 'middle',
        tooltip: true,
        headerFilter: 'input',
      },
      columns: [
        { 
          title: 'KC/KR/KP', 
          field: 'kc_kr_kp', 
          editor: 'input', 
          width: 140, 
          frozen: true,
          headerFilter: 'list',
          headerFilterParams: { valuesLookup: true, clearable: true, multiselect: true },
          headerFilterFunc: 'in'
        },
        { title: 'Judul Temuan', field: 'judul_temuan', editor: 'textarea', width: 240 },
        { title: 'Kode Risk Issue', field: 'kode_risk_issue', editor: 'input', width: 160 },
        { title: 'Judul Risk Issue', field: 'judul_risk_issue', editor: 'textarea', width: 240 },
        { 
          title: 'Kategori', 
          field: 'kategori', 
          editor: 'input', 
          width: 160,
          headerFilter: 'list',
          headerFilterParams: { valuesLookup: true, clearable: true, multiselect: true },
          headerFilterFunc: 'in',
          formatter: (cell: any) => {
            const val = cell.getValue() ?? '';
            const strVal = String(val);
            if (strVal.toLowerCase().includes('major')) {
              cell.getElement().style.color = '#ef4444';
              cell.getElement().style.fontWeight = 'bold';
            } else {
              cell.getElement().style.color = '';
              cell.getElement().style.fontWeight = '';
            }
            return strVal;
          }
        },
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
          title: 'Tanggal Audit',
          field: 'tanggal_audit',
          editor: 'input',
          width: 140,
          validator: [
            {
              type: 'regex',
              parameters: '^(|\\d{2}\\/\\d{2}\\/\\d{4})$',
            },
          ],
          tooltip: 'Format: dd/mm/yyyy',
        },
        {
          title: 'Last Updated',
          field: 'last_updated',
          width: 180,
          editor: false,
          formatter: (cell: TabulatorValueCellLike) => {
            const value = cell.getValue();
            if (!value) return '-';
            return new Date(String(value)).toLocaleString('id-ID', {
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
      cellEdited: () => {
        setSaveState('idle');
        setSaveMessage('Terdapat perubahan (belum disimpan)');
      },
    });

    return () => {
      tableRef.current?.destroy();
      tableRef.current = null;
    };
  }, [loading, user?.id]);

  const handleAddRow = async () => {
    if (!user?.id) {
      toast.error('User login tidak ditemukan');
      return;
    }

    try {
      setAddingRow(true);
      const payload = createBlankRiskIssueRow(user.id, editorTab);
      const { data, error } = await supabase
        .from('risk_issue')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setRows((prev) => [...prev, data]);
      setSaveState('idle');
      setSaveMessage('Baris ditambahkan (belum disimpan)');

      tableRef.current?.addRow(data).then(() => {
        tableRef.current?.scrollToRow(data.id, 'bottom', false);
      });
    } catch (error) {
      console.error('Error adding risk issue row:', error);
      toast.error(getRiskIssueTableSetupMessage(error) || 'Gagal menambah baris baru');
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
              Risk Issue Editor
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Spreadsheet Risk Issue</h1>
            <p className="text-sm text-slate-600">
              Setiap QA mengedit sheet miliknya sendiri per tab, lalu hasil akhirnya tetap terkumpul di halaman utama.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setEditorTab('regular')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  editorTab === 'regular'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reguler
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('special')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  editorTab === 'special'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khusus
              </button>
            </div>
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
            <Button variant="outline" size="sm" onClick={handleAddRow} disabled={addingRow}>
              {addingRow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Row
            </Button>
            <Button size="sm" onClick={handleManualSave} disabled={saveState === 'saving' || loading}>
              {saveState === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Data
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] p-4">
        <div className="mb-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm lg:grid-cols-4">
          <div>
            <span className="font-semibold text-slate-900">Tab aktif:</span> {editorTab === 'special' ? 'Khusus' : 'Reguler'}.
          </div>
          <div>
            <span className="font-semibold text-slate-900">Add Row:</span> untuk menambah data matriks untuk di input.
          </div>
          <div>
            <span className="font-semibold text-slate-900">Tanggal audit:</span> isi dengan format `yyyy-mm-dd`.
          </div>
            <div>
            <span className="font-semibold text-slate-900">Simpan data:</span> setelah input matriks, jangan lupa simpan data.
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div key="loader" className="flex h-[60vh] items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat editor risk issue...
            </div>
          ) : !user?.id ? (
            <div key="no-user" className="flex h-[60vh] items-center justify-center px-6 text-center text-slate-500">
              Session login tidak ditemukan. Login ulang lalu buka editor ini lagi.
            </div>
          ) : (
            <div key="tabulator-container" className="risk-issue-sheet tabulator-google-like" ref={tableContainerRef} />
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

        .tabulator-google-like .tabulator-header-filter input {
          box-sizing: border-box;
          width: 100%;
          padding: 4px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
          color: #334155;
          font-weight: normal;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        
        .tabulator-google-like .tabulator-header-filter input:focus {
          border-color: #2563eb;
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
          overflow-wrap: anywhere;
          word-break: break-word;
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
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .tabulator-google-like .tabulator-cell textarea {
          min-height: 88px;
          resize: vertical;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}
