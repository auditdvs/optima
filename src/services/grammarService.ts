import { supabase } from '../lib/supabase';

export const grammarService = {
  async submitText(text: string) {
    const { data: user } = await supabase.auth.getUser();
    return supabase
      .from('grammar_requests')
      .insert({
        user_id: user.user?.id,
        original_text: text,
      })
      .select();
  },

  async getRequests() {
    return supabase
      .from('grammar_requests')
      .select('*')
      .order('created_at', { ascending: false });
  },

  subscribeToChanges(requestId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`grammar_request_${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'grammar_requests',
        filter: `id=eq.${requestId}`,
      }, callback)
      .subscribe();
  }
};