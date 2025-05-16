import { addMonths, format, isAfter } from 'date-fns';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Calendar, Download, FileJson, FileSpreadsheet, FileText, HandCoins, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '../components/ui/card';
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
  const [downloadFormat, setDownloadFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAudits();
  }, []);

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
        
        return {
          ...audit,
          payments,
          fraud_amount_paid: totalPaid,
          due_date: caseDetails?.due_date || null,
          fraud_collection_fee: collectionFee,
          pic: caseDetails?.pic || ''
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

  const isFullyPaid = (amountPaid: number | undefined, fraudAmount: number | undefined) => {
    if (!amountPaid || !fraudAmount) return false;
    return amountPaid >= fraudAmount;
  };

  const downloadReport = () => {
    const data = fraudAudits.map(audit => ({
      'Branch Name': audit.branch_name,
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

    if (downloadFormat === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Fraud Cases');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, 'fraud_cases_report.xlsx');
    } else if (downloadFormat === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const dataBlob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8' });
      saveAs(dataBlob, 'fraud_cases_report.csv');
    } else if (downloadFormat === 'pdf') {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Fraud Cases Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 22);
      
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
    }
    
    setShowDownloadOptions(false);
  };

  const filteredFraudAudits = filterFraudAudits(fraudAudits);

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

  return (
    <div className="space-y-6 p-4 relative">
      <div className="flex justify-between items-center">
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
                  onClick={() => { setDownloadFormat('xlsx'); downloadReport(); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </button>
                <button 
                  onClick={() => { setDownloadFormat('pdf'); downloadReport(); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (.pdf)
                </button>
                <button 
                  onClick={() => { setDownloadFormat('csv'); downloadReport(); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  CSV (.csv)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Special Audits Table */}
      <Card>
        <CardContent className="p-3 pt-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Fraud Audits Cases</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search branch or fraud staff..."
                value={fraudSearchTerm}
                onChange={(e) => setFraudSearchTerm(e.target.value)}
                className={`pl-9 pr-4 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              />
            </div>
          </div>
          
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="overflow-x-auto w-full">
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
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
                    {filteredFraudAudits.map((audit) => (
                      <TableRow key={audit.id} className={
                        isDueDatePassed(audit.due_date, audit.fraud_amount_paid, audit.fraud_amount) 
                          ? 'bg-red-50' 
                          : 'hover:bg-gray-50'
                      }>
                        <TableCell className={isFullyPaid(audit.fraud_amount_paid, audit.fraud_amount) ? 'bg-green-100' : ''}>
                          {audit.branch_name}
                        </TableCell>
                        <TableCell>{formatDate(audit.audit_start_date)}</TableCell>
                        <TableCell>{formatDate(audit.audit_end_date)}</TableCell>
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
                          <input
                            type="text"
                            value={audit.pic || ''}
                            onChange={(e) => {
                              if (e.target.value.length <= 20) {
                                handleUpdateFraudCase(audit.id, 'pic', e.target.value);
                              }
                            }}
                            maxLength={20}
                            className="border rounded px-2 py-1 text-sm w-32"
                            placeholder="PIC name"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => {
                              setSelectedFraudCase(audit);
                              setPaymentInput({
                                ...paymentInput,
                                fraudStaffName: audit.fraud_staff || ''
                              });
                              setShowSidebar(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            Add Payment
                          </button>
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

      {/* Risk Input Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add Payment</h2>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              {selectedFraudCase && (
                <div className="space-y-6">
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
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleAddPayment}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                      disabled={paymentInput.amountPaid <= 0}
                    >
                      Add Payment
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskDashboard;