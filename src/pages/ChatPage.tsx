import { format } from 'date-fns';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { BarChart2, ChevronDown, ChevronUp, Edit2, FileText, History, Image, Info, MessageSquare, MoreVertical, Phone, PhoneOff, Pin, Plus, Reply, Search, Send, Smile, Trash2, Undo, UploadCloud, UserMinus, Users, Video, X } from 'lucide-react';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { db } from '../lib/firebase';
import { supabaseService } from '../lib/supabaseService';




const REACTION_BASE = 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/reaction';
const REACTIONS = [
  { key: 'high_five', label: 'High Five', url: `${REACTION_BASE}/High%20Five%20Emoji.png` },
  { key: 'heart_eyes', label: 'Heart Eyes', url: `${REACTION_BASE}/Heart%20Eyes.png` },
  { key: 'praying', label: 'Praying', url: `${REACTION_BASE}/Praying%20Emoji.png` },
  { key: 'star_eyes', label: 'Star Eyes', url: `${REACTION_BASE}/Star%20Eyes%20Emoji.png` },
  { key: 'surprised', label: 'Surprised', url: `${REACTION_BASE}/Surprised%20Emoji.png` },
  { key: 'omg', label: 'OMG', url: `${REACTION_BASE}/Omg%20Emoji.png` },
  { key: 'angry', label: 'Angry', url: `${REACTION_BASE}/Angry%20Emoji.png` },
  { key: 'call_me', label: 'Call Me', url: `${REACTION_BASE}/Call%20Me%20Emoji.png` },
  { key: 'nail_polish', label: 'Nail Polish', url: `${REACTION_BASE}/Nail%20Polish%20Emoji.png` },
  { key: 'palms', label: 'Palms', url: `${REACTION_BASE}/Palms%20Emoji.png` },
  { key: 'thumbs_down', label: 'Thumbs Down', url: `${REACTION_BASE}/Thumbs%20Down%20Emoji.png` },
  { key: 'heart'  , label: 'Heart', url: `${REACTION_BASE}/heart.png` },
];

interface PollOption {
  id: string;
  text: string;
  voters: string[];
}

interface Poll {
  question: string;
  options: PollOption[];
  allowMultipleAnswers: boolean;
}

interface Message {
  id: string;
  text: string;
  createdAt: any;
  uid?: string;
  senderId?: string;
  displayName?: string;
  role?: string;
  type?: 'text' | 'image' | 'video' | 'file' | 'poll' | 'sticker' | 'call';
  callRoomName?: string;
  isCallEnded?: boolean;
  poll?: Poll;
  fileUrl?: string;
  fileName?: string;
  isPinned?: boolean;
  isRead?: boolean;
  reactions?: { [emoji: string]: string[] };
  isDeleted?: boolean;
  deletedAt?: any;
  isEdited?: boolean;
  editHistory?: { text: string; editedAt: any }[];
  groupId?: string; // Added for group messages
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  readBy?: string[]; // Array of user IDs who read the message
}

interface ChatGroup {
  id: string;
  name: string;
  createdBy: string;
  admins: string[];
  members: string[]; // List of user IDs
  createdAt: any;
}

interface ChatUser {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { onlineUserIds } = usePresence();
  const [activeChat, setActiveChat] = useState<'global' | string | null>(null); // null = List View
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]); // Groups state
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [dmUnreads, setDmUnreads] = useState<{[key: string]: number}>({});
  const [groupUnreads, setGroupUnreads] = useState<{[key: string]: number}>({});
  // Typing Status State
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const lastTypingRef = useRef(0);
  // Using a ref to store raw typing data for the interval to check against
  const typingDataRef = useRef<Record<string, number>>({});

  const [stickers, setStickers] = useState<string[]>([]); // Dynamic Sticker List from Supabase
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // For Confirm Modal
  const [fileCaption, setFileCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [messageToUnsend, setMessageToUnsend] = useState<Message | null>(null); // Unsend Confirmation Modal State

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<ChatUser | null>(null); // For User Profile Popup
  const [showGroupMembers, setShowGroupMembers] = useState(false); // For Group Members Modal
  
  // Group Feature States
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false); // For Kick/View Members

  const [isAdmin, setIsAdmin] = useState(false);
  const isManager = currentUserProfile?.role === 'manager';
  const canManageGroups = isAdmin || isManager;
  const unreadCounts = { ...dmUnreads, ...groupUnreads };

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null);
  const [interactedUserIds, setInteractedUserIds] = useState<string[]>([]);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [showReadByMsgId, setShowReadByMsgId] = useState<string | null>(null);
  





  
  const getDownloadUrl = (url: string | null | undefined, fileName: string | null | undefined) => {
    if (!url) return '#';
    // Return original URL straightforwardly. 
    // Transformations like fl_attachment caused 401 (Unauthorized) or 404s.
    // We handle "download" via fetch+blob in the UI handler.
    return url;
  };
  const dummy = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 0. Fetch My Own Profile
  useEffect(() => {
    const fetchMyProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabaseService
          .from('account')
          .select('full_name, nickname, profile_pic, role') // Include role
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setCurrentUserProfile(data);
          setIsAdmin(data.role === 'superadmin');
        }
      } catch (err) {
        console.error("Error fetching my profile:", err);
      }
    };
    fetchMyProfile();
  }, [user]);

  // 1. Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: accounts, error: accountError } = await supabaseService
          .from('account')
          .select('user_id, full_name, nickname, profile_pic') // Include nickname
          .order('full_name');

        if (accounts && accounts.length > 0) {
          const mappedAccounts = accounts
            .filter((acc: any) => acc.user_id !== user?.id)
            .map((acc: any) => ({
              id: acc.user_id,
              full_name: acc.full_name,
              avatar_url: acc.profile_pic
            }));
          setUsers(mappedAccounts as ChatUser[]);
          return;
        }

        // Fallbacks
        const { data: profiles } = await supabaseService
          .from('profiles')
          .select('*')
          .neq('id', user?.id)
          .order('full_name');

        if (profiles && profiles.length > 0) {
          const mappedProfiles = profiles.map((p: any) => ({
             id: p.id,
             full_name: p.full_name,
             email: p.email,
             avatar_url: p.avatar_url || p.profile_pic
          }));
          setUsers(mappedProfiles as ChatUser[]);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    
    if (user) fetchUsers();
  }, [user]);

  // 2. Listen to Unread Messages (Badge Logic)
  useEffect(() => {
    if (!user) return;

    // Listen to direct_messages where I am receiver and isRead is false
    const q = query(
      collection(db, 'direct_messages'),
      where('receiverId', '==', user.id),
      where('isRead', '==', false)
    );

    const unsubscribeDM = onSnapshot(q, (snapshot) => {
      const counts: {[key: string]: number} = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.senderId) {
          counts[data.senderId] = (counts[data.senderId] || 0) + 1;
        }
      });
      setDmUnreads(counts);
    });

    return () => unsubscribeDM();
  }, [user]);

  // 2.5 Group Unread Logic
  useEffect(() => {
    if (!user || groups.length === 0) return;

    // Note: 'in' query limit is 10. If > 10 groups, we need multiple listeners or a different strategy.
    // For MVP, taking first 10 groups.
    const groupIds = groups.slice(0, 10).map(g => g.id);
    
    if (groupIds.length === 0) return;

    const qGroup = query(
      collection(db, 'group_messages'),
      where('groupId', 'in', groupIds),
      // orderBy('createdAt', 'desc'), // Removing orderBy to avoid index issues. Client-side filter is fine for MVP.
      limit(100)
    );

    const unsubscribeGroup = onSnapshot(qGroup, (snapshot) => {
       const gCounts: {[key: string]: number} = {};
       groupIds.forEach(id => gCounts[id] = 0); // Initialize to 0
       snapshot.docs.forEach(doc => {
          const data = doc.data() as Message;
          // Check sender (support legacy uid)
          const sender = data.senderId || data.uid;
          if (data.groupId && sender !== user.id && (!data.readBy || !data.readBy.includes(user.id))) {
             gCounts[data.groupId] = (gCounts[data.groupId] || 0) + 1;
          }
       });
       setGroupUnreads(prev => ({ ...prev, ...gCounts }));
    });

    return () => unsubscribeGroup();
  }, [user, groups]);

  // Global Chat Unread Listener
  useEffect(() => {
    if (!user) return;
    const qGlobal = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
       let count = 0;
       snapshot.forEach(doc => {
          const data = doc.data() as Message;
          const sender = data.senderId || data.uid;
          if (sender !== user.id && (!data.readBy || !data.readBy.includes(user.id))) {
             count++;
          }
       });
       setGroupUnreads(prev => ({...prev, global: count}));
    });
    return () => unsubscribeGlobal();
  }, [user]);

  // Determine collection name for current chat
  const currentCollectionName = activeChat === 'global' 
    ? 'messages' 
    : (groups.some(g => g.id === activeChat) ? 'group_messages' : 'direct_messages');

  // Handle auto-scroll to unread and marking as read
  useChatScrollAndRead(messages, user, activeChat, dummy, initialScrollDone, setInitialScrollDone, currentCollectionName);

  // Fetch Groups
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'chat_groups'), 
      where('members', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatGroup[];
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch User Chats (Pinned & Interacted)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'user_chats', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInteractedUserIds(data.interactedUsers || []);
        setPinnedUserIds(data.pinnedUsers || []);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Mark Messages as Read
  useEffect(() => {
    if (!user || !activeChat || activeChat === 'global') return;

    const markAsRead = async () => {
      const isGroup = groups.some(g => g.id === activeChat);
      if (isGroup) return; // Group messages don't have individual read status for now

      const conversationId = [user.id, activeChat].sort().join('_');
      // Find unread messages in this conversation
      const q = query(
        collection(db, 'direct_messages'),
        where('conversationId', '==', conversationId),
        where('receiverId', '==', user.id),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach(doc => {
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
      }
    };

    markAsRead();
  }, [activeChat, messages, user, groups]);

  // 4. Listen to Current Chat Messages
  useEffect(() => {
    setInitialScrollDone(false);
    if (!user || !db || !activeChat) return;

    let q;
    let collectionName;
    const isGroup = groups.some(g => g.id === activeChat);

    if (activeChat === 'global') {
      collectionName = 'messages';
      q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (isGroup) {
      collectionName = 'group_messages';
      q = query(
        collection(db, collectionName),
        where('groupId', '==', activeChat),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      collectionName = 'direct_messages';
      const conversationId = [user.id, activeChat].sort().join('_');
      q = query(
        collection(db, collectionName),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      const pinned: Message[] = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Message;
        msgs.push(data);
        if (data.isPinned) pinned.push(data);
      });
      // Reverse to display chronologically (Oldest at top, Newest at bottom)
      setMessages(msgs.reverse());
      setPinnedMessages(pinned);
      setTimeout(() => dummy.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error("Snapshot Error:", error);
      toast.error(`Sync Error: ${error.message}`);
    });

    return () => unsubscribe();
  }, [activeChat, user, groups]);

  // Fetch Stickers from Supabase Storage
  // Fetch stickers
  useEffect(() => {
      // ... existing sticker fetch ...
      if (showStickerPicker && stickers.length === 0) {
         // ...
         const fetchStickers = async () => {
            // ... (keep existing)
            try {
               const { data, error } = await supabaseService.storage.from('sticker').list();
               if (error) throw error;
               if (data) {
                  const urls = data.filter((f: any) => f.name !== '.emptyFolderPlaceholder').map((f: any) => {
                     return supabaseService.storage.from('sticker').getPublicUrl(f.name).data.publicUrl;
                  });
                  setStickers(urls);
               }
            } catch (e) {
               console.error("Error fetching stickers:", e);
               // Fallback
               setStickers([
                  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2Q.../giphy.gif",
                  // ...
               ]);
            }
         };
         fetchStickers();
      }
  }, [showStickerPicker]);

  // 1. Determine Chat ID
  const typingActiveGroup = groups.find(g => g.id === activeChat);
  const typingChatId = activeChat === 'global' ? 'global' : (typingActiveGroup ? typingActiveGroup.id : (activeChat && user ? [user.id, activeChat].sort().join('_') : null));

  // 2. Handle Input Change
  const handleTyping = async () => {
    if (!typingChatId || !user) return;
    const now = Date.now();
    
    // Throttle updates to every 3 seconds
    if (now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now;
      try {
        // Write to Firestore subcollection
        // Using setDoc to overwrite/update timestamp
        await setDoc(doc(db, 'typing_status', typingChatId, 'users', user.id), {
          displayName: currentUserProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          lastTyped: serverTimestamp() // Server time
        });
      } catch (e) {
        console.error("Error updating typing status", e);
      }
    }
  };

  // 3. Listen for Typing Users
  useEffect(() => {
    if (!typingChatId || !user) {
       setTypingUsers([]);
       return;
    }

    const q = query(collection(db, 'typing_status', typingChatId, 'users'));
    
    const unsub = onSnapshot(q, (snapshot) => {
       const now = Date.now();
       const newData: Record<string, number> = {};
       
       snapshot.forEach(doc => {
          if (doc.id === user.id) return; // Ignore self
          const data = doc.data();
          if (data.lastTyped) {
             // Convert firestore timestamp to millis
             const typedTime = data.lastTyped.toMillis ? data.lastTyped.toMillis() : (data.lastTyped.seconds * 1000);
             // Verify it's recent (last 5s)
             if (now - typedTime < 5000) {
                 newData[data.displayName || 'Someone'] = typedTime;
             }
          }
       });
       
       typingDataRef.current = newData;
       setTypingUsers(Object.keys(newData));
    });

    // Interval to prune old typing statuses
    const interval = setInterval(() => {
       const now = Date.now();
       let changed = false;
       const currentData = { ...typingDataRef.current };
       
       Object.keys(currentData).forEach(name => {
          if (now - currentData[name] > 5000) {
             delete currentData[name];
             changed = true;
          }
       });
       
       if (changed) {
          typingDataRef.current = currentData;
          setTypingUsers(Object.keys(currentData));
       }
    }, 1000);

    return () => {
       unsub();
       clearInterval(interval);
    };
  }, [typingChatId, user]);

  // 5. Send Message
  const sendMessage = async (fileData?: { type: 'image' | 'video' | 'file' | 'sticker', url: string, name: string, text?: string }, pollData?: Poll) => {
    if ((!newMessage.trim() && !fileData && !pollData) || !user || !activeChat) return;
    
    // Close pickers
    setShowStickerPicker(false);
    setShowAttachMenu(false);

    // OPTIMISTIC CLEARING
    const textToSend = fileData?.text || newMessage;
    setNewMessage(''); // Clear immediately
    setReplyingTo(null); // Clear replyingTo state

    const messagePayload = {
      text: textToSend,
      createdAt: serverTimestamp(),
      type: fileData ? fileData.type : (pollData ? 'poll' : 'text'),
      poll: pollData || null,
      fileUrl: fileData ? fileData.url : null,
      fileName: fileData ? fileData.name : null,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text || (replyingTo.fileUrl ? (replyingTo.fileName || 'Attachment') : (replyingTo.poll ? 'Poll' : '')),
        senderName: users.find(u => u.id === (replyingTo.uid || replyingTo.senderId))?.full_name || replyingTo.displayName || 'Unknown'
      } : null,
      readBy: [user.id], // I have read my own message
      isPinned: false,
      isRead: false,
      isDeleted: false,
    };

    const senderInfo = {
       uid: user.id, // For global chat, this is the sender's ID
       senderId: user.id, // For DMs and Groups, this is the sender's ID
       displayName: currentUserProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
       role: currentUserProfile?.role || 'user'
    };
    
    const isGroup = groups.some(g => g.id === activeChat);

    try {
      if (activeChat === 'global') {
        await addDoc(collection(db, 'messages'), { ...messagePayload, ...senderInfo });
      } else if (isGroup) {
        await addDoc(collection(db, 'group_messages'), { 
          ...messagePayload, 
          ...senderInfo,
          groupId: activeChat // Link to the group
        });
      } else {
        // Direct Message
        const conversationId = [user.id, activeChat].sort().join('_');
        await addDoc(collection(db, 'direct_messages'), { 
          ...messagePayload, 
          ...senderInfo,
          receiverId: activeChat, // The other user's ID
          conversationId: conversationId
        });

        // Update Active Chats
        await setDoc(doc(db, 'user_chats', user.id), { interactedUsers: arrayUnion(activeChat) }, { merge: true });
        await setDoc(doc(db, 'user_chats', activeChat), { interactedUsers: arrayUnion(user.id) }, { merge: true });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      if (!fileData && !pollData) setNewMessage(textToSend); // Restore if failed
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      toast.error("Question required");
      return;
    }
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error("Minimum 2 options required");
      return;
    }

    const pollData: Poll = {
      question: pollQuestion,
      options: validOptions.map(text => ({ 
        id: Math.random().toString(36).substr(2, 9), 
        text, 
        voters: [] 
      })),
      allowMultipleAnswers: pollAllowMultiple
    };

    await sendMessage(undefined, pollData);
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowMultiple(false);
  };

  const handleVote = async (msg: Message, optionId: string) => {
    if (!user || !activeChat || !msg.poll) return;

    const poll = msg.poll;
    const optionIndex = poll.options.findIndex(o => o.id === optionId);
    if (optionIndex === -1) return;

    const option = poll.options[optionIndex];
    const hasVoted = option.voters.includes(user.id);
    
    let newOptions = [...poll.options];

    if (!poll.allowMultipleAnswers) {
       // Single choice: Remove user from all other options
       newOptions = newOptions.map(o => ({
         ...o,
         voters: o.voters.filter(v => v !== user.id)
       }));
    }

    // Toggle vote
    const targetOption = newOptions[optionIndex]; // Refetch from new array
    if (hasVoted) {
       // If currently voted -> remove
       // If single choice, we just removed it above, so we are done (it's already removed)
       // Wait, if single choice and hasVoted is true, line above removed it.
       // So we don't need to do anything else for removal?
       // Yes.
       // But if multiple choice, we assume line above didn't run.
       if (poll.allowMultipleAnswers) {
          targetOption.voters = targetOption.voters.filter(v => v !== user.id);
       }
    } else {
       // Add vote
       targetOption.voters.push(user.id);
    }

    try {
      const isGroup = groups.some(g => g.id === activeChat);
      const collectionName = activeChat === 'global' ? 'messages' : (isGroup ? 'group_messages' : 'direct_messages');
      
      await updateDoc(doc(db, collectionName, msg.id), {
        poll: { ...poll, options: newOptions }
      });
    } catch (err) {
      console.error("Vote error:", err);
      toast.error("Failed to vote");
    }
  };

  const handleUnsend = (msg: Message) => {
    setMessageToUnsend(msg);
  };

  const confirmUnsend = async () => {
    if (!messageToUnsend || !user || !activeChat) return;
    const msg = messageToUnsend;

    try {
      const isGroup = groups.some(g => g.id === activeChat);
      const collectionName = activeChat === 'global' ? 'messages' : (isGroup ? 'group_messages' : 'direct_messages');
      
      await updateDoc(doc(db, collectionName, msg.id), {
        isDeleted: true,
        deletedAt: serverTimestamp()
      });
      toast.success("Message unsent");
      setMessageToUnsend(null);
    } catch (error) {
      console.error("Error unsending:", error);
      toast.error("Failed to unsend");
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = async (msg: Message) => {
    if (!editText.trim() || editText === msg.text) {
      setEditingMessageId(null);
      return;
    }
    try {
      const isGroup = groups.some(g => g.id === activeChat);
      const collectionName = activeChat === 'global' ? 'messages' : (isGroup ? 'group_messages' : 'direct_messages');

      await updateDoc(doc(db, collectionName, msg.id), {
        text: editText,
        isEdited: true,
        editHistory: arrayUnion({
          text: msg.text,
          editedAt: new Date().toISOString() // Store ISO string for simplicity in history
        })
      });
      setEditingMessageId(null);
      toast.success("Message edited");
    } catch (error) {
      console.error("Error editing:", error);
      toast.error("Failed to edit");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
       toast.error("Group name required");
       return;
    }
    if (selectedGroupMembers.length === 0) {
       toast.error("Select at least 1 member");
       return;
    }

    try {
       await addDoc(collection(db, 'chat_groups'), {
         name: newGroupName,
         createdBy: user?.id,
         admins: [user?.id], // Creator is admin
         members: [user?.id, ...selectedGroupMembers],
         createdAt: serverTimestamp()
       });
       toast.success("Group created!");
       setShowCreateGroup(false);
       setNewGroupName('');
       setSelectedGroupMembers([]);
    } catch(err) {
       console.error("Error creating group:", err);
       toast.error("Failed to create group");
    }
  };

  const activeGroup = groups.find(g => g.id === activeChat);

  const handleKickMember = (memberId: string) => {
     setKickConfirmId(memberId);
  };

  const confirmKickMember = async () => {
     if (!activeGroup || !kickConfirmId) return;
     try {
       const newMembers = activeGroup.members.filter(id => id !== kickConfirmId);
       await updateDoc(doc(db, 'chat_groups', activeGroup.id), {
         members: newMembers
       });
       toast.success("User removed from group");
       setKickConfirmId(null);
     } catch (err) {
       console.error("Kick error:", err);
       toast.error("Failed to remove user");
     }
  };

  const handleDeleteGroup = async () => {
     if (!activeGroup) return;
     try {
        await deleteDoc(doc(db, 'chat_groups', activeGroup.id));
        toast.success("Group deleted");
        setShowDeleteGroupConfirm(false);
        setShowGroupInfo(false);
        setActiveChat(null);
     } catch (err) {
        console.error("Delete group error:", err);
        toast.error("Failed to delete group");
     }
  };


  // 6. Handle File Selection (Pre-Upload)
  const handleFileSelect = (file: File) => {
    // Validate File Size (100MB)
    const MAX_SIZE = 100 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      toast.error("File terlalu besar (Maks 100MB)");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setFileCaption('');
    
    // Create preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
       const url = URL.createObjectURL(file);
       setPreviewUrl(url);
    } else {
       setPreviewUrl(null);
    }
    
    setShowAttachMenu(false);
  };

  // Actual Upload Logic (triggered from Modal)
  const confirmUpload = async () => {
    if (!selectedFile) return;
    const file = selectedFile;

    setIsUploading(true);
    // Close modal immediately or wait? 
    // Usually better to show progress, but for now we close modal and show spinner in global state
    setSelectedFile(null); 
    setPreviewUrl(null);

    try {
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      let publicUrl = '';

      if (isPdf) {
         const BUCKET_NAME = 'pdf_attachment';
         const { data: buckets } = await supabaseService.storage.listBuckets();
         if (!buckets?.find(b => b.name === BUCKET_NAME)) {
            await supabaseService.storage.createBucket(BUCKET_NAME, { public: true, fileSizeLimit: 100 * 1024 * 1024 });
         }

         const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
         const filePath = `${Date.now()}_${sanitizedName}`;

         const { error: uploadError } = await supabaseService.storage.from(BUCKET_NAME).upload(filePath, file);
         if (uploadError) throw uploadError;

         const { data } = supabaseService.storage.from(BUCKET_NAME).getPublicUrl(filePath);
         publicUrl = data.publicUrl;

      } else {
         const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dax1rl7fm'; 
         const UPLOAD_PRESET = 'optima-chat'; 
         const formData = new FormData();
         formData.append('file', file);
         formData.append('upload_preset', UPLOAD_PRESET);

         const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
             method: 'POST', body: formData
         });
         if (!response.ok) throw new Error('Cloudinary upload failed');
         const data = await response.json();
         publicUrl = data.secure_url;
      }

      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Send Message with Caption
      await sendMessage({ 
         type, 
         url: publicUrl, 
         name: file.name, 
         text: fileCaption.trim() // Send caption as text
      });
      toast.success('File sent!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const MAX_PINNED = 2;

  const togglePin = async (message: Message) => {
    if (!activeChat) return;
    const isGroup = groups.some(g => g.id === activeChat);
    const collectionName = activeChat === 'global' ? 'messages' : (isGroup ? 'group_messages' : 'direct_messages');
    try {
      if (message.isPinned) {
        // Simply unpin
        await updateDoc(doc(db, collectionName, message.id), { isPinned: false });
        toast.success("Message unpinned");
      } else {
        // Check current pinned count
        const currentPinned = pinnedMessages
          .filter(m => m.id !== message.id)
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeA - timeB; // oldest first
          });

        // If already at max, unpin the oldest
        if (currentPinned.length >= MAX_PINNED) {
          const oldest = currentPinned[0];
          await updateDoc(doc(db, collectionName, oldest.id), { isPinned: false });
        }

        // Pin the new message
        await updateDoc(doc(db, collectionName, message.id), { isPinned: true });
        toast.success("Pinned to top");
      }
    } catch (error) {
      console.error("Pin error:", error);
      toast.error("Failed to pin message");
    }
  };

  const handleReaction = async (message: Message, emoji: string) => {
    if (!activeChat || !user) return;
    // Prevent reacting to own messages
    const isMine = activeChat === 'global' ? message.uid === user.id : message.senderId === user.id;
    if (isMine) return;

    const isGroup = groups.some(g => g.id === activeChat);
    const collectionName = activeChat === 'global' ? 'messages' : (isGroup ? 'group_messages' : 'direct_messages');
    try {
      const msgRef = doc(db, collectionName, message.id);
      const currentReactions = { ...(message.reactions || {}) };
      const emojiReactors = currentReactions[emoji] || [];
      const hasReacted = emojiReactors.includes(user.id);

      if (hasReacted) {
        // Remove reaction (toggle off same emoji)
        const updated = emojiReactors.filter((id: string) => id !== user.id);
        if (updated.length === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = updated;
        }
        await updateDoc(msgRef, { reactions: currentReactions });
      } else {
        // Remove user from any existing reaction first (max 1 reaction per user)
        for (const key of Object.keys(currentReactions)) {
          currentReactions[key] = (currentReactions[key] as string[]).filter((id: string) => id !== user.id);
          if (currentReactions[key].length === 0) {
            delete currentReactions[key];
          }
        }
        // Add new reaction
        currentReactions[emoji] = [...(currentReactions[emoji] || []), user.id];
        await updateDoc(msgRef, { reactions: currentReactions });
      }
    } catch (error) {
      console.error('Reaction error:', error);
      toast.error('Failed to react');
    }
  };

  const getActivechatUser = () => users.find(u => u.id === activeChat);

  const handlePinUser = async (e: React.MouseEvent, targetId: string) => {
     e.stopPropagation();
     if (!user) return;
     const isPinned = pinnedUserIds.includes(targetId);
     await setDoc(doc(db, 'user_chats', user.id), {
        pinnedUsers: isPinned ? arrayRemove(targetId) : arrayUnion(targetId)
     }, { merge: true });
     toast.success(isPinned ? "User unpinned" : "User pinned");
  };

  const displayUsers = (() => {
     if (searchTerm.trim()) {
        return users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
     }
     const pinned = users.filter(u => pinnedUserIds.includes(u.id));
     const recent = users.filter(u => interactedUserIds.includes(u.id) && !pinnedUserIds.includes(u.id));
       const list = [...pinned, ...recent];
      if (activeChat && activeChat !== 'global' && !groups.some(g => g.id === activeChat)) {
         const activeUser = users.find(u => u.id === activeChat);
         if (activeUser && !list.some(u => u.id === activeChat)) {
            return [...pinned, activeUser, ...recent];
         }
      }
      return list;
  })();

  // 7. Calculate Matches & Auto-scroll
  useEffect(() => {
    if (!chatSearchTerm) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    
    // Find all matching message IDs
    const matches = messages
      .filter(msg => 
        msg.text?.toLowerCase().includes(chatSearchTerm.toLowerCase()) || 
        msg.poll?.question?.toLowerCase().includes(chatSearchTerm.toLowerCase()) || 
        msg.fileName?.toLowerCase().includes(chatSearchTerm.toLowerCase())
      )
      .map(msg => msg.id);

    setSearchMatches(matches);
    // Focus on the LAST match (most recent at bottom) initially, if any
    setCurrentMatchIndex(matches.length > 0 ? matches.length - 1 : -1);
  }, [chatSearchTerm, messages]);

  // 8. Scroll to Current Match logic
  useEffect(() => {
    if (currentMatchIndex >= 0 && searchMatches[currentMatchIndex]) {
       const element = document.getElementById(`msg-${searchMatches[currentMatchIndex]}`);
       if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Flash animation
          element.classList.add('animate-pulse');
          setTimeout(() => element.classList.remove('animate-pulse'), 1000);
       }
    }
  }, [currentMatchIndex, searchMatches]);


  // 9. Video/Voice Call
  const startCall = async (type: 'audio' | 'video') => {
    if (!user || !activeChat) return;
    
    // Generate unique room name/ID (PeerJS compatible: alphanumeric, underscores)
    const roomSuffix = Date.now().toString(36);
    const idPrefix = 'optima'; 
    const roomName = `${idPrefix}_${roomSuffix}`; // e.g. optima_k92...
    
    // Send a call message to the chat
    const callerName = currentUserProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const callText = type === 'video' 
      ? `${callerName} memulai Video Call` 
      : `${callerName} memulai Voice Call`;

    const messagePayload = {
      text: callText,
      createdAt: serverTimestamp(),
      type: 'call' as const,
      callRoomName: roomName,
      uid: user.id,
      senderId: user.id,
      displayName: callerName,
      role: currentUserProfile?.role || 'user',
      readBy: [user.id],
      isPinned: false,
      isRead: false,
      isDeleted: false,
      replyTo: null,
      fileUrl: null,
      fileName: null,
      poll: null,
      isCallEnded: false
    };

    const isGroup = groups.some(g => g.id === activeChat);
    let docRef: any;
    let targetCollection = 'direct_messages';
    
    try {
      if (activeChat === 'global') {
        targetCollection = 'messages';
        docRef = await addDoc(collection(db, 'messages'), messagePayload);
      } else if (isGroup) {
        targetCollection = 'group_messages';
        docRef = await addDoc(collection(db, 'group_messages'), { ...messagePayload, groupId: activeChat });
      } else {
        targetCollection = 'direct_messages';
        const conversationId = [user.id, activeChat].sort().join('_');
        docRef = await addDoc(collection(db, 'direct_messages'), { 
          ...messagePayload, 
          receiverId: activeChat, 
          conversationId 
        });
        await setDoc(doc(db, 'user_chats', user.id), { interactedUsers: arrayUnion(activeChat) }, { merge: true });
        await setDoc(doc(db, 'user_chats', activeChat), { interactedUsers: arrayUnion(user.id) }, { merge: true });
      }

      // Open the call in new tab
      const hostParam = 'true';
      const msgId = docRef.id;
      // Encode collection to be safe? usually generic string
      const url = `/video-call?room=${roomName}&type=${type}&host=${hostParam}&msgId=${msgId}&collection=${targetCollection}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Gagal memulai panggilan');
    }
  };

  const joinCall = (roomName: string, type: 'audio' | 'video' = 'video') => {
      const hostParam = 'false';
      const url = `/video-call?room=${roomName}&type=${type}&host=${hostParam}`;
      window.open(url, '_blank', 'noopener,noreferrer');
  };


    
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
      <div className={`w-full lg:w-80 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div 
            onClick={() => setActiveChat('global')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${activeChat === 'global' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${activeChat === 'global' ? 'bg-white border-indigo-100' : 'bg-gray-200'}`}>
              <img 
                src="https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics/group.jpeg" 
                alt="Optima Team" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">IA KOMIDA</h3>
              <p className={`text-xs ${activeChat === 'global' ? 'text-indigo-500' : 'text-gray-500'}`}>Global discussion</p>
            </div>
            {unreadCounts['global'] > 0 && (
               <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
                  {unreadCounts['global'] > 9 ? '9+' : unreadCounts['global']}
               </div>
            )}
          </div>

          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-4 mb-1 flex justify-between items-center group">
            <span>Groups</span>
            {canManageGroups && (
               <button 
                 onClick={() => setShowCreateGroup(true)}
                 className="p-1 rounded hover:bg-indigo-100 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                 title="Create New Group"
               >
                 <Plus className="w-3.5 h-3.5" />
               </button>
            )}
          </div>

          {groups.map(group => (
             <div 
               key={group.id}
               onClick={() => setActiveChat(group.id)}
               className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all relative ${activeChat === group.id ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
             >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                   <Users className="w-5 h-5" />
                </div>
                 <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{group.members.length} members</p>
                 </div>
                 {unreadCounts[group.id] > 0 && (
                   <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
                      {unreadCounts[group.id] > 9 ? '9+' : unreadCounts[group.id]}
                   </div>
                 )}
              </div>
          ))}

          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-4 mb-1 flex justify-between items-center group">
            <span>Direct Messages</span>
            <button 
               onClick={() => setShowNewChatModal(true)}
               className="p-1 rounded hover:bg-indigo-100 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
               title="New Chat"
            >
               <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {displayUsers.map(chatUser => (
            <div 
              key={chatUser.id}
              onClick={() => setActiveChat(chatUser.id)}
              className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all relative group/item ${activeChat === chatUser.id ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 overflow-hidden shrink-0 shadow-sm relative">
                 {chatUser.avatar_url ? (
                   <img src={chatUser.avatar_url} alt={chatUser.full_name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="font-bold">{chatUser.full_name?.charAt(0).toUpperCase()}</span>
                 )}
                 {onlineUserIds.has(chatUser.id) && (
                   <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                 )}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center">
                   <h3 className="font-semibold text-sm truncate flex items-center gap-1">
                      {chatUser.full_name}
                      {pinnedUserIds.includes(chatUser.id) && <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500 rotate-45" />}
                   </h3>
                   {unreadCounts[chatUser.id] > 0 && (
                     <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                       {unreadCounts[chatUser.id]}
                     </span>
                   )}
                 </div>
                 <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                   {onlineUserIds.has(chatUser.id) ? 'Online' : 'Offline'}
                 </p>
              </div>

              {/* Pin Button (Visible on Hover) */}
              <button 
                onClick={(e) => handlePinUser(e, chatUser.id)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white shadow-sm transition-all ${pinnedUserIds.includes(chatUser.id) ? 'opacity-100 text-indigo-600 bg-white' : 'opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-indigo-600'}`}
                title={pinnedUserIds.includes(chatUser.id) ? "Unpin User" : "Pin User"}
              >
                 <Pin className={`w-3.5 h-3.5 ${pinnedUserIds.includes(chatUser.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
          ))}

        </div>
      </div>
      
      {/* User Profile Modal */}
      {/* User Profile Modal */}
      {selectedUserProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedUserProfile(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            {/* Header Banner */}
            <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
              <button 
                onClick={() => setSelectedUserProfile(null)} 
                className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-all backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 pb-8 pt-12 relative flex flex-col items-center text-center">
              {/* Avatar - Centered & Overlapping */}
              <div className="w-28 h-28 rounded-full bg-white p-1 absolute -top-14 left-1/2 -translate-x-1/2 shadow-xl ring-4 ring-white">
                <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-gray-400 border border-gray-100">
                  {selectedUserProfile.avatar_url ? (
                    <img src={selectedUserProfile.avatar_url} alt={selectedUserProfile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    selectedUserProfile.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              
              {/* User Info */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedUserProfile.full_name}</h3>
              <p className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full mb-6">
                {selectedUserProfile.email}
              </p>
              
              {/* Action Button */}
              <button 
                onClick={() => {
                  setActiveChat(selectedUserProfile.id);
                  setSelectedUserProfile(null);
                }}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 group"
              >
                <MessageSquare className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowCreateGroup(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Create New Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Team Regional A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500">
                          {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" /> : u.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{u.full_name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedGroupMembers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupMembers([...selectedGroupMembers, u.id]);
                          } else {
                            setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== u.id));
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateGroup}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfo && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowGroupInfo(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">{activeGroup.name}</h3>
                <button onClick={() => setShowGroupInfo(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Created by: {activeGroup.createdBy === user?.id ? 'You' : (users.find(u => u.id === activeGroup.createdBy)?.full_name || 'Unknown')}
              </p>

              <h4 className="text-lg font-semibold text-gray-800 mb-3">Members ({activeGroup.members.length})</h4>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {activeGroup.members.map(memberId => {
                  const isCurrentUser = user?.id === memberId;
                  let member = users.find(u => u.id === memberId);
                  
                  if (isCurrentUser) {
                     // Fallback for current user since 'users' array usually excludes self
                     member = {
                        id: user.id,
                        full_name: currentUserProfile?.full_name || 'You',
                        avatar_url: currentUserProfile?.profile_pic || user?.user_metadata?.avatar_url,
                        email: user?.email
                     } as ChatUser;
                  }

                  const isCreator = activeGroup.createdBy === memberId;
                  const canKick = canManageGroups && !isCreator && !isCurrentUser; 

                  return (
                    <div key={memberId} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500">
                          {member?.avatar_url ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" /> : member?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                           {isCurrentUser ? 'You' : (member?.full_name || 'Unknown User')}
                        </span>
                        {isCreator && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Creator</span>}
                        {activeGroup.admins.includes(memberId) && !isCreator && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>}
                      </div>
                      {canKick && (
                        <button
                          onClick={() => handleKickMember(memberId)}
                          className="p-1.5 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                          title="Kick from group"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Delete Group Button for Creator/Admin */}
              {(activeGroup.createdBy === user?.id || isAdmin) && (
                 <div className="mt-6 border-t border-gray-100 pt-4">
                    <button 
                       onClick={() => setShowDeleteGroupConfirm(true)}
                       className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 py-2.5 rounded-lg font-semibold transition-all"
                    >
                       <Trash2 className="w-4 h-4" />
                       Delete Group
                    </button>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeChat ? (
        <div 
           className={`flex-1 flex flex-col bg-slate-50 relative ${!activeChat ? 'hidden lg:flex' : 'flex'}`}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
        >
           {/* Drag Overlay */}
           {isDragging && (
              <div className="absolute inset-0 z-50 bg-indigo-50/90 backdrop-blur-sm border-4 border-dashed border-indigo-500 rounded-lg flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                 <UploadCloud className="w-24 h-24 text-indigo-600 mb-4 animate-bounce" />
                 <h3 className="text-3xl font-bold text-indigo-800">Drop file here to send</h3>
              </div>
           )}

      {/* File Upload Confirmation Modal (Scoped to Chat Area) */}
      {selectedFile && (
        <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200 rounded-lg overflow-hidden">
           {/* Header */}
           <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 bg-white/50">
              <button 
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                 <X className="w-6 h-6" />
              </button>
              <h3 className="font-bold text-gray-800 truncate max-w-[50%]">{selectedFile.name}</h3>
              <div className="w-10" /> {/* Spacer */}
           </div>

           {/* Preview Area */}
           <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden bg-gray-50/50">
               <div className="relative max-w-full max-h-full flex flex-col items-center justify-center">
                  {selectedFile.type.startsWith('image/') && previewUrl ? (
                     <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white p-2">
                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-[50vh] object-contain rounded-lg" />
                     </div>
                  ) : selectedFile.type.startsWith('video/') && previewUrl ? (
                     <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-black">
                        <video src={previewUrl} controls className="max-w-full max-h-[50vh]" />
                     </div>
                  ) : (
                     <div className="bg-white p-12 rounded-3xl flex flex-col items-center text-center shadow-xl border border-gray-100">
                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-500">
                           <FileText className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-800 mb-2">File Preview Unavailable</h4>
                        <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-gray-100 rounded-full">
                           <span className="text-xs font-semibold text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                           <div className="w-1 h-1 rounded-full bg-gray-400" />
                           <span className="text-xs font-bold text-gray-600 uppercase">{selectedFile.name.split('.').pop()}</span>
                        </div>
                     </div>
                  )}
               </div>
           </div>

           {/* Footer / Input */}
           <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-4 shadow-lg ring-1 ring-black/5">
              <div className="flex-1 bg-gray-100 hover:bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3 transition-all border border-transparent focus-within:border-indigo-500">
                 <Smile className="w-6 h-6 text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors" />
                 <input 
                    type="text" 
                    value={fileCaption}
                    onChange={(e) => setFileCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 flex-1 text-sm outline-none font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                       if (e.key === 'Enter') confirmUpload();
                    }}
                 />
              </div>
              <button 
                 onClick={confirmUpload}
                 className="p-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl text-white shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center group"
              >
                 <Send className="w-5 h-5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
           </div>
        </div>
      )}

          <div className="bg-white border-b border-gray-200 flex flex-col shadow-sm shrink-0 z-20">
            <div className="h-16 flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                 <button onClick={() => setActiveChat(null)} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 </button>

                 {activeChat === 'global' ? (
                   <>
                     <div 
                       className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors -ml-2 pr-4 group"
                       onClick={() => setShowGroupMembers(true)}
                     >
                       <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md overflow-hidden border border-indigo-100 group-hover:ring-2 ring-indigo-200 transition-all">
                          <img 
                            src="https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics/group.jpeg" 
                            alt="Optima Team" 
                            className="w-full h-full object-cover"
                          />
                       </div>
                       <div>
                         <h2 className="font-bold text-gray-900 leading-tight group-hover:text-indigo-700 transition-colors">IA KOMIDA</h2>
                         <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                           {typingUsers.length > 0 ? (
                              <span className="text-indigo-600 animate-pulse font-semibold">
                                 {typingUsers.length > 2 ? `${typingUsers.length} people typing...` : `${typingUsers.join(', ')} is typing...`}
                              </span>
                           ) : (
                              <>
                                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {users.filter(u => onlineUserIds.has(u.id)).length} Online
                              </>
                           )}
                         </p>
                       </div>
                     </div>
                   </>
                 ) : activeGroup ? (
                   <>
                     <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-lg -ml-2 pr-4" onClick={() => setShowGroupInfo(true)}>
                       <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
                          <Users className="w-5 h-5" />
                       </div>
                       <div>
                          <h2 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
                            {activeGroup.name}
                            <Info className="w-3.5 h-3.5 text-gray-400" />
                          </h2>
                          <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                             {typingUsers.length > 0 ? (
                                <span className="text-indigo-600 animate-pulse font-semibold">
                                   {typingUsers.length > 2 ? `${typingUsers.length} people typing...` : `${typingUsers.join(', ')} is typing...`}
                                </span>
                             ) : (
                                `${activeGroup.members.length} members`
                             )}
                          </p>
                        </div>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm overflow-hidden">
                        {getActivechatUser()?.avatar_url ? (
                          <img src={getActivechatUser()?.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold">{getActivechatUser()?.full_name?.charAt(0).toUpperCase()}</span>
                        )}
                     </div>
                     <div>
                        <h2 className="font-bold text-gray-900 leading-tight">{getActivechatUser()?.full_name}</h2>
                        <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                           {typingUsers.length > 0 ? (
                              <span className="text-indigo-600 animate-pulse font-semibold">typing...</span>
                           ) : (
                              getActivechatUser()?.email
                           )}
                        </p>
                      </div>
                   </>
                 )}
               </div>
               
               {/* Chat Search Header with Navigation */}
               <div className="flex items-center gap-2">
                  {showChatSearch ? (
                     <div className="relative animate-in slide-in-from-right-5 duration-200 flex items-center bg-white border border-gray-300 rounded-full pr-1 pl-3 py-1 shadow-sm gap-2">
                        <input 
                          autoFocus
                          type="text"
                          value={chatSearchTerm}
                          onChange={(e) => setChatSearchTerm(e.target.value)}
                          placeholder="Search..."
                          className="text-sm border-none focus:ring-0 w-24 lg:w-32 transition-all outline-none bg-transparent p-0"
                        />
                        
                        {searchMatches.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 font-medium px-1 border-l border-gray-200 pl-2">
                             <span>{currentMatchIndex + 1} of {searchMatches.length}</span>
                             <div className="flex flex-col">
                                <button 
                                  onClick={() => setCurrentMatchIndex(prev => prev > 0 ? prev - 1 : prev)}
                                  disabled={currentMatchIndex <= 0}
                                  className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => setCurrentMatchIndex(prev => prev < searchMatches.length - 1 ? prev + 1 : prev)}
                                  disabled={currentMatchIndex >= searchMatches.length - 1}
                                  className="hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                             </div>
                          </div>
                        )}

                        <button 
                          onClick={() => { setChatSearchTerm(''); setShowChatSearch(false); }}
                          className="ml-1 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                     </div>
                  ) : (
                     <div className="flex items-center gap-1">

                        <button
                          onClick={() => startCall('video')}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Video Call"
                        >
                          <Video className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowChatSearch(true)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                          title="Search in conversation"
                        >
                          <Search className="w-5 h-5" />
                        </button>
                     </div>
                  )}
               </div>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="bg-amber-50 border-t border-amber-100 divide-y divide-amber-100 animate-in slide-in-from-top-2 duration-300">
                 {pinnedMessages.slice(-MAX_PINNED).map((pinnedMsg, idx) => (
                    <div
                      key={pinnedMsg.id}
                      className="px-4 py-2 flex items-center gap-2 text-xs text-amber-800 cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => {
                        const el = document.getElementById(`msg-${pinnedMsg.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2', 'rounded-2xl', 'shadow-2xl');
                          setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2', 'rounded-2xl', 'shadow-2xl'), 1500);
                        }
                      }}
                    >
                       <Pin className="w-3 h-3 flex-shrink-0 fill-amber-700" />
                       <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold">Pinned Message {pinnedMessages.length > 1 ? `#${idx + 1}` : ''}</span>
                          <span className="truncate block opacity-80 max-w-full">{(() => { const t = (pinnedMsg.text || 'Attachment').replace(/\n/g, ' '); return t.length > 100 ? t.slice(0, 100) + '...' : t; })()}</span>
                       </div>
                    </div>
                 ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-8 flex flex-col bg-slate-50">
             {messages.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                 <MessageSquare className="w-16 h-16 mb-4" />
                 <p className="text-lg font-medium">No messages yet</p>
                 <p className="text-sm">Start the conversation!</p>
               </div>
             )}
             {messages.filter(msg => !msg.isDeleted || canManageGroups).map((msg, index, arr) => {
              const isMe = activeChat === 'global' ? msg.uid === user?.id : msg.senderId === user?.id;
              const senderProfile = users.find(u => u.id === msg.uid);
              
              const isMatch = chatSearchTerm && (
                msg.text?.toLowerCase().includes(chatSearchTerm.toLowerCase()) || 
                msg.poll?.question?.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
                msg.fileName?.toLowerCase().includes(chatSearchTerm.toLowerCase())
              );

              // Timestamp Grouping Logic (using filtered array 'arr')
              const nextMsg = arr[index + 1];
              const prevMsg = arr[index - 1];
              
              const currentMsgTime = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '';
              const nextMsgTime = nextMsg?.createdAt?.toDate ? format(nextMsg.createdAt.toDate(), 'HH:mm') : '';
              const isSameSender = nextMsg && (activeChat === 'global' ? nextMsg.uid === msg.uid : nextMsg.senderId === msg.senderId);
              const isSameTime = nextMsg && isSameSender && nextMsgTime === currentMsgTime;
              const shouldShowTime = !isSameTime;

              const isSameSenderAsPrev = prevMsg && (activeChat === 'global' ? prevMsg.uid === msg.uid : prevMsg.senderId === msg.senderId);
              const marginTop = isSameSenderAsPrev ? 'mt-1' : 'mt-4';

              const isFirstInGroup = !isSameSenderAsPrev;
              const isLastInGroup = !isSameSender;
              const isLastMessage = index === arr.length - 1;
              const readByList = (msg.readBy || []).filter(id => id !== msg.senderId && id !== user?.id);
              
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} ${marginTop} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex items-end gap-2 max-w-[85%] lg:max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    {activeChat === 'global' && !isMe && (
                      <div 
                        onClick={() => senderProfile && isLastInGroup && setSelectedUserProfile(senderProfile)}
                        className={`w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-200 mb-1 overflow-hidden relative transition-all ${isLastInGroup ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : 'opacity-0 pointer-events-none'}`}
                      >
                         {senderProfile?.avatar_url ? (
                           <img src={senderProfile.avatar_url} alt={senderProfile.full_name} className="w-full h-full object-cover" />
                         ) : (
                           senderProfile?.full_name ? senderProfile.full_name.charAt(0).toUpperCase() : (msg.displayName ? msg.displayName.charAt(0).toUpperCase() : '?')
                         )}
                      </div>
                    )}
                    
                    <div className="relative flex flex-col">
                      {activeChat === 'global' && !isMe && isFirstInGroup && (
                        <div className="text-[10px] text-gray-500 ml-1 mb-1 font-medium">{senderProfile?.full_name || msg.displayName}</div>
                      )}
                                            <div 
                          className={`relative group/bubble ${
                            msg.type === 'sticker' 
                              ? 'bg-transparent'
                              : isMe 
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-none shadow-sm' 
                                : 'bg-white text-gray-800 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm'
                          } ${searchMatches[currentMatchIndex] === msg.id 
                              ? 'ring-4 ring-orange-500 ring-offset-2 shadow-2xl scale-[1.03] z-20' 
                              : isMatch 
                                ? 'ring-2 ring-yellow-300 ring-offset-1 shadow-md z-10' 
                                : ''
                          }`}
                        >

                        {/* Quoted Reply */}
                        {msg.replyTo && (
                          <div 
                             className={`mb-2 p-2 rounded-lg text-xs cursor-pointer opacity-90 border-l-4 overflow-hidden ${isMe ? 'bg-black/10 border-indigo-200 text-indigo-50' : 'bg-gray-100 border-indigo-500 text-gray-600'}`}
                             onClick={(e) => {
                               e.stopPropagation();
                               const el = document.getElementById(`msg-${msg.replyTo?.id}`);
                               if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('animate-pulse');
                                  setTimeout(() => el.classList.remove('animate-pulse'), 1000);
                               }
                             }}
                          >
                             <div className="font-bold mb-0.5 text-[10px] opacity-80">{msg.replyTo.senderName}</div>
                             <div className="truncate opacity-75 max-w-full">{(() => { const t = (msg.replyTo.text || '').replace(/\n/g, ' '); return t.length > 100 ? t.slice(0, 100) + '...' : t; })()}</div>
                          </div>
                        )}

                        {/* File Attachments */}
                        {msg.type === 'image' && msg.fileUrl && (
                          <div className="max-w-sm rounded-lg overflow-hidden m-1 relative">
                             {msg.isDeleted && (
                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase shadow-sm">
                                   <Undo className="w-3 h-3" /> Unsent
                                </div>
                             )}
                            <img 
                              src={msg.fileUrl} 
                              alt="attachment" 
                              className={`w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity ${msg.isDeleted ? 'opacity-50 grayscale' : ''}`}
                              onClick={() => window.open(getDownloadUrl(msg.fileUrl, msg.fileName), '_blank')} 
                            />
                          </div>
                        )}
                        {msg.type === 'video' && msg.fileUrl && (
                          <div className="max-w-sm rounded-lg overflow-hidden m-1 relative">
                             {msg.isDeleted && (
                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase shadow-sm">
                                   <Undo className="w-3 h-3" /> Unsent
                                </div>
                             )}
                            <video src={msg.fileUrl} controls className={`w-full h-auto max-h-64 bg-black ${msg.isDeleted ? 'opacity-50 grayscale' : ''}`} />
                          </div>
                        )}
                        {msg.type === 'file' && msg.fileUrl && (
                          <button 
                            onClick={async (e) => {
                               e.preventDefault();
                               let url = getDownloadUrl(msg.fileUrl, msg.fileName);
                               
                               // Force RAW url for PDFs to avoid Cloudinary 401/Processing errors on image pipeline
                               if (msg.fileName && msg.fileName.toLowerCase().endsWith('.pdf') && url.includes('/image/upload/')) {
                                  url = url.replace('/image/upload/', '/raw/upload/');
                               }

                               const toastId = toast.loading("Downloading...");
                               try {
                                  const response = await fetch(url);
                                  if (!response.ok) throw new Error("Download failed");
                                  const blob = await response.blob();
                                  const blobUrl = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = blobUrl;
                                  a.download = msg.fileName || 'document';
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(blobUrl);
                                  document.body.removeChild(a);
                                  toast.success("Download complete", { id: toastId });
                               } catch (err) {
                                  console.error("Download error:", err);
                                  toast.error("Download failed", { id: toastId });
                                  // Fallback to opening in new tab (using the RAW url if possible)
                                  window.open(url, '_blank');
                               }
                            }}
                            className={`flex items-center gap-3 p-3 m-1 rounded-xl hover:bg-black/10 transition-colors text-left w-full relative group/file ${isMe ? 'text-white' : 'text-gray-800'} ${msg.isDeleted ? 'opacity-60' : ''}`}
                          >
                             {msg.isDeleted && (
                                <div className="absolute top-1 right-1 z-10 flex items-center gap-1 px-1 py-0.5 bg-red-600/90 text-white rounded text-[8px] font-bold uppercase shadow-sm">
                                   <Undo className="w-2 h-2" /> Unsent
                                </div>
                             )}
                             <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                               <FileText className="w-6 h-6" />
                             </div>
                             <div className="flex flex-col min-w-[120px]">
                                <span className="text-sm font-medium truncate max-w-[180px]">{msg.fileName || 'Document'}</span>
                                <span className="text-[10px] opacity-70">Click to download</span>
                             </div>
                          </button>
                        )}

                        {/* Poll Rendering */}
                        {msg.type === 'poll' && msg.poll && (
                          <div className={`p-4 min-w-[300px] relative ${isMe ? 'text-white' : 'text-gray-900'} ${msg.isDeleted ? 'opacity-70' : ''}`}>
                             {msg.isDeleted && (
                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase shadow-sm">
                                   <Undo className="w-3 h-3" /> Unsent
                                </div>
                             )}
                             <h4 className="font-bold mb-3 text-lg flex items-center gap-2">
                               <BarChart2 className="w-5 h-5" />
                               {msg.poll.question}
                             </h4>
                             <div className="space-y-2">
                               {msg.poll.options.map(opt => {
                                 const voteCount = opt.voters.length;
                                 const totalVotes = msg.poll!.options.reduce((acc, curr) => acc + curr.voters.length, 0);
                                 const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                 const isVoted = opt.voters.includes(user?.id || '');
                                 
                                 return (
                                   <div key={opt.id} className="relative">
                                      <button
                                        onClick={() => handleVote(msg, opt.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all relative z-10 flex justify-between items-center group
                                          ${isMe 
                                            ? 'border-white/30 hover:bg-white/10' 
                                            : 'border-gray-200 hover:bg-gray-50'
                                          }
                                        `}
                                      >
                                         <span className="font-medium relative z-20 flex-1">{opt.text}</span>
                                         {isVoted && <span className="ml-2 relative z-20 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">Voted</span>}
                                         <span className="ml-2 text-xs opacity-70 relative z-20">{voteCount} votes ({percentage}%)</span>
                                      </button>
                                      
                                      <div 
                                         className={`absolute top-0 left-0 h-full rounded-lg transition-all duration-500 opacity-20 z-0
                                           ${isMe ? 'bg-white' : 'bg-indigo-600'}
                                         `}
                                         style={{ width: `${percentage}%` }}
                                      />
                                   </div>
                                 );
                               })}
                             </div>
                             <div className="mt-3 text-xs opacity-70 text-center">
                                {msg.poll.options.reduce((acc, curr) => acc + curr.voters.length, 0)} total votes • {msg.poll.allowMultipleAnswers ? 'Multiple Choice' : 'Single Choice'}
                             </div>
                          </div>
                        )}

                        {/* Sticker Rendering */}
                        {msg.type === 'sticker' && msg.fileUrl && (
                           <div className="relative">
                              {msg.isDeleted && (
                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase shadow-sm">
                                   <Undo className="w-3 h-3" /> Unsent
                                </div>
                             )}
                              <img 
                                 src={msg.fileUrl} 
                                 alt="Sticker" 
                                 className={`w-32 h-32 object-contain ${msg.isDeleted ? 'opacity-50 grayscale' : ''}`}
                                 loading="lazy"
                              />
                           </div>
                        )}

                        {/* Call Message Rendering */}
                        {msg.type === 'call' && msg.callRoomName && (
                           <div className={`p-4 min-w-[260px] relative ${msg.isDeleted ? 'opacity-70' : ''}`}>
                              {msg.isDeleted && (
                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase shadow-sm">
                                   <Undo className="w-3 h-3" /> Unsent
                                </div>
                             )}
                              <div className="flex items-center gap-3 mb-3">
                                 <div className={`p-2.5 rounded-full ${isMe ? 'bg-white/20' : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'}`}>
                                    <Video className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <div className="font-bold text-sm">{msg.text?.includes('Video') ? 'Video Call' : 'Voice Call'}</div>
                                    <div className={`text-xs ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                       {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : 'Just now'}
                                    </div>
                                 </div>
                              </div>
                              <button
                                 disabled={msg.isCallEnded}
                                 onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (!msg.isCallEnded) joinCall(msg.callRoomName!, msg.text?.includes('Video') ? 'video' : 'audio'); 
                                 }}
                                 className={`w-full py-2 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    msg.isCallEnded 
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                      : isMe
                                         ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:scale-[1.02] active:scale-95'
                                         : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:scale-[1.02] active:scale-95'
                                 }`}
                              >
                                 {msg.isCallEnded ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                 {msg.isCallEnded ? 'Panggilan Berakhir' : 'Gabung Panggilan'}
                              </button>
                           </div>
                        )}

                        {/* Text Content */}
                        {!msg.poll && msg.type !== 'sticker' && msg.type !== 'call' && (editingMessageId === msg.id ? (
                           <div className="p-3 min-w-[240px]">
                              <textarea 
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full p-2 text-sm border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                rows={3}
                              />
                              <div className="flex justify-end gap-2 text-xs mt-2">
                                <button onClick={() => setEditingMessageId(null)} className={`px-3 py-1 rounded hover:bg-black/10 ${isMe ? 'text-white' : 'text-gray-600'}`}>Cancel</button>
                                <button onClick={() => saveEdit(msg)} className="bg-white text-indigo-600 px-3 py-1 rounded font-bold hover:shadow-lg transition-shadow">Save</button>
                              </div>
                           </div>
                        ) : (
                          msg.text && (
                            <div className="px-4 py-3 text-sm break-words leading-relaxed whitespace-pre-wrap min-w-[120px] relative">
                              {msg.isDeleted && msg.type === 'text' && (
                                 <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-red-500 uppercase tracking-wider border-b border-red-200/30 pb-1">
                                    <Undo className="w-3 h-3" />
                                    Unsent
                                 </div>
                              )}
                              {(() => {
                                 // Auto-detect URLs and render as clickable links
                                 const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
                                 const parts = msg.text.split(urlRegex);
                                 return parts.map((part: string, i: number) => 
                                    urlRegex.test(part) ? (
                                       <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
                                          className={`underline hover:opacity-80 transition-opacity ${isMe ? 'text-indigo-200' : 'text-indigo-600'}`}
                                       >{part}</a>
                                    ) : <span key={i}>{part}</span>
                                 );
                              })()}
                              
                              {/* Edited Indicator */}
                              {msg.isEdited && (
                                <div className="inline-flex items-center ml-1 align-baseline">
                                  <span className="text-[10px] opacity-60 italic">(edited)</span>
                                  {isAdmin && (
                                     <button 
                                      onClick={() => setShowHistoryId(showHistoryId === msg.id ? null : msg.id)}
                                      className="ml-1 p-0.5 rounded hover:bg-black/10 transition-colors"
                                      title="View Edit History"
                                     >
                                       <History className="w-3 h-3" />
                                     </button>
                                  )}
                                </div>
                              )}

                              {/* Admin Edit History Popup */}
                              {isAdmin && showHistoryId === msg.id && msg.editHistory && (
                                <div className={`mt-3 text-xs p-3 rounded-lg text-left animate-in zoom-in-95 duration-200 ${isMe ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-100 text-gray-800'}`}>
                                  <div className="font-bold mb-2 flex items-center gap-1 opacity-90"><History className="w-3 h-3"/> Edit History</div>
                                  <div className="space-y-2">
                                    {msg.editHistory.map((hist, idx) => (
                                      <div key={idx} className={`border-l-2 pl-2 ${isMe ? 'border-indigo-400' : 'border-gray-400'}`}>
                                        <div className="line-through text-xs opacity-70">{hist.text}</div>
                                        <div className="text-[9px] opacity-60">
                                          {typeof hist.editedAt === 'string' ? format(new Date(hist.editedAt), 'dd MMM HH:mm') : 'Unknown'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        ))}

                        {/* Reply Button (Hover) */}
                        {!msg.isDeleted && !editingMessageId && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
                             className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'right-auto -left-8' : '-right-8'} opacity-0 group-hover/bubble:opacity-100 transition-all z-10 p-1.5 rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-indigo-600 hover:scale-110`}
                             title="Reply"
                           >
                             <Reply className="w-3.5 h-3.5" />
                           </button>
                        )}

                        {/* Reaction Picker Trigger - Button only (appears on hover, NOT on own messages) */}
                        {!isMe && !msg.isDeleted && !editingMessageId && (
                           <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveMenuMsgId(activeMenuMsgId === `react-${msg.id}` ? null : `react-${msg.id}`);
                              }}
                              className={`absolute ${isLastMessage ? '-top-2' : '-bottom-2'} ${isMe ? 'left-2' : 'right-2'} opacity-0 group-hover/bubble:opacity-100 transition-all z-10 p-1 rounded-full bg-white shadow border border-gray-200 text-gray-400 hover:text-amber-500 hover:scale-110`}
                           >
                              <Smile className="w-3 h-3" />
                           </button>
                        )}

                        {/* Reaction Picker Popup - Opens upward for last message to avoid clipping */}
                        {activeMenuMsgId === `react-${msg.id}` && (
                           <>
                              <div className="fixed inset-0 z-20" onClick={() => setActiveMenuMsgId(null)} />
                              <div className={`absolute ${isLastMessage ? 'bottom-full mb-1' : 'top-full mt-1'} ${isMe ? 'right-0' : 'left-0'} z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 grid grid-cols-4 gap-1 animate-in zoom-in-95 duration-150`}>
                                 {REACTIONS.map(r => (
                                    <button 
                                       key={r.key} 
                                       onClick={(e) => { e.stopPropagation(); handleReaction(msg, r.key); setActiveMenuMsgId(null); }}
                                       className="hover:scale-125 transition-transform p-1 hover:bg-gray-100 rounded-lg active:scale-95"
                                       title={r.label}
                                    >
                                       <img src={r.url} alt={r.label} className="w-6 h-6 object-contain" />
                                    </button>
                                 ))}
                              </div>
                           </>
                        )}
                        
                        {/* 3-Dot Menu Trigger - Only show for active NON-deleted message owned by user */}
                        {isMe && !msg.isDeleted && !editingMessageId && (
                           <div className="absolute -top-2 right-2 opacity-0 group-hover/bubble:opacity-100 transition-all z-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                                }}
                                className="p-1 rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-indigo-600 hover:scale-105 transition-all"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>
                              
                              {/* Dropdown Menu */}
                              {activeMenuMsgId === msg.id && (
                                <div className="absolute top-6 right-0 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden w-28 animate-in zoom-in-95 origin-top-right z-20">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuMsgId(null); startEditing(msg); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3 h-3" /> Edit
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuMsgId(null); handleUnsend(msg); }}
                                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                                  >
                                    <Trash2 className="w-3 h-3" /> Unsend
                                  </button>
                                </div>
                              )}
                           </div>
                        )}
                      </div>

                      {/* Reaction Display - above bubble for last message, below for others */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                         <div className={`flex flex-wrap gap-1.5 ${isLastMessage ? 'mb-1.5 order-first' : 'mt-1.5'} ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                            {Object.entries(msg.reactions).map(([key, reactors]) => {
                               const reactorList = reactors as string[];
                               if (reactorList.length === 0) return null;
                               const iReacted = reactorList.includes(user?.id || '');
                               const reactionData = REACTIONS.find(r => r.key === key);
                               if (!reactionData) return null;
                               return (
                                  <button
                                     key={key}
                                     onClick={() => handleReaction(msg, key)}
                                     title={reactorList.map(id => users.find(u => u.id === id)?.full_name || 'User').join(', ')}
                                     className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all hover:scale-110 active:scale-95 ${
                                       iReacted 
                                         ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200' 
                                         : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                     }`}
                                  >
                                     <img src={reactionData.url} alt={reactionData.label} className="w-5 h-5 object-contain" />
                                     <span className={`font-bold text-[11px] ${iReacted ? 'text-indigo-600' : 'text-gray-500'}`}>{reactorList.length}</span>
                                  </button>
                               );
                            })}
                         </div>
                      )}

                       {/* Pin Button - isMe: top-left (away from 3-dot menu), others: top-right (away from reply) */}
                       <button 
                         onClick={() => togglePin(msg)}
                         className={`absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 z-10 ${isMe ? '-left-3' : '-right-3'}`}
                         title={msg.isPinned ? "Unpin Message" : "Pin Message"}
                      >
                         <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                       </button>

                      {msg.isPinned && (
                        <div className={`absolute -top-2 ${isMe ? 'left-0' : 'right-0'} bg-amber-100 text-amber-600 p-0.5 rounded-full border border-white shadow-sm z-10`}>
                           <Pin className="w-2.5 h-2.5 fill-amber-600" />
                        </div>
                      )}

                      {/* Read By Info (Admin/Manager Only) */}
                      {canManageGroups && readByList.length > 0 && (
                        <div className={`text-[9px] text-gray-400 mt-1 px-1 flex flex-wrap gap-1 items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="opacity-60 italic">Read by:</span>
                            <span className="font-medium truncate max-w-[200px]">
                                {readByList.slice(0, 3).map(id => users.find(u => u.id === id)?.full_name?.split(' ')[0] || 'User').join(', ')}
                            </span>
                            {readByList.length > 3 && (
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setShowReadByMsgId(msg.id); }}
                                  className="text-indigo-500 font-bold text-[9px] cursor-pointer hover:underline hover:text-indigo-700 bg-indigo-50 px-1 rounded transition-colors"
                                >
                                   +{readByList.length - 3}
                                </span>
                            )}
                        </div>
                      )}

                      {/* TIMESTAMP & STATUS - Conditionally Rendered */}
                      {shouldShowTime && (
                         <div className={`text-[10px] text-gray-400 mt-1 font-medium ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                           {currentMsgTime}
                           {isMe && msg.isRead && activeChat !== 'global' && <span className="ml-1 text-indigo-300">✓✓</span>}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={dummy} />
          </div>

            <div className="p-4 bg-white border-t border-gray-200 shrink-0 relative">
            {/* Attachment Menu */}
            {showAttachMenu && (
              <div className="absolute bottom-20 left-4 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 flex flex-col gap-1 w-48 animate-in slide-in-from-bottom-2 duration-200">
                <button 
                  onClick={() => {
                     if (fileInputRef.current) {
                       fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
                       fileInputRef.current.click();
                     }
                     setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors text-left"
                >
                  <div className="p-2 bg-indigo-50 rounded-full text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-semibold">Dokumen</span>
                     <span className="text-[10px] text-gray-400">PDF, Word, Excel</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*,video/*";
                      fileInputRef.current.click();
                    }
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors text-left"
                >
                  <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                    <Image className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-semibold">Foto & Video</span>
                     <span className="text-[10px] text-gray-400">Photos & Videos</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                     setShowPollModal(true);
                     setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors text-left"
                >
                  <div className="p-2 bg-amber-50 rounded-full text-amber-600">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-semibold">Polling</span>
                     <span className="text-[10px] text-gray-400">Create a poll</span>
                  </div>
                </button>
              </div>
            )}
            
            {/* Overlay to close menu */}
            {showAttachMenu && (
               <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
            )}

            {/* Reply Preview Banner */}
            {replyingTo && (
               <div className="max-w-4xl mx-auto mb-2 px-4 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-white border-l-4 border-indigo-500 rounded-r-lg p-3 shadow-sm flex items-center justify-between">
                     <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-indigo-600">Replying to {users.find(u => u.id === (replyingTo.uid || replyingTo.senderId))?.full_name || replyingTo.displayName || 'User'}</span>
                        <span className="text-sm text-gray-600 truncate max-w-[200px] lg:max-w-md">
                           {replyingTo.text || (replyingTo.fileUrl ? (replyingTo.fileName || 'Attachment') : (replyingTo.poll ? 'Poll' : 'Message'))}
                        </span>
                     </div>
                     <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            )}

            {/* Sticker Picker Panel */}
            {showStickerPicker && (
               <div className="absolute bottom-20 left-4 sm:left-auto bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72 z-50 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="text-sm font-bold text-gray-700">Stickers</h3>
                     <button onClick={() => setShowStickerPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                     {stickers.length === 0 ? (
                        <div className="col-span-3 text-center text-xs text-gray-400 py-4">
                           Loading stickers...
                        </div>
                     ) : (
                        stickers.map((url, i) => (
                           <button 
                              key={i} 
                              onClick={() => sendMessage({ type: 'sticker', url, name: 'Sticker' })}
                              className="hover:bg-gray-100 p-2 rounded transition-colors aspect-square flex items-center justify-center"
                           >
                              <img src={url} alt="Sticker" className="w-full h-full object-contain pointer-events-none" />
                           </button>
                        ))
                     )}
                  </div>
               </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="flex gap-2 items-end max-w-4xl mx-auto">
              <button 
                type="button"
                className={`p-3 rounded-full transition-colors relative z-30 flex-shrink-0 ${showAttachMenu ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`}
                onClick={() => { setShowAttachMenu(!showAttachMenu); setShowStickerPicker(false); }}
                disabled={isUploading}
                title="Attach"
              >
                {isUploading ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Plus className={`w-5 h-5 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />}
              </button>

              <button 
                type="button"
                className={`p-3 rounded-full transition-colors relative z-30 flex-shrink-0 ${showStickerPicker ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`}
                onClick={() => { setShowStickerPicker(!showStickerPicker); setShowAttachMenu(false); }}
                title="Stickers"
              >
                 <Smile className="w-5 h-5" />
              </button>
              
              <textarea
                value={newMessage}
                onChange={(e) => {
                   setNewMessage(e.target.value);
                   handleTyping();
                   // Auto-resize
                   e.target.style.height = 'auto';
                   e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                      // Reset height after send
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                   }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none shadow-inner resize-none overflow-y-auto leading-relaxed"
                style={{ maxHeight: '120px' }}
              />
              <button 
                type="button"
                onClick={() => sendMessage()}
                disabled={!newMessage.trim() && !isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95 flex items-center justify-center transform active:scale-90 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gray-50/50 text-gray-400">
           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100 animate-in zoom-in duration-500">
              <MessageSquare className="w-10 h-10 text-indigo-300" />
           </div>
           <h2 className="text-xl font-bold text-gray-600 mb-2">Select a conversation</h2>
           <p className="text-gray-500 max-w-xs text-center text-sm">Choose from the list on the left to start chatting with your team.</p>
        </div>
      )}
      {/* Group Members Modal (Online Status) */}
      {showGroupMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowGroupMembers(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-lg text-gray-800">Online Members</h3>
                <p className="text-xs text-green-600 font-medium">{users.filter(u => onlineUserIds.has(u.id)).length} currently online</p>
              </div>
              <button onClick={() => setShowGroupMembers(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {users
                .filter(u => onlineUserIds.has(u.id)) // Show ONLY online users
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group cursor-default">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-400">{u.full_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {/* Online Indicator */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900">{u.full_name} {user?.id === u.id && <span className="text-gray-400 text-xs font-normal">(You)</span>}</h4>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                    Online
                  </span>
                  
                  {user?.id !== u.id && (
                     <button 
                       onClick={() => {
                         setActiveChat(u.id);
                         setShowGroupMembers(false);
                       }}
                       className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                       title="Message"
                     >
                       <MessageSquare className="w-4 h-4" />
                     </button>
                  )}
                </div>
              ))}
              
              {users.filter(u => onlineUserIds.has(u.id)).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">
                  No one else is online right now.
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Create Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowPollModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                 <BarChart2 className="w-5 h-5 text-indigo-600" /> Create Poll
               </h3>
               <button onClick={() => setShowPollModal(false)} className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <input 
                    type="text" 
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                  />
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                     {pollOptions.map((opt, idx) => (
                       <div key={idx} className="flex gap-2">
                         <input 
                           type="text" 
                           value={opt}
                           onChange={(e) => {
                             const newOptions = [...pollOptions];
                             newOptions[idx] = e.target.value;
                             setPollOptions(newOptions);
                           }}
                           placeholder={`Option ${idx + 1}`}
                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                         />
                         {pollOptions.length > 2 && (
                           <button 
                             onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                             className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                     ))}
                  </div>
                  {pollOptions.length < 10 && (
                     <button 
                       onClick={() => setPollOptions([...pollOptions, ''])}
                       className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                     >
                       <Plus className="w-4 h-4" /> Add Option
                     </button>
                  )}
               </div>
               
               <div className="flex items-center gap-2 pt-2">
                 <input 
                   type="checkbox" 
                   id="allowMultiple" 
                   checked={pollAllowMultiple}
                   onChange={(e) => setPollAllowMultiple(e.target.checked)}
                   className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300" 
                 />
                 <label htmlFor="allowMultiple" className="text-sm text-gray-700 cursor-pointer select-none">Allow multiple answers</label>
               </div>
            </div>
            
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
               <button 
                 onClick={() => setShowPollModal(false)}
                 className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200 font-medium transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreatePoll}
                 className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md transition-all active:scale-95"
               >
                 Create Poll
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Confirmation Modal */}
      {kickConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setKickConfirmId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4 border-4 border-red-50">
                 <UserMinus className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Member?</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-gray-800">{users.find(u => u.id === kickConfirmId)?.full_name || 'this user'}</span> from this group?
              </p>
              
              <div className="flex gap-3 justify-center w-full">
                 <button 
                   onClick={() => setKickConfirmId(null)}
                   className="flex-1 px-4 py-2.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold transition-colors focus:ring-2 focus:ring-gray-200 outline-none"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmKickMember}
                   className="flex-1 px-4 py-2.5 rounded-xl text-white bg-red-600 hover:bg-red-700 font-semibold shadow-lg shadow-red-200 hover:shadow-xl transition-all focus:ring-2 focus:ring-red-500 outline-none"
                 >
                   Remove
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupConfirm && activeGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowDeleteGroupConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4 border-4 border-red-50">
                 <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Group?</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-800">{activeGroup.name}</span>? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center w-full">
                 <button 
                   onClick={() => setShowDeleteGroupConfirm(false)}
                   className="flex-1 px-4 py-2.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold transition-colors focus:ring-2 focus:ring-gray-200 outline-none"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleDeleteGroup}
                   className="flex-1 px-4 py-2.5 rounded-xl text-white bg-red-600 hover:bg-red-700 font-semibold shadow-lg shadow-red-200 hover:shadow-xl transition-all focus:ring-2 focus:ring-red-500 outline-none"
                 >
                   Delete
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowNewChatModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-1 ring-black/5 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="font-bold text-lg text-gray-800">New Message</h3>
               <button onClick={() => setShowNewChatModal(false)} className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search people..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {users
                .filter(u => u.full_name?.toLowerCase().includes(newChatSearch.toLowerCase()))
                .map(u => (
                  <div 
                    key={u.id}
                    onClick={() => {
                       setActiveChat(u.id);
                       setShowNewChatModal(false);
                       setNewChatSearch('');
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group"
                  >
                     <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-500 font-bold border border-gray-200 group-hover:border-indigo-200 transition-all">
                        {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" /> : u.full_name?.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{u.full_name}</h4>
                        <p className="text-xs text-gray-500">{u.email}</p>
                     </div>
                  </div>
              ))}
              {users.filter(u => u.full_name?.toLowerCase().includes(newChatSearch.toLowerCase())).length === 0 && (
                 <div className="text-center py-8 text-gray-400 text-sm">No users found</div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Read By Details Modal */}
      {showReadByMsgId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowReadByMsgId(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Read By
                 </h3>
                 <button onClick={() => setShowReadByMsgId(null)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 font-bold transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="overflow-y-auto p-2 custom-scrollbar">
                 {(() => {
                    const msg = messages.find(m => m.id === showReadByMsgId);
                    if (!msg || !msg.readBy) return <div className="p-4 text-center text-gray-400">No data</div>;
                    
                    const readers = msg.readBy
                       .filter(id => id !== msg.senderId && id !== user?.id)
                       .map(id => users.find(u => u.id === id));
                    
                    if (readers.length === 0) return <div className="p-8 text-center text-gray-400 text-sm">No other readers yet</div>;

                    return (
                       <div className="space-y-1">
                          {readers.map((u, idx) => (
                             <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                                   {u?.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-500">{u?.full_name?.charAt(0)}</span>}
                                </div>
                                <span className="font-medium text-sm text-gray-700">{u?.full_name || 'Unknown User'}</span>
                             </div>
                          ))}
                       </div>
                    );
                 })()}
              </div>
           </div>
        </div>
      )}

      {/* Unsend Confirmation Modal */}
      {messageToUnsend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unsend Message?</h3>
            <p className="text-gray-600 mb-6 text-sm">
              This message will be removed for everyone in the chat. 
              <br/><span className="text-xs text-gray-400 mt-1 block font-medium">Only admins can see original content.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setMessageToUnsend(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmUnsend}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-red-200 transition-all transform hover:scale-105"
              >
                Unsend
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

// Helper: Scroll handling and Read Marking
function useChatScrollAndRead(
  messages: Message[], 
  user: any, 
  activeChat: string | null, 
  dummyRef: any,
  initialScrollDone: boolean,
  setInitialScrollDone: (b: boolean) => void,
  collectionName: string
) {
  useEffect(() => {
    if (!user || !activeChat || messages.length === 0) return;

    // 1. Mark displayed AND recent hidden messages as read (Aggressive Clearing)
    const markAsRead = async () => {
       if (!db || !collectionName || !activeChat) return;
       
       try {
           let q;
           const FETCH_LIMIT = 300; // Fetch more to ensure we clear badge even if messages are scrolled up
           
           if (activeChat === 'global') {
              q = query(
                 collection(db, 'messages'),
                 orderBy('createdAt', 'desc'),
                 limit(FETCH_LIMIT)
              );
           } else if (collectionName === 'group_messages') {
              q = query(
                 collection(db, 'group_messages'),
                 where('groupId', '==', activeChat),
                 orderBy('createdAt', 'desc'),
                 limit(FETCH_LIMIT)
              );
           } else {
              // DMs handled by other effect mostly, but we can double check 'readBy' for consistency if moving to unified system
              // For now, let's stick to 'messages' (from prop) for DMs to avoid conflict, or skip DMs here
              // But since this hook is generic... let's just use the prop messages for DMs to avoid index issues
              // Logic: If DMs use 'isRead' field, this might be redundant but harmless (adding readBy)
           }

           let docsToUpdate: any[] = [];
           
           if (q) {
              const snapshot = await getDocs(q);
              snapshot.docs.forEach(doc => {
                 const m = doc.data() as Message;
                 const isFromOther = (m.senderId || m.uid) !== user.id;
                 const isUnread = !m.readBy || !m.readBy.includes(user.id);
                 if (isFromOther && isUnread) {
                    docsToUpdate.push(doc);
                 }
              });
           } else {
              // Fallback to prop messages (e.g. for DMs or if query fails construction)
              messages.forEach(m => {
                 const isFromOther = (m.senderId || m.uid) !== user.id;
                 const isUnread = !m.readBy || !m.readBy.includes(user.id);
                 // We don't have doc reference easily from message object if it lacks it? 
                 // Message interface has 'id'.
                 if (isFromOther && isUnread) {
                    docsToUpdate.push({ id: m.id, ref: doc(db, collectionName, m.id) });
                 }
              });
           }

           if (docsToUpdate.length > 0) {
              // Batch limit 500
              const chunks = [];
              for (let i = 0; i < docsToUpdate.length; i += 400) {
                 chunks.push(docsToUpdate.slice(i, i + 400));
              }

              for (const chunk of chunks) {
                  const batch = writeBatch(db);
                  chunk.forEach((d: any) => {
                     // d is either QueryDocumentSnapshot or {ref}
                     const ref = d.ref || doc(db, collectionName, d.id);
                     batch.update(ref, { 
                        readBy: arrayUnion(user.id),
                        ...(collectionName === 'direct_messages' ? { isRead: true } : {}) // Sync isRead for DMs
                     });
                  });
                  await batch.commit();
              }
           }
       } catch (err) {
           console.error("Error marking read:", err);
       }
    };
    markAsRead();

    // 2. Scroll Logic
    if (!initialScrollDone) {
       const firstUnread = messages.find(m => {
          const isFromOther = (m.senderId || m.uid) !== user.id;
          const isUnread = !m.readBy || !m.readBy.includes(user.id);
          return isFromOther && isUnread;
       });

       if (firstUnread) {
          const el = document.getElementById(`msg-${firstUnread.id}`);
          if (el) {
             el.scrollIntoView({ behavior: 'auto', block: 'center' });
             // Show "Unread Messages" divider logic could be added here
          } else {
             // If element not found (maybe not rendered yet?), fallback
             // But usually limit 50 means we have them. 
             // If first unread is older than 50, we can't scroll to it easily.
             dummyRef.current?.scrollIntoView();
          }
       } else {
          dummyRef.current?.scrollIntoView();
       }
       setInitialScrollDone(true);
    } else {
       // Auto-scroll to bottom only if user is already near bottom? 
       // For now, simple behavior: if new message looks like mine or is very recent, scroll.
       // Or just let user scroll. 
       // Standard behavior: if I sent it, scroll. 
       const lastMsg = messages[messages.length - 1];
       if (lastMsg.senderId === user.id || lastMsg.uid === user.id) {
          dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
       }
    }

  }, [messages, activeChat, user, initialScrollDone]);
}
