import React, { useState, useEffect } from 'react';

interface MessagesInboxProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: {
        name: string;
        avatar: string;
    };
}

// Mock Data for the Inbox - Added 'otherUserAvatar' to simulate uploaded pictures
const mockChats = [
    {
        id: 'chat_1',
        itemTitle: 'Black Leather Wallet',
        reference: 'REF: TRK-001',
        otherUser: 'Alex Shrestha',
        otherUserAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150', // Alex has an avatar
        role: 'Finder',
        lastMessage: 'I have handed it over to the library desk.',
        time: '10:42 AM',
        unread: 2,
        messages: [
            { id: 'm1', sender: 'them', text: 'Hi, I am the one who found the wallet.', time: '10:30 AM' },
            { id: 'm2', sender: 'me', text: 'Thank you so much! Where can we meet?', time: '10:35 AM' },
            { id: 'm3', sender: 'them', text: 'I have handed it over to the library desk.', time: '10:42 AM' }
        ]
    },
    {
        id: 'chat_2',
        itemTitle: 'Sony WH-1000XM4',
        reference: 'REF: TRK-002',
        otherUser: 'Priya Karki',
        otherUserAvatar: '', // Priya does not have an avatar, will show 'P'
        role: 'Claimer',
        lastMessage: 'Yes, it has a small scratch on the left side.',
        time: 'Yesterday',
        unread: 0,
        messages: [
            { id: 'm1', sender: 'them', text: 'Hello, I believe these are my headphones.', time: 'Yesterday 4:00 PM' },
            { id: 'm2', sender: 'me', text: 'Great. Can you confirm the specific scratch location?', time: 'Yesterday 4:15 PM' },
            { id: 'm3', sender: 'them', text: 'Yes, it has a small scratch on the left side.', time: 'Yesterday 4:20 PM' }
        ]
    }
];

export const MessagesInbox: React.FC<MessagesInboxProps> = ({ isOpen, onClose, currentUser }) => {
    const [activeChatId, setActiveChatId] = useState<string | null>(mockChats[0].id);
    const [chatInput, setChatInput] = useState('');
    const [localChats, setLocalChats] = useState(mockChats);

    useEffect(() => {
        if (isOpen && !activeChatId) {
            setActiveChatId(mockChats[0].id);
        }
    }, [isOpen, activeChatId]);

    if (!isOpen) return null;

    const activeChat = localChats.find(c => c.id === activeChatId);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatId) return;

        setLocalChats(prevChats =>
            prevChats.map(chat => {
                if (chat.id === activeChatId) {
                    return {
                        ...chat,
                        lastMessage: chatInput,
                        time: 'Just now',
                        messages: [
                            ...chat.messages,
                            { id: Date.now().toString(), sender: 'me', text: chatInput, time: 'Just now' }
                        ]
                    };
                }
                return chat;
            })
        );
        setChatInput('');
    };

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden border border-brand-lightest">

                {/* LEFT PANEL: Chat List */}
                <div className="w-full md:w-[380px] flex flex-col border-r border-slate-200 bg-slate-50 shrink-0">

                    {/* Header - Current User Profile */}
                    <div className="bg-slate-950 p-4 flex justify-between items-center shrink-0 h-20 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-brand-light font-bold overflow-hidden shadow-inner shrink-0">
                                {currentUser.avatar ? (
                                    <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(currentUser.name)
                                )}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight leading-tight">Secure Inbox</h2>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{currentUser.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full focus:outline-none shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Search/Filter */}
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {localChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setActiveChatId(chat.id)}
                                className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-100 flex gap-3 items-center ${activeChatId === chat.id ? 'bg-white border-l-4 border-l-brand-primary' : 'border-l-4 border-l-transparent'}`}
                            >
                                {/* OTHER USER AVATAR - Chat List */}
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 border border-slate-300 overflow-hidden">
                                    {chat.otherUserAvatar ? (
                                        <img src={chat.otherUserAvatar} alt={chat.otherUser} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(chat.otherUser)
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="text-sm font-bold text-brand-dark truncate pr-2">{chat.itemTitle}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap mt-0.5">{chat.time}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-medium text-slate-500 truncate pr-2">
                                            <span className="font-bold text-slate-700">{chat.otherUser.split(' ')[0]}</span>: {chat.lastMessage}
                                        </p>
                                        {chat.unread > 0 && (
                                            <span className="w-5 h-5 bg-brand-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                        {chat.unread}
                      </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANEL: Active Chat */}
                <div className="hidden md:flex flex-1 flex-col bg-white relative">
                    {activeChat ? (
                        <>
                            {/* Active Chat Header */}
                            <div className="bg-white px-6 h-20 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10">
                                <div className="flex items-center gap-4">
                                    {/* OTHER USER AVATAR - Active Chat Header */}
                                    <div className="w-10 h-10 rounded-full bg-brand-lightest flex items-center justify-center text-brand-primary font-bold border border-brand-light overflow-hidden shrink-0">
                                        {activeChat.otherUserAvatar ? (
                                            <img src={activeChat.otherUserAvatar} alt={activeChat.otherUser} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(activeChat.otherUser)
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-brand-dark leading-tight">{activeChat.itemTitle}</h3>
                                        <p className="text-xs font-semibold text-slate-500">
                                            Communicating with <span className="text-brand-primary">{activeChat.otherUser}</span> ({activeChat.role}) • {activeChat.reference}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="text-slate-400 hover:text-brand-dark transition-colors bg-slate-50 p-2 rounded-full border border-slate-200 shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            {/* Security Warning Banner */}
                            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3 shrink-0">
                                <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <div className="text-xs font-medium text-amber-800 leading-relaxed">
                                    <strong>Security Warning:</strong> Messages are NOT end-to-end encrypted and are monitored by admins for fraud prevention.
                                    Do not share financial information. <span className="font-bold underline">Communicating off-platform voids all system protections.</span>
                                </div>
                            </div>

                            {/* Chat Messages Area */}
                            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar bg-slate-50">
                                {activeChat.messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[70%] px-5 py-3 rounded-2xl text-sm font-medium shadow-sm ${
                                            msg.sender === 'me'
                                                ? 'bg-brand-primary text-white rounded-tr-sm'
                                                : 'bg-white border border-slate-200 text-brand-dark rounded-tl-sm'
                                        }`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 mt-1 mx-1">{msg.time}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Message Input */}
                            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-200 shrink-0 flex gap-3 items-center">
                                <button type="button" className="p-2 text-slate-400 hover:text-brand-primary transition-colors focus:outline-none shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                </button>
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Type a secure message..."
                                    className="flex-1 px-5 py-3.5 bg-slate-100 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-medium text-brand-dark"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim()}
                                    className="w-12 h-12 bg-brand-primary text-white rounded-full flex items-center justify-center hover:bg-brand-dark transition-all shadow-md disabled:opacity-50 disabled:shadow-none focus:outline-none shrink-0"
                                >
                                    <svg className="w-5 h-5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            <p className="font-medium">Select a conversation to view messages</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};