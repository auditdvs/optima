import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export interface RiskIssueData {
  id: number;
  kc_kr_kp: string;
  audit_type?: 'regular' | 'special' | string | null;
  created_by?: string | null;
  created_by_name?: string;
  judul_temuan: string;
  kode_risk_issue: string;
  judul_risk_issue: string;
  kategori: string;
  penyebab: string;
  dampak: string;
  kelemahan: string;
  rekomendasi: string;
  poin: number | null;
  perbaikan_temuan: string;
  jatuh_tempo: string;
  tanggal_audit: string;
  last_updated?: string | null;
}

interface RiskIssueTableProps {
  data: RiskIssueData[];
  loading: boolean;
}

const TABLE_MIN_WIDTH = '2200px';

export const RiskIssueTable: React.FC<RiskIssueTableProps> = ({ data, loading }) => {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const topTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tableElement = tableRef.current;
    const topScrollElement = topScrollRef.current;
    const topTrackElement = topTrackRef.current;
    const tableScrollElement = tableElement?.parentElement as HTMLDivElement | null;

    if (!tableElement || !topScrollElement || !topTrackElement || !tableScrollElement) return;

    tableScrollElement.classList.add('risk-issue-scrollbar-hide');
    tableScrollElement.style.scrollbarWidth = 'none';

    const syncTrackWidth = () => {
      topTrackElement.style.width = `${tableScrollElement.scrollWidth}px`;
    };

    const syncTopToTable = () => {
      topScrollElement.scrollLeft = tableScrollElement.scrollLeft;
    };

    const syncTableToTop = () => {
      tableScrollElement.scrollLeft = topScrollElement.scrollLeft;
    };

    tableScrollElement.addEventListener('scroll', syncTopToTable);
    topScrollElement.addEventListener('scroll', syncTableToTop);
    window.addEventListener('resize', syncTrackWidth);

    const resizeObserver = new ResizeObserver(() => {
      syncTrackWidth();
    });
    resizeObserver.observe(tableScrollElement);

    syncTrackWidth();
    syncTopToTable();

    return () => {
      tableScrollElement.removeEventListener('scroll', syncTopToTable);
      topScrollElement.removeEventListener('scroll', syncTableToTop);
      window.removeEventListener('resize', syncTrackWidth);
      resizeObserver.disconnect();
      tableScrollElement.classList.remove('risk-issue-scrollbar-hide');
      tableScrollElement.style.scrollbarWidth = '';
    };
  }, [data, loading]);

  const renderTable = (bodyRows: React.ReactNode) => (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 pt-2 pb-2">
          <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden risk-issue-top-scroll">
            <div ref={topTrackRef} className="h-px" style={{ minWidth: TABLE_MIN_WIDTH }} />
          </div>
        </div>
        <Table ref={tableRef} className="min-w-max" style={{ minWidth: TABLE_MIN_WIDTH }}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead className="min-w-[120px]">KC/KR/KP</TableHead>
              <TableHead className="min-w-[100px]">Jenis</TableHead>
              <TableHead className="min-w-[160px]">Input QA</TableHead>
              <TableHead className="min-w-[200px]">Judul Temuan</TableHead>
              <TableHead className="min-w-[120px]">Kode Risk Issue</TableHead>
              <TableHead className="min-w-[200px]">Judul Risk Issue</TableHead>
              <TableHead className="min-w-[100px]">Kategori</TableHead>
              <TableHead className="min-w-[250px]">Penyebab</TableHead>
              <TableHead className="min-w-[250px]">Dampak</TableHead>
              <TableHead className="min-w-[250px]">Kelemahan</TableHead>
              <TableHead className="min-w-[250px]">Rekomendasi</TableHead>
              <TableHead className="min-w-[80px]">Poin</TableHead>
              <TableHead className="min-w-[200px]">Perbaikan Temuan</TableHead>
              <TableHead className="min-w-[120px]">Jatuh Tempo</TableHead>
              <TableHead className="min-w-[140px]">Tanggal Audit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{bodyRows}</TableBody>
        </Table>
      </CardContent>
      <style>{`
        .risk-issue-top-scroll {
          scrollbar-gutter: stable;
        }

        .risk-issue-scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .risk-issue-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Card>
  );

  if (loading) {
    return renderTable(
      [...Array(8)].map((_, rowIdx) => (
        <TableRow key={rowIdx}>
          {[...Array(16)].map((_, colIdx) => (
            <TableCell key={colIdx}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No risk issue data available. Open the sheet editor to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return renderTable(
    data.map((item, index) => (
      <TableRow key={item.id}>
        <TableCell className="text-center align-top">{index + 1}</TableCell>
        <TableCell className="align-top">{item.kc_kr_kp}</TableCell>
        <TableCell className="align-top">{item.audit_type === 'special' ? 'Khusus' : 'Reguler'}</TableCell>
        <TableCell className="align-top">{item.created_by_name || '-'}</TableCell>
        <TableCell className="align-top">{item.judul_temuan}</TableCell>
        <TableCell className="align-top">{item.kode_risk_issue}</TableCell>
        <TableCell className="align-top">{item.judul_risk_issue}</TableCell>
        <TableCell className="align-top">{item.kategori}</TableCell>
        <TableCell className="align-top">{item.penyebab}</TableCell>
        <TableCell className="align-top">{item.dampak}</TableCell>
        <TableCell className="align-top">{item.kelemahan}</TableCell>
        <TableCell className="align-top">{item.rekomendasi}</TableCell>
        <TableCell className="text-center align-top">{item.poin || '-'}</TableCell>
        <TableCell className="align-top">{item.perbaikan_temuan}</TableCell>
        <TableCell className="align-top">{item.jatuh_tempo}</TableCell>
        <TableCell className="align-top">{item.tanggal_audit || '-'}</TableCell>
      </TableRow>
    ))
  );
};
