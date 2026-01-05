import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export interface MatriksData {
  id: number;
  kc_kr_kp: string;
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
  last_updated?: string;
}

interface MatriksTableProps {
  data: MatriksData[];
  loading: boolean;
}

export const MatriksTable: React.FC<MatriksTableProps> = ({ data, loading }) => {
  // Skeleton Table
  const SkeletonTable = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Skeleton className="h-4 w-8" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="min-w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[250px]"><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead className="min-w-[80px]"><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead className="min-w-[200px]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="min-w-[120px]"><Skeleton className="h-4 w-20" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(8)].map((_, idx) => (
                <TableRow key={idx}>
                  {[...Array(13)].map((_, colIdx) => (
                    <TableCell key={colIdx}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <SkeletonTable />;
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No matriks data available. Upload a CSV file to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead className="min-w-[120px]">KC/KR/KP</TableHead>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center align-top">{index + 1}</TableCell>
                  <TableCell className="align-top whitespace-normal break-words">
                    {item.kc_kr_kp}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[200px]">
                    {item.judul_temuan}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words">
                    {item.kode_risk_issue}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[200px]">
                    {item.judul_risk_issue}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words">
                    {item.kategori}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                    {item.penyebab}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                    {item.dampak}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                    {item.kelemahan}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[250px]">
                    {item.rekomendasi}
                  </TableCell>
                  <TableCell className="text-center align-top">{item.poin || '-'}</TableCell>
                  <TableCell className="align-top whitespace-normal break-words max-w-[200px]">
                    {item.perbaikan_temuan}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal break-words">
                    {item.jatuh_tempo}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};