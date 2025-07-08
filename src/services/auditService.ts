export interface AuditStats {
  totalRegular: number;
  totalFraud: number;
  recentAudits: Array<{
    id: string;
    branch_name: string;
    audit_type: string;
    audit_start_date: string;
    audit_end_date: string;
    rating: string;
  }>;
}

export const getAuditStatsByUser = async (userId: string): Promise<AuditStats> => {
  try {
    // Get auditor alias for the user
    const aliasResponse = await fetch(`/api/auditor-aliases?profile_id=${userId}`);
    const aliasData = await aliasResponse.json();
    
    if (!aliasData || aliasData.length === 0) {
      return { totalRegular: 0, totalFraud: 0, recentAudits: [] };
    }

    const auditorAlias = aliasData[0].alias;

    // Get work papers where this auditor is involved
    const workPapersResponse = await fetch(`/api/work-papers?auditor=${auditorAlias}`);
    const workPapers = await workPapersResponse.json();

    const regularAudits = workPapers.filter((wp: any) => wp.audit_type === 'regular');
    const fraudAudits = workPapers.filter((wp: any) => wp.audit_type === 'fraud');

    return {
      totalRegular: regularAudits.length,
      totalFraud: fraudAudits.length,
      recentAudits: workPapers.slice(0, 5) // Get 5 most recent
    };
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return { totalRegular: 0, totalFraud: 0, recentAudits: [] };
  }
};