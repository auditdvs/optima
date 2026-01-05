// Service for calling Supabase Edge Functions related to letter operations
import { supabase } from '../lib/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ApproveLetterResponse {
  success: boolean;
  message: string;
  lpjFileUrl?: string;
  umSheetProtected?: boolean;
  sheetsProtected?: string[];
  error?: string;
}

interface ApproveAddendumResponse {
  success: boolean;
  message: string;
  lpjFileUrl?: string;
  umSheetProtected?: boolean;
  sheetsProtected?: string[];
  error?: string;
}

/**
 * Approve a letter by calling the edge function
 * This will:
 * 1. Move the Excel file from perdin bucket to perdin_acc bucket
 * 2. Protect the UM (Uang Muka) sheet in the Excel file
 * 3. Update the letter status to approved
 * 4. Save protected file URL to lpj column
 */
export async function approveLetterWithProtection(letterId: string, userId: string): Promise<ApproveLetterResponse> {
  try {
    // Get the current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/approve-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ letterId, userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to approve letter');
    }

    return data;
  } catch (error) {
    console.error('Error calling approve-letter function:', error);
    throw error;
  }
}

/**
 * Fallback approval without edge function for letters
 * Use this if edge function is not deployed or fails
 */
export async function approveLetterFallback(letterId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('letter')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: null
    })
    .eq('id', letterId);

  if (error) throw error;
}

/**
 * Approve an addendum by calling the edge function
 * This will:
 * 1. Move the Excel file from perdin bucket to perdin_acc bucket
 * 2. Protect the UM (Uang Muka) sheet in the Excel file
 * 3. Update the addendum status to approved
 * 4. Save protected file URL to lpj column
 */
export async function approveAddendumWithProtection(addendumId: string, userId: string): Promise<ApproveAddendumResponse> {
  try {
    // Get the current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/approve-addendum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ addendumId, userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to approve addendum');
    }

    return data;
  } catch (error) {
    console.error('Error calling approve-addendum function:', error);
    throw error;
  }
}

/**
 * Fallback approval without edge function for addendums
 * Use this if edge function is not deployed or fails
 */
export async function approveAddendumFallback(addendumId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('addendum')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: null
    })
    .eq('id', addendumId);

  if (error) throw error;
}
