import { supabase } from './supabaseClient';
import { supabaseService } from './supabaseService';

export const getActiveAuditors = async () => {
  // 1. Fetch from profiles where auditor_id is not null
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, auditor_id')
    .not('auditor_id', 'is', null)
    .order('full_name');
    
  if (profilesError) throw profilesError;

  // 2. Fetch banned users (keluar dari perusahaan)
  let bannedNames = new Set<string>();
  try {
    const { data: { users }, error: userError } = await supabaseService.auth.admin.listUsers();
    if (!userError && users) {
      const bannedUsers = users.filter((u: any) => u.banned_until && new Date(u.banned_until) > new Date());
      if (bannedUsers.length > 0) {
        const bannedIds = bannedUsers.map((u: any) => u.id);
        const { data: bannedProfiles } = await supabase.from('profiles').select('full_name').in('id', bannedIds);
        if (bannedProfiles) {
          bannedProfiles.forEach(p => {
            if (p.full_name) bannedNames.add(p.full_name.toLowerCase().trim());
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching banned users:', err);
  }

  // 3. Map and Filter
  return profiles
    .filter(profile => {
      if (!profile.full_name) return false;
      // Pastikan auditor_id benar-benar ada nilainya (bukan string kosong, NAN, atau string 'NULL')
      if (!profile.auditor_id || 
          profile.auditor_id.trim() === '' || 
          profile.auditor_id.toUpperCase() === 'NAN' || 
          profile.auditor_id.toUpperCase() === 'NULL') {
        return false;
      }
      return !bannedNames.has(profile.full_name.toLowerCase().trim());
    })
    .map(profile => ({
      id: profile.id, 
      name: profile.full_name
    }));
};
