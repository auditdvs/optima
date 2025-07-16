import { format } from 'date-fns';
import idLocale from 'date-fns/locale/id';
import { Document, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, Packer, Paragraph } from "docx";
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Calendar, Download, FileJson, FileSpreadsheet, FileText, HandCoins, PlusCircle, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { supabase } from '../lib/supabaseClient';

interface AuditData {
  id: string;
  branch_name: string;
  audit_start_date: string;
  audit_end_date: string;
  audit_type: 'regular' | 'fraud';
  rating?: 'low' | 'medium' | 'high';
  fraud_amount?: number;
  fraud_staff?: string;
  work_paper_auditors?: { auditor_name: string }[];
}

interface FraudPayment {
  id: string;
  work_paper_id: string;
  payment_date: string;
  amount: number;
  created_at: string;
}

interface FraudCase extends AuditData {
  due_date?: string;
  fraud_amount_paid?: number;
  fraud_collection_fee?: 'YES' | 'NO';
  pic?: string;
  payments?: FraudPayment[];
}

interface Branch {
  name: string;
  region: string;
  // ...other fields...
}

const RiskDashboard = () => {
  const [fraudAudits, setFraudAudits] = useState<FraudCase[]>([]);
  const [fraudSearchTerm, setFraudSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedFraudCase, setSelectedFraudCase] = useState<FraudCase | null>(null);
  const [paymentInput, setPaymentInput] = useState({
    fraudStaffName: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    amountPaid: 0
  });
  const [downloadFormat, setDownloadFormat] = useState<'xlsx' | 'csv' | 'docx'>('xlsx');
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Tambahkan state baru untuk modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [fromSalary, setFromSalary] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Tambahkan state untuk filter dan sort berdasarkan nominal fraud
  const [fraudAmountSort, setFraudAmountSort] = useState<'asc' | null>(null);
  const [fraudAmountFilterType, setFraudAmountFilterType] = useState<'lt' | 'gt' | 'between' | null>(null);
  const [fraudAmountInput, setFraudAmountInput] = useState<number | ''>('');
  const [fraudAmountMin, setFraudAmountMin] = useState<number | ''>('');
  const [fraudAmountMax, setFraudAmountMax] = useState<number | ''>('');


  // Tambahkan state baru untuk filter lunas
  const [fraudPaidFilter, setFraudPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    fetchAudits();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('name, region');
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchAudits = async () => {
    try {
      setIsLoading(true);
      // Fetch fraud audits
      const { data: fraudData, error: fraudError } = await supabase
        .from('work_papers')
        .select(`
          *,
          work_paper_auditors(auditor_name)
        `)
        .eq('audit_type', 'fraud')
        .order('audit_start_date', { ascending: false });

      if (fraudError) throw fraudError;

      // Fetch fraud payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fraud_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch fraud case details
      const { data: fraudCaseData, error: fraudCaseError } = await supabase
        .from('fraud_cases')
        .select('*');

      if (fraudCaseError) throw fraudCaseError;

      // Process fraud audits with payments and case details
      const processedFraudAudits = fraudData?.map(audit => {
        const payments = paymentsData?.filter(payment => payment.work_paper_id === audit.id) || [];
        const caseDetails = fraudCaseData?.find(caseDetail => caseDetail.work_paper_id === audit.id);

        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

        let collectionFee = 'NO';
        if (caseDetails?.due_date) {
          const dueDate = new Date(caseDetails.due_date);
          const sixMonthsAfterDueDate = addMonths(dueDate, 6);

          if (payments.length === 0 && isAfter(new Date(), sixMonthsAfterDueDate)) {
            collectionFee = 'YES';
          } else if (payments.length > 0) {
            const lastPaymentDate = new Date(payments[0].payment_date);
            if (isAfter(lastPaymentDate, sixMonthsAfterDueDate)) {
              collectionFee = 'YES';
            }
          }
        }

        // VLOOKUP region dari branches (lebih toleran)
        const auditBranch = (audit.branch_name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const branchInfo = branches.find(
          b => (b.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === auditBranch
        );
        if (!branchInfo) {
          // Debug: tampilkan branch yang tidak ketemu region-nya
          console.warn('Branch not found in branches table:', audit.branch_name);
        }
        return {
          ...audit,
          payments,
          fraud_amount_paid: totalPaid,
          due_date: caseDetails?.due_date || null,
          fraud_collection_fee: collectionFee,
          pic: caseDetails?.pic || '',
          region: branchInfo?.region || '-' // tambahkan region
        };
      });

      setFraudAudits(processedFraudAudits || []);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const filterFraudAudits = (audits: FraudCase[]) => {
    if (!fraudSearchTerm) return audits;
    
    const searchLower = fraudSearchTerm.toLowerCase();
    return audits.filter(audit => 
      audit.branch_name.toLowerCase().includes(searchLower) ||
      (audit.fraud_staff && audit.fraud_staff.toLowerCase().includes(searchLower)) ||
      (audit.pic && audit.pic.toLowerCase().includes(searchLower))
    );
  };

  const filterByRegion = (audits: FraudCase[]) => {
    if (selectedRegion === 'ALL') return audits;
    return audits.filter(audit => (audit.region || '').toUpperCase() === selectedRegion);
  };

  // Filter & sort fraud audits by nominal
  const isFullyPaid = (amountPaid: number | undefined, fraudAmount: number | undefined) => {
    if (!amountPaid || !fraudAmount) return false;
    return amountPaid >= fraudAmount;
  };

  const filterAndSortFraudAudits = (audits: FraudCase[]) => {
    let filtered = [...audits];

    // Filter lunas/belum lunas
    if (fraudPaidFilter === 'paid') {
      filtered = filtered.filter(a => isFullyPaid(a.fraud_amount_paid, a.fraud_amount));
    }
    if (fraudPaidFilter === 'unpaid') {
      filtered = filtered.filter(a => !isFullyPaid(a.fraud_amount_paid, a.fraud_amount));
    }

    // Filter nominal
    if (fraudAmountFilterType === 'lt' && fraudAmountInput !== '') {
      filtered = filtered.filter(a => (a.fraud_amount || 0) < Number(fraudAmountInput));
    }
    if (fraudAmountFilterType === 'gt' && fraudAmountInput !== '') {
      filtered = filtered.filter(a => (a.fraud_amount || 0) > Number(fraudAmountInput));
    }
    if (fraudAmountFilterType === 'between' && fraudAmountMin !== '' && fraudAmountMax !== '') {
      filtered = filtered.filter(a => (a.fraud_amount || 0) >= Number(fraudAmountMin) && (a.fraud_amount || 0) <= Number(fraudAmountMax));
    }
    if (fraudAmountSort === 'asc') {
      filtered = filtered.sort((a, b) => (a.fraud_amount || 0) - (b.fraud_amount || 0));
    }
    return filtered;
  };

  const filteredFraudAudits = filterAndSortFraudAudits(filterByRegion(filterFraudAudits(fraudAudits)));

  const handleAddPayment = async () => {
    if (!selectedFraudCase) return;
    
    try {
      // Add payment to database
      const { data, error } = await supabase
        .from('fraud_payments')
        .insert({
          work_paper_id: selectedFraudCase.id,
          payment_date: paymentInput.paymentDate,
          amount: paymentInput.amountPaid
        })
        .select();

      if (error) throw error;

      // Update local state
      const updatedFraudAudits = fraudAudits.map(audit => {
        if (audit.id === selectedFraudCase.id) {
          const newPayment = {
            id: data[0].id,
            work_paper_id: selectedFraudCase.id,
            payment_date: paymentInput.paymentDate,
            amount: paymentInput.amountPaid,
            created_at: new Date().toISOString()
          };
          
          const updatedPayments = [...(audit.payments || []), newPayment];
          const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
          
          // Recalculate collection fee
          let collectionFee = 'NO';
          if (audit.due_date) {
            const dueDate = new Date(audit.due_date);
            const sixMonthsAfterDueDate = addMonths(dueDate, 6);
            const lastPaymentDate = new Date(paymentInput.paymentDate);
            
            if (isAfter(lastPaymentDate, sixMonthsAfterDueDate)) {
              collectionFee = 'YES';
            }
          }
          
          return {
            ...audit,
            payments: updatedPayments,
            fraud_amount_paid: totalPaid,
            fraud_collection_fee: collectionFee
          };
        }
        return audit;
      });

      setFraudAudits(updatedFraudAudits);
      
      // Update collection fee in database
      const updatedAudit = updatedFraudAudits.find(a => a.id === selectedFraudCase.id);
      if (updatedAudit) {
        await updateCollectionFee(updatedAudit.id, updatedAudit.fraud_collection_fee || 'NO');
      }
      
      // Reset form
      setPaymentInput({
        fraudStaffName: '',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        amountPaid: 0
      });
      
      // Close sidebar
      setShowSidebar(false);
      setSelectedFraudCase(null);
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment. Please try again.');
    }
  };

  const updateCollectionFee = async (id: string, value: string) => {
    try {
      // Check if fraud case exists
      const { data: existingCase } = await supabase
        .from('fraud_cases')
        .select('*')
        .eq('work_paper_id', id)
        .maybeSingle();

      if (existingCase) {
        // Update existing case
        await supabase
          .from('fraud_cases')
          .update({ fraud_collection_fee: value })
          .eq('work_paper_id', id);
      } else {
        // Create new case
        await supabase
          .from('fraud_cases')
          .insert({
            work_paper_id: id,
            fraud_collection_fee: value
          });
      }
    } catch (error) {
      console.error('Error updating collection fee:', error);
    }
  };

  const handleUpdateFraudCase = async (id: string, field: string, value: any) => {
    try {
      // Check if fraud case exists
      const { data: existingCase } = await supabase
        .from('fraud_cases')
        .select('*')
        .eq('work_paper_id', id)
        .single();

      if (existingCase) {
        // Update existing case
        await supabase
          .from('fraud_cases')
          .update({ [field]: value })
          .eq('work_paper_id', id);
      } else {
        // Create new case
        await supabase
          .from('fraud_cases')
          .insert({
            work_paper_id: id,
            [field]: value
          });
      }

      // Update local state
      const updatedFraudAudits = fraudAudits.map(audit => {
        if (audit.id === id) {
          const updatedAudit = { ...audit, [field]: value };
          
          // If updating due date, recalculate collection fee
          if (field === 'due_date' && value) {
            const dueDate = new Date(value);
            const sixMonthsAfterDueDate = addMonths(dueDate, 6);
            
            if (audit.payments && audit.payments.length > 0) {
              const lastPaymentDate = new Date(audit.payments[0].payment_date);
              updatedAudit.fraud_collection_fee = isAfter(lastPaymentDate, sixMonthsAfterDueDate) ? 'YES' : 'NO';
            } else {
              updatedAudit.fraud_collection_fee = isAfter(new Date(), sixMonthsAfterDueDate) ? 'YES' : 'NO';
            }
            
            // Update collection fee in database
            updateCollectionFee(id, updatedAudit.fraud_collection_fee);
          }
          
          return updatedAudit;
        }
        return audit;
      });

      setFraudAudits(updatedFraudAudits);
    } catch (error) {
      console.error('Error updating fraud case:', error);
      alert('Failed to update fraud case. Please try again.');
    }
  };

  const isDueDatePassed = (dueDate: string | undefined, amountPaid: number | undefined, fraudAmount: number | undefined) => {
    if (!dueDate) return false;
    if (!fraudAmount) return false;
    
    // Check if full amount is paid
    if (amountPaid && amountPaid >= fraudAmount) return false;
    
    // Check if due date is passed
    return isAfter(new Date(), new Date(dueDate));
  };

  const downloadReport = async (fileFormat: 'xlsx' | 'csv' | 'docx') => {
    const data = fraudAudits.map(audit => ({
      'Branch Name': audit.branch_name,
      'Region': audit.region || '-',
      'Start Date': formatDate(audit.audit_start_date),
      'End Date': formatDate(audit.audit_end_date),
      'Fraud Staff': audit.fraud_staff || '-',
      'Fraud Amount': audit.fraud_amount ? formatCurrency(audit.fraud_amount) : '-',
      'Amount Paid': audit.fraud_amount_paid ? formatCurrency(audit.fraud_amount_paid) : '-',
      'Due Date': formatDate(audit.due_date || ''),
      'Collection Fee': audit.fraud_collection_fee || '-',
      'PIC': audit.pic || '-',
      'Status': isDueDatePassed(audit.due_date, audit.fraud_amount_paid, audit.fraud_amount) ? 'Overdue' : 'On Track'
    }));

    if (fileFormat === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Fraud Cases');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, 'fraud_cases_report.xlsx');
    } else if (fileFormat === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const dataBlob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8' });
      saveAs(dataBlob, 'fraud_cases_report.csv');
    } else if (fileFormat === 'pdf') {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Fraud Cases Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'dd MMMM, yyyy', { locale: idLocale })}`, 14, 22);
      
      // Create table
      (doc as any).autoTable({
        startY: 30,
        head: [['Branch', 'Fraud Staff', 'Fraud Amount', 'Amount Paid', 'Due Date', 'Status']],
        body: data.map(item => [
          item['Branch Name'],
          item['Fraud Staff'],
          item['Fraud Amount'],
          item['Amount Paid'],
          item['Due Date'],
          item['Status']
        ]),
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 255] }
      });
      
      doc.save('fraud_cases_report.pdf');
    } else if (fileFormat === 'docx') {
      // Helper untuk bulan terakhir fraud > 0
      const trendData = getFraudChartData(fraudAudits);
      const lastMonthIdx = trendData.map(d => d.fraud).lastIndexOf(
        trendData.slice().reverse().find(d => d.fraud > 0)?.fraud ?? 0
      );
      const trendRows = trendData
        .slice(0, lastMonthIdx + 1)
        .map(row =>
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph(row.month)] }),
              new DocxTableCell({ children: [new Paragraph(formatCurrency(row.fraud))] }),
            ],
          })
        );

      // Overview Table
      const overviewTable = new DocxTable({
        rows: [
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph("Total Fraud")] }),
              new DocxTableCell({ children: [new Paragraph(formatCurrency(totalFraud))] }),
            ],
          }),
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph("Fraud Recovery")] }),
              new DocxTableCell({ children: [new Paragraph(formatCurrency(fraudRecovery))] }),
            ],
          }),
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph("Outstanding Fraud")] }),
              new DocxTableCell({ children: [new Paragraph(formatCurrency(outstandingFraud))] }),
            ],
          }),
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph("Total Staff Fraud")] }),
              new DocxTableCell({ children: [new Paragraph(totalStaffFraud.toString())] }),
            ],
          }),
        ],
      });

      // Table helper
      const makeTable = (items: any[], columns: string[]) =>
        new DocxTable({
          rows: [
            new DocxTableRow({
              children: columns.map(col => new DocxTableCell({ children: [new Paragraph(col)] })),
            }),
            ...items.map(row =>
              new DocxTableRow({
                children: columns.map(col =>
                  new DocxTableCell({ children: [new Paragraph(row[col] ?? '-')] })
                ),
              })
            ),
          ],
        });

      // Data untuk tabel fraud audit cases
      const columns = [
        'Branch Name', 'Region', 'Start Date', 'End Date', 'Fraud Staff',
        'Fraud Amount', 'Amount Paid', 'Due Date', 'Collection Fee', 'PIC', 'Status'
      ];
      const dataBelumLunas = data.filter(d => {
        // Hilangkan karakter non-digit sebelum parse
        const fraudAmount = Number(String(d['Fraud Amount']).replace(/[^\d]/g, ''));
        const amountPaid = Number(String(d['Amount Paid']).replace(/[^\d]/g, ''));
        return amountPaid < fraudAmount;
      });
      const dataSudahLunas = data.filter(d => {
        const fraudAmount = Number(String(d['Fraud Amount']).replace(/[^\d]/g, ''));
        const amountPaid = Number(String(d['Amount Paid']).replace(/[^\d]/g, ''));
        return fraudAmount > 0 && amountPaid === fraudAmount;
      });

      // Footer tanggal
      const footerDate = format(new Date(), 'dd MMMM, yyyy', { locale: idLocale });

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: "Fraud Cases Report",
                heading: "Heading1",
                alignment: "center",
              }),
              new Paragraph({
                text: `Generated on: ${format(new Date(), 'dd MMMM, yyyy', { locale: idLocale })}`,
                alignment: "center",
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Overview:", heading: "Heading2" }),
              overviewTable,
              new Paragraph({ text: "" }),
              new Paragraph({ text: `Fraud Trend from January to ${trendData[lastMonthIdx]?.month || 'December'}`, heading: "Heading2" }),
              new DocxTable({
                rows: [
                  new DocxTableRow({
                    children: [
                      new DocxTableCell({ children: [new Paragraph("Month")] }),
                      new DocxTableCell({ children: [new Paragraph("Total Fraud")] }),
                    ],
                  }),
                  ...trendRows,
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Fraud audit cases (Belum Lunas):", heading: "Heading2" }),
              makeTable(dataBelumLunas, columns),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Fraud audit cases (Sudah Lunas):", heading: "Heading2" }),
              makeTable(dataSudahLunas, columns),
              new Paragraph({ text: "" }),
              new Paragraph({
                text: `Risk Management, ${footerDate}`,
                alignment: "right",
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, "fraud_cases_report.docx");
    }
    
    setShowDownloadOptions(false);
  };

  // Chart config
  const chartConfig = {
    fraud: {
      label: "Fraud",
      color: "#ef4444", // merah tailwind (red-500)
    },
  } satisfies ChartConfig;

  // Helper: Generate chart data from fraudAudits
  const getFraudChartData = (audits: FraudCase[]) => {
    // Buat array bulan Jan - Des
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    // Inisialisasi data
    const data = months.map((month, idx) => ({
      month,
      fraud: 0,
    }));
    audits.forEach(audit => {
      if (audit.audit_start_date && audit.fraud_amount) {
        const date = new Date(audit.audit_start_date);
        const monthIdx = date.getMonth();
        data[monthIdx].fraud += audit.fraud_amount;
      }
    });
    return data;
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  );

  const [showPicModal, setShowPicModal] = useState(false);
  const [picInput, setPicInput] = useState('');
  const [selectedPicCase, setSelectedPicCase] = useState<FraudCase | null>(null);

  // Helper untuk summary
  const totalFraud = fraudAudits.reduce((sum, audit) => sum + (audit.fraud_amount || 0), 0);
  const fraudRecovery = fraudAudits.reduce((sum, audit) => sum + (audit.fraud_amount_paid || 0), 0);
  const outstandingFraud = totalFraud - fraudRecovery;
  const uniqueStaff = Array.from(new Set(fraudAudits.map(audit => (audit.fraud_staff || '').trim()).filter(Boolean)));
  const totalStaffFraud = uniqueStaff.length;

  return (
    <div className="space-y-6 p-4 relative">
      {/* Header & Download Button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Risk Dashboard</h1>
        <div className="relative">
          <button 
            onClick={() => setShowDownloadOptions(!showDownloadOptions)}
            className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
          {showDownloadOptions && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
              <div className="p-2">
                <button 
                  onClick={() => { setDownloadFormat('xlsx'); downloadReport('xlsx'); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </button>
                <button 
                  onClick={() => { setDownloadFormat('csv'); downloadReport('csv'); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  CSV (.csv)
                </button>
                <button 
                  onClick={() => { setDownloadFormat('docx'); downloadReport('docx'); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Word (.docx)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fraud Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Fraud</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalFraud)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fraud Recovery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(fraudRecovery)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding Fraud</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(outstandingFraud)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Staff Fraud</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{totalStaffFraud}</div>
          </CardContent>
        </Card>
      </div>


      {/* Fraud Trend Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fraud Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <BarChart
              accessibilityLayer
              data={getFraudChartData(fraudAudits)}
              height={250}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="fraud" fill="#ef4444" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none mx-2">
            Showing total fraud amount per month (Jan - Dec)
          </div>
        </CardFooter>
      </Card>


      {/* REGION FILTER RADIO BUTTONS */}
      <div className="flex gap-2 mb-4">
        {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S'].map(region => (
          <button
            key={region}
            type="button"
            onClick={() => setSelectedRegion(region)}
            className={`px-3 py-1 rounded-md border text-sm font-medium transition-colors
              ${selectedRegion === region
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50'}`}
          >
            {region}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedRegion('ALL')}
          className={`px-3 py-1 rounded-md border text-sm font-medium transition-colors
            ${selectedRegion === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50'}`}
        >
          All
        </button>
      </div>

      {/* Special Audits Table */}
      <Card>
        <CardContent className="p-3 pt-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Fraud Audits Cases</h3>
            <div className="flex gap-4 items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search branch or fraud staff..."
                  value={fraudSearchTerm}
                  onChange={(e) => setFraudSearchTerm(e.target.value)}
                  className={`pl-9 pr-4 py-2 border rounded-md w-64 h-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {/* Fraud Amount Filter */}
              <div className="flex gap-2 items-center">
                <select
                  value={fraudAmountSort || ''}
                  onChange={e => setFraudAmountSort(e.target.value === 'asc' ? 'asc' : null)}
                  className="border rounded px-2 py-1 text-sm h-10"
                >
                  <option value="">Sort</option>
                  <option value="asc">Terkecil &gt; Terbesar</option>
                </select>
                <select
                  value={fraudAmountFilterType || ''}
                  onChange={e => setFraudAmountFilterType(e.target.value as any)}
                  className="border rounded px-2 py-1 text-sm h-10"
                >
                  <option value="">Filter Nominal</option>
                  <option value="lt">Kurang dari</option>
                  <option value="gt">Lebih dari</option>
                  <option value="between">Di antara</option>
                </select>
                {fraudAmountFilterType === 'lt' || fraudAmountFilterType === 'gt' ? (
                  <input
                    type="number"
                    placeholder="Nominal"
                    value={fraudAmountInput}
                    onChange={e => setFraudAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm w-24 h-10"
                    min={0}
                  />
                ) : null}
                {fraudAmountFilterType === 'between' ? (
                  <>
                    <input
                      type="number"
                      placeholder="Min"
                      value={fraudAmountMin}
                      onChange={e => setFraudAmountMin(e.target.value === '' ? '' : Number(e.target.value))}
                      className="border rounded px-2 py-1 text-sm w-20 h-10"
                      min={0}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={fraudAmountMax}
                      onChange={e => setFraudAmountMax(e.target.value === '' ? '' : Number(e.target.value))}
                      className="border rounded px-2 py-1 text-sm w-20 h-10"
                      min={0}
                    />
                  </>
                ) : null}
                {(fraudAmountFilterType || fraudAmountSort) && (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 ml-2"
                    onClick={() => {
                      setFraudAmountSort(null);
                      setFraudAmountFilterType(null);
                      setFraudAmountInput('');
                      setFraudAmountMin('');
                      setFraudAmountMax('');
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
              {/* Filter lunas */}
              <select
                value={fraudPaidFilter}
                onChange={e => setFraudPaidFilter(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm h-10"
              >
                <option value="all">Semua Status</option>
                <option value="paid">Sudah Lunas</option>
                <option value="unpaid">Belum Lunas</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="overflow-x-auto w-full">
              <div className="h-full overflow-y-auto">
                <Table>
<TableHeader>
  <TableRow>
    <TableHead>No.</TableHead>
    <TableHead>Region</TableHead> {/* Tambahkan kolom Region */}
    <TableHead>Branch Name</TableHead>
    <TableHead>Audit Date</TableHead>
    <TableHead>Fraud Staff</TableHead>
    <TableHead>Fraud Amount</TableHead>
    <TableHead>Amount Paid</TableHead>
    <TableHead>Due Date</TableHead>
    <TableHead>Collection Fee</TableHead>
    <TableHead>PIC</TableHead>
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {filteredFraudAudits.map((audit, idx) => (
    <TableRow key={audit.id} className={
      isDueDatePassed(audit.due_date, audit.fraud_amount_paid, audit.fraud_amount) 
        ? 'bg-red-50' 
        : 'hover:bg-gray-50'
    }>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{audit.region || '-'}</TableCell> {/* Tampilkan region */}
      <TableCell className={isFullyPaid(audit.fraud_amount_paid, audit.fraud_amount) ? 'bg-green-100' : ''}>
        {audit.branch_name}
      </TableCell>
      <TableCell>
        {`${format(new Date(audit.audit_start_date), 'dd/MM/yy')} - ${format(new Date(audit.audit_end_date), 'dd/MM/yy')}`}
      </TableCell>
      <TableCell>{audit.fraud_staff}</TableCell>
      <TableCell>{formatCurrency(audit.fraud_amount || 0)}</TableCell>
      <TableCell>{formatCurrency(audit.fraud_amount_paid || 0)}</TableCell>
      <TableCell>
        <input
          type="date"
          value={audit.due_date || ''}
          onChange={(e) => handleUpdateFraudCase(audit.id, 'due_date', e.target.value)}
          className="border rounded px-2 py-1 text-sm w-32"
        />
      </TableCell>
      <TableCell>
        <span className="px-2 py-1 rounded text-sm">
          {audit.fraud_collection_fee || 'NO'}
        </span>
      </TableCell>
<TableCell>
  {isFullyPaid(audit.fraud_amount_paid, audit.fraud_amount) ? (
    <span className="text-gray-400 italic">N/A</span>
  ) : (
    audit.pic || '<Input PIC>'
  )}
</TableCell>
<TableCell>
  <div className="flex items-center gap-2 justify-center">
    <button
      onClick={() => {
        setSelectedFraudCase(audit);
        setPaymentInput({
          ...paymentInput,
          fraudStaffName: audit.fraud_staff || ''
        });
        setFromSalary(false);
        setShowPaymentModal(true);
      }}
      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center"
      title="Add Payment"
    >
      <PlusCircle className="w-5 h-5" />
    </button>
    {!isFullyPaid(audit.fraud_amount_paid, audit.fraud_amount) && (
      <button
        onClick={() => {
          setSelectedPicCase(audit);
          setPicInput(audit.pic || '');
          setShowPicModal(true);
        }}
        className="text-green-600 hover:text-red-600 text-sm font-medium flex items-center justify-center"
        title="x"
      >
        <User className="w-5 h-5" />
      </button>
    )}
  </div>
</TableCell>
    </TableRow>
  ))}
</TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && selectedFraudCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4">Add Payment</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Case Details</h3>
              <p className="text-sm text-gray-600">Branch: <span className="font-medium">{selectedFraudCase.branch_name}</span></p>
              <p className="text-sm text-gray-600">Fraud Staff: <span className="font-medium">{selectedFraudCase.fraud_staff}</span></p>
              <p className="text-sm text-gray-600">Total Amount: <span className="font-medium">{formatCurrency(selectedFraudCase.fraud_amount || 0)}</span></p>
              <p className="text-sm text-gray-600">Amount Paid: <span className="font-medium">{formatCurrency(selectedFraudCase.fraud_amount_paid || 0)}</span></p>
              <p className="text-sm text-gray-600">Remaining: <span className="font-medium">{formatCurrency((selectedFraudCase.fraud_amount || 0) - (selectedFraudCase.fraud_amount_paid || 0))}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="inline-block w-4 h-4 mr-1" />
                  Fraud Staff Name
                </label>
                <input
                  type="text"
                  value={paymentInput.fraudStaffName}
                  onChange={(e) => setPaymentInput({...paymentInput, fraudStaffName: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Staff name"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentInput.paymentDate}
                  onChange={(e) => setPaymentInput({...paymentInput, paymentDate: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={fromSalary}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <HandCoins className="inline-block w-4 h-4 mr-1" />
                  Amount Paid
                </label>
                <input
                  type="number"
                  value={paymentInput.amountPaid}
                  onChange={(e) => setPaymentInput({...paymentInput, amountPaid: parseFloat(e.target.value)})}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                  min="0"
                  step="1000"
                  disabled={fromSalary}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fromSalary"
                  checked={fromSalary}
                  onChange={(e) => {
                    setFromSalary(e.target.checked);
                    if (e.target.checked && selectedFraudCase) {
                      setPaymentInput({
                        ...paymentInput,
                        amountPaid: selectedFraudCase.fraud_amount || 0,
                        paymentDate: format(new Date(), 'yyyy-MM-dd')
                      });
                    }
                  }}
                />
                <label htmlFor="fromSalary" className="text-sm text-gray-700 select-none">
                  From Salary (Lunas Otomatis)
                </label>
              </div>
            </div>
            <div className="pt-4">
              <button
                onClick={async () => {
                  await handleAddPayment();
                  setShowPaymentModal(false);
                }}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                disabled={paymentInput.amountPaid <= 0}
              >
                <PlusCircle className="inline-block w-5 h-5 mr-1" /> Add Payment
              </button>
            </div>
            {/* Payment History */}
            {selectedFraudCase.payments && selectedFraudCase.payments.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-gray-700 mb-3">Payment History</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedFraudCase.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PIC Modal */}
      {showPicModal && selectedPicCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowPicModal(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4">Edit PIC Name</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIC Name
              </label>
              <input
                type="text"
                value={picInput}
                onChange={e => setPicInput(e.target.value)}
                maxLength={20}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="PIC name"
              />
            </div>
            <div className="pt-2">
              <button
                onClick={async () => {
                  await handleUpdateFraudCase(selectedPicCase.id, 'pic', picInput);
                  setShowPicModal(false);
                }}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                disabled={picInput.trim() === ''}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskDashboard;