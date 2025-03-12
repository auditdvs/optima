import React from 'react';
import { Building2, ClipboardCheck, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const DashboardStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Branches Card */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 pt-4">
              <p className="text-sm text-gray-600 mb-1">Total Branches</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold">{stats.totalBranches}</span>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-600">{stats.auditedBranches} audited</span>
                  <span className="text-xs text-gray-500">{stats.unauditedBranches} unaudited</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Types Card */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 pt-4">
              <p className="text-sm text-gray-600 mb-1">Audit Types</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold">{stats.totalAudits}</span>
                <div className="flex flex-col">
                  <span className="text-xs text-red-600">{stats.fraudAudits} Fraud</span>
                  <span className="text-xs text-green-600">{stats.annualAudits} Annual</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Fraud Card */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 pt-4">
              <p className="text-sm text-gray-600 mb-1">Total Fraud</p>
              <div className="flex flex-col">
                <span className="text-xl font-semibold">Rp {stats.totalFraud.toLocaleString('id-ID')}</span>
                <span className="text-xs text-red-500">{stats.totalFraudCases} cases detected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Fraud Cases Card */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 pt-4">
              <p className="text-sm text-gray-600 mb-1">Total fraud cases (staff)</p>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{stats.totalFraudulentBranches}</span>
                <span className="text-xs text-gray-500">branches involved</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
