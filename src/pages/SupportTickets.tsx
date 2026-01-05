import { MessageSquarePlus, RefreshCw, Search, Send, User, UserCheck, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SupportTicket {
  id: string;
  ticket_code: string;
  user_id: string;
  topic: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  resolved_by: string | null;
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', color: 'bg-red-100 text-red-700' },
};

interface UserAccount {
  profile_id: string;
  full_name: string;
}

function SupportTickets() {
  const { user, userRole } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state for new ticket
  const [newTicket, setNewTicket] = useState({
    topic: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Check if user can edit status (dvs, superadmin, manager)
  const canEditStatus = ['dvs', 'superadmin', 'manager'].includes(userRole);

  // Fetch all accounts (same pattern as AssignmentLetterList)
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('auditor_aliases')
        .select('profile_id, full_name');

      if (error) {
        console.error('Error fetching auditor aliases:', error);
        return;
      }
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching auditor aliases:', error);
    }
  };

  // Get user name from accounts (same pattern as AssignmentLetterList)
  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const account = accounts.find(acc => acc.profile_id === userId);
    return account?.full_name || 'Unknown';
  };

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // DEBUG: Check role and permissions
      console.log('DEBUG SupportTickets - userRole:', userRole);
      console.log('DEBUG SupportTickets - canEditStatus:', canEditStatus);
      console.log('DEBUG SupportTickets - user.id:', user?.id);
      
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only fetch user's own tickets
      if (!canEditStatus) {
        console.log('DEBUG: Filtering by user_id because NOT admin');
        query = query.eq('user_id', user?.id);
      } else {
        console.log('DEBUG: Fetching ALL tickets because IS admin');
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTickets();
    }
  }, [user]);

  // Create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTicket.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id,
        topic: newTicket.topic.trim(),
        description: newTicket.description.trim() || null,
        priority: newTicket.priority,
        status: 'open',
      });

      if (error) throw error;

      toast.success('Ticket created successfully!');
      setNewTicket({ topic: '', description: '', priority: 'medium' });
      setIsModalOpen(false);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update ticket status (admin only) - also records who handled it
  const handleStatusChange = async (ticketId: string, newStatus: SupportTicket['status']) => {
    if (!canEditStatus) {
      toast.error('You do not have permission to change ticket status');
      return;
    }

    // Optimistic update: update local state immediately
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId
          ? { ...ticket, status: newStatus, resolved_by: user?.id || null }
          : ticket
      )
    );

    try {
      // When status changes, record who handled it
      const updateData: { status: string; resolved_by?: string } = { 
        status: newStatus 
      };
      
      // Set resolved_by when status changes to in_progress, resolved, or closed
      if (['in_progress', 'resolved', 'closed'].includes(newStatus)) {
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        // Revert on error - refetch data
        fetchTickets();
        throw error;
      }

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Support Tickets</h1>
            <p className="text-gray-500 mt-1">
              {canEditStatus ? 'Manage all support tickets' : 'View and create support tickets'}
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <MessageSquarePlus className="w-5 h-5" />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticket code or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all min-w-[160px]"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary Stats - Only visible to admins */}
        {canEditStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = tickets.filter((t) => t.status === status).length;
              return (
                <div
                  key={status}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
                >
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className={`text-sm font-medium ${config.color.split(' ')[1]}`}>
                    {config.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tickets Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <MessageSquarePlus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No tickets found</p>
              <p className="text-gray-400 text-sm mt-1">Create a new ticket to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ticket Code
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Handled By
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Last Update
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-indigo-600">
                            {ticket.ticket_code}
                          </span>
                          <span className={`inline-flex w-fit mt-1 px-2 py-0.5 text-[10px] font-semibold rounded ${priorityConfig[ticket.priority].color}`}>
                            {priorityConfig[ticket.priority].label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{ticket.topic}</p>
                          {ticket.description && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {getUserName(ticket.user_id) || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {canEditStatus ? (
                          <select
                            value={ticket.status}
                            onChange={(e) =>
                              handleStatusChange(ticket.id, e.target.value as SupportTicket['status'])
                            }
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                              statusConfig[ticket.status].color
                            }`}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                              statusConfig[ticket.status].color
                            }`}
                          >
                            {statusConfig[ticket.status].label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getUserName(ticket.resolved_by) ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                              <UserCheck className="w-3.5 h-3.5 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {getUserName(ticket.resolved_by)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(ticket.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Ticket</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-5">
              {/* Topic */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTicket.topic}
                  onChange={(e) => setNewTicket({ ...newTicket, topic: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Provide more details about your issue (optional)"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <div className="flex gap-3">
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setNewTicket({ ...newTicket, priority })}
                      className={`flex-1 py-2.5 rounded-xl font-medium text-sm border-2 transition-all ${
                        newTicket.priority === priority
                          ? priority === 'low'
                            ? 'bg-slate-100 border-slate-400 text-slate-700'
                            : priority === 'medium'
                            ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                            : 'bg-red-100 border-red-400 text-red-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {priorityConfig[priority].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupportTickets;
