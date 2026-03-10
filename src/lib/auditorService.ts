import { supabase } from './supabaseClient';
import { supabaseService } from './supabaseService';

export const getActiveAuditors = async () => {
  // 1. Fetch all auditors
  const { data: auditors, error: auditorsError } = await supabase
    .from('auditors')
    .select('*')
    .order('name');
    
  if (auditorsError) throw auditorsError;

  // 2. Fetch banned users (keluar dari perusahaan)
  let bannedNames = new Set<string>();
  try {
    const { data: { users }, error: userError } = await supabaseService.auth.admin.listUsers();
    if (!userError && users) {
      const bannedUsers = users.filter((u: any) => u.banned_until && new Date(u.banned_until) > new Date());
      if (bannedUsers.length > 0) {
        const bannedIds = bannedUsers.map((u: any) => u.id);
        const { data: profiles } = await supabase.from('profiles').select('full_name').in('id', bannedIds);
        if (profiles) {
          profiles.forEach(p => {
            if (p.full_name) bannedNames.add(p.full_name.toLowerCase().trim());
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching banned users:', err);
  }

  // 3. Filter auditors
  return auditors.filter(auditor => {
    if (!auditor.name) return false;
    return !bannedNames.has(auditor.name.toLowerCase().trim());
  });
};
