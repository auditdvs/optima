import { format } from 'date-fns';
import { addDoc, arrayUnion, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { ArrowLeft, Maximize2, MessageSquare, Minimize2, Plus, Search, Send, Users, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { supabaseService } from '../lib/supabaseService';

interface Message {
  id: string;
  text: string;
  createdAt: any;
  uid?: string;
  senderId?: string;
  displayName?: string;
  role?: string;
}

interface ChatUser {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export default function ChatWidget({ unreadCount = 0 }: { unreadCount?: number }) {
  const { user, userRole } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Navigation State
  const [activeChat, setActiveChat] = useState<'global' | string | null>(null); // null = List View, 'global' or userId = Chat View
  
  // Data State
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [interactedUserIds, setInteractedUserIds] = useState<string[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
  
  const dummy = useRef<HTMLDivElement>(null);

  // 1. Fetch Users List on Mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      
      try {
        // Try fetch from accounts first (preferred)
        const { data: accounts } = await supabaseService
          .from('account')
          .select('user_id, full_name, nickname, profile_pic')
          .order('full_name');

        if (accounts && accounts.length > 0) {
          const mappedAccounts = accounts
            .filter((acc: any) => acc.user_id !== user.id)
            .map((acc: any) => ({
              id: acc.user_id,
              full_name: acc.full_name || acc.nickname,
              avatar_url: acc.profile_pic
            }));
          setUsers(mappedAccounts as ChatUser[]);
          return;
        }

        // Fallback to profiles
        const { data } = await supabaseService
          .from('profiles')
          .select('id, full_name, avatar_url')
          .neq('id', user.id)
          .order('full_name');
        
        if (data) setUsers(data as ChatUser[]);
      } catch (error) {
        console.error("Error fetching users for widget:", error);
      }
    };
    
    if (isOpen) fetchUsers();
  }, [isOpen, user]);

  // 2. Listen to Messages based on Active Chat
  useEffect(() => {
    if (!db || !user || !activeChat) return;

    let q;
    if (activeChat === 'global') {
      q = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(50)
      );
    } else {
      // DM Logic
      const participants = [user.id, activeChat].sort();
      const conversationId = participants.join('_');
      q = query(
        collection(db, 'direct_messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setTimeout(() => dummy.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [activeChat, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChat) return;

    if (activeChat === 'global') {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        createdAt: serverTimestamp(),
        uid: user.id,
        displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
        role: userRole || 'user'
      });
    } else {
      const participants = [user.id, activeChat].sort();
      const conversationId = participants.join('_');
      await addDoc(collection(db, 'direct_messages'), {
        text: newMessage,
        createdAt: serverTimestamp(),
        senderId: user.id,
        receiverId: activeChat,
        conversationId: conversationId,
        isRead: false
      });

      // Update Active Chats for both users
      try {
        await setDoc(doc(db, 'user_chats', user.id), { interactedUsers: arrayUnion(activeChat) }, { merge: true });
        await setDoc(doc(db, 'user_chats', activeChat), { interactedUsers: arrayUnion(user.id) }, { merge: true });
      } catch (err) {
        console.error("Error updating user_chats:", err);
      }
    }

    setNewMessage('');
  };

  const getActiveUser = () => users.find(u => u.id === activeChat);

  // 3. Listen to Interacted Users (for DM filtering)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'user_chats', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInteractedUserIds(data.interactedUsers || []);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 4. Listen for Unreads
  useEffect(() => {
    if (!user) return;

    // Global Unreads
    const globalQuery = query(
      collection(db, 'messages'),
      where('createdAt', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // Last 7 days
      limit(100)
    );

    const unsubGlobal = onSnapshot(globalQuery, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.uid !== user.id && (!data.readBy || !data.readBy.includes(user.id))) {
           count++;
        }
      });
      setUnreadCounts(prev => ({ ...prev, 'global': count }));
    });

    // DM Unreads (Incoming messages not read)
    // We check 'readBy' array because 'isRead' boolean might not be updated by ChatPage logic
    const dmQuery = query(
      collection(db, 'direct_messages'),
      where('receiverId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubDM = onSnapshot(dmQuery, (snapshot) => {
      const counts: {[key: string]: number} = {};
      snapshot.docs.forEach(doc => {
         const data = doc.data();
         // Check if I haven't read it
         if (!data.readBy || !data.readBy.includes(user.id)) {
            const sender = data.senderId;
            if (sender) {
               counts[sender] = (counts[sender] || 0) + 1;
            }
         }
      });
      setUnreadCounts(prev => {
        // Reset all user counts first (to handle reads/removals correctly would require diffing, but simple merge is okay for now if we assume snapshot returns all unreads)
        // Actually, simpler to just start with { global: prev.global } and add new counts
        const cleanCounts: {[key: string]: number} = { 'global': prev.global || 0 };
        return { ...cleanCounts, ...counts };
      });
    });

    return () => {
      unsubGlobal();
      unsubDM();
    };
  }, [user]);

  // Filter users for search - Only show interacted users by default, search searches all
  const filteredUsers = users.filter(u => {
    if (searchTerm.trim()) {
      return u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (showAllUsers) return true;
    return interactedUserIds.includes(u.id);
  });

  if (!user || location.pathname.startsWith('/chat')) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end print:hidden">
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`bg-white rounded-xl shadow-2xl border border-gray-200 w-[350px] transition-all duration-300 flex flex-col overflow-hidden ${isMinimized ? 'h-14 mb-0' : 'h-[500px] mb-4'}`}
        >
          {/* Header */}
          <div 
            className="bg-indigo-600 text-white p-3 flex justify-between items-center cursor-pointer shrink-0" 
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-3">
              {activeChat && !isMinimized && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveChat(null); }}
                  className="p-1 hover:bg-indigo-700 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              
              <div className="flex items-center gap-2">
                {activeChat === 'global' ? (
                   <Users className="w-4 h-4" />
                ) : activeChat ? (
                   <div className="w-5 h-5 rounded-full bg-indigo-400 flex items-center justify-center text-[10px] font-bold">
                     {getActiveUser()?.full_name?.charAt(0).toUpperCase()}
                   </div>
                ) : (
                   <MessageSquare className="w-4 h-4" />
                )}
                
                <span className="font-semibold text-sm truncate max-w-[150px]">
                  {activeChat === 'global' ? 'Optima Team' : activeChat ? getActiveUser()?.full_name : 'Messages'}
                </span>
                {!activeChat && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowAllUsers(!showAllUsers); }}
                    className="p-1 hover:bg-indigo-700 rounded-full transition-colors ml-2"
                    title={showAllUsers ? "Show Direct Messages" : "New Chat"}
                  >
                    <Plus className={`w-4 h-4 transition-all duration-300 ${showAllUsers ? 'rotate-45' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-indigo-700 p-1.5 rounded-md transition-colors">
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-indigo-700 p-1.5 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              
              {/* VIEW 1: USER LIST */}
              {!activeChat && (
                <>
                  <div className="p-3 bg-white border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        placeholder="Search team..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {/* Global Chat Item */}
                    <div 
                      onClick={() => setActiveChat('global')}
                      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-indigo-50 transition-colors border-b border-gray-100/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md overflow-hidden border border-indigo-100 group-hover:ring-2 ring-indigo-200 transition-all">
                          <img 
                            src="https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics/group.jpeg" 
                            alt="Optima Team" 
                            className="w-full h-full object-cover"
                          />
                       </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">IA KOMIDA</h3>
                        <p className="text-xs text-gray-500">Global discussion room</p>
                      </div>
                      {unreadCounts['global'] > 0 && (
                        <div className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in zoom-in-50">
                          {unreadCounts['global']}
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      {showAllUsers ? 'All Contacts' : 'Direct Messages'}
                    </div>

                    {filteredUsers.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => setActiveChat(u.id)}
                        className="p-3 px-4 flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-sm transition-all border-b border-gray-100/50 last:border-0"
                      >
                        <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 shrink-0 shadow-sm">
                           {u.avatar_url ? (
                             <img src={u.avatar_url} alt={u.full_name} className="w-full h-full rounded-full object-cover" />
                           ) : (
                             <span className="font-bold text-xs">{u.full_name?.charAt(0).toUpperCase()}</span>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-800 text-sm truncate">{u.full_name}</h3>
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Online
                          </p>
                        </div>
                        {unreadCounts[u.id] > 0 && (
                           <div className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm animate-in zoom-in-50">
                             {unreadCounts[u.id]}
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* VIEW 2: CHAT ROOM */}
              {activeChat && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No messages yet.</p>
                        <p className="text-xs">Start the conversation!</p>
                      </div>
                    )}
                    
                    {messages.map((msg) => {
                      // Determine if message is mine
                      const isMe = activeChat === 'global' ? msg.uid === user.id : msg.senderId === user.id;
                      
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar (only for others in Global) */}
                            {activeChat === 'global' && !isMe && (
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0 mb-1 ${
                                msg.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                              }`}>
                                {msg.displayName?.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div>
                              {activeChat === 'global' && !isMe && (
                                <div className="text-[10px] text-gray-500 ml-1 mb-0.5">{msg.displayName}</div>
                              )}
                              <div 
                                className={`px-3 py-2 rounded-2xl text-sm shadow-sm break-words ${
                                  isMe 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                }`}
                              >
                                {msg.text}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[9px] text-gray-400 mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={dummy} />
                  </div>

                  {/* Input Area */}
                  <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 text-sm bg-gray-100 border-none rounded-full px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Button (Launch) */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center group active:scale-95 hover:rotate-3 relative"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10 shadow-sm animate-in zoom-in-50">
               {unreadCount > 99 ? '99+' : unreadCount}
             </span>
          )}
        </button>
      )}
    </div>
  );
}
