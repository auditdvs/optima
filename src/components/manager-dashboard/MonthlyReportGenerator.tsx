import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

// ==================== TYPES ====================
interface ReportData {
  totalReguler: number;
  totalKhusus: number;
  totalNominalFraud: number;
  totalPengembalianFraud: number;
  regionFrauds: Record<string, { count: number; nominal: number }>;
  auditDetails: AuditDetail[];
  fraudDetails: FraudDetail[];
}

interface AuditDetail {
  branch_name: string;
  region: string;
  audit_type: string;
  team: string;
  leader: string;
  audit_start_date: string;
  audit_end_date: string;
  rating?: string;
}

interface FraudDetail {
  fraud_staff: string;
  fraud_amount: number;
  payment_fraud: number;
  branch_name?: string;
  region?: string;
  audit_master_id?: string;
}

// ==================== CONSTANTS ====================
const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const PUTER_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiZ3VpIiwidiI6IjAuMC4wIiwidSI6Ind5a3A4UzhNUjJHWjFGQ2lISW9UZXc9PSIsInV1IjoiRzZxWUVWR2lSZFcvcmRtUUZaM3FLQT09IiwiaWF0IjoxNzc1NTI2NDEyfQ.NEPFduNcdF1_JKjQ5kZ5UDmE26jt1CKV5nRRboaSA0g';
const KIMI_API_KEY = 'sk-dDuwBkuALgzMB2pkPc3pkyO7Wai0Sx9zBbkvv7oVhtMJzsc2';
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const FREE_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const PUTER_MODELS = [
  { value: 'puter:gpt-4o', label: 'GPT-4o' },
  { value: 'puter:gpt-4o-mini', label: 'GPT-4o Mini' },
];

const KIMI_MODELS = [
  { value: 'kimi:moonshot-v1-8k', label: 'Kimi Moonshot 8K' },
  { value: 'kimi:moonshot-v1-32k', label: 'Kimi Moonshot 32K' },
  { value: 'kimi:moonshot-v1-128k', label: 'Kimi Moonshot 128K' },
];

const GROQ_MODELS = [
  { value: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { value: 'groq:llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
  { value: 'groq:mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  { value: 'groq:gemma2-9b-it', label: 'Gemma 2 9B' },
];

const ALL_MODELS = [...FREE_MODELS, ...PUTER_MODELS, ...KIMI_MODELS, ...GROQ_MODELS];

const COLORS = {
  headerBlue: [17, 53, 107] as [number, number, number],
  accentBlue: [50, 115, 168] as [number, number, number],
  lightBlue: [236, 245, 252] as [number, number, number],
  green: [40, 167, 69] as [number, number, number],
  red: [220, 53, 69] as [number, number, number],
  orange: [243, 156, 18] as [number, number, number],
  gray: [108, 117, 125] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  tableHeader: [204, 51, 51] as [number, number, number],
  tableHeaderBlue: [17, 53, 107] as [number, number, number],
  tableHeaderGray: [85, 85, 85] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  textDark: [30, 30, 30] as [number, number, number],
  textMed: [80, 80, 80] as [number, number, number],
  textLight: [120, 120, 120] as [number, number, number],
  rowAltRed: [255, 245, 245] as [number, number, number],
  rowAltBlue: [245, 245, 255] as [number, number, number],
};

type ProgressStep = 'idle' | 'fetching' | 'processing' | 'ai_narrative' | 'generating_pdf' | 'done' | 'error';

const STEP_INFO: Record<ProgressStep, { label: string; progress: number }> = {
  idle: { label: '', progress: 0 },
  fetching: { label: 'Mengambil data audit dari database...', progress: 15 },
  processing: { label: 'Memproses dan menganalisis data...', progress: 35 },
  ai_narrative: { label: 'Membuat narasi AI...', progress: 60 },
  generating_pdf: { label: 'Menyusun laporan PDF...', progress: 85 },
  done: { label: 'Laporan berhasil dibuat!', progress: 100 },
  error: { label: 'Terjadi kesalahan', progress: 0 },
};

// ==================== HELPERS ====================
const formatRp = (value: number) =>
  `Rp ${value.toLocaleString('id-ID')}`;

const formatRpCompact = (value: number) => {
  if (!value || value === 0) return 'Rp 0';
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace('.0', '')} Jt`;
  return `Rp ${(value / 1_000).toFixed(0)} Rb`;
};

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const toDisplayDate = (iso: string) => {
  if (!iso) return '-';
  const [y, m, day] = iso.split('-');
  return `${day}-${m}-${y}`;
};

// ==================== CANVAS CHARTS ====================

// FIX: Tambah helper createHiDpiCanvas untuk render chart dengan resolusi tinggi (3x scale)
// Sebelumnya canvas dibuat dengan ukuran biasa sehingga chart terlihat buram di PDF.
// Dengan scale 3x, gambar canvas jauh lebih tajam saat di-embed ke PDF.
const createHiDpiCanvas = (width: number, height: number, scale = 3) => {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  return { canvas, ctx };
};

// FIX: drawHBarChart — gunakan createHiDpiCanvas (scale 3x) agar tidak buram
const drawHBarChart = (
  labels: string[],
  values: number[],
  colors: string[],
  title: string,
  width = 520,
  height = 300,
): string => {
  // FIX: Ganti document.createElement('canvas') biasa dengan helper HiDpi
  const { canvas, ctx } = createHiDpiCanvas(width, height, 3);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const titleH = 30;
  ctx.fillStyle = '#11356B';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, titleH - 5);

  if (!labels.length || values.every(v => v === 0)) {
    ctx.fillStyle = '#999';
    ctx.font = '11px Arial';
    ctx.fillText('Tidak ada data', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const pad = { top: titleH + 10, right: 80, bottom: 20, left: 120 };
  const chartW = width - pad.left - pad.right;
  const barAreaH = height - pad.top - pad.bottom;
  const barH = Math.min(28, (barAreaH / labels.length) * 0.6);
  const gap = (barAreaH - barH * labels.length) / (labels.length + 1);
  const maxVal = Math.max(...values, 1);

  labels.forEach((label, i) => {
    const barW = (values[i] / maxVal) * chartW;
    const y = pad.top + gap * (i + 1) + barH * i;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(pad.left, y, barW, barH);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(values[i].toLocaleString('id-ID'), pad.left + barW + 5, y + barH / 2 + 4);

    ctx.fillStyle = '#444';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(label, pad.left - 6, y + barH / 2 + 4);
  });

  return canvas.toDataURL('image/png');
};

// FIX: drawVBarChart — gunakan createHiDpiCanvas (scale 3x) agar tidak buram
const drawVBarChart = (
  labels: string[],
  values: number[],
  title: string,
  width = 520,
  height = 240,
): string => {
  // FIX: Ganti document.createElement('canvas') biasa dengan helper HiDpi
  const { canvas, ctx } = createHiDpiCanvas(width, height, 3);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const titleH = 22;
  ctx.fillStyle = '#11356B';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, titleH - 2);

  if (!labels.length || values.every(v => v === 0)) return canvas.toDataURL('image/png');

  const pad = { top: titleH + 8, right: 15, bottom: 55, left: 55 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...values, 1);
  const barW = Math.max(10, (chartW / labels.length) * 0.55);
  const gap = (chartW - barW * labels.length) / (labels.length + 1);

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    const val = maxVal - (maxVal / 4) * i;
    ctx.fillStyle = '#888';
    ctx.font = '8px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(val >= 1_000_000 ? `${(val / 1_000_000).toFixed(0)}Jt` : val.toFixed(0), pad.left - 3, y + 3);
  }

  labels.forEach((label, i) => {
    const bH = (values[i] / maxVal) * chartH;
    const x = pad.left + gap * (i + 1) + barW * i;
    const y = pad.top + chartH - bH;

    const alpha = Math.max(0.4, 1 - i * 0.05);
    ctx.fillStyle = `rgba(17,53,107,${alpha})`;
    ctx.fillRect(x, y, barW, bH);

    const compact = values[i] >= 1_000_000
      ? `Rp ${(values[i] / 1_000_000).toFixed(1)} Jt`
      : `Rp ${values[i].toLocaleString('id-ID')}`;
    ctx.fillStyle = '#333';
    ctx.font = `${Math.min(9, Math.max(7, barW * 0.25))}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(compact, x + barW / 2, y - 3);

    ctx.fillStyle = '#555';
    ctx.font = `${Math.min(8, Math.max(6, barW * 0.22))}px Arial`;
    ctx.save();
    ctx.translate(x + barW / 2, pad.top + chartH + 10);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
};

// FIX: drawDonutChart — gunakan createHiDpiCanvas (scale 3x) agar tidak buram
const drawDonutChart = (
  labels: string[],
  values: number[],
  colors: string[],
  width = 500,
  height = 300,
): string => {
  // FIX: Ganti document.createElement('canvas') biasa dengan helper HiDpi
  const { canvas, ctx } = createHiDpiCanvas(width, height, 3);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return canvas.toDataURL();

  const cx = width * 0.38;
  const cy = height / 2;
  const outerR = Math.min(width, height) / 2.3;
  const innerR = outerR * 0.48;

  let startAngle = -Math.PI / 2;

  values.forEach((val, i) => {
    if (!val) return;
    const slice = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = startAngle + slice / 2;
    const pr = outerR * 0.72;
    const px = cx + Math.cos(mid) * pr;
    const py = cy + Math.sin(mid) * pr;
    const pct = Math.round((val / total) * 100);
    if (pct > 5) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, px, py + 5);
    }

    startAngle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();

  const legendX = width * 0.68;
  const legendStartY = cy - (labels.length * 28) / 2;
  labels.forEach((label, i) => {
    const ly = legendStartY + i * 28;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, ly, 14, 14);
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, legendX + 20, ly + 11);
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.fillText(`(${values[i]} cabang)`, legendX + 20, ly + 24);
  });

  return canvas.toDataURL('image/png');
};

// ==================== DATA FETCHING ====================
const fetchReportData = async (month: number, year: number): Promise<ReportData> => {
  const startDate = formatDate(new Date(year, month - 1, 1));
  const endDate = formatDate(new Date(year, month, 0));

  const { data: audits, error: auditsError } = await supabase
    .from('audit_master')
    .select('id, branch_name, region, audit_type, team, leader, audit_start_date, audit_end_date, rating')
    .gte('audit_start_date', startDate)
    .lte('audit_start_date', endDate);

  if (auditsError) throw new Error(`Gagal mengambil data audit: ${auditsError.message}`);

  let frauds: FraudDetail[] = [];
  if (audits && audits.length > 0) {
    const auditIds = audits.map((a: any) => a.id);
    const { data: fraudData, error: fraudError } = await supabase
      .from('work_paper_persons')
      .select('fraud_staff, fraud_amount, payment_fraud, audit_master_id')
      .in('audit_master_id', auditIds);

    if (fraudError) throw new Error(`Gagal mengambil data fraud: ${fraudError.message}`);

    frauds = (fraudData || [])
      .filter((f: any) => f.fraud_staff && f.fraud_staff.trim() !== '')
      .map((f: any) => {
        const audit = audits.find((a: any) => a.id === f.audit_master_id);
        return {
          fraud_staff: f.fraud_staff,
          fraud_amount: Number(f.fraud_amount) || 0,
          payment_fraud: Number(f.payment_fraud) || 0,
          branch_name: audit?.branch_name,
          region: audit?.region,
          audit_master_id: f.audit_master_id,
        };
      });
  }

  const reguler = (audits || []).filter(
    (a: any) => a.audit_type?.toLowerCase().includes('reguler') || a.audit_type?.toLowerCase().includes('regular'),
  );
  const khusus = (audits || []).filter(
    (a: any) => a.audit_type?.toLowerCase().includes('khusus') || a.audit_type?.toLowerCase().includes('special') || a.audit_type?.toLowerCase().includes('fraud'),
  );

  const totalNominalFraud = frauds.reduce((s, f) => s + f.fraud_amount, 0);
  const totalPengembalianFraud = frauds.reduce((s, f) => s + f.payment_fraud, 0);

  const regionFrauds: Record<string, { count: number; nominal: number }> = {};
  frauds.forEach(f => {
    const r = f.region || 'Lainnya';
    if (!regionFrauds[r]) regionFrauds[r] = { count: 0, nominal: 0 };
    regionFrauds[r].count += 1;
    regionFrauds[r].nominal += f.fraud_amount;
  });

  return {
    totalReguler: reguler.length,
    totalKhusus: khusus.length,
    totalNominalFraud,
    totalPengembalianFraud,
    regionFrauds,
    auditDetails: (audits || []) as AuditDetail[],
    fraudDetails: frauds,
  };
};

// ==================== AI NARRATIVE ====================
const generateAINarrative = async (
  data: ReportData,
  monthLabel: string,
  year: number,
  model: string,
  signal: AbortSignal,
): Promise<string> => {
  const topRegions = Object.entries(data.regionFrauds)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([r, v]) => `Regional ${r}: ${v.count} pelaku, total Rp ${v.nominal.toLocaleString('id-ID')}`)
    .join('; ');

  const outstandingFraud = data.totalNominalFraud - data.totalPengembalianFraud;
  const recoveryRate = data.totalNominalFraud > 0
    ? ((data.totalPengembalianFraud / data.totalNominalFraud) * 100).toFixed(1)
    : '0';

  const ratingCounts = { high: 0, medium: 0, low: 0 };
  data.auditDetails.filter(a => a.audit_type?.toLowerCase().includes('reguler') || a.audit_type?.toLowerCase().includes('regular')).forEach(a => {
    const r = a.rating?.toLowerCase() || '';
    if (r === 'high') ratingCounts.high++;
    else if (r === 'medium') ratingCounts.medium++;
    else if (r === 'low') ratingCounts.low++;
  });

  const prompt = `Anda adalah seorang Manager Senior Audit Internal yang berpengalaman. Tugas Anda adalah menulis "Bab 6: Kesimpulan dan Rekomendasi" untuk laporan audit bulanan resmi yang akan disampaikan kepada Direksi dan Komite Audit.

DATA AUDIT BULAN ${monthLabel.toUpperCase()} ${year}:

[AUDIT REGULER]
- Total cabang diaudit: ${data.totalReguler} cabang
- Rating HIGH: ${ratingCounts.high} cabang (${data.totalReguler > 0 ? ((ratingCounts.high / data.totalReguler) * 100).toFixed(0) : 0}%)
- Rating MEDIUM: ${ratingCounts.medium} cabang
- Rating LOW: ${ratingCounts.low} cabang

[AUDIT KHUSUS/FRAUD]
- Total kasus dikonfirmasi real fraud: ${data.totalKhusus} kasus
- Total pelaku teridentifikasi: ${data.fraudDetails.length} pelaku
- Total nominal fraud: Rp ${data.totalNominalFraud.toLocaleString('id-ID')}
- Total pengembalian diterima: Rp ${data.totalPengembalianFraud.toLocaleString('id-ID')}
- Recovery rate: ${recoveryRate}%
- Saldo belum terpulihkan: Rp ${outstandingFraud.toLocaleString('id-ID')}

[DISTRIBUSI REGIONAL FRAUD]
${
  Object.entries(data.regionFrauds)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([r, v], i) => `- Regional ${r}: ${v.count} pelaku, nominal Rp ${v.nominal.toLocaleString('id-ID')}`)
    .join('\n') || '- Tidak ada data regional fraud'
}

INSTRUKSI PENULISAN:
1. Tulis dalam Bahasa Indonesia formal sesuai standar laporan audit internal
2. Setiap poin kesimpulan harus mencerminkan interpretasi atas data, bukan sekadar pengulangan angka
3. Sertakan angka kunci hanya bila mendukung narasi dan memberikan konteks yang bermakna
4. Rekomendasi harus konkret, terukur, dan merujuk langsung pada temuan (sebutkan regional atau cabang spesifik bila relevan)
5. Jika recovery rate 0% atau sangat rendah, soroti ini sebagai temuan kritis
6. Jika seluruh kasus khusus terkonfirmasi fraud (100%), nyatakan ini secara eksplisit sebagai perhatian serius

FORMAT OUTPUT (ikuti persis, langsung mulai dari 6.1):

6.1 Kesimpulan

a. [Judul Singkat]: [Narasi 2-3 kalimat yang menginterpretasikan data audit reguler secara keseluruhan]
b. [Judul Singkat]: [Narasi tentang hasil audit reguler — distribusi rating dan implikasinya]
c. [Judul Singkat]: [Narasi tentang audit khusus/fraud — volume, pelaku, dan nominal]
d. [Judul Singkat]: [Narasi tentang status pengembalian dan recovery rate, soroti bila kritis]
e. [Judul Singkat]: [Narasi tentang pola regional — sebutkan regional dengan fraud tertinggi dan implikasinya]

6.2 Rekomendasi

1. [Rekomendasi konkret terkait percepatan recovery — sebutkan pihak yang bertanggung jawab dan tenggat waktu bila memungkinkan]
2. [Rekomendasi terkait cabang rating HIGH — tindak lanjut RTL dengan batas waktu spesifik]
3. [Rekomendasi terkait regional dengan fraud tertinggi — sebutkan nama regional spesifik]
4. [Rekomendasi terkait kelengkapan dokumentasi audit khusus]
5. [Rekomendasi terkait penguatan sistem pengendalian internal secara menyeluruh]`;

  // Route ke Puter.js jika model dipilih dari PUTER_MODELS
  if (model.startsWith('puter:')) {
    const puterModel = model.replace('puter:', '');
    return generateAINarrativePuter(prompt, puterModel, signal)
      .catch((err: any) => {
        if (err.name === 'AbortError') throw err;
        return generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);
      });
  }

  // Route ke Kimi (Moonshot AI) jika model dipilih dari KIMI_MODELS
  if (model.startsWith('kimi:')) {
    const kimiModel = model.replace('kimi:', '');
    return generateAINarrativeKimi(prompt, kimiModel, signal)
      .catch((err: any) => {
        if (err.name === 'AbortError') throw err;
        return generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);
      });
  }

  // Route ke Groq jika model dipilih dari GROQ_MODELS
  if (model.startsWith('groq:')) {
    const groqModel = model.replace('groq:', '');
    return generateAINarrativeGroq(prompt, groqModel, signal)
      .catch((err: any) => {
        if (err.name === 'AbortError') throw err;
        return generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);
      });
  }

  try {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) return generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);

    const resp = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
      }),
      signal,
    });

    if (!resp.ok) return generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);
    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    return generateFallbackNarrative(data, monthLabel, year, ratingCounts, outstandingFraud, recoveryRate);
  }
};

// ==================== PUTER.JS AI ====================
const generateAINarrativePuter = async (
  prompt: string,
  model: string,
  signal: AbortSignal,
): Promise<string> => {
  const resp = await fetch('https://api.puter.com/drivers/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PUTER_API_KEY}`,
    },
    body: JSON.stringify({
      interface: 'puter-chat-completion',
      driver: 'openai-completion',
      test_mode: false,
      method: 'complete',
      args: {
        model,
        messages: [{ role: 'user', content: prompt }],
      },
    }),
    signal,
  });

  if (!resp.ok) throw new Error(`Puter API error: ${resp.status}`);
  const result = await resp.json();
  const text = result?.result?.message?.content
    ?? result?.result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Puter API: respons tidak valid');
  return text;
};

// ==================== KIMI (MOONSHOT AI) ====================
const generateAINarrativeKimi = async (
  prompt: string,
  model: string,
  signal: AbortSignal,
): Promise<string> => {
  const resp = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 1200,
    }),
    signal,
  });

  if (!resp.ok) throw new Error(`Kimi API error: ${resp.status}`);
  const result = await resp.json();
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Kimi API: respons tidak valid');
  return text;
};

// ==================== GROQ (LLAMA / MIXTRAL / GEMMA) ====================
const generateAINarrativeGroq = async (
  prompt: string,
  model: string,
  signal: AbortSignal,
): Promise<string> => {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!groqKey) throw new Error('VITE_GROQ_API_KEY belum dikonfigurasi di .env');

  const resp = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 1200,
    }),
    signal,
  });

  if (!resp.ok) throw new Error(`Groq API error: ${resp.status}`);
  const result = await resp.json();
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq API: respons tidak valid');
  return text;
};

const generateFallbackNarrative = (
  data: ReportData,
  monthLabel: string,
  year: number,
  ratingCounts: { high: number; medium: number; low: number },
  outstandingFraud: number,
  recoveryRate: string,
): string => {
  const topRegions = Object.entries(data.regionFrauds).sort((a, b) => b[1].count - a[1].count);
  const top1 = topRegions[0];
  const top2 = topRegions[1];

  return `6.1 Kesimpulan

a. Volume Audit: Divisi Audit Internal telah melaksanakan total ${data.totalReguler + data.totalKhusus} kegiatan audit pada bulan ${monthLabel} ${year}, terdiri dari ${data.totalReguler} audit reguler dan ${data.totalKhusus} audit khusus/fraud.

b. Audit Reguler: Dari ${data.totalReguler} cabang yang diaudit secara reguler, sebanyak ${ratingCounts.high} cabang (${data.totalReguler > 0 ? Math.round((ratingCounts.high / data.totalReguler) * 100) : 0}%) mendapatkan rating HIGH, ${ratingCounts.medium} cabang rating MEDIUM, dan ${ratingCounts.low} cabang rating LOW. Cabang-cabang dengan rating HIGH wajib menyelesaikan rencana tindak lanjut dalam waktu yang telah disepakati.

c. Audit Khusus/Fraud: Seluruh ${data.totalKhusus} audit khusus yang dilaksanakan dikonfirmasi sebagai real fraud, melibatkan ${data.fraudDetails.length} pelaku dengan total nominal fraud sebesar Rp ${data.totalNominalFraud.toLocaleString('id-ID')}.

d. Status Pengembalian: Hingga tanggal laporan ini diterbitkan, total pengembalian yang diterima adalah Rp ${data.totalPengembalianFraud.toLocaleString('id-ID')} (recovery rate: ${recoveryRate}%). Total kerugian yang belum terpulihkan sebesar Rp ${outstandingFraud.toLocaleString('id-ID')}.

e. Analisis Regional: ${top1 ? `Regional ${top1[0]} dan ${top2 ? `Regional ${top2[0]}` : 'regional lainnya'} secara kumulatif merupakan regional dengan jumlah kasus fraud terbanyak, sehingga memerlukan perhatian pengawasan yang lebih intensif.` : 'Tidak terdapat kasus fraud pada periode ini.'}

6.2 Rekomendasi

1. Divisi terkait agar segera memproses dan mendampingi penyelesaian pengembalian (recovery) kerugian fraud dari seluruh pelaku yang telah teridentifikasi pada periode ${monthLabel} ${year}.

2. Cabang-cabang dengan rating HIGH pada audit reguler (${ratingCounts.high} cabang) diwajibkan menyampaikan Rencana Tindak Lanjut (RTL) secara tertulis kepada Divisi Audit Internal paling lambat 30 hari setelah tanggal laporan.

3. ${top1 ? `Regional ${top1[0]} ${top2 ? `dan Regional ${top2[0]}` : ''} sebagai regional dengan kasus fraud kumulatif tertinggi agar dilakukan penguatan pengawasan internal dan peningkatan frekuensi audit pada periode berikutnya.` : 'Divisi Audit Internal agar terus meningkatkan kualitas dan cakupan audit pada periode selanjutnya.'}

4. Tim audit khusus agar mempercepat finalisasi dokumentasi audit untuk cabang-cabang yang masih dalam proses, guna memastikan kelengkapan berkas sesuai standar yang berlaku.

5. Manajemen disarankan untuk melakukan kajian menyeluruh terhadap sistem pengendalian internal di cabang-cabang yang terindikasi fraud sebagai langkah pencegahan agar kejadian serupa tidak terulang.`;
};

// ==================== PDF ENGINE ====================
const generatePDF = async (
  data: ReportData,
  narrative: string,
  monthLabel: string,
  year: number,
): Promise<jsPDF> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const M = 20;
  const CW = PW - M * 2;

  // ---------- HELPERS ----------

  // FIX: setFont sekarang selalu dipanggil SEBELUM splitTextToSize di seluruh kode.
  // Ini kritis karena jsPDF menghitung lebar karakter berdasarkan font yang sedang aktif.
  // Jika splitTextToSize dipanggil sebelum setFont, ukuran/wrap teks jadi tidak akurat
  // dan paragraf terlihat terpotong atau tidak mengisi lebar halaman penuh.
  const setFont = (style: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number] = COLORS.textDark) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };

  const drawPageHeader = (leftText: string, rightText: string) => {
    pdf.setFillColor(...COLORS.headerBlue);
    pdf.rect(0, 0, PW, 7, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.white);
    pdf.text(leftText, M, 5);
    pdf.text(rightText, PW - M, 5, { align: 'right' });
  };

  const HEADER_LEFT = `LAPORAN BULANAN KEGIATAN AUDIT — ${monthLabel.toUpperCase()} ${year}`;
  const HEADER_RIGHT = 'DIVISI INTERNAL AUDIT | RAHASIA';

  const drawPageFooter = (pageNum: number) => {
    const footerY = PH - 10;
    pdf.setDrawColor(...COLORS.textLight);
    pdf.setLineWidth(0.3);
    pdf.line(M, footerY, PW - M, footerY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text('IA - KSP MITRA DHUAFA', M, footerY + 5);
    pdf.text(`Halaman ${pageNum}`, PW / 2, footerY + 5, { align: 'center' });
    const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    pdf.text(dateStr, PW - M, footerY + 5, { align: 'right' });
  };

  const drawSectionTitle = (text: string, y: number): number => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...COLORS.headerBlue);
    pdf.text(text, M, y);
    pdf.setDrawColor(...COLORS.headerBlue);
    pdf.setLineWidth(0.6);
    pdf.line(M, y + 2, PW - M, y + 2);
    return y + 10;
  };

  const drawSubTitle = (text: string, y: number): number => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...COLORS.headerBlue);
    pdf.text(text, M, y);
    return y + 7;
  };

  const drawHighlightBox = (
    text: string,
    y: number,
    bgColor: [number, number, number],
    borderColor: [number, number, number],
    textColor: [number, number, number],
  ): number => {
    const paddingX = 6;
    const paddingY = 5;
    const lineH = 5;
    const fontSize = 8.5;
    // FIX: setFont dipanggil SEBELUM splitTextToSize agar kalkulasi lebar wrap akurat
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    const wrapWidth = CW - paddingX * 2;
    const lines: string[] = pdf.splitTextToSize(text, wrapWidth);
    const boxH = lines.length * lineH + paddingY * 2;
    pdf.setFillColor(...bgColor);
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.4);
    pdf.rect(M, y, CW, boxH, 'FD');
    pdf.setTextColor(...textColor);
    lines.forEach((line: string, i: number) => {
      pdf.text(line, M + paddingX, y + paddingY + lineH * 0.75 + i * lineH);
    });
    return y + boxH + 4;
  };

  // ======================================================
  // PAGE 1 — COVER
  // ======================================================
  pdf.setFillColor(...COLORS.headerBlue);
  pdf.rect(0, 0, PW, 18, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.white);
  pdf.text('DIVISI INTERNAL AUDIT', PW / 2, 7, { align: 'center' });
  pdf.text('KSP MITRA DHUAFA', PW / 2, 13, { align: 'center' });

  const titleY = 70;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...COLORS.headerBlue);
  pdf.text('LAPORAN BULANAN', PW / 2, titleY, { align: 'center' });
  pdf.text('KEGIATAN AUDIT', PW / 2, titleY + 12, { align: 'center' });

  pdf.setFontSize(28);
  pdf.setTextColor(...COLORS.red);
  pdf.text(`${monthLabel.toUpperCase()} ${year}`, PW / 2, titleY + 26, { align: 'center' });

  pdf.setDrawColor(...COLORS.accentBlue);
  pdf.setLineWidth(0.8);
  pdf.line(M + 20, titleY + 32, PW - M - 20, titleY + 32);

  const lastDay = new Date(year, parseInt(String(
    MONTH_OPTIONS.findIndex(m => m.label === monthLabel) + 1,
  )), 0).getDate();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.textMed);
  pdf.text(`Periode Pelaksanaan: 1 - ${lastDay} ${monthLabel} ${year}`, PW / 2, titleY + 42, { align: 'center' });
  pdf.text(`Diterbitkan: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, PW / 2, titleY + 50, { align: 'center' });

  pdf.setFillColor(240, 240, 240);
  pdf.rect(M + 30, titleY + 57, CW - 60, 10, 'F');
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.textMed);
  pdf.text('RAHASIA — Dokumen ini hanya untuk kalangan internal', PW / 2, titleY + 64, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.textLight);
  pdf.text(
    `Digenerate otomatis oleh OPTIMA Database pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    PW / 2,
    PH - 12,
    { align: 'center' },
  );

  // ======================================================
  // PAGE 2 — DAFTAR ISI
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);

  let y = 22;
  y = drawSectionTitle('DAFTAR ISI', y);
  y += 4;

  const tocItems = [
    { num: '1.', title: 'Pendahuluan', page: '2' },
    { num: '2.', title: 'Ringkasan Eksekutif', page: '2' },
    { num: '3.', title: `Audit Reguler ${monthLabel} ${year}`, page: '3' },
    { num: '   3.1', title: 'Daftar Cabang yang Diaudit', page: '3' },
    { num: '   3.2', title: 'Distribusi Rating Hasil Audit', page: '4' },
    { num: '4.', title: `Audit Khusus / Fraud ${monthLabel} ${year}`, page: '4' },
    { num: '   4.1', title: 'Daftar Kasus Fraud per Cabang', page: '5' },
    { num: '   4.2', title: 'Rincian Pelaku dan Nominal Fraud', page: '7' },
    { num: '   4.3', title: 'Status Pengembalian Fraud', page: '8' },
    { num: '5.', title: 'Analisis Regional', page: '8' },
    { num: '6.', title: 'Kesimpulan dan Rekomendasi', page: '9' },
  ];

  tocItems.forEach(item => {
    const isBold = !item.num.startsWith('   ');
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.textDark);
    pdf.text(item.num, M + 5, y);
    pdf.text(item.title, M + 20, y);
    pdf.text(item.page, PW - M, y, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.textLight);
    const titleEnd = M + 20 + pdf.getTextWidth(item.title) + 2;
    const pageStart = PW - M - pdf.getTextWidth(item.page) - 3;
    let dotX = titleEnd;
    while (dotX < pageStart) {
      pdf.text('.', dotX, y);
      dotX += 2.5;
    }
    y += 8;
  });

  drawPageFooter(3);

  // ======================================================
  // PAGE 3 — PENDAHULUAN + RINGKASAN EKSEKUTIF
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);

  y = 22;
  y = drawSectionTitle('1. PENDAHULUAN', y);

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar wrap teks menggunakan
  // ukuran font yang benar dan mengisi lebar CW secara penuh (bukan terpotong)
  setFont('normal', 9, COLORS.textDark);
  const pendahuluanLines = pdf.splitTextToSize(
    `Laporan ini disusun oleh Divisi Audit Internal dalam rangka menyajikan hasil dan perkembangan kegiatan audit yang dilaksanakan selama bulan ${monthLabel} ${year}. Cakupan laporan meliputi audit reguler terhadap cabang-cabang dalam rangka penilaian kepatuhan dan tata kelola, serta audit khusus/fraud yang dilaksanakan sebagai respons atas indikasi penyimpangan keuangan di sejumlah unit kerja.`,
    CW,
  );
  pdf.text(pendahuluanLines, M, y);
  y += pendahuluanLines.length * 4.5 + 3;

  // FIX: setFont dipanggil SEBELUM splitTextToSize
  setFont('normal', 9, COLORS.textDark);
  const pendahuluan2Lines = pdf.splitTextToSize(
    'Laporan ini disusun berdasarkan data aktivitas audit yang tercatat dalam sistem manajemen audit internal. Seluruh data telah melalui proses verifikasi dan validasi oleh tim Quality Assurance (QA). Laporan ini bersifat rahasia dan hanya diperuntukkan bagi pihak internal yang berwenang.',
    CW,
  );
  pdf.text(pendahuluan2Lines, M, y);
  y += pendahuluan2Lines.length * 4.5 + 6;

  y = drawSectionTitle('2. RINGKASAN EKSEKUTIF', y);

  const uniqueFraudStaff = [...new Set(data.fraudDetails.map(f => f.fraud_staff))].length;
  const uniqueFraudBranch = [...new Set(data.fraudDetails.map(f => f.branch_name))].filter(Boolean).length;

  const ringkasanText = `Selama bulan ${monthLabel} ${year}, Divisi Audit Internal telah melaksanakan total ${data.totalReguler + data.totalKhusus} kegiatan audit yang terdiri dari ${data.totalReguler} audit reguler dan ${data.totalKhusus} audit khusus/fraud. Kegiatan audit tersebar di berbagai regional di seluruh Indonesia, mencerminkan komitmen divisi audit dalam menjaga integritas dan kepatuhan operasional cabang.`;

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar paragraf ringkasan eksekutif
  // tampil rapi dan mengisi lebar halaman penuh (sebelumnya terpotong di tengah)
  setFont('normal', 9, COLORS.textDark);
  const ringkasanLines = pdf.splitTextToSize(ringkasanText, CW);
  pdf.text(ringkasanLines, M, y);
  y += ringkasanLines.length * 4.5 + 5;

  // KPI boxes: 4 per row, 2 rows
  const kpis = [
    { v: String(data.totalReguler + data.totalKhusus), label: 'Total Kegiatan Audit', color: COLORS.headerBlue },
    { v: String(data.totalReguler), label: 'Audit Reguler', color: COLORS.green },
    { v: String(data.totalKhusus), label: 'Audit Khusus/Fraud', color: COLORS.red },
    { v: String(uniqueFraudStaff), label: 'Total Pelaku Fraud', color: COLORS.orange },
    { v: formatRpCompact(data.totalNominalFraud), label: 'Total Nominal Fraud', color: COLORS.red },
    { v: String(uniqueFraudBranch || data.totalKhusus), label: 'Total Cabang Fraud', color: [230, 126, 34] as [number, number, number] },
    { v: String(data.totalReguler), label: 'Total Cabang Reguler', color: COLORS.green },
    { v: formatRpCompact(data.totalPengembalianFraud), label: 'Pengembalian Fraud', color: COLORS.gray },
  ];

  const boxW = (CW - 9) / 4;
  const boxH = 18;
  const boxGap = 3;

  kpis.forEach((kpi, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const bx = M + (boxW + boxGap) * col;
    const by = y + (boxH + boxGap) * row;

    pdf.setFillColor(248, 248, 248);
    pdf.setDrawColor(...kpi.color);
    pdf.setLineWidth(0.5);
    pdf.rect(bx, by, boxW, boxH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...kpi.color);
    pdf.text(kpi.v, bx + boxW / 2, by + 9, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(kpi.label, bx + boxW / 2, by + 15, { align: 'center' });
  });

  y += (boxH + boxGap) * 2 + 5;

  const outstandingFraud = data.totalNominalFraud - data.totalPengembalianFraud;
  const topRegionEntry = Object.entries(data.regionFrauds).sort((a, b) => b[1].count - a[1].count)[0];
  const summaryText = `Dari ${uniqueFraudBranch} cabang yang menjalani audit khusus/fraud, seluruhnya dikonfirmasi sebagai real fraud. Total nominal fraud yang teridentifikasi mencapai ${formatRp(data.totalNominalFraud)} dengan total ${uniqueFraudStaff} pelaku. Hingga tanggal laporan ini diterbitkan, ${data.totalPengembalianFraud === 0 ? 'belum ada pengembalian atas kerugian yang terdeteksi.' : `total pengembalian yang diterima adalah ${formatRp(data.totalPengembalianFraud)}, dengan saldo belum terpulihkan sebesar ${formatRp(outstandingFraud)}.`}`;

  y = drawHighlightBox(summaryText, y, [236, 245, 252], COLORS.accentBlue, [40, 80, 130]);

  // Donut chart
  if (data.totalReguler + data.totalKhusus > 0) {
    const donutImg = drawDonutChart(
      ['Audit Reguler', 'Audit Khusus/Fraud'],
      [data.totalReguler, data.totalKhusus],
      ['#11356B', '#C0392B'],
      500, 260,
    );
    setFont('bold', 10, COLORS.headerBlue);
    pdf.text(`Komposisi Kegiatan Audit — ${monthLabel} ${year}`, PW / 2, y + 6, { align: 'center' });
    pdf.addImage(donutImg, 'PNG', M + 10, y + 8, CW - 20, 60);
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text(`Gambar 1: Komposisi Kegiatan Audit ${monthLabel} ${year}`, PW / 2, y + 72, { align: 'center' });
  }

  drawPageFooter(4);

  // ======================================================
  // PAGE 4 — AUDIT REGULER 3.1 Daftar Cabang
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  y = drawSectionTitle(`3. AUDIT REGULER`, y);

  const regulerAudits = data.auditDetails.filter(
    a => a.audit_type?.toLowerCase().includes('reguler') || a.audit_type?.toLowerCase().includes('regular'),
  );

  const regulerIntro = `Audit reguler merupakan kegiatan pemeriksaan periodik yang dilaksanakan terhadap cabang-cabang berdasarkan jadwal yang telah ditetapkan. Pada bulan ${monthLabel} ${year}, terdapat ${regulerAudits.length} cabang yang menjadi objek audit reguler yang tersebar di berbagai regional. Audit reguler difokuskan pada evaluasi kepatuhan operasional, kecukupan dokumentasi, dan penilaian profil risiko masing-masing cabang.`;

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar paragraf intro section 3
  // tampil rapi dan mengisi lebar CW secara penuh (sebelumnya wrap tidak akurat)
  setFont('normal', 9, COLORS.textDark);
  const regulerIntroLines = pdf.splitTextToSize(regulerIntro, CW);
  pdf.text(regulerIntroLines, M, y);
  y += regulerIntroLines.length * 4.5 + 5;

  y = drawSubTitle('3.1 Daftar Cabang yang Diaudit (Reguler)', y);

  if (regulerAudits.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [['No', 'Cabang', 'Regional', 'Tgl Mulai', 'Tgl Selesai', 'Rating']],
      body: regulerAudits.map((a, i) => [
        String(i + 1),
        (a.branch_name || '-').toUpperCase(),
        a.region || '-',
        toDisplayDate(a.audit_start_date),
        toDisplayDate(a.audit_end_date),
        (a.rating || 'BELUM DIISI').toUpperCase(),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.tableHeaderBlue,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: { fontSize: 7.5, textColor: COLORS.textDark },
      alternateRowStyles: { fillColor: COLORS.rowAltBlue },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: M, right: M },
      didParseCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === 'body') {
          const val = String(hookData.cell.raw || '');
          if (val === 'HIGH') hookData.cell.styles.textColor = COLORS.red;
          else if (val === 'MEDIUM') hookData.cell.styles.textColor = COLORS.orange;
          else if (val === 'LOW') hookData.cell.styles.textColor = COLORS.green;
        }
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 4;
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text(`Tabel 1: Daftar Cabang Audit Reguler ${monthLabel} ${year}`, PW / 2, y, { align: 'center' });
    y += 6;
  } else {
    setFont('italic', 9, COLORS.textMed);
    pdf.text('Tidak ada data audit reguler pada bulan ini.', M, y);
    y += 10;
  }

  drawPageFooter(5);

  // ======================================================
  // PAGE 5 — 3.2 Rating Distribution
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  y = drawSubTitle('3.2 Distribusi Rating Hasil Audit Reguler', y);

  const ratingCounts = { high: 0, medium: 0, low: 0 };
  regulerAudits.forEach(a => {
    const r = (a.rating || '').toLowerCase();
    if (r === 'high') ratingCounts.high++;
    else if (r === 'medium') ratingCounts.medium++;
    else if (r === 'low') ratingCounts.low++;
  });

  const ratingDistText = `Penilaian hasil audit reguler menggunakan tiga kategori rating: HIGH (risiko tinggi/temuan signifikan), MEDIUM (risiko sedang), dan LOW (risiko rendah/kondisi baik). Dari ${regulerAudits.length} cabang yang diaudit, sebanyak ${ratingCounts.high} cabang mendapatkan rating High, ${ratingCounts.medium} cabang rating Medium, dan ${ratingCounts.low} cabang rating Low.`;

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar teks distribusi rating rapi
  setFont('normal', 9, COLORS.textDark);
  const ratingDistLines = pdf.splitTextToSize(ratingDistText, CW);
  pdf.text(ratingDistLines, M, y);
  y += ratingDistLines.length * 4.5 + 5;

  if (ratingCounts.high + ratingCounts.medium + ratingCounts.low > 0) {
    const ratingImg = drawHBarChart(
      ['high', 'medium', 'low'],
      [ratingCounts.high, ratingCounts.medium, ratingCounts.low],
      ['#28A745', '#F39C12', '#DC3545'],
      `Distribusi Rating Audit Reguler — ${monthLabel} ${year}`,
      520, 200,
    );
    pdf.addImage(ratingImg, 'PNG', M + 5, y, CW - 10, 55);
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text(`Gambar 2: Distribusi Rating Audit Reguler ${monthLabel} ${year}`, PW / 2, y + 58, { align: 'center' });
    y += 64;
  }

  const highPct = regulerAudits.length > 0 ? Math.round((ratingCounts.high / regulerAudits.length) * 100) : 0;
  const ratingHighlightText = `Sebanyak ${ratingCounts.high} cabang (${highPct}%) mendapatkan rating HIGH, yang mengindikasikan adanya temuan audit yang signifikan dan memerlukan tindak lanjut segera. Manajemen direkomendasikan untuk memastikan rencana tindak lanjut (RTL) dari cabang-cabang tersebut diselesaikan dalam tenggat waktu yang telah disepakati.`;
  drawHighlightBox(ratingHighlightText, y, [236, 245, 252], COLORS.accentBlue, [40, 80, 130]);

  drawPageFooter(6);

  // ======================================================
  // PAGE 6 — AUDIT KHUSUS 4.1 Daftar Kasus
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  y = drawSectionTitle(`4. AUDIT KHUSUS / FRAUD`, y);

  const khususAudits = data.auditDetails.filter(
    a => a.audit_type?.toLowerCase().includes('khusus') || a.audit_type?.toLowerCase().includes('fraud') || a.audit_type?.toLowerCase().includes('special'),
  );

  const khususIntro = `Audit khusus/fraud dilaksanakan atas dasar indikasi atau laporan adanya penyimpangan keuangan pada cabang tertentu. Pada bulan ${monthLabel} ${year}, terdapat ${khususAudits.length} cabang yang menjadi objek audit khusus, tersebar di ${Object.keys(data.regionFrauds).length} regional. Seluruh audit khusus dikonfirmasi sebagai real fraud, dengan total kerugian yang teridentifikasi sebesar ${formatRp(data.totalNominalFraud)}.`;

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar paragraf intro section 4
  // tampil rapi dan mengisi lebar CW secara penuh (sebelumnya terpotong)
  setFont('normal', 9, COLORS.textDark);
  const khususIntroLines = pdf.splitTextToSize(khususIntro, CW);
  pdf.text(khususIntroLines, M, y);
  y += khususIntroLines.length * 4.5 + 5;

  y = drawSubTitle('4.1 Daftar Kasus Fraud per Cabang', y);

  const branchFraudMap: Record<string, { region: string; pelaku: string[]; total: number; start: string; end: string }> = {};
  khususAudits.forEach(a => {
    const bn = a.branch_name || 'Unknown';
    if (!branchFraudMap[bn]) {
      branchFraudMap[bn] = { region: a.region || '-', pelaku: [], total: 0, start: a.audit_start_date, end: a.audit_end_date };
    }
  });
  data.fraudDetails.forEach(f => {
    const bn = f.branch_name || 'Unknown';
    if (!branchFraudMap[bn]) branchFraudMap[bn] = { region: f.region || '-', pelaku: [], total: 0, start: '', end: '' };
    branchFraudMap[bn].pelaku.push(f.fraud_staff);
    branchFraudMap[bn].total += f.fraud_amount;
  });

  const branchFraudRows = Object.entries(branchFraudMap)
    .sort((a, b) => b[1].total - a[1].total);

  if (branchFraudRows.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [['No', 'Cabang', 'Regional', 'Tgl Mulai', 'Tgl Selesai', 'Jml Pelaku', 'Total Fraud (Rp)']],
      body: branchFraudRows.map(([bn, v], i) => [
        String(i + 1),
        bn.toUpperCase(),
        v.region,
        toDisplayDate(v.start),
        toDisplayDate(v.end),
        String(v.pelaku.length),
        formatRp(v.total),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: { fontSize: 7.5, textColor: COLORS.textDark },
      alternateRowStyles: { fillColor: COLORS.rowAltRed },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLORS.red },
      },
      margin: { left: M, right: M },
    });

    y = (pdf as any).lastAutoTable.finalY + 4;
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text(`Tabel 2: Ringkasan Kasus Fraud per Cabang ${monthLabel} ${year}`, PW / 2, y, { align: 'center' });
    y += 6;

    // FIX: Hapus pdf.text judul chart yang duplikat di sini.
    // Sebelumnya ada 2 judul: satu dari pdf.text dan satu dari dalam canvas drawVBarChart,
    // sehingga judul tampil double di PDF. Sekarang cukup dari dalam canvas saja.
    if (y < PH - 80) {
      const topBranches = branchFraudRows.slice(0, 10);
      const barImg = drawVBarChart(
        topBranches.map(([bn]) => bn.length > 10 ? bn.substring(0, 10) + '.' : bn),
        topBranches.map(([, v]) => v.total),
        `Nominal Fraud per Cabang — ${monthLabel} ${year}`,
        520, 200,
      );
      // FIX: Hapus baris pdf.text judul chart yang menyebabkan double title:
      // sebelumnya ada: setFont('bold', 9, ...) + pdf.text(`Nominal Fraud per Cabang...`)
      // Judul sudah ada di dalam canvas, jadi tidak perlu pdf.text lagi
      const chartH = Math.min(55, PH - y - 30);
      pdf.addImage(barImg, 'PNG', M + 5, y, CW - 10, chartH);
      y += chartH + 15;
    }
  } else {
    setFont('italic', 9, COLORS.textMed);
    pdf.text('Tidak ada data audit khusus pada bulan ini.', M, y);
    y += 10;
  }

  drawPageFooter(7);

  // ======================================================
  // PAGE 7 — 4.2 Rincian Pelaku
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  // FIX: Hapus baris caption "Gambar 3" yang sebelumnya ada di sini tapi
  // tidak sesuai posisi karena chart sudah di halaman sebelumnya
  y = drawSubTitle('4.2 Rincian Pelaku dan Nominal Fraud', y);

  const topBranchByFraud = branchFraudRows[0];
  const pelakuIntroText = `Berikut adalah daftar lengkap pelaku fraud beserta nominal kerugian yang teridentifikasi dalam pelaksanaan audit khusus bulan ${monthLabel} ${year}. Total teridentifikasi ${data.fraudDetails.length} pelaku${topBranchByFraud ? ` dengan nominal fraud terbesar tercatat pada cabang ${topBranchByFraud[0]} (Regional ${topBranchByFraud[1].region}) sebesar ${formatRp(topBranchByFraud[1].total)} yang melibatkan ${topBranchByFraud[1].pelaku.length} pelaku.` : '.'}`;

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar paragraf intro 4.2 rapi
  setFont('normal', 9, COLORS.textDark);
  const pelakuIntroLines = pdf.splitTextToSize(pelakuIntroText, CW);
  pdf.text(pelakuIntroLines, M, y);
  y += pelakuIntroLines.length * 4.5 + 4;

  if (data.fraudDetails.length > 0) {
    autoTable(pdf, {
      startY: y,
      head: [['No', 'Cabang', 'Regional', 'Nama Pelaku', 'Nominal Fraud (Rp)']],
      body: data.fraudDetails.map((f, i) => [
        String(i + 1),
        (f.branch_name || '-').toUpperCase(),
        f.region || '-',
        f.fraud_staff || '-',
        formatRp(f.fraud_amount),
      ]),
      foot: [['', '', '', 'TOTAL', formatRp(data.totalNominalFraud)]],
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      footStyles: {
        fillColor: COLORS.lightGray,
        textColor: COLORS.textDark,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 7.5, textColor: COLORS.textDark },
      alternateRowStyles: { fillColor: COLORS.rowAltRed },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 58 },
        4: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: COLORS.red },
      },
      margin: { left: M, right: M },
    });

    y = (pdf as any).lastAutoTable.finalY + 4;
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text(`Tabel 3: Rincian Pelaku Fraud ${monthLabel} ${year}`, PW / 2, y, { align: 'center' });
  }

  drawPageFooter(8);

  // ======================================================
  // PAGE 8 — 4.3 Status Pengembalian
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  y = drawSubTitle('4.3 Status Pengembalian (Recovery) Fraud', y);

  const recoveryIntroText = `Pengembalian fraud merupakan upaya pemulihan kerugian yang dilakukan oleh pelaku atau pihak terkait setelah temuan fraud dikonfirmasi. Berdasarkan data yang tercatat dalam sistem hingga tanggal pelaporan, status pengembalian fraud untuk periode ${monthLabel} ${year} adalah sebagai berikut:`;

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar teks intro recovery rapi
  setFont('normal', 9, COLORS.textDark);
  const recoveryIntroLines = pdf.splitTextToSize(recoveryIntroText, CW);
  pdf.text(recoveryIntroLines, M, y);
  y += recoveryIntroLines.length * 4.5 + 4;

  const recoveryPct = data.totalNominalFraud > 0
    ? ((data.totalPengembalianFraud / data.totalNominalFraud) * 100).toFixed(2)
    : '0.00';
  const outstanding = data.totalNominalFraud - data.totalPengembalianFraud;

  autoTable(pdf, {
    startY: y,
    head: [['Keterangan', 'Nominal (Rp)']],
    body: [
      ['Total Nominal Fraud Teridentifikasi', formatRp(data.totalNominalFraud)],
      ['Total Pengembalian yang Diterima', formatRp(data.totalPengembalianFraud)],
      ['Saldo Kerugian Belum Terpulihkan', formatRp(outstanding)],
      ['Persentase Recovery', `${recoveryPct}%`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.tableHeaderGray,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: COLORS.textDark },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 56, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === 2 && hookData.column.index === 1) {
        hookData.cell.styles.textColor = COLORS.red;
      }
      if (hookData.section === 'body' && hookData.row.index === 1 && hookData.column.index === 1) {
        hookData.cell.styles.textColor = COLORS.green;
      }
    },
  });

  y = (pdf as any).lastAutoTable.finalY + 4;
  setFont('italic', 7.5, COLORS.textLight);
  pdf.text(`Tabel 4: Status Pengembalian Fraud ${monthLabel} ${year}`, PW / 2, y, { align: 'center' });
  y += 7;

  const recoveryNote = data.totalPengembalianFraud === 0
    ? `Hingga tanggal laporan ini diterbitkan, belum ada pengembalian dana yang diterima dari seluruh pelaku fraud yang teridentifikasi pada periode ${monthLabel} ${year}. Proses penagihan dan pemulihan kerugian akan terus dipantau dan dilaporkan pada periode berikutnya. Divisi Audit Internal berkoordinasi dengan pihak terkait untuk memastikan proses recovery berjalan sesuai ketentuan yang berlaku.`
    : `Hingga tanggal laporan ini diterbitkan, total pengembalian yang diterima adalah ${formatRp(data.totalPengembalianFraud)} atau ${recoveryPct}% dari total kerugian. Saldo yang belum terpulihkan sebesar ${formatRp(outstanding)} masih dalam proses penagihan dan pemulihan. Divisi Audit Internal berkoordinasi dengan pihak terkait untuk memastikan proses recovery berjalan sesuai ketentuan yang berlaku.`;

  drawHighlightBox(recoveryNote, y, [236, 245, 252], COLORS.accentBlue, [40, 80, 130]);

  drawPageFooter(9);

  // ======================================================
  // PAGE 9 — ANALISIS REGIONAL
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  y = drawSectionTitle('5. ANALISIS REGIONAL', y);

  const regionalIntro = 'Analisis regional bertujuan untuk mengidentifikasi pola distribusi kasus fraud berdasarkan wilayah/regional secara kumulatif. Data ini penting untuk menentukan prioritas pengawasan dan alokasi sumber daya audit pada periode selanjutnya. Analisis mencakup seluruh data historis yang tersedia dalam sistem.';

  // FIX: setFont dipanggil SEBELUM splitTextToSize agar paragraf intro section 5 rapi
  setFont('normal', 9, COLORS.textDark);
  const regionalIntroLines = pdf.splitTextToSize(regionalIntro, CW);
  pdf.text(regionalIntroLines, M, y);
  y += regionalIntroLines.length * 4.5 + 5;

  const sortedRegions = Object.entries(data.regionFrauds).sort((a, b) => b[1].count - a[1].count);

  if (sortedRegions.length > 0) {
    const regionColors = sortedRegions.map((_, i) => {
      const blues = ['#11356B', '#1E4D8C', '#2E6DB0', '#3A8AC8', '#4BA3DB'];
      return blues[Math.min(i, blues.length - 1)];
    });

    const regBarImg = drawHBarChart(
      sortedRegions.map(([r]) => r),
      sortedRegions.map(([, v]) => v.count),
      regionColors,
      'Top Regional dengan Kasus Fraud Terbanyak (Kumulatif)',
      520, Math.max(160, sortedRegions.length * 22 + 50),
    );

    const chartH = Math.min(65, PH - y - 100);
    pdf.addImage(regBarImg, 'PNG', M + 5, y, CW - 10, chartH);
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text('Gambar 4: Top Regional dengan Kasus Fraud Terbanyak (Kumulatif)', PW / 2, y + chartH + 3, { align: 'center' });
    y += chartH + 8;

    autoTable(pdf, {
      startY: y,
      head: [['No', 'Regional', 'Jumlah Pelaku', 'Total Nominal Fraud (Rp)']],
      body: sortedRegions.map(([region, v], i) => [
        String(i + 1),
        region,
        String(v.count),
        formatRp(v.nominal),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.tableHeaderBlue,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: { fontSize: 8, textColor: COLORS.textDark },
      alternateRowStyles: { fillColor: COLORS.rowAltBlue },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 70, halign: 'right', fontStyle: 'bold', textColor: COLORS.red },
      },
      margin: { left: M, right: M },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.row.index === 0) {
          hookData.cell.styles.fillColor = [255, 230, 230];
        }
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 4;
    setFont('italic', 7.5, COLORS.textLight);
    pdf.text('Tabel 5: Ranking Regional Berdasarkan Kumulatif Kasus Fraud', PW / 2, y, { align: 'center' });
    y += 6;

    if (sortedRegions.length >= 2) {
      const r1 = sortedRegions[0];
      const r2 = sortedRegions[1];
      const regionalHighlight = `Regional ${r1[0]} menempati posisi pertama dengan kasus fraud terbanyak (${r1[1].count} pelaku, total ${formatRp(r1[1].nominal)}), diikuti oleh Regional ${r2[0]} (${r2[1].count} pelaku, total ${formatRp(r2[1].nominal)}). Kedua regional ini perlu mendapatkan perhatian dan pengawasan yang lebih intensif dalam periode audit selanjutnya.`;
      drawHighlightBox(regionalHighlight, y, [236, 245, 252], COLORS.accentBlue, [40, 80, 130]);
    }
  } else {
    setFont('italic', 9, COLORS.textMed);
    pdf.text('Tidak ada kasus fraud regional untuk dianalisis bulan ini.', M, y);
  }

  drawPageFooter(10);

  // ======================================================
  // PAGE 10+ — KESIMPULAN DAN REKOMENDASI
  // ======================================================
  pdf.addPage();
  drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
  y = 22;

  y = drawSectionTitle('6. KESIMPULAN DAN REKOMENDASI', y);
  y += 2;

  const renderNarrative = (text: string, startY: number): number => {
    let cy = startY;
    const lines = text.split('\n');

    lines.forEach(rawLine => {
      const line = rawLine.trimEnd();
      if (!line) return;

      const isH2 = /^6\.[0-9]/.test(line.trim());
      const isAlpha = /^[a-z]\.\s/.test(line.trim());
      const isNumPt = /^[0-9]+\.\s/.test(line.trim());
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const isBoldHeading = /^\*\*[^*]+\*\*$/.test(line.trim());

      if (cy > PH - 25) {
        pdf.addPage();
        drawPageHeader(HEADER_LEFT, HEADER_RIGHT);
        cy = 22;
      }

      if (isH2) {
        cy += 3;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(...COLORS.headerBlue);
        const cleanLine = line.replace(/\*\*/g, '').trim();
        pdf.text(cleanLine, M, cy);
        cy += 6;
        return;
      }

      if (isBoldHeading) {
        cy += 2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.textDark);
        const cleanLine = line.replace(/\*\*/g, '').trim();
        pdf.text(cleanLine, M, cy);
        cy += 5;
        return;
      }

      const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
      if (!cleanLine) { cy += 2; return; }

      if (isAlpha || isNumPt) {
        const match = cleanLine.match(/^([a-z]\.|[0-9]+\.)\s+(.+)/);
        if (match) {
          const marker = match[1];
          const content = match[2];

          if (cy > PH - 25) { pdf.addPage(); drawPageHeader(HEADER_LEFT, HEADER_RIGHT); cy = 22; }

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(...COLORS.textDark);
          pdf.text(marker, M + 3, cy);

          // FIX: setFont dipanggil sebelum splitTextToSize juga di dalam renderNarrative
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          const wrapW = CW - 15;
          const wrappedContent = pdf.splitTextToSize(content, wrapW);
          wrappedContent.forEach((wl: string, wi: number) => {
            if (cy > PH - 25) { pdf.addPage(); drawPageHeader(HEADER_LEFT, HEADER_RIGHT); cy = 22; }
            pdf.text(wl, M + 12, cy + wi * 4.8);
          });
          cy += wrappedContent.length * 4.8 + 2;
          return;
        }
      }

      if (isBullet) {
        const content = cleanLine.replace(/^[-*]\s+/, '');
        // FIX: setFont sebelum splitTextToSize di bullet point
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const wrappedContent = pdf.splitTextToSize(content, CW - 10);
        pdf.setTextColor(...COLORS.textDark);
        pdf.text('•', M + 3, cy);
        wrappedContent.forEach((wl: string, wi: number) => {
          if (cy > PH - 25) { pdf.addPage(); drawPageHeader(HEADER_LEFT, HEADER_RIGHT); cy = 22; }
          pdf.text(wl, M + 9, cy + wi * 4.8);
        });
        cy += wrappedContent.length * 4.8 + 1;
        return;
      }

      // FIX: setFont sebelum splitTextToSize di paragraph normal
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const wrappedLines = pdf.splitTextToSize(cleanLine, CW);
      pdf.setTextColor(...COLORS.textDark);
      wrappedLines.forEach((wl: string) => {
        if (cy > PH - 25) { pdf.addPage(); drawPageHeader(HEADER_LEFT, HEADER_RIGHT); cy = 22; }
        pdf.text(wl, M, cy);
        cy += 4.8;
      });
      cy += 1;
    });

    return cy;
  };

  y = renderNarrative(narrative, y);

  // Signature section
  y += 15;
  if (y > PH - 60) { pdf.addPage(); drawPageHeader(HEADER_LEFT, HEADER_RIGHT); y = 30; }

  const sigX = PW - M - 60;
  setFont('normal', 9, COLORS.textDark);
  pdf.text('Disiapkan oleh:', sigX, y);
  pdf.setDrawColor(...COLORS.textDark);
  pdf.setLineWidth(0.4);
  pdf.line(sigX, y + 20, sigX + 60, y + 20);
  setFont('normal', 8, COLORS.textMed);
  pdf.text('Manager Audit', sigX, y + 25);

  // ======================================================
  // Update nomor halaman di semua halaman
  // ======================================================
  const totalPages = pdf.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    pdf.setPage(pg);
    if (pg > 1) {
      const footerLineY = PH - 10;
      const pageLabel = `Halaman ${pg - 1} dari ${totalPages - 1}`;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(PW / 2 - 25, footerLineY + 1, 50, 6, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(pageLabel, PW / 2, footerLineY + 5, { align: 'center' });
    }
  }

  return pdf;
};

// ==================== COMPONENT ====================
export default function MonthlyReportGenerator() {
  const currentDate = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedModel, setSelectedModel] = useState(ALL_MODELS[0].value);
  const [step, setStep] = useState<ProgressStep>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const yearOptions = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);

  const handleGenerate = async () => {
    abortRef.current = new AbortController();
    setErrorMessage('');

    try {
      setStep('fetching');
      const data = await fetchReportData(selectedMonth, selectedYear);

      if (data.auditDetails.length === 0 && data.totalReguler === 0 && data.totalKhusus === 0) {
        setErrorMessage(`Tidak ada data audit untuk ${MONTH_OPTIONS[selectedMonth - 1].label} ${selectedYear}.`);
        setStep('error');
        return;
      }

      setStep('processing');
      await new Promise(r => setTimeout(r, 400));

      setStep('ai_narrative');
      const monthLabel = MONTH_OPTIONS[selectedMonth - 1].label;
      const narrative = await generateAINarrative(data, monthLabel, selectedYear, selectedModel, abortRef.current!.signal);

      setStep('generating_pdf');
      const pdf = await generatePDF(data, narrative, monthLabel, selectedYear);

      setStep('done');
      const fileName = `Laporan_Audit_${monthLabel}_${selectedYear}.pdf`;
      pdf.save(fileName);
      toast.success(`Laporan berhasil di-download: ${fileName}`);

      setTimeout(() => setStep('idle'), 3000);
    } catch (error: any) {
      if (error.name === 'AbortError') { setStep('idle'); return; }
      console.error('Report generation error:', error);
      setErrorMessage(error.message || 'Terjadi kesalahan saat generate laporan');
      setStep('error');
      toast.error('Gagal generate laporan');
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStep('idle');
    setErrorMessage('');
  };

  const isGenerating = !['idle', 'done', 'error'].includes(step);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 active:scale-[0.97]"
      >
        <FileText className="w-4 h-4" />
        Generate Laporan
      </button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!isGenerating) setIsOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Generate Laporan Bulanan
            </DialogTitle>
            <DialogDescription>
              Pilih periode bulan dan tahun untuk generate laporan audit bulanan secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Periode Laporan
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  disabled={isGenerating}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 bg-white"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 bg-white"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI Model untuk Narasi
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 bg-white"
              >
                <optgroup label="Google Gemini">
                  {FREE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="GPT via Puter.js">
                  {PUTER_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Kimi (Moonshot AI)">
                  {KIMI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Groq (Llama / Mixtral / Gemma)">
                  {GROQ_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
              {selectedModel.startsWith('puter:') && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <span>✓</span> Model ini gratis via Puter.js
                </p>
              )}
              {selectedModel.startsWith('kimi:') && (
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <span>✓</span> Kimi oleh Moonshot AI
                </p>
              )}
              {selectedModel.startsWith('groq:') && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <span>⚡</span> Groq — Super cepat, gratis
                </p>
              )}
            </div>

            {isGenerating && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${STEP_INFO[step].progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>{STEP_INFO[step].label}</span>
                </div>
                <div className="flex justify-center gap-1.5 py-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-indigo-400"
                      style={{ animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 animate-in fade-in duration-300">
                <Download className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Laporan berhasil di-download!</p>
                  <p className="text-xs text-green-600">
                    Laporan_Audit_{MONTH_OPTIONS[selectedMonth - 1].label}_{selectedYear}.pdf
                  </p>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 animate-in fade-in duration-300">
                <div className="mt-0.5 text-red-500 text-lg">⚠</div>
                <div>
                  <p className="text-sm font-medium text-red-800">Gagal generate laporan</p>
                  <p className="text-xs text-red-600">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {isGenerating ? (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setIsOpen(false); setStep('idle'); setErrorMessage(''); }}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97]"
                  >
                    <FileText className="w-4 h-4" />
                    Generate PDF
                  </button>
                </>
              )}
            </div>
          </div>

          <style>{`
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0); }
              40% { transform: scale(1); }
            }
          `}</style>
        </DialogContent>
      </Dialog>
    </>
  );
}