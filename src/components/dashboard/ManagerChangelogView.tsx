import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, Loader2, Palette, Rocket, Tag, Wrench } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';

interface ChangelogItem {
  id: string;
  release_date: string;
  icon: string;
  title: string;
  description: string;
  created_at: string;
}

export default function ManagerChangelogView() {
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['system_changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_changelog')
        .select('*')
        .order('release_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChangelogItem[];
    }
  });

  // Format YYYY-MM
  const dateObj = new Date();
  const currentMonthStr = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [currentMonthStr]: true
  });

  const toggleMonth = (monthStr: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthStr]: prev[monthStr] !== undefined ? !prev[monthStr] : !(monthStr === currentMonthStr)
    }));
  };

  const groupedLogs = logsData?.reduce((acc: any, curr) => {
    const d = new Date(curr.release_date);
    const monthYear = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    if (!acc[monthYear]) {
      acc[monthYear] = {
        period: monthYear,
        icon: curr.icon, 
        items: []
      };
    }
    acc[monthYear].items.push(curr);
    return acc;
  }, {});

  const renderGroups = groupedLogs ? Object.values(groupedLogs) : [];

  const getIcon = (iconName: string, className: string) => {
    switch(iconName) {
      case 'Wrench': return <Wrench className={className} />;
      case 'Palette': return <Palette className={className} />;
      case 'Rocket': return <Rocket className={className} />;
      case 'Tag': return <Tag className={className} />;
      default: return <CheckCircle2 className={className} />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            System Updates
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Riwayat pengerjaan sistem dan fitur baru yang telah dirilis.
          </p>
        </div>
      </div>
      
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-sm text-gray-500">Memuat log sistem...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {renderGroups.map((log: any, idx) => {
              // Jika bulan belum pernah ditoggle, pakai default (current month = true, else = false)
              const isExpanded = expandedMonths[log.period] !== undefined 
                ? expandedMonths[log.period] 
                : (log.period === currentMonthStr);

              return (
                <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {/* Header / Toggle */}
                  <div 
                    onClick={() => toggleMonth(log.period)}
                    className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex justify-between items-center select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h3 className="text-md font-bold text-gray-800">{log.period}</h3>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium ml-2">
                        {log.items.length} updates
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Body */}
                  {isExpanded && (
                    <div className="p-4 bg-white space-y-3">
                      {log.items.map((item: ChangelogItem, itemIdx: number) => {
                        const itemDate = new Date(item.release_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'long'
                        });

                        return (
                          <div key={itemIdx} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-indigo-100 transition-colors flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-shrink-0 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 whitespace-nowrap shadow-sm mt-0.5 min-w-[100px] text-center">
                              {itemDate}
                            </div>
                            <div className="flex-1">
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
                                {getIcon(item.icon, "w-4 h-4 text-emerald-500 flex-shrink-0")}
                                {item.title}
                              </h4>
                              <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {renderGroups.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-10">Belum ada update di database.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
