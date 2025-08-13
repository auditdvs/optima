import { format, parseISO } from "date-fns";
import { ArrowUpDown, Clock, Pencil, Search } from "lucide-react";
import { useEffect, useState } from 'react';
import { CartesianGrid, Dot, Line, LineChart } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "../ui/chart";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface FraudCase {
  id: string;
  branch_name: string;
  region: string; // Added region field
  fraud_amount: number;
  fraud_staff: string;
  fraud_payments_audits?: {
    id: string;
    hkp_amount: number;
    payment_date: string;
    notes?: string;
    from_salary?: boolean;
  }[];
}

interface FraudPayment {
  id: string;
  work_paper_id: string;
  hkp_amount: number;
  payment_date: string;
  from_salary?: boolean;
  notes?: string;
}

// Add this interface with your other interfaces
interface FraudDetailByRegion {
  region: string;
  totalFraudAmount: number;
  totalRecoveryAmount: number; // Add this line
  totalRegularAudit: number;
  totalSpecialAudit: number;
  totalFraudStaff: number;
}

type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortOrder;
}

const FraudData = () => {
  // State variables
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [selectedFraud, setSelectedFraud] = useState<FraudCase | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [fraudSearchTerm, setFraudSearchTerm] = useState('');
  const [fraudSortConfig, setFraudSortConfig] = useState<SortConfig>({ key: 'branch_name', direction: 'asc' });
  const [paymentHistory, setPaymentHistory] = useState<FraudPayment[]>([]);
  const [hkpAmountInput, setHkpAmountInput] = useState<number>(0);
  const [fromSalaryChecked, setFromSalaryChecked] = useState<boolean>(false);
  const [fraudDetailsByRegion, setFraudDetailsByRegion] = useState<FraudDetailByRegion[]>([]);
  const [activeFraudTab, setActiveFraudTab] = useState<'data' | 'region'>('data');
  const [fraudTrendData, setFraudTrendData] = useState<{ month: string; total: number }[]>([]);

  // Fetch functions
  const fetchFraudTrendData = async () => {
    // Ambil data work_papers fraud
    const { data, error } = await supabase
      .from('work_papers')
      .select('audit_end_date, fraud_amount')
      .eq('audit_type', 'fraud');
    if (error) return;

    // Inisialisasi bulan Jan-Des
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fraudByMonth: Record<string, number> = {};
    months.forEach(m => (fraudByMonth[m] = 0));

    data?.forEach(row => {
      if (row.audit_end_date) {
        const d = new Date(row.audit_end_date);
        const m = months[d.getMonth()];
        fraudByMonth[m] += row.fraud_amount || 0;
      }
    });

    setFraudTrendData(months.map(m => ({ month: m, total: fraudByMonth[m] })));
  };

  const fetchFraudCases = async () => {
    try {
      const { data: fraudData, error: fraudError } = await supabase
        .from('work_papers')
        .select(`
          id,
          branch_name,
          fraud_amount,
          fraud_staff,
          fraud_payments_audits (
            id,
            hkp_amount,
            payment_date,
            notes,
            from_salary
          )
        `)
        .eq('audit_type', 'fraud');

      if (fraudError) throw fraudError;

      // Get all branches to map regions
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('name, region');
      
      if (branchesError) throw branchesError;
      
      // Create a lookup map for regions by branch name
      const branchRegionMap: Record<string, string> = {};
      branchesData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });

      // Add region to each fraud case
      const fraudCasesWithRegion = fraudData?.map(fraud => ({
        ...fraud,
        region: branchRegionMap[fraud.branch_name] || 'Unknown'
      })) || [];

      setFraudCases(fraudCasesWithRegion);
    } catch (error) {
      console.error('Error fetching fraud cases:', error);
    }
  };

  const fetchPaymentHistory = async (fraudId: string) => {
    try {
      const { data, error } = await supabase
        .from('fraud_payments_audits')
        .select('*')
        .eq('work_paper_id', fraudId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      setPaymentHistory(data || []);
      setIsHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  // Add this function with your other fetch functions (after fetchPaymentHistory)
  const fetchFraudDetailsByRegion = async () => {
    try {
      // 1. Get all branches with their regions
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('name, region');
      
      if (branchesError) throw branchesError;
      
      // Create a lookup map for regions by branch name
      const branchRegionMap: Record<string, string> = {};
      branchesData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });
      
      // Get unique regions
      const regions = [...new Set(branchesData?.map(branch => branch.region))];
      
      // 2. Fetch work_papers data with fraud_payments_audits information
      const { data: workPapersData, error: workPapersError } = await supabase
        .from('work_papers')
        .select(`
          branch_name, 
          fraud_amount, 
          audit_type, 
          fraud_staff,
          fraud_payments_audits (
            hkp_amount,
            from_salary
          )
        `);
      
      if (workPapersError) throw workPapersError;
      
      // 3. Fetch regular audits
      const { data: regularAuditData, error: regularAuditError } = await supabase
        .from('audit_regular')
        .select('branch_name');
      
      if (regularAuditError) throw regularAuditError;
      
      // Process data by region
      const fraudDetailsByRegion = regions.map(region => {
        // Filter work papers for this region with audit_type='fraud'
        const regionFraudWorkPapers = workPapersData?.filter(wp => 
          branchRegionMap[wp.branch_name] === region && 
          wp.audit_type === 'fraud'
        ) || [];
        
        // Calculate total fraud amount for this region
        const fraudAmount = regionFraudWorkPapers
          .reduce((sum, wp) => sum + (wp.fraud_amount || 0), 0);
        
        // Calculate total recovery amount for this region
        const recoveryAmount = regionFraudWorkPapers
          .reduce((sum, wp) => {
            const hkpAmount = wp.fraud_payments_audits?.[0]?.hkp_amount || 0;
            // If payment is from salary, count the full fraud amount as recovered
            const fromSalary = wp.fraud_payments_audits?.[0]?.from_salary || false;
            return sum + (fromSalary ? wp.fraud_amount || 0 : hkpAmount);
          }, 0) || 0;
        
        // Count regular audits for this region
        const regularAuditCount = regularAuditData
          ?.filter(audit => branchRegionMap[audit.branch_name] === region)
          .length || 0;
        
        // Count special audits for this region - Using work_papers where audit_type='fraud'
        const specialAuditCount = regionFraudWorkPapers.length;
        
        // Count fraud staff cases for this region
        const fraudStaffSet = new Set();
        regionFraudWorkPapers
          .filter(wp => wp.fraud_staff && wp.fraud_staff.trim() !== '')
          .forEach(wp => {
            // Count unique fraud staff names
            fraudStaffSet.add(wp.fraud_staff.trim().toLowerCase());
          });
        
        return {
          region,
          totalFraudAmount: fraudAmount,
          totalRecoveryAmount: recoveryAmount, // Add recovery amount
          totalRegularAudit: regularAuditCount,
          totalSpecialAudit: specialAuditCount,
          totalFraudStaff: fraudStaffSet.size
        };
      });
      
      // Sort by region name and filter out empty regions
      const sortedFraudDetails = fraudDetailsByRegion
        .filter(detail => detail.totalFraudAmount > 0 || detail.totalRegularAudit > 0 || 
                 detail.totalSpecialAudit > 0 || detail.totalFraudStaff > 0)
        .sort((a, b) => a.region.localeCompare(b.region));
      
      setFraudDetailsByRegion(sortedFraudDetails);
    } catch (error) {
      console.error('Error fetching fraud details by region:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const requestFraudSort = (key: string) => {
    let direction: SortOrder = 'asc';
    if (fraudSortConfig.key === key && fraudSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setFraudSortConfig({ key, direction });
  };

  const getSortedFraudData = (data: FraudCase[]) => {
    if (!fraudSortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[fraudSortConfig.key];
      const bVal = (b as any)[fraudSortConfig.key];
      
      if (aVal < bVal) {
        return fraudSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return fraudSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const isPaymentComplete = (fraud: FraudCase) => {
    const payment = fraud.fraud_payments_audits?.[0];
    if (!payment) return false;
    return (
      (payment.hkp_amount > 0 && payment.hkp_amount === fraud.fraud_amount) ||
      payment.from_salary === true
    );
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFraud) return;

    try {
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);

      const paymentDate = formData.get('payment_date') as string;
      const fromSalary = formData.get('from_salary') === 'on';
      const notes = formData.get('notes') as string || '';

      // Gunakan nilai dari state - ini akan tetap 0 kecuali user mengubahnya secara manual
      const hkpAmount = hkpAmountInput;

      const paymentData = {
        work_paper_id: selectedFraud.id,
        hkp_amount: hkpAmount,
        payment_date: paymentDate,
        from_salary: fromSalary,
        notes: notes
      };

      const { error } = await supabase
        .from('fraud_payments_audits')
        .insert([paymentData]);

      if (error) throw error;

      setIsPaymentDialogOpen(false);
      fetchFraudCases();
    } catch (error) {
      console.error('Error submitting payment:', error);
    }
  };

  const filteredFraudCases = fraudCases.filter(fraud =>
    fraud.branch_name.toLowerCase().includes(fraudSearchTerm.toLowerCase()) ||
    fraud.fraud_staff.toLowerCase().includes(fraudSearchTerm.toLowerCase()) ||
    fraud.region.toLowerCase().includes(fraudSearchTerm.toLowerCase())
  );

  const sortedFraudCases = getSortedFraudData(filteredFraudCases);

  // Tambahkan useEffect ini untuk reset input saat dialog dibuka
  useEffect(() => {
    if (isPaymentDialogOpen) {
      setHkpAmountInput(0);
      setFromSalaryChecked(false);
    }
  }, [isPaymentDialogOpen]);

  useEffect(() => {
    fetchFraudTrendData();
    fetchFraudCases();
    fetchFraudDetailsByRegion();
  }, []);

  return (
    <>
      {/* Fraud Trend Line Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fraud Trend per Month</CardTitle>
          <CardDescription>January - December</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              total: { label: "Total Fraud", color: "#e74c3c" }
            }}
            className="w-full h-[300px]" // Set explicit height here
          >
            <LineChart
              data={fraudTrendData}
              margin={{ top: 24, left: 24, right: 24, bottom: 32 }}
              height={250} // Set chart height here (try 250 or 300)
              width={undefined}
            >
              <CartesianGrid vertical={false} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    nameKey="total"
                    hideLabel
                  />
                }
              />
              <Line
                dataKey="total"
                type="natural"
                stroke="#6366F1"
                strokeWidth={2}
                dot={({ payload, ...props }) => (
                  <Dot
                    key={payload.month}
                    r={5}
                    cx={props.cx}
                    cy={props.cy}
                    fill="#6366F1"
                    stroke="#6366F1"
                  />
                )}
              />
            </LineChart>
          </ChartContainer>
          {/* Bulan label di bawah chart */}
          <div className="flex justify-between mt-2 px-2">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
              <span key={m} className="text-xs text-gray-500" style={{ minWidth: 18, textAlign: 'center' }}>{m}</span>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none mt-5">
            Showing total fraud amount per month (Jan–Dec)
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-6">
          {/* All the existing fraud data content */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Fraud Data</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={fraudSearchTerm}
                onChange={(e) => setFraudSearchTerm(e.target.value)}
                placeholder="Search branch or staff..."
                className="pl-9 pr-2 py-1.5 text-xs border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setActiveFraudTab('data')}
              className={`px-4 py-2 rounded-md ${
                activeFraudTab === 'data'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Fraud Data
            </button>
            <button
              onClick={() => setActiveFraudTab('region')}
              className={`px-4 py-2 rounded-md ${
                activeFraudTab === 'region'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Fraud by Region
            </button>
          </div>

          {activeFraudTab === 'data' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => requestFraudSort('region')}
                    >
                      <div className="flex items-center">
                        Region
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => requestFraudSort('branch_name')}
                    >
                      <div className="flex items-center">
                        Branch Name
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => requestFraudSort('fraud_staff')}
                    >
                      <div className="flex items-center">
                        Fraud Staff
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => requestFraudSort('fraud_amount')}
                    >
                      <div className="flex items-center">
                        Fraud Amount
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>HKP Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFraudCases.map((fraud, index) => (
                    <TableRow
                      key={fraud.id}
                      className={isPaymentComplete(fraud) ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
                    >
                      <TableCell className="text-xs font-medium text-gray-500">{index + 1}</TableCell>
                      <TableCell className="text-xs">{fraud.region}</TableCell>
                      <TableCell className="text-xs">{fraud.branch_name}</TableCell>
                      <TableCell className="text-xs">{fraud.fraud_staff}</TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(fraud.fraud_amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {fraud.fraud_payments_audits?.[0]?.hkp_amount 
                          ? formatCurrency(fraud.fraud_payments_audits[0].hkp_amount) 
                          : 'No HKP'}
                        {fraud.fraud_payments_audits?.[0]?.from_salary && (
                          <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Salary</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px] whitespace-normal break-words">
                        {fraud.fraud_payments_audits?.[0]?.notes !== undefined &&
                        fraud.fraud_payments_audits?.[0]?.notes !== null
                          ? fraud.fraud_payments_audits[0].notes
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              setSelectedFraud(fraud);
                              setIsPaymentDialogOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label="Edit Payment"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => fetchPaymentHistory(fraud.id)}
                            className="text-gray-600 hover:text-gray-800"
                            aria-label="View Payment History"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Total Fraud Amount</TableHead>
                    <TableHead>Fraud Recovery</TableHead>
                    <TableHead>Total Regular Audit</TableHead>
                    <TableHead>Total Special Audit</TableHead>
                    <TableHead>Total Fraud Staff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudDetailsByRegion.map((detail, index) => (
                    <TableRow key={detail.region}>
                      <TableCell className="text-xs font-medium text-gray-500">{index + 1}</TableCell>
                      <TableCell className="text-xs">{detail.region}</TableCell>
                      <TableCell className="text-xs font-medium text-red-600">
                        {formatCurrency(detail.totalFraudAmount)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-emerald-600">
                        {formatCurrency(detail.totalRecoveryAmount)}
                      </TableCell>
                      <TableCell className="text-xs">{detail.totalRegularAudit}</TableCell>
                      <TableCell className="text-xs">{detail.totalSpecialAudit}</TableCell>
                      <TableCell className="text-xs">{detail.totalFraudStaff}</TableCell>
                    </TableRow>
                  ))}
                  {fraudDetailsByRegion.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-sm text-gray-500">
                        No fraud details found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update HKP Amount</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-700">HKP Amount</label>
              <input
                type="number"
                name="amount"
                className="w-full mt-1 text-sm border rounded-md p-2"
                min="0"
                value={hkpAmountInput}
                onChange={e => setHkpAmountInput(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Payment Date</label>
              <input
                type="date"
                name="payment_date"
                className="w-full mt-1 text-sm border rounded-md p-2"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                name="from_salary"
                id="from_salary"
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                checked={fromSalaryChecked}
                onChange={e => setFromSalaryChecked(e.target.checked)}
              />
              <label htmlFor="from_salary" className="ml-2 text-xs text-gray-700">
                From Salary and Kopkada
              </label>
            </div>
            <div>
              <label className="text-xs text-gray-700">Notes</label>
              <textarea
                name="notes"
                className="w-full mt-1 text-sm border rounded-md p-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPaymentDialogOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {paymentHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-xs">
                        {payment.payment_date ? format(parseISO(payment.payment_date as string), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(payment.hkp_amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {payment.notes?.includes('[From Salary]') ? 'Salary Deduction' : 'Direct Payment'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-sm text-gray-500">No payment history found</p>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsHistoryDialogOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FraudData;
