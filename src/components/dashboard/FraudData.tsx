import { format } from "date-fns";
import { EChartsOption } from 'echarts';
import { ArrowUpDown, Search } from "lucide-react";
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import LazyEChart from '../common/LazyEChart';
import { Card, CardContent } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface FraudStaffData {
  id: string;
  audit_master_id: string;
  region: string;
  branch_name: string;
  fraud_staff: string;
  fraud_amount: number;
  payment_fraud: number;
  notes: string | null;
  audit_end_date?: string;
}

interface RegionalFraudSummary {
  region: string;
  totalFraud: number;
  totalPayment: number;
  outstanding: number;
  caseCount: number;
}

interface MonthlyFraudTrend {
  month: string;
  count: number;
  amount: number;
}

type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortOrder;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FraudData = () => {
  // State variables
  const [fraudData, setFraudData] = useState<FraudStaffData[]>([]);
  const [selectedFraud, setSelectedFraud] = useState<FraudStaffData | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [fraudSearchTerm, setFraudSearchTerm] = useState('');
  const [fraudSortConfig, setFraudSortConfig] = useState<SortConfig>({ key: 'branch_name', direction: 'asc' });
  const [paymentInput, setPaymentInput] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [revisedFraudAmount, setRevisedFraudAmount] = useState<number>(0);
  const [showExceedWarning, setShowExceedWarning] = useState(false);
  
  // New state for tabs and summary data
  const [activeTab, setActiveTab] = useState<'summary' | 'allData'>('summary');
  const [regionalSummary, setRegionalSummary] = useState<RegionalFraudSummary[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyFraudTrend[]>([]);
  const [trendGranularity, setTrendGranularity] = useState<'month' | 'week' | 'day'>('month');

  // Fetch fraud data from audit_master and work_paper_persons
  const fetchFraudData = async () => {
    try {
      // Fetch work_paper_persons with audit_master data (including region and audit_end_date)
      const { data: fraudPersonsData, error: fraudError } = await supabase
        .from('work_paper_persons')
        .select(`
          id,
          audit_master_id,
          fraud_staff,
          fraud_amount,
          payment_fraud,
          notes,
          audit_master:audit_master_id (
            branch_name,
            region,
            audit_end_date
          )
        `)
        .not('fraud_staff', 'is', null);

      if (fraudError) throw fraudError;

      // Filter out empty fraud_staff and transform data
      const fraudDataWithRegion: FraudStaffData[] = fraudPersonsData
        ?.filter(person => person.fraud_staff && person.fraud_staff.trim() !== '')
        .map(person => ({
          id: person.id,
          audit_master_id: person.audit_master_id,
          branch_name: (person.audit_master as any)?.branch_name || 'Unknown',
          region: (person.audit_master as any)?.region || 'Unknown',
          audit_end_date: (person.audit_master as any)?.audit_end_date,
          fraud_staff: person.fraud_staff || '',
          fraud_amount: person.fraud_amount || 0,
          payment_fraud: person.payment_fraud || 0,
          notes: person.notes
        })) || [];

      setFraudData(fraudDataWithRegion);
      
      // Generate summary data
      generateRegionalSummary(fraudDataWithRegion);
      updateTrendsByGranularity(fraudDataWithRegion, trendGranularity);
    } catch (error) {
      console.error('Error fetching fraud data:', error);
      toast.error('Failed to fetch fraud data');
    }
  };

  const generateRegionalSummary = (data: FraudStaffData[]) => {
    const regionMap = new Map<string, RegionalFraudSummary>();

    data.forEach(fraud => {
      const region = fraud.region;
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          region,
          totalFraud: 0,
          totalPayment: 0,
          outstanding: 0,
          caseCount: 0
        });
      }

      const summary = regionMap.get(region)!;
      summary.totalFraud += fraud.fraud_amount;
      summary.totalPayment += fraud.payment_fraud;
      summary.caseCount += 1;
    });

    // Calculate outstanding and convert to array
    const summaryArray = Array.from(regionMap.values()).map(summary => ({
      ...summary,
      outstanding: summary.totalFraud - summary.totalPayment
    }));

    // Sort by total fraud amount descending
    summaryArray.sort((a, b) => b.totalFraud - a.totalFraud);
    
    setRegionalSummary(summaryArray);
  };

  const generateMonthlyTrends = (data: FraudStaffData[]) => {
    const monthlyMap = new Map<string, MonthlyFraudTrend>();

    // Initialize all months
    MONTHS.forEach(month => {
      monthlyMap.set(month, { month, count: 0, amount: 0 });
    });

    // Aggregate data by month
    data.forEach(fraud => {
      if (fraud.audit_end_date) {
        const month = format(new Date(fraud.audit_end_date), 'MMM');
        const trend = monthlyMap.get(month);
        if (trend) {
          trend.count += 1;
          trend.amount += fraud.fraud_amount;
        }
      }
    });

    setMonthlyTrends(Array.from(monthlyMap.values()));
  };

  const generateWeeklyTrends = (data: FraudStaffData[]) => {
    const weeklyMap = new Map<string, MonthlyFraudTrend>();

    // Aggregate data by week
    data.forEach(fraud => {
      if (fraud.audit_end_date) {
        const date = new Date(fraud.audit_end_date);
        const weekNumber = getWeekNumber(date);
        const weekKey = `W${weekNumber}`;
        
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { month: weekKey, count: 0, amount: 0 });
        }
        
        const trend = weeklyMap.get(weekKey)!;
        trend.count += 1;
        trend.amount += fraud.fraud_amount;
      }
    });

    // Sort by week number
    const weeklyArray = Array.from(weeklyMap.values()).sort((a, b) => {
      const weekA = parseInt(a.month.replace('W', ''));
      const weekB = parseInt(b.month.replace('W', ''));
      return weekA - weekB;
    });

    setMonthlyTrends(weeklyArray);
  };

  const generateDailyTrends = (data: FraudStaffData[]) => {
    const dailyMap = new Map<string, MonthlyFraudTrend>();

    // Aggregate data by day
    data.forEach(fraud => {
      if (fraud.audit_end_date) {
        const dayKey = format(new Date(fraud.audit_end_date), 'dd/MM');
        
        if (!dailyMap.has(dayKey)) {
          dailyMap.set(dayKey, { month: dayKey, count: 0, amount: 0 });
        }
        
        const trend = dailyMap.get(dayKey)!;
        trend.count += 1;
        trend.amount += fraud.fraud_amount;
      }
    });

    // Sort by date
    const dailyArray = Array.from(dailyMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.month.split('/').map(Number);
      const [dayB, monthB] = b.month.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });

    setMonthlyTrends(dailyArray);
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const updateTrendsByGranularity = (data: FraudStaffData[], granularity: 'month' | 'week' | 'day') => {
    switch (granularity) {
      case 'month':
        generateMonthlyTrends(data);
        break;
      case 'week':
        generateWeeklyTrends(data);
        break;
      case 'day':
        generateDailyTrends(data);
        break;
    }
  };

  const getFraudTrendChartOption = (): EChartsOption => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Jumlah Kasus', 'Total Nominal'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: monthlyTrends.map(item => item.month),
        axisLabel: {
          rotate: trendGranularity === 'day' ? 45 : 0,
          interval: trendGranularity === 'day' ? 'auto' : 0
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Jumlah Kasus',
          position: 'left',
          axisLabel: {
            formatter: '{value}'
          }
        },
        {
          type: 'value',
          name: 'Nominal (Juta Rp)',
          position: 'right',
          axisLabel: {
            formatter: (value: number) => (value / 1000000).toFixed(0)
          }
        }
      ],
      series: [
        {
          name: 'Jumlah Kasus',
          type: 'line',
          data: monthlyTrends.map(item => item.count),
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 3 },
          smooth: true,
          yAxisIndex: 0
        },
        {
          name: 'Total Nominal',
          type: 'line',
          data: monthlyTrends.map(item => item.amount),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3 },
          smooth: true,
          yAxisIndex: 1
        }
      ]
    };
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

  const getSortedFraudData = (data: FraudStaffData[]) => {
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

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFraud) return;

    try {
      const newPayment = selectedFraud.payment_fraud + paymentInput;
      
      if (newPayment > selectedFraud.fraud_amount && !showExceedWarning) {
        setShowExceedWarning(true);
        return;
      }
      
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const paymentNote = `[${timestamp}] Payment: ${formatCurrency(paymentInput)}`;
      const updatedNotes = selectedFraud.notes 
        ? `${selectedFraud.notes}\n${paymentNote}${paymentNotes ? ` - ${paymentNotes}` : ''}`
        : `${paymentNote}${paymentNotes ? ` - ${paymentNotes}` : ''}`;

      const { error } = await supabase
        .from('work_paper_persons')
        .update({
          payment_fraud: newPayment,
          notes: updatedNotes
        })
        .eq('id', selectedFraud.id);

      if (error) throw error;

      toast.success('Payment updated successfully');
      setIsPaymentDialogOpen(false);
      setPaymentInput(0);
      setPaymentNotes('');
      setShowExceedWarning(false);
      fetchFraudData();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleFraudAmountRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFraud) return;

    try {
      if (revisedFraudAmount < selectedFraud.payment_fraud) {
        toast.error(`Revised fraud amount cannot be less than current payment (${formatCurrency(selectedFraud.payment_fraud)})`);
        return;
      }

      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const revisionNote = `[${timestamp}] Fraud amount revised from ${formatCurrency(selectedFraud.fraud_amount)} to ${formatCurrency(revisedFraudAmount)}`;
      const updatedNotes = selectedFraud.notes 
        ? `${selectedFraud.notes}\n${revisionNote}`
        : revisionNote;

      const { error } = await supabase
        .from('work_paper_persons')
        .update({
          fraud_amount: revisedFraudAmount,
          notes: updatedNotes
        })
        .eq('id', selectedFraud.id);

      if (error) throw error;

      toast.success('Fraud amount revised successfully');
      setIsRevisionDialogOpen(false);
      setRevisedFraudAmount(0);
      fetchFraudData();
    } catch (error) {
      console.error('Error revising fraud amount:', error);
      toast.error('Failed to revise fraud amount');
    }
  };

  const filteredFraudData = fraudData.filter(fraud =>
    fraud.branch_name.toLowerCase().includes(fraudSearchTerm.toLowerCase()) ||
    fraud.fraud_staff.toLowerCase().includes(fraudSearchTerm.toLowerCase()) ||
    fraud.region.toLowerCase().includes(fraudSearchTerm.toLowerCase())
  );

  const sortedFraudData = getSortedFraudData(filteredFraudData);

  useEffect(() => {
    if (isPaymentDialogOpen) {
      setPaymentInput(0);
      setPaymentNotes('');
      setShowExceedWarning(false);
    }
  }, [isPaymentDialogOpen]);

  useEffect(() => {
    if (isRevisionDialogOpen && selectedFraud) {
      setRevisedFraudAmount(selectedFraud.fraud_amount);
    }
  }, [isRevisionDialogOpen, selectedFraud]);

  useEffect(() => {
    fetchFraudData();
  }, []);

  // Update trends when granularity changes
  useEffect(() => {
    if (fraudData.length > 0) {
      updateTrendsByGranularity(fraudData, trendGranularity);
    }
  }, [trendGranularity]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Fraud Data</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'summary'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('allData')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'allData'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Data
          </button>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Fraud Trend Chart */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">
                  Tren Fraud {trendGranularity === 'month' ? 'Per Bulan' : trendGranularity === 'week' ? 'Per Minggu' : 'Per Hari'}
                </h3>
                <select
                  value={trendGranularity}
                  onChange={(e) => setTrendGranularity(e.target.value as 'month' | 'week' | 'day')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="month">Per Bulan</option>
                  <option value="week">Per Minggu</option>
                  <option value="day">Per Hari</option>
                </select>
              </div>
              <LazyEChart option={getFraudTrendChartOption()} style={{ height: '400px', width: '100%' }} />
            </div>

            {/* Regional Summary Table */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-base font-semibold mb-4">Total Nominal Fraud Per Regional</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No.</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Jumlah Kasus</TableHead>
                      <TableHead className="text-right">Total Fraud</TableHead>
                      <TableHead className="text-right">Total Payment</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionalSummary.map((summary, index) => (
                      <TableRow key={summary.region}>
                        <TableCell className="text-xs font-medium">{index + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{summary.region}</TableCell>
                        <TableCell className="text-xs text-right">{summary.caseCount}</TableCell>
                        <TableCell className="text-xs text-right font-semibold text-red-600">
                          {formatCurrency(summary.totalFraud)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-green-600">
                          {formatCurrency(summary.totalPayment)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-yellow-600">
                          {formatCurrency(summary.outstanding)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {regionalSummary.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-sm text-gray-500">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* All Data Tab */}
        {activeTab === 'allData' && (
          <div>
            <div className="flex justify-end mb-4">
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
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => requestFraudSort('payment_fraud')}
                    >
                      <div className="flex items-center">
                        Payment
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFraudData.map((fraud, index) => {
                    const isOverpaid = fraud.payment_fraud > fraud.fraud_amount;
                    const isFullyPaid = fraud.payment_fraud === fraud.fraud_amount && fraud.fraud_amount > 0;
                    const paymentColorClass = isOverpaid 
                      ? 'bg-red-100 text-red-800 font-semibold' 
                      : isFullyPaid 
                      ? 'bg-green-100 text-green-800 font-semibold' 
                      : '';
                    
                    return (
                      <TableRow key={fraud.id} className="hover:bg-gray-50">
                        <TableCell className="text-xs font-medium text-black-500">{index + 1}</TableCell>
                        <TableCell className="text-xs">{fraud.region}</TableCell>
                        <TableCell className="text-xs">{fraud.branch_name}</TableCell>
                        <TableCell className="text-xs">{fraud.fraud_staff}</TableCell>
                        <TableCell className="text-xs">
                          {formatCurrency(fraud.fraud_amount)}
                        </TableCell>
                        <TableCell className={`text-xs-bold ${paymentColorClass}`}>
                          {fraud.payment_fraud > 0 
                            ? formatCurrency(fraud.payment_fraud) 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[300px] whitespace-pre-line break-words">
                          {fraud.notes || '-'}
                        </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedFraud(fraud);
                              setIsPaymentDialogOpen(true);
                            }}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                          >
                            Payment
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFraud(fraud);
                              setIsRevisionDialogOpen(true);
                            }}
                            className="px-3 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 transition-colors"
                          >
                            Revisi
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {sortedFraudData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-sm text-gray-500">
                        No fraud data found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Input Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Amount</label>
              <input
                type="number"
                className="w-full mt-1 text-sm border rounded-md p-2"
                min="0"
                value={paymentInput}
                onChange={e => setPaymentInput(Number(e.target.value))}
                required
              />
              {paymentInput > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {formatCurrency(paymentInput)}
                </div>
              )}
              {selectedFraud && (
                <div className="text-xs text-gray-600 mt-2">
                  Current Payment: {formatCurrency(selectedFraud.payment_fraud)}
                  <br />
                  New Total: {formatCurrency(selectedFraud.payment_fraud + paymentInput)}
                  <br />
                  Fraud Amount: {formatCurrency(selectedFraud.fraud_amount)}
                  {(selectedFraud.payment_fraud + paymentInput) > selectedFraud.fraud_amount && (
                    <div className="text-red-600 font-medium mt-1">
                      ⚠️ Payment exceeds fraud amount!
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                className="w-full mt-1 text-sm border rounded-md p-2"
                rows={3}
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="Add notes about this payment..."
              />
            </div>
            
            {showExceedWarning && selectedFraud && (selectedFraud.payment_fraud + paymentInput) > selectedFraud.fraud_amount && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Peringatan: Payment Melebihi Fraud Amount
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Total payment ({formatCurrency(selectedFraud.payment_fraud + paymentInput)}) 
                        akan melebihi fraud amount ({formatCurrency(selectedFraud.fraud_amount)}).
                      </p>
                      <p className="mt-1 font-medium">
                        Apakah Anda yakin ingin melanjutkan?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setShowExceedWarning(false);
                }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm text-white rounded-md ${
                  showExceedWarning 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {showExceedWarning ? 'Ya, Lanjutkan' : 'Save Payment'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fraud Amount Revision Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revise Fraud Amount</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFraudAmountRevision} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Current Fraud Amount</label>
              <div className="w-full mt-1 text-sm border rounded-md p-2 bg-gray-50">
                {selectedFraud && formatCurrency(selectedFraud.fraud_amount)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Revised Fraud Amount</label>
              <input
                type="number"
                className="w-full mt-1 text-sm border rounded-md p-2"
                min="0"
                value={revisedFraudAmount}
                onChange={e => setRevisedFraudAmount(Number(e.target.value))}
                required
              />
              {revisedFraudAmount > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {formatCurrency(revisedFraudAmount)}
                </div>
              )}
              {selectedFraud && revisedFraudAmount < selectedFraud.payment_fraud && (
                <div className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ Revised amount cannot be less than current payment ({formatCurrency(selectedFraud.payment_fraud)})
                </div>
              )}
              {selectedFraud && revisedFraudAmount !== selectedFraud.fraud_amount && revisedFraudAmount >= selectedFraud.payment_fraud && (
                <div className="text-xs text-blue-600 mt-1">
                  Change: {revisedFraudAmount > selectedFraud.fraud_amount ? '+' : ''}{formatCurrency(revisedFraudAmount - selectedFraud.fraud_amount)}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsRevisionDialogOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700"
                disabled={selectedFraud ? revisedFraudAmount < selectedFraud.payment_fraud : false}
              >
                Save Revision
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FraudData;
