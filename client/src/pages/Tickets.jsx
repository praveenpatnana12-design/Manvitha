import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { Plus, Search, MessageSquare, Send, AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const Tickets = () => {
  const { user } = useAuth();
  const isClient = user.role === 'client';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicketData, setSelectedTicketData] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields: New Ticket
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields: Thread Reply
  const [replyMessage, setReplyMessage] = useState('');
  const [changeStatus, setChangeStatus] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tickets');
      setTickets(response.data);
      // Auto select first ticket if available
      if (response.data.length > 0 && !selectedTicketId) {
        handleSelectTicket(response.data[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load support queries.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (id) => {
    setSelectedTicketId(id);
    setLoadingThread(true);
    try {
      const response = await api.get(`/api/tickets/${id}`);
      setSelectedTicketData(response.data);
      setChangeStatus(response.data.ticket.status);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve discussion thread.', 'error');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject || !description) {
      showToast('Please fill in subject and description.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/api/tickets', {
        subject,
        description,
        priority
      });

      showToast('Support ticket raised successfully!', 'success');
      setIsModalOpen(false);
      setSubject('');
      setDescription('');
      setPriority('medium');
      
      const newTicketId = response.data.ticket?.id || response.data.ticketId;
      if (newTicketId) {
        setSelectedTicketId(newTicketId);
      }

      fetchTickets();
    } catch (err) {
      showToast('Failed to create ticket.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage) return;

    setIsReplying(true);
    try {
      await api.post(`/api/tickets/${selectedTicketId}/reply`, {
        message: replyMessage,
        status: changeStatus !== selectedTicketData.ticket.status ? changeStatus : undefined
      });

      showToast('Reply added successfully!', 'success');
      setReplyMessage('');
      handleSelectTicket(selectedTicketId);
      
      // Update local ticket list status
      setTickets(tickets.map(t => {
        if (t.id === selectedTicketId) {
          return { ...t, status: changeStatus || t.status };
        }
        return t;
      }));
    } catch (err) {
      showToast('Failed to send reply.', 'error');
    } finally {
      setIsReplying(false);
    }
  };

  const getPriorityBadge = (prio) => {
    const classes = {
      low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      medium: 'bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400',
      high: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${classes[prio]}`}>{prio}</span>;
  };

  const getStatusBadge = (status) => {
    const classes = {
      open: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900',
      in_progress: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900',
      closed: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${classes[status]}`}>{status.replace('_', ' ')}</span>;
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    (t.company_name && t.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Toast popup */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Support Ticketing Center
          </h2>
          <p className="text-xs text-slate-500">
            {isClient ? 'Raise billing queries, log address updates, or report rate disputes' : 'Respond to client disputes, update ticket progression states, and review audit threads'}
          </p>
        </div>
        
        {isClient && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-1.5 self-start text-xs font-semibold"
          >
            <Plus size={16} /> Open Ticket
          </button>
        )}
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Ticket List */}
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="form-input pl-9.5 text-xs py-2"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850 max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-20 text-center text-slate-400 italic text-xs">
                No tickets found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    className={`w-full text-left p-4 transition-colors flex flex-col gap-2 ${
                      selectedTicketId === t.id 
                        ? 'bg-brand-50/20 border-l-4 border-brand-600 dark:bg-brand-950/10' 
                        : 'hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-slate-450 uppercase">Ticket #{t.id}</span>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(t.priority)}
                        {getStatusBadge(t.status)}
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                      {t.subject}
                    </h4>
                    {!isClient && (
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        Client: {t.company_name}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 block">
                      Opened: {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Conversation Thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850 h-[72vh] flex flex-col overflow-hidden">
          
          {loadingThread ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
            </div>
          ) : !selectedTicketData ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <HelpCircle size={48} className="text-slate-300 stroke-[1.5] mb-3" />
              <p className="text-sm font-semibold">Select a Support Ticket</p>
              <p className="text-xs mt-1 text-slate-450 max-w-xs">
                Select a ticket from the left panel to review the messaging thread or raise a new ticket to communicate with accounts.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-md" title={selectedTicketData.ticket.subject}>
                    {selectedTicketData.ticket.subject}
                  </h3>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Priority: <span className="font-bold text-slate-600 capitalize mr-3">{selectedTicketData.ticket.priority}</span>
                    Status: <span className="font-bold">{selectedTicketData.ticket.status.toUpperCase()}</span>
                  </span>
                </div>
                
                {/* Status selector (Admin can close ticket, Client can reopen) */}
                <div className="flex items-center gap-2">
                  <select
                    value={changeStatus}
                    onChange={(e) => setChangeStatus(e.target.value)}
                    className="form-input text-[11px] py-1 px-2.5 w-32 cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Message History Bubble Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/20 dark:bg-slate-950/10">
                {selectedTicketData.replies.map((reply) => {
                  const isOwnMessage = reply.user_id === user.id;
                  
                  return (
                    <div 
                      key={reply.id}
                      className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[9px] font-bold text-slate-400 mb-1">
                        {reply.sender_name} ({reply.sender_role})
                      </span>
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isOwnMessage 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-none dark:bg-slate-800 dark:border-slate-750 dark:text-slate-250'
                      }`}>
                        {reply.message}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">
                        {new Date(reply.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Reply Submission Panel */}
              <div className="p-4 border-t border-slate-200/60 dark:border-slate-850">
                <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your message reply here..."
                    className="form-input text-xs py-2.5"
                    disabled={selectedTicketData.ticket.status === 'closed' && changeStatus === 'closed'}
                  />
                  <button
                    type="submit"
                    disabled={isReplying || (!replyMessage && changeStatus === selectedTicketData.ticket.status)}
                    className="btn-primary p-2.5 rounded-xl shrink-0 flex items-center justify-center"
                    title="Send Reply"
                  >
                    <Send size={15} />
                  </button>
                </form>
                {selectedTicketData.ticket.status === 'closed' && (
                  <p className="text-[9px] text-amber-600 font-semibold mt-1">
                    * This ticket is currently closed. Type a message and change the status dropdown to Open/In Progress to reply and reopen the conversation.
                  </p>
                )}
              </div>
            </>
          )}

        </div>

      </div>

      {/* Raise Ticket Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Raise New Support Query"
      >
        <form onSubmit={handleCreateTicket} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            
            {/* Subject */}
            <div>
              <label className="form-label">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Discrepancy on invoice GST details"
                className="form-input text-xs"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="form-label">Query Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="form-input text-xs py-2.5 cursor-pointer"
              >
                <option value="low">Low (Address edits, contact info updates)</option>
                <option value="medium">Medium (Trip log disputes, billing questions)</option>
                <option value="high">High (Late statement errors, double payments)</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="form-label">Detailed Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or query details here. Reference trip dates or invoice numbers where possible..."
                className="form-input text-xs h-32 resize-none"
                required
              />
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end border-t border-slate-200/50 pt-4 mt-6 dark:border-slate-800/50">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <MessageSquare size={14} /> {isSubmitting ? 'Raising Ticket...' : 'Open Ticket'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Tickets;
