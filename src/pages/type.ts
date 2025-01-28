interface Branch {
  id: string;
  code: string;
  name: string;
  coordinates: [number, number];
  region: string;
}

interface BranchAudit {
  id: string;
  branchName: string;
  auditType: 'regular' | 'fraud';
  fraudAmount?: number;
  date: string;
  notes: string;
}