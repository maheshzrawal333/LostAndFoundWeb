import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface MessagesInboxProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: {
        name: string;
        avatarUrl: string;
    };
}

interface Attachment {
    type: string;
    url: string;
    name: string;
}

interface Message {
    id: string;
    sender: 'me' | 'them' | 'system';
    text: string;
    time: string;
    attachment?: Attachment;
}

interface Chat {
    id: string;
    itemTitle: string;
    itemType: 'LOST' | 'FOUND';
    reference: string;
    otherUser: string;
    otherUserAvatar: string;
    role: string;
    lastMessage: string;
    time: string;
    unread: number;
    status: 'OPEN' | 'RESOLVED';
    isPoster: boolean;
    closureRequestedByMe: boolean;
    closureRequestedByOther: boolean;
    resolutionOtp: string | null;
    messages: Message[];
}

const ALLOWED_ATTACHMENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
];
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024; // 6MB

export const MessagesInbox: React.FC<MessagesInboxProps> = ({ isOpen, onClose, currentUser }) => {
    const { token } = useAuth();

    const [localChats, setLocalChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const [isResolvingUI, setIsResolvingUI] = useState(false);
    const [resolveOtp, setResolveOtp] = useState('');
    const [resolveError, setResolveError] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Guided Tour State (0 = Inactive, 1 = Not a Match, 2 = Generate/Enter Code)
    const [tutorialStep, setTutorialStep] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const stompClientRef = useRef<Client | null>(null);

    const activeChat = localChats.find(c => c.id === activeChatId);

    const canShowActionButtons = activeChat?.status === 'OPEN' && !isResolvingUI && !activeChat?.resolutionOtp && !activeChat?.closureRequestedByMe && !activeChat?.closureRequestedByOther;

    // Trigger Guided Tour exactly once per user account
    useEffect(() => {
        if (isOpen && activeChatId && canShowActionButtons) {
            const tourKey = `laf_chat_tour_completed_${currentUser.name.replace(/\s+/g, '_')}`;
            const hasSeenTour = localStorage.getItem(tourKey);

            if (!hasSeenTour && tutorialStep === 0) {
                const timer = setTimeout(() => {
                    setTutorialStep(1);
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen, activeChatId, canShowActionButtons, tutorialStep, currentUser.name]);

    const dismissTutorial = () => {
        const tourKey = `laf_chat_tour_completed_${currentUser.name.replace(/\s+/g, '_')}`;
        localStorage.setItem(tourKey, 'true');
        setTutorialStep(0);
    };

    const fetchChats = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/chats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data: Chat[] = await res.json();
                setLocalChats(data);
                if (data.length > 0 && !activeChatId && window.innerWidth >= 768) {
                    setActiveChatId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch chats", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !token || !activeChatId) {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
                stompClientRef.current = null;
            }
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
            connectHeaders: { Authorization: `Bearer ${token}` },
            onConnect: () => {
                client.subscribe(`/topic/chat/${activeChatId}`, () => {
                    fetchChats();
                });
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client) client.deactivate();
        };
    }, [isOpen, token, activeChatId]);

    useEffect(() => {
        if (isOpen) {
            fetchChats();
        } else {
            setActiveChatId(null);
            setLocalChats([]);
            setTutorialStep(0);
        }
    }, [isOpen, token]);

    useEffect(() => {
        setIsResolvingUI(false);
        setResolveOtp('');
        setResolveError('');
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localChats, activeChatId]);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError('');
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
            setFileError('Invalid file. Only JPG, PNG, WEBP, and PDF documents are supported.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > MAX_ATTACHMENT_BYTES) {
            setFileError('Attachment exceeds the 6MB maximum limit.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setPendingFile(file);
        setPendingFileUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePendingFile = () => {
        setPendingFile(null);
        setPendingFileUrl(null);
        setFileError('');
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!chatInput.trim() && !pendingFile) || !activeChatId || !token) return;

        setIsSending(true);
        let uploadedAttachmentUrl = null;

        try {
            if (pendingFile) {
                let fileToUpload: File = pendingFile;

                if (pendingFile.type.startsWith('image/')) {
                    const options = {
                        maxSizeMB: 0.25,
                        maxWidthOrHeight: 1200,
                        useWebWorker: true,
                        fileType: 'image/jpeg'
                    };
                    try {
                        fileToUpload = await imageCompression(pendingFile, options);
                    } catch (err) {
                        console.warn("Could not compress chat image, uploading original.", err);
                    }
                }

                const formData = new FormData();
                formData.append('file', fileToUpload, pendingFile.name);

                const fileRes = await fetch(`${API_BASE_URL}/files/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (fileRes.ok) {
                    const fileData = await fileRes.json();
                    uploadedAttachmentUrl = fileData.url;
                } else {
                    const errData = await fileRes.json().catch(() => ({}));
                    setFileError(errData.message || 'Failed to upload attachment.');
                    setIsSending(false);
                    return;
                }
            }

            const payload = {
                text: chatInput.trim(),
                attachmentUrl: uploadedAttachmentUrl,
                attachmentType: pendingFile?.type || null,
                attachmentName: pendingFile?.name || null
            };

            const res = await fetch(`${API_BASE_URL}/chats/${activeChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setChatInput('');
                removePendingFile();
                await fetchChats();
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleAction = async (endpoint: string, method: string = 'PATCH', body?: object) => {
        if (!activeChatId || !token) return;
        setIsActionLoading(true);
        setResolveError('');
        try {
            const options: RequestInit = {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(`${API_BASE_URL}/chats/${activeChatId}/${endpoint}`, options);
            if (res.ok) {
                if (endpoint === 'resolve') setIsResolvingUI(false);
                await fetchChats();
            } else {
                const data = await res.json().catch(() => ({}));
                setResolveError(data.message || 'Action failed.');
            }
        } catch (error) {
            setResolveError('Network error occurred.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    const formatTime = (isoString: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ENTERPRISE FIX: Force strict chronological sorting by comparing timestamps
    const getCleanMessages = (messages: Message[]) => {
        return [...messages] // Create a safe copy before sorting
            .filter(msg => msg.sender !== 'system')
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    };

    // Dynamic Tour Logic based on Physical Possession
    let step1Text = "If you determine this is not a match, click here. This sends a mutual closure request to safely conclude the conversation.";
    let step2Text = "To safely finalize the handover, securely exchange the generated authorization code here.";

    if (activeChat) {
        const isOwner = (activeChat.isPoster && activeChat.itemType === 'LOST') || (!activeChat.isPoster && activeChat.itemType === 'FOUND');

        if (isOwner) {
            step1Text = "If you determine this is not your item, click here. This sends a mutual closure request to safely conclude the conversation.";
        } else {
            step1Text = "If you determine the other party is not the rightful owner, click here. This sends a mutual closure request to safely conclude the conversation.";
        }

        if (activeChat.isPoster) {
            if (isOwner) {
                step2Text = "Upon receiving your item, generate a secure authorization code here and provide it to the finder to formally verify the return.";
            } else {
                step2Text = "Prior to handing over the item, generate a secure authorization code here and provide it to the rightful owner to formally record the transfer.";
            }
        } else {
            if (isOwner) {
                step2Text = "Upon receiving your item, request the secure authorization code from the finder and enter it here to formally verify the return.";
            } else {
                step2Text = "Prior to handing over the item, request the secure authorization code from the rightful owner and enter it here to formally record the transfer.";
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-0 md:p-8 animate-in fade-in duration-200 overflow-hidden">
            <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-[85vh] md:max-w-6xl flex overflow-hidden border-0 md:border border-brand-lightest relative">

                {tutorialStep > 0 && (
                    <div className="absolute inset-0 bg-[#0f172a]/75 z-[50] backdrop-blur-[2px] animate-in fade-in duration-300 pointer-events-auto" />
                )}

                {/* Sidebar: Chat List */}
                <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] flex-col border-r border-slate-200 bg-slate-50 shrink-0 ${tutorialStep === 0 ? 'relative z-20' : ''}`}>
                    <div className="bg-slate-950 p-4 flex justify-between items-center shrink-0 h-20 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-brand-light font-bold overflow-hidden shadow-inner shrink-0">
                                {currentUser.avatarUrl ? (
                                    <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(currentUser.name)
                                )}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight leading-tight">Secure Inbox</h2>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{currentUser.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full focus:outline-none shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <svg className="animate-spin h-8 w-8 text-brand-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </div>
                        ) : localChats.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-slate-400 p-4 text-center">
                                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                <p className="text-sm font-medium">Your inbox is empty.</p>
                            </div>
                        ) : (
                            localChats.map((chat) => {
                                const cleanMsgs = getCleanMessages(chat.messages);
                                const latestText = cleanMsgs.length > 0 ? cleanMsgs[cleanMsgs.length - 1].text : "No messages yet";
                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => setActiveChatId(chat.id)}
                                        className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-100 flex gap-3 items-center ${activeChatId === chat.id ? 'bg-white border-l-4 border-l-brand-primary' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="relative w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 border border-slate-300 overflow-hidden">
                                            {chat.otherUserAvatar ? (
                                                <img src={chat.otherUserAvatar} alt={chat.otherUser} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(chat.otherUser)
                                            )}
                                            {chat.status === 'RESOLVED' && (
                                                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[1px]">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className={`text-sm font-bold truncate pr-2 ${chat.status === 'RESOLVED' ? 'text-slate-500' : 'text-brand-dark'}`}>{chat.itemTitle}</h4>
                                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap mt-0.5">{formatTime(chat.time)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs font-medium truncate pr-2 ${chat.status === 'RESOLVED' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {chat.status === 'RESOLVED' ? (
                                                        <span className="italic flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Closed</span>
                                                    ) : (
                                                        <><span className="font-bold text-slate-700">{chat.otherUser.split(' ')[0]}</span>: {latestText}</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white ${tutorialStep === 0 ? 'relative z-10' : ''} min-w-0 overflow-hidden`}>
                    {activeChat ? (
                        <>
                            {/* ACTIVE CHAT HEADER */}
                            <div className={`bg-white px-2 sm:px-4 md:px-6 min-h-[4rem] sm:min-h-[5rem] py-2 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm relative w-full ${tutorialStep > 0 ? '' : 'z-10'}`}>

                                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0 pr-2">
                                    <button onClick={() => setActiveChatId(null)} className="md:hidden text-slate-500 hover:text-brand-dark p-1 sm:p-2 -ml-1 sm:-ml-2 rounded-full shrink-0">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                                    </button>

                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-lightest flex items-center justify-center text-brand-primary font-bold border border-brand-light overflow-hidden shrink-0">
                                        {activeChat.otherUserAvatar ? (
                                            <img src={activeChat.otherUserAvatar} alt={activeChat.otherUser} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(activeChat.otherUser)
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold text-brand-dark leading-tight flex items-center gap-1.5 sm:gap-2">
                                            <span className="truncate block">{activeChat.itemTitle}</span>
                                            {activeChat.status === 'RESOLVED' && (
                                                <span className="bg-green-100 text-green-700 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block shrink-0">Resolved</span>
                                            )}
                                        </h3>
                                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate block">
                                            With <span className="text-brand-primary">{activeChat.otherUser}</span> • {activeChat.reference}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                                    {canShowActionButtons && (
                                        <div className="flex gap-1.5 sm:gap-2">
                                            <div className={`rounded-lg ${tutorialStep === 1 ? 'relative z-[60] bg-white ring-[4px] ring-[#3b82f6]/30 shadow-2xl scale-105 transition-transform' : 'relative'}`}>
                                                {tutorialStep === 1 && <div className="absolute inset-0 z-10" />}
                                                <button
                                                    onClick={() => handleAction('request-close')}
                                                    disabled={isActionLoading || tutorialStep > 0}
                                                    className={`text-[10px] sm:text-xs font-bold transition-all px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-sm flex items-center gap-1 sm:gap-1.5 ${
                                                        tutorialStep === 1
                                                            ? 'bg-blue-50 text-[#1e40af] border-2 border-[#2563eb]'
                                                            : tutorialStep === 2
                                                                ? 'bg-slate-100 text-slate-400 border border-slate-200 opacity-40'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 border border-slate-200'
                                                    }`}
                                                >
                                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                    <span className="hidden sm:inline">Not a Match</span>
                                                </button>

                                                {tutorialStep === 1 && (
                                                    <div className="absolute top-full right-0 mt-3 w-[240px] sm:w-72 bg-white rounded-xl shadow-2xl p-4 sm:p-5 border border-slate-200 z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                                                        <div className="absolute -top-2 right-4 w-4 h-4 bg-white transform rotate-45 border-l border-t border-slate-200"></div>
                                                        <div className="relative z-10">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="bg-[#2563eb] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 1 of 2</span>
                                                            </div>
                                                            <h4 className="font-extrabold text-[#1e3a8a] mb-1.5 text-sm">Cancel Connection</h4>
                                                            <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed">
                                                                {step1Text}
                                                            </p>
                                                            <div className="flex justify-end">
                                                                <button onClick={() => setTutorialStep(2)} className="bg-[#2563eb] text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-[#1d4ed8] transition-colors shadow-md focus:outline-none">
                                                                    Next
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`rounded-lg ${tutorialStep === 2 ? 'relative z-[60] bg-white ring-[4px] ring-emerald-500/30 shadow-2xl scale-105 transition-transform' : 'relative'}`}>
                                                {tutorialStep === 2 && <div className="absolute inset-0 z-10" />}

                                                {activeChat.isPoster ? (
                                                    <button
                                                        onClick={() => handleAction('request-resolve-otp', 'POST')}
                                                        disabled={isActionLoading || tutorialStep > 0}
                                                        className={`text-[10px] sm:text-xs font-bold transition-all px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-sm flex items-center gap-1 sm:gap-1.5 ${
                                                            tutorialStep === 2
                                                                ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600'
                                                                : tutorialStep === 1
                                                                    ? 'bg-green-50 text-green-600 border border-green-200 opacity-40'
                                                                    : 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-200'
                                                        }`}
                                                    >
                                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                        <span className="hidden sm:inline">Generate Code</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsResolvingUI(true)}
                                                        disabled={isActionLoading || tutorialStep > 0}
                                                        className={`text-[10px] sm:text-xs font-bold transition-all px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-sm flex items-center gap-1 sm:gap-1.5 ${
                                                            tutorialStep === 2
                                                                ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600'
                                                                : tutorialStep === 1
                                                                    ? 'bg-green-50 text-green-600 border border-green-200 opacity-40'
                                                                    : 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-200'
                                                        }`}
                                                    >
                                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                                        <span className="hidden sm:inline">Enter Code</span>
                                                    </button>
                                                )}

                                                {tutorialStep === 2 && (
                                                    <div className="absolute top-full right-0 mt-3 w-[240px] sm:w-72 bg-white rounded-xl shadow-2xl p-4 sm:p-5 border border-slate-200 z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                                                        <div className="absolute -top-2 right-4 w-4 h-4 bg-white transform rotate-45 border-l border-t border-slate-200"></div>
                                                        <div className="relative z-10">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 2 of 2</span>
                                                            </div>
                                                            <h4 className="font-extrabold text-[#1e3a8a] mb-1.5 text-sm">Finalize Handover</h4>
                                                            <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed">
                                                                {step2Text}
                                                            </p>
                                                            <div className="flex justify-end">
                                                                <button onClick={dismissTutorial} className="bg-emerald-600 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-md focus:outline-none">
                                                                    Got it!
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    )}

                                    <button onClick={onClose} className="text-slate-400 hover:text-brand-dark transition-colors bg-slate-50 p-1.5 sm:p-2 rounded-full border border-slate-200 shrink-0 hidden sm:block ml-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col relative overflow-hidden">

                                {activeChat.status === 'OPEN' && activeChat.closureRequestedByMe && (
                                    <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-3 flex justify-between items-center gap-3 shrink-0 shadow-inner">
                                        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-slate-600 min-w-0">
                                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <span className="truncate">Waiting for {activeChat.otherUser.split(' ')[0]} to confirm closure.</span>
                                        </div>
                                        <button onClick={() => handleAction('cancel-close')} disabled={isActionLoading} className="text-[10px] font-bold bg-white text-slate-500 border border-slate-300 hover:bg-slate-200 px-3 py-1.5 rounded-lg shadow-sm shrink-0">Cancel Request</button>
                                    </div>
                                )}

                                {activeChat.status === 'OPEN' && activeChat.closureRequestedByOther && (
                                    <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shrink-0 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-start gap-2 text-[11px] sm:text-xs font-bold text-blue-800">
                                            <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <span>{activeChat.otherUser.split(' ')[0]} wants to close this chat as 'Not a Match'. Do you agree?</span>
                                        </div>
                                        <div className="flex gap-2 self-end sm:self-auto shrink-0">
                                            <button onClick={() => handleAction('cancel-close')} disabled={isActionLoading} className="text-[10px] font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg shadow-sm">Decline</button>
                                            <button onClick={() => handleAction('approve-close')} disabled={isActionLoading} className="text-[10px] font-bold bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> Approve Close</button>
                                        </div>
                                    </div>
                                )}

                                {(isResolvingUI || activeChat.resolutionOtp) && activeChat.status === 'OPEN' ? (
                                    <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 animate-in fade-in duration-300">
                                        {activeChat.isPoster ? (
                                            <>
                                                <div className="w-16 h-16 bg-[#eff6ff] text-[#3b82f6] rounded-full flex items-center justify-center mb-6 shadow-sm border-[4px] border-[#dbeafe] shrink-0">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                </div>
                                                <h3 className="text-2xl font-extrabold text-brand-dark mb-2 text-center">Share this Code</h3>
                                                <p className="text-sm text-slate-500 font-medium mb-8 max-w-sm text-center">
                                                    Show this secure 6-digit code to the other user. They must enter it on their phone to verify the hand-off.
                                                </p>
                                                <div className="bg-white border-2 border-slate-200 px-8 py-5 rounded-2xl shadow-sm mb-8 text-center">
                                                    <span className="text-4xl tracking-[0.3em] font-mono font-extrabold text-brand-primary">{activeChat.resolutionOtp}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-8 animate-pulse text-center">
                                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    Waiting for {activeChat.otherUser.split(' ')[0]} to submit...
                                                </div>
                                                <button onClick={() => handleAction('cancel-resolve-otp')} disabled={isActionLoading} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors">
                                                    Back to Chat
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-6 shadow-sm border-[4px] border-[#d1fae5] shrink-0">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                                </div>
                                                <h3 className="text-2xl font-extrabold text-brand-dark mb-2 text-center">Finalize Resolution</h3>
                                                <p className="text-sm text-slate-500 font-medium mb-8 max-w-sm text-center">
                                                    To securely confirm the exchange of this item, please enter the 6-digit code provided by the poster.
                                                </p>
                                                <div className="w-full max-w-xs">
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        value={resolveOtp}
                                                        onChange={(e) => setResolveOtp(e.target.value.replace(/\D/g, ''))}
                                                        className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border rounded-xl focus:outline-none focus:ring-2 font-mono shadow-sm bg-white ${resolveError ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-green-500 focus:ring-green-100'}`}
                                                        placeholder="------"
                                                        disabled={isActionLoading}
                                                    />
                                                    {resolveError && <p className="text-red-500 text-xs font-semibold mt-2 text-center">{resolveError}</p>}
                                                </div>
                                                <div className="flex gap-3 mt-8">
                                                    <button
                                                        onClick={() => { setIsResolvingUI(false); setResolveError(''); setResolveOtp(''); }}
                                                        disabled={isActionLoading}
                                                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction('resolve', 'PATCH', { otp: resolveOtp })}
                                                        disabled={isActionLoading}
                                                        className="px-8 py-2.5 rounded-xl text-sm font-bold bg-green-500 text-white shadow-md hover:bg-green-600 transition-all flex items-center justify-center min-w-[140px]"
                                                    >
                                                        {isActionLoading ? <svg className="animate-spin h-5 w-5 text-white shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Verify & Resolve'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {activeChat.status === 'OPEN' && (
                                            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex items-start gap-3 shrink-0">
                                                <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                <div className="text-[10px] sm:text-xs font-medium text-amber-800 leading-relaxed">
                                                    <strong>Security Notice:</strong> Messages are not end-to-end encrypted. Logs are retained and strictly reviewed only if a user is reported for fraud or system exploitation. <span className="font-bold underline hidden sm:inline">Never share sensitive data or communicate off-platform.</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex-1 p-3 sm:p-6 overflow-y-auto flex flex-col gap-3 sm:gap-4 custom-scrollbar bg-slate-50 relative z-0">
                                            {getCleanMessages(activeChat.messages).map((msg) => (
                                                <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-[85%] sm:max-w-[70%] px-3.5 sm:px-5 py-2 sm:py-3 rounded-2xl text-sm font-medium shadow-sm break-words ${
                                                        msg.sender === 'me'
                                                            ? 'bg-brand-primary text-white rounded-tr-sm'
                                                            : 'bg-white border border-slate-200 text-brand-dark rounded-tl-sm'
                                                    }`}>
                                                        {msg.attachment && (
                                                            <div className="mb-2 rounded-lg overflow-hidden border border-white/20 bg-black/5">
                                                                {msg.attachment.type?.startsWith('image/') ? (
                                                                    <img src={msg.attachment.url} alt="Attachment" className="max-w-full h-auto max-h-48 object-cover rounded-lg" />
                                                                ) : (
                                                                    <a href={msg.attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20">
                                                                        <svg className="w-8 h-8 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                                        <span className="text-xs font-bold truncate underline">{msg.attachment.name || 'Download PDF Document'}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                        {msg.text && <div>{msg.text}</div>}
                                                    </div>
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1 mx-1">{formatTime(msg.time)}</span>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {activeChat.status === 'RESOLVED' ? (
                                            <div className="p-4 bg-slate-100 border-t border-slate-200 shrink-0 text-center flex flex-col items-center justify-center gap-1">
                                                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chat Closed</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white border-t border-slate-200 shrink-0 flex flex-col">
                                                {fileError && (
                                                    <div className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold border-b border-red-200">
                                                        {fileError}
                                                    </div>
                                                )}

                                                {pendingFile && (
                                                    <div className="px-4 pt-3 pb-1 flex items-center">
                                                        <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center gap-3 pr-8 relative min-w-0">
                                                            {pendingFile.type.startsWith('image/') && pendingFileUrl ? (
                                                                <img src={pendingFileUrl} alt="Preview" className="w-10 h-10 object-cover rounded-md border border-slate-300 shrink-0" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-slate-200 rounded-md flex items-center justify-center shrink-0">
                                                                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-bold text-slate-600 truncate max-w-[120px] sm:max-w-[150px]">{pendingFile.name}</span>
                                                                <span className="text-[10px] text-slate-400">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                            </div>
                                                            <button type="button" onClick={removePendingFile} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm shrink-0">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <form onSubmit={sendMessage} className="p-2 sm:p-4 flex gap-1.5 sm:gap-3 items-end pb-safe">
                                                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg, image/png, image/webp, application/pdf" />
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 sm:p-3 text-slate-400 hover:text-brand-primary hover:bg-brand-lightest rounded-full transition-colors focus:outline-none shrink-0 mb-0.5" disabled={activeChat.closureRequestedByMe || activeChat.closureRequestedByOther || tutorialStep > 0}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                                    </button>
                                                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={activeChat.closureRequestedByMe || activeChat.closureRequestedByOther ? "Chat paused..." : "Type a message..."} disabled={activeChat.closureRequestedByMe || activeChat.closureRequestedByOther || tutorialStep > 0} className="flex-1 min-w-0 px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-100 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-medium text-brand-dark resize-none min-h-[45px] sm:min-h-[50px] max-h-[100px] custom-scrollbar disabled:opacity-60" rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} />
                                                    <button type="submit" disabled={(!chatInput.trim() && !pendingFile) || isSending || activeChat.closureRequestedByMe || activeChat.closureRequestedByOther || tutorialStep > 0} className="w-11 h-11 sm:w-12 sm:h-12 bg-brand-primary text-white rounded-full flex items-center justify-center hover:bg-brand-dark transition-all shadow-md disabled:opacity-50 disabled:shadow-none focus:outline-none shrink-0 mb-0.5">
                                                        {isSending ? (
                                                            <svg className="animate-spin h-5 w-5 text-white shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        ) : (
                                                            <svg className="w-5 h-5 -ml-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                                        )}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 relative z-10">
                            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-brand-dark transition-colors bg-slate-50 p-2 rounded-full border border-slate-200 shrink-0 hidden md:block">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <svg className="w-16 h-16 mb-4 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03-8-9-8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            <p className="font-medium">Select a conversation to view messages</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};