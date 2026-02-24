import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import {
    Circle,
    Hand,
    LayoutGrid,
    Mic,
    MicOff,
    Monitor,
    PhoneOff,
    Pin,
    PinOff,
    Smile,
    Square,
    StopCircle,
    Users,
    Video,
    VideoOff,
    X
} from 'lucide-react';
import Peer, { MediaConnection } from 'peerjs';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabaseClient';

interface PeerStream {
    id: string;
    stream: MediaStream;
    isLocal: boolean;
    isScreenShare?: boolean;
    isHandRaised?: boolean;
    reaction?: string;
    name?: string;
}

const VideoPlayer = ({ stream, isLocal, className, label, isHandRaised, reaction }: { 
    stream: MediaStream, 
    isLocal: boolean, 
    className?: string,
    label?: string,
    isHandRaised?: boolean,
    reaction?: string
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    
    return (
        <div className="relative w-full h-full group">
            <video ref={videoRef} autoPlay playsInline muted={isLocal} className={className} />
            
            {/* Name Label */}
            {label && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur rounded text-xs md:text-sm text-white font-medium z-10">
                    {label}
                </div>
            )}

            {/* Hand Raised Indicator */}
            {isHandRaised && (
                <div className="absolute top-2 left-2 p-1.5 bg-yellow-500 rounded-full text-white shadow-lg animate-bounce z-20">
                    <Hand className="w-3 h-3 md:w-4 md:h-4" />
                </div>
            )}

            {/* Reaction Emoji Overlay */}
            {reaction && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl md:text-6xl animate-ping-slow z-30 pointer-events-none drop-shadow-lg">
                    {reaction}
                </div>
            )}
        </div>
    );
};

export default function VideoCallPage() {
    const [searchParams] = useSearchParams();
    const roomName = searchParams.get('room');
    const type = searchParams.get('type') as 'audio' | 'video' || 'video';
    const isHost = searchParams.get('host') === 'true';
    const msgId = searchParams.get('msgId');
    const collectionName = searchParams.get('collection');

    const [myPeerId, setMyPeerId] = useState('');
    const [callStatus, setCallStatus] = useState<'idle' | 'waiting' | 'calling' | 'connected' | 'ended'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoDisabled, setIsVideoDisabled] = useState(type === 'audio');
    
    // Layout State
    const [layoutMode, setLayoutMode] = useState<'speaker' | 'grid'>('speaker');
    const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
    const [peers, setPeers] = useState<PeerStream[]>([]);
    const [showReactionMenu, setShowReactionMenu] = useState(false);
    const [showParticipantsList, setShowParticipantsList] = useState(false);

    // Screen Share & Recording State
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const localStreamRef = useRef<MediaStream | null>(null);
    const callsRef = useRef<MediaConnection[]>([]);
    const peerRef = useRef<Peer | null>(null);
    const screenTrackRef = useRef<MediaStreamTrack | null>(null);

    const [streamReady, setStreamReady] = useState(false);

    useEffect(() => {
        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: type === 'video' ? { facingMode: 'user' } : false,
                    audio: true,
                });
                localStreamRef.current = stream;
                setPeers([{ id: 'Me', stream, isLocal: true }]);
                setStreamReady(true);
            } catch (err) {
                console.error('Failed to get local stream', err);
                toast.error('Gagal mengakses kamera/mikrofon. Pastikan izin diberikan.');
            }
        };
        getMedia();
        
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [type]);

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const participantsRef = useRef<Record<string, any>>({});

    // Cleanup on tab close
    useEffect(() => {
        const handleBeforeUnload = () => {
             if (peerRef.current?.id && roomName) {
                 // Best effort delete on close
                 const participantRef = doc(db, 'meetings', roomName, 'participants', peerRef.current.id);
                 deleteDoc(participantRef).catch(console.error);
             }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [roomName]);

    useEffect(() => {
        if (!roomName || !streamReady) return;

        let isMounted = true;

        const setupPeer = async () => {
             if (!isMounted) return;

             // Fetch User Name
             let myName = 'User';
             try {
                 const { data: session } = await supabase.auth.getSession();
                 if (session?.session?.user) {
                     const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', session.session.user.id)
                        .single();
                     if (profile?.full_name) myName = profile.full_name;
                 }
             } catch (error) {
                 console.error("Error fetching name:", error);
             }
            
            // Clean up any existing peer before starting new one
            if (peerRef.current) {
                peerRef.current.disconnect();
                peerRef.current.destroy();
                peerRef.current = null;
            }

            console.log(`Initializing Peer for Room: ${roomName}...`);
            
            const peerConfig = {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            };

            try {
                // Initialize Peer with random ID for everyone (Full Mesh)
                const peer = new Peer(peerConfig);
                peerRef.current = peer;

                peer.on('open', async (id) => {
                    if (!isMounted) return;
                    console.log("My Peer ID:", id);
                    setMyPeerId(id);
                    setCallStatus('waiting'); // Waiting for connections

                    // 1. Register in Firestore
                    const participantRef = doc(db, 'meetings', roomName, 'participants', id);
                    await setDoc(participantRef, { 
                        name: myName,
                        joinedAt: serverTimestamp(),
                        type: isHost ? 'host' : 'guest',
                        isHandRaised: false,
                        reaction: null
                    });

                    // 2. Listen for other participants
                    // ALSO listen for changes (reactions, hand raise updates)
                    const q = query(collection(db, 'meetings', roomName, 'participants'));
                    const unsubscribe = onSnapshot(q, (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            const data = change.doc.data();
                            const remotePeerId = change.doc.id;
                            
                            // Update cache
                            participantsRef.current[remotePeerId] = data;

                            if (change.type === 'added') {
                                if (remotePeerId === id) return; // Skip self

                                console.log("New peer detected:", remotePeerId);

                                // Connect logic...
                                if (id > remotePeerId) {
                                    if (localStreamRef.current) {
                                        const call = peer.call(remotePeerId, localStreamRef.current);
                                        handleCallStream(call);
                                    }
                                }
                            }
                            
                            // Handle Updates (Hand Raise / Reaction / Name)
                            if (change.type === 'modified' || change.type === 'added') {
                                setPeers(prev => prev.map(p => {
                                    if (p.id === remotePeerId || (p.isLocal && remotePeerId === id)) {
                                        return { 
                                            ...p, 
                                            isHandRaised: data.isHandRaised,
                                            reaction: data.reaction,
                                            name: data.name || (p.isLocal ? 'You' : `Peer ${p.id.slice(0, 4)}`)
                                        };
                                    }
                                    return p;
                                }));
                                
                                // If adding new peer, we might not have streaming yet, handled by call logic.
                                // BUT: updates are critical for name visibility on existing streams.
                            }


                        });
                    });
                    
                    unsubscribeRef.current = unsubscribe;
                });

                // 4. Handle Incoming Calls
                peer.on('call', (call) => {
                    console.log("Incoming call from:", call.peer);
                    if (localStreamRef.current) {
                         call.answer(localStreamRef.current);
                         handleCallStream(call);
                    }
                });
                
                peer.on('error', async (err: any) => {
                    console.error("Peer Error:", err);
                    
                    // Strictly ignore peer-unavailable errors to prevent toast spam
                    if (err.type === 'peer-unavailable' || err.type === 'unavailable-id') {
                        // Optional: Try to clean up stale peer if ID is known
                         const unavailablePeerId = err.message?.replace('Could not connect to peer ', '');
                         if (unavailablePeerId && typeof unavailablePeerId === 'string') {
                             // Silently remove from local state
                             setPeers(prev => prev.filter(p => p.id !== unavailablePeerId));
                             // Try to remove from Firestore (best effort)
                             deleteDoc(doc(db, 'meetings', roomName, 'participants', unavailablePeerId)).catch(() => {});
                         }
                         return; 
                    }
                    
                    toast.error(`Connection Error: ${err.type}`);
                });

            } catch (err) {
                console.error("Setup Peer Error", err);
            }
        };

        const handleCallStream = (call: MediaConnection) => {
            // Check if call already handled
            if (callsRef.current.find(c => c.peer === call.peer)) return;
            
            callsRef.current.push(call);
            setCallStatus('connected');
            
            call.on('stream', async (remoteStream) => {
                 // Try to fetch name for this stream (from Firestore cache)
                 const cachedData = participantsRef.current[call.peer];
                 
                 setPeers(prev => {
                    if (prev.some(p => p.id === call.peer)) return prev;
                    return [...prev, { 
                        id: call.peer, 
                        stream: remoteStream, 
                        isLocal: false,
                        name: cachedData?.name || `Peer ${call.peer.slice(0, 4)}`,
                        isHandRaised: cachedData?.isHandRaised,
                        reaction: cachedData?.reaction
                    }];
                 });
            });

            call.on('close', () => {
                console.log("Call closed:", call.peer);
                setPeers(prev => prev.filter(p => p.id !== call.peer));
                callsRef.current = callsRef.current.filter(c => c !== call);
                if (callsRef.current.length === 0) setCallStatus('waiting');
            });
            
            call.on('error', (err) => {
                 console.error("Call Error:", err);
                 setPeers(prev => prev.filter(p => p.id !== call.peer));
            });
        };

        setupPeer();

        return () => {
            isMounted = false;
            
            // Cleanup Firestore listener
            if (unsubscribeRef.current) unsubscribeRef.current();
            
            // Remove self from Firestore
            if (peerRef.current?.id) {
               const participantRef = doc(db, 'meetings', roomName, 'participants', peerRef.current.id);
               deleteDoc(participantRef).catch(console.error);
            }

            if (peerRef.current) {
                peerRef.current.disconnect();
                peerRef.current.destroy();
                peerRef.current = null;
            }
            setCallStatus('ended');
            setPeers([]);
            callsRef.current = [];
        };
    }, [roomName, isHost, streamReady]);

    // --- Helper Functions ---

    const toggleMute = () => {
        if (localStreamRef.current) {
            const newMuted = !isMuted;
            localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMuted);
            setIsMuted(newMuted);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const newDisabled = !isVideoDisabled;
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !newDisabled);
            setIsVideoDisabled(newDisabled);
        }
    };

    const toggleScreenShare = () => {
        if (!isScreenSharing) {
            // Start Screen Share
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }).then((stream) => {
                const videoTrack = stream.getVideoTracks()[0];
                screenTrackRef.current = videoTrack;
                
                videoTrack.onended = () => {
                     stopScreenShare();
                };

                // Replace track for ALL active calls
                callsRef.current.forEach(call => {
                    if (call.peerConnection) {
                        const sender = call.peerConnection.getSenders().find((s:any) => s.track.kind === 'video');
                        if (sender) {
                             sender.replaceTrack(videoTrack).catch((err:any) => console.error("Track replacement failed for", call.peer, err));
                        }
                    }
                });
                
                // Update Local Preview
                if (localStreamRef.current) {
                    const newStream = new MediaStream([videoTrack, ...localStreamRef.current.getAudioTracks()]);
                    setPeers(prev => prev.map(p => p.isLocal ? { ...p, stream: newStream } : p));
                }

                setIsScreenSharing(true);
                toast.success("Mulai Share Screen");
            }).catch(err => {
                console.error("Failed to share screen", err);
                toast.error("Gagal share screen");
            });
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        // Revert to Camera
        const cameraVideoTrack = localStreamRef.current?.getVideoTracks()[0];
        
        if (cameraVideoTrack) {
             cameraVideoTrack.enabled = !isVideoDisabled;

             callsRef.current.forEach(call => {
                if (call.peerConnection) {
                     const sender = call.peerConnection.getSenders().find((s:any) => s.track.kind === 'video');
                     if (sender) {
                          sender.replaceTrack(cameraVideoTrack).catch((err:any) => console.error("Track revert failed for", call.peer, err));
                     }
                }
             });
             
             // Restore Local Preview
             if (localStreamRef.current) {
                 setPeers(prev => prev.map(p => p.isLocal ? { ...p, stream: localStreamRef.current! } : p));
             }
        }

        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }
        
        setIsScreenSharing(false);
        toast.success("Stop Share Screen");
    };

    const toggleRecording = () => {
        // Find a remote stream to record, OR record local if alone
        if (!isRecording) {
            const remotePeer = peers.find(p => !p.isLocal);
            const streamToRecord = remotePeer ? remotePeer.stream : localStreamRef.current;
            
            if (streamToRecord) {
                startRecordingStream(streamToRecord);
            } else {
                 return toast.error("Tidak ada video untuk direkam");
            }
        } else {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            toast.success("Recording saved 💾");
        }
    };
    
    const startRecordingStream = (stream: MediaStream) => {
        try {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `recording-${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            };
            recorder.start();
            setIsRecording(true);
            toast.success("Recording started");
        } catch (err) {
            console.error("Recording error", err);
            toast.error("Gagal memulai recording");
        }
    };

    const handleEndCall = async () => {
        if (isHost && msgId && collectionName) {
           try {
               await updateDoc(doc(db, collectionName, msgId), { isCallEnded: true });
               toast.success("Panggilan diakhiri");
           } catch (err) {
               console.error("Error updating call status", err);
           }
        }
        setTimeout(() => window.close(), 500); 
    };

    const toggleHandRaise = async () => {
        if (!myPeerId || !roomName) return;
        const currentPeer = peers.find(p => p.isLocal);
        const newState = !currentPeer?.isHandRaised;
        
        try {
            await updateDoc(doc(db, 'meetings', roomName, 'participants', myPeerId), {
                isHandRaised: newState
            });
            toast(newState ? "✋ Hand Raised" : "Hand Lowered", { icon: newState ? '✋' : null });
        } catch (err) {
            console.error("Failed to toggle hand", err);
        }
    };

    const sendReaction = async (emoji: string) => {
        if (!myPeerId || !roomName) return;
        
        try {
            setShowReactionMenu(false);
            // Set reaction
            await updateDoc(doc(db, 'meetings', roomName, 'participants', myPeerId), {
                reaction: emoji
            });
            
            // Auto clear reaction after 2s
            setTimeout(async () => {
                 await updateDoc(doc(db, 'meetings', roomName, 'participants', myPeerId), {
                    reaction: null
                });
            }, 2500);

        } catch (err) {
            console.error("Failed to send reaction", err);
        }
    };

    const togglePin = (id: string) => {
        if (pinnedPeerId === id) {
            setPinnedPeerId(null);
        } else {
            setPinnedPeerId(id);
            setLayoutMode('speaker'); // Auto-switch to speaker view when pinning
        }
    };

    // Render Logic
    const remotePeers = peers.filter(p => !p.isLocal);
    
    // Determine who is active in Speaker View
    // Priority: Pinned User -> First Remote User -> Local User (if alone)
    const activeSpeakerPeer = pinnedPeerId 
        ? peers.find(p => p.id === pinnedPeerId) 
        : (remotePeers.length > 0 ? remotePeers[0] : null);

    // Filter thumbnails (Everyone except the active speaker)
    const thumbnailPeers = activeSpeakerPeer 
        ? peers.filter(p => p.id !== activeSpeakerPeer.id) 
        : peers;
    
    return (
        <div className="w-screen h-screen bg-black flex flex-col relative overflow-hidden">
            
            {/* Main Content Area */}
            <div className="flex-1 w-full h-full relative">
                {layoutMode === 'speaker' ? (
                     // Speaker View: One Big + Small Cards Overlay
                     <div className="w-full h-full relative">
                         {/* Main Active Video */}
                         {activeSpeakerPeer ? (
                             <div className="w-full h-full relative group">
                                 <VideoPlayer 
                                     stream={activeSpeakerPeer.stream} 
                                     isLocal={activeSpeakerPeer.isLocal} 
                                     className="w-full h-full object-contain bg-neutral-900" 
                                     label={activeSpeakerPeer.name || (activeSpeakerPeer.isLocal ? 'You' : `Peer ${activeSpeakerPeer.id.slice(0,5)}`)}
                                     isHandRaised={activeSpeakerPeer.isHandRaised}
                                     reaction={activeSpeakerPeer.reaction}
                                 />
                                 
                                 {/* Pin Button for Main Video */}
                                 <button 
                                     onClick={() => togglePin(activeSpeakerPeer.id)}
                                     className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                     title={pinnedPeerId === activeSpeakerPeer.id ? "Unpin" : "Pin"}
                                 >
                                     {pinnedPeerId === activeSpeakerPeer.id ? <PinOff className="w-4 h-4 text-blue-400" /> : <Pin className="w-4 h-4" />}
                                 </button>
                             </div>
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-white/50">
                                 Waiting for participants...
                             </div>
                         )}
                         
                         {/* Floating Pip Container (Thumbnails) */}
                         <div className="absolute right-2 bottom-24 flex flex-col gap-2 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar z-10">
                             {thumbnailPeers.map(peer => (
                                 <div key={peer.id} className="w-28 h-20 md:w-48 md:h-36 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 relative group flex-shrink-0">
                                     <VideoPlayer 
                                         stream={peer.stream} 
                                         isLocal={peer.isLocal} 
                                         className="w-full h-full object-cover" 
                                         label={peer.name || (peer.isLocal ? 'You' : `Remote ${peer.id.slice(0, 4)}`)}
                                         isHandRaised={peer.isHandRaised}
                                         reaction={peer.reaction}
                                     />
                                     
                                     {/* Pin Button for Thumbnail */}
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); togglePin(peer.id); }}
                                         className="absolute top-1 right-1 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                         title="Pin User"
                                     >
                                         <Pin className="w-3 h-3" />
                                     </button>
                                 </div>
                             ))}
                         </div>
                     </div>
                ) : (
                    // Grid View
                    <div className="w-full h-full p-2 md:p-4 grid gap-2 md:gap-4 content-center" 
                         style={{ 
                             gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(peers.length))}, 1fr)` 
                         }}>
                         {peers.map(peer => (
                             <div key={peer.id} className="relative w-full h-full max-h-[400px] aspect-video bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-xl group">
                                 <VideoPlayer 
                                     stream={peer.stream} 
                                     isLocal={peer.isLocal} 
                                     className="w-full h-full object-cover" 
                                     label={peer.name || (peer.isLocal ? 'You' : `Peer ${peer.id.substr(0, 5)}`)}
                                     isHandRaised={peer.isHandRaised}
                                     reaction={peer.reaction}
                                 />
                                 
                                 {/* Pin Button Grid */}
                                 <button 
                                     onClick={() => togglePin(peer.id)}
                                     className={`absolute top-2 right-2 p-2 rounded-full text-white transition-all z-20 ${pinnedPeerId === peer.id ? 'bg-blue-600 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}
                                     title={pinnedPeerId === peer.id ? "Unpin" : "Pin"}
                                 >
                                     {pinnedPeerId === peer.id ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                 </button>
                             </div>
                         ))}
                    </div>
                )}
            </div>
            
            {/* Status Indicator (Clickable to show participants) */}
            <button 
                onClick={() => setShowParticipantsList(!showParticipantsList)}
                className="absolute top-4 left-4 bg-gray-900/50 backdrop-blur px-4 py-2 rounded-full text-white flex items-center gap-2 z-50 hover:bg-gray-800 transition-colors cursor-pointer border border-white/5"
            >
                <div className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span className="text-sm font-medium">
                    {callStatus === 'connected' ? 'Connected' : callStatus === 'calling' ? 'Connecting...' : 'Waiting...'} 
                    {isHost ? ' (Host)' : ' (Guest)'}
                </span>
                <span className="text-xs text-gray-400 ml-2 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {peers.length} active
                </span>
            </button>

            {/* Participants Sidebar */}
            {showParticipantsList && (
                <div className="absolute top-0 right-0 h-full w-full md:w-80 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            Participants ({peers.length})
                        </h3>
                        <button onClick={() => setShowParticipantsList(false)} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-2">
                        {peers.map(peer => {
                            const meta = participantsRef.current[peer.id];
                            const isPeerHost = meta?.type === 'host' || (peer.isLocal && isHost);
                            
                            return (
                                <div key={peer.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors group">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                            {peer.name ? peer.name.slice(0, 2).toUpperCase() : peer.id.slice(0, 2)}
                                        </div>
                                        {peer.isHandRaised && (
                                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 border border-gray-900">
                                                <Hand className="w-3 h-3 text-black" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-sm font-medium text-white truncate">
                                                {peer.name || `Peer ${peer.id.slice(0, 5)}`}
                                                {peer.isLocal && <span className="text-gray-400 ml-1">(You)</span>}
                                            </p>
                                            <div className="flex">
                                                {isPeerHost ? (
                                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">Host</span>
                                                ) : (
                                                    <span className="text-[10px] bg-gray-700/50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-600/30">Guest</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => togglePin(peer.id)}
                                            className={`p-1.5 rounded-full ${pinnedPeerId === peer.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
                                            title={pinnedPeerId === peer.id ? "Unpin" : "Pin"}
                                        >
                                            {pinnedPeerId === peer.id ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Controls Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-2xl z-50">
                  <button 
                    onClick={toggleMute}
                    className={`p-3 rounded-full text-white transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Mute/Unmute"
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  <button 
                    onClick={toggleVideo}
                    className={`p-3 rounded-full text-white transition-all ${isVideoDisabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Camera On/Off"
                  >
                    {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
    
                  <button 
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-full text-white transition-all ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Share Screen"
                  >
                    <Monitor className="w-5 h-5" />
                  </button>

                  {/* Reaction Button */}
                  <div className="relative">
                      <button 
                        onClick={() => setShowReactionMenu(!showReactionMenu)}
                        className={`p-3 rounded-full text-white transition-all ${showReactionMenu ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
                        title="Reactions"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      
                      {/* Reaction Menu Popup */}
                      {showReactionMenu && (
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-800 rounded-full p-2 flex gap-2 shadow-xl border border-gray-600 animate-in slide-in-from-bottom-2 fade-in">
                              {['👍', '❤️', '😂', '😮', '🎉'].map(emoji => (
                                  <button 
                                    key={emoji}
                                    onClick={() => sendReaction(emoji)}
                                    className="p-2 hover:bg-gray-700 rounded-full text-xl transition-colors hover:scale-125"
                                  >
                                      {emoji}
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Hand Raise Button */}
                  <button 
                    onClick={toggleHandRaise}
                    className={`p-3 rounded-full text-white transition-all ${peers.find(p => p.isLocal && p.isHandRaised) ? 'bg-yellow-500 text-black animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Raise Hand"
                  >
                    <Hand className="w-5 h-5" />
                  </button>
    
                  <button 
                    onClick={toggleRecording}
                    className={`p-3 rounded-full text-white transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                  >
                    {isRecording ? <StopCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  
                  {/* Vertical Separator */}
                  <div className="w-px h-8 bg-gray-600 mx-1"></div>
                  
                  {/* Layout Toggle */}
                  <button 
                    onClick={() => setLayoutMode(prev => prev === 'speaker' ? 'grid' : 'speaker')}
                    className="p-3 rounded-full text-white bg-gray-700 hover:bg-gray-600 transition-all"
                    title="Toggle Layout (Grid/Speaker)"
                  >
                    {layoutMode === 'speaker' ? <LayoutGrid className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
    
                  <div className="w-px h-8 bg-gray-600 mx-2"></div>
    
                  <button 
                    onClick={handleEndCall}
                    className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all shadow-lg hover:scale-105"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
            </div>
        </div>
    );
}
