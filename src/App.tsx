import React, { useState, useRef, useEffect } from 'react';
import { Item, ItemType } from './types/item.types';
import { ItemCard } from './components/items/ItemCard';
import { ReportModal } from './components/items/ReportModal';
import { LoginDrawer } from './components/layout/LoginDrawer';
import { ClaimModal } from './components/items/ClaimModal';
import { MessagesInbox } from './components/chat/MessagesInbox';
import { LegalModal, LegalPageType } from './components/legal/LegalModal';
import { FeedbackModal } from './components/layout/FeedbackModal';
import { useAuth } from './context/AuthContext'; // Adjust path if necessary

const API_BASE_URL = 'http://localhost:8081/api/v1';

export const App: React.FC = () => {
  const { token, isAuthenticated, logout } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const [filterType, setFilterType] = useState<ItemType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  // User Profile State (Fetched from backend)
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '+977 98XXXXX123', // Still mocked as locked for security demonstration
    province: '',
    district: '',
    avatarUrl: ''
  });

  // UI States
  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<Item | null>(null);
  const [isMessagesInboxOpen, setIsMessagesInboxOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [legalPageOpen, setLegalPageOpen] = useState<LegalPageType | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Profile Form State
  const [draftProfile, setDraftProfile] = useState(userProfile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- API Integrations ---

  // 1. Fetch Items dynamically based on filters
  const fetchItems = async () => {
    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (locationQuery.trim()) params.append('location', locationQuery.trim());

      const res = await fetch(`${API_BASE_URL}/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch items", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Fetch items on initial load and when the Type tab changes
  useEffect(() => {
    fetchItems();
  }, [filterType]);

  // 2. Fetch User Profile on Login
  useEffect(() => {
    if (isAuthenticated && token) {
      fetch(`${API_BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              const loadedProfile = {
                name: data.name || '',
                email: data.email || '',
                phone: '+977 98XXXXX123',
                province: data.province || '',
                district: data.district || '',
                avatarUrl: data.avatarUrl || ''
              };
              setUserProfile(loadedProfile);
              setDraftProfile(loadedProfile);
            }
          });
    }
  }, [isAuthenticated, token]);

  // Sync draft profile when modal opens
  useEffect(() => {
    if (isProfileModalOpen) {
      setDraftProfile(userProfile);
      setIsVerifyingEmail(false);
      setEmailOtp('');
      setOtpError('');
    }
  }, [isProfileModalOpen, userProfile]);

  // --- Handlers ---

  const requireAuth = (action: () => void) => {
    if (isAuthenticated) action();
    else setIsLoginDrawerOpen(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutModalOpen(false);
    setIsProfileModalOpen(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && token) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_BASE_URL}/files/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          setDraftProfile(prev => ({ ...prev, avatarUrl: data.url }));
        }
      } catch (error) {
        console.error("Failed to upload avatar", error);
      }
    }
  };

  const saveProfileToBackend = async (profileData: typeof draftProfile) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(prev => ({ ...prev, ...updated }));
        setIsProfileModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save profile", err);
    }
  };

  const handleInitiateSave = async () => {
    const hasSensitiveChanges = draftProfile.email !== userProfile.email;

    setIsSavingProfile(true);

    if (hasSensitiveChanges) {
      setTimeout(() => {
        setIsVerifyingEmail(true);
        setIsSavingProfile(false);
      }, 800);
    } else {
      await saveProfileToBackend(draftProfile);
      setIsSavingProfile(false);
    }
  };

  const handleVerifyAndSave = async () => {
    if (emailOtp.length !== 6) {
      setOtpError('Please enter a valid 6-digit code.');
      return;
    }

    setIsSavingProfile(true);
    setOtpError('');

    await new Promise(resolve => setTimeout(resolve, 1200));

    if (emailOtp === '123456') { // Mock verification
      await saveProfileToBackend(draftProfile);
      setIsSavingProfile(false);
    } else {
      setOtpError('Invalid verification code.');
      setIsSavingProfile(false);
    }
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
      <div className="min-h-screen flex flex-col bg-background text-brand-dark selection:bg-brand-lightest selection:text-brand-dark">

        {/* --- HEADER --- */}
        <header className="sticky top-0 z-50 w-full bg-slate-950 border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">

            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => { setFilterType('ALL'); fetchItems(); }}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-primary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <span className="text-lg sm:text-2xl font-bold tracking-tight text-white hidden sm:block">Lost And Found Nepal.</span>
              <span className="text-lg font-bold tracking-tight text-white sm:hidden">L&F Nepal.</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {isAuthenticated ? (
                  <>
                    <button
                        onClick={() => requireAuth(() => setIsReportModalOpen(true))}
                        className="bg-brand-primary text-white p-2 sm:px-5 sm:py-2.5 rounded-lg text-sm font-bold shadow-md shadow-brand-primary/20 hover:bg-brand-light hover:text-brand-dark transition-all duration-300 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                      <span className="hidden sm:inline">+ Report Item</span>
                    </button>

                    <div className="h-6 sm:h-8 w-px bg-slate-700 hidden sm:block mx-0.5 sm:mx-1"></div>

                    <button
                        onClick={() => requireAuth(() => setIsMessagesInboxOpen(true))}
                        className="relative p-2 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-slate-950 rounded-full"></span>
                    </button>

                    <div
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group ml-1 sm:ml-2 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                    >
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-bold text-white group-hover:text-brand-light transition-colors">{userProfile.name || 'User'}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verified User</span>
                      </div>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center font-bold text-brand-light group-hover:border-brand-light transition-colors overflow-hidden shrink-0">
                        {userProfile.avatarUrl ? (
                            <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            getInitials(userProfile.name)
                        )}
                      </div>
                    </div>
                  </>
              ) : (
                  <button
                      onClick={() => setIsLoginDrawerOpen(true)}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-bold transition-all border border-white/10 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                    Sign In
                  </button>
              )}
            </div>
          </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">

          <div className="mb-8 sm:mb-10 max-w-2xl mx-auto text-center px-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-dark mb-3 sm:mb-4 leading-tight">
              Recover what matters.
            </h1>
            <p className="text-base sm:text-lg text-slate-500 font-medium">
              Search our secure database to find your lost belongings or help someone recover theirs.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 mb-10 sm:mb-12 w-full">

            <div className="flex bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full max-w-md sm:w-fit border border-slate-200">
              {(['ALL', 'LOST', 'FOUND'] as const).map((type) => (
                  <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex-1 sm:flex-none px-2 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                          filterType === type
                              ? type === 'LOST'
                                  ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                                  : type === 'FOUND'
                                      ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                                      : 'bg-white text-brand-dark shadow-md'
                              : 'text-slate-500 hover:text-brand-dark hover:bg-slate-200/50'
                      }`}
                  >
                    {type === 'ALL' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>}
                    {type === 'LOST' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>}
                    {type === 'FOUND' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                    {type === 'ALL' ? 'View All' : type === 'LOST' ? 'Lost Items' : 'Found Items'}
                  </button>
              ))}
            </div>

            <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col md:flex-row items-center gap-2 md:gap-0 w-full max-w-4xl">
              <div className="flex-1 flex items-center px-4 py-2 w-full group">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <div className="ml-3 w-full text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">What are you looking for?</label>
                  <input
                      type="text"
                      placeholder="e.g. Wallet, Sony, Keys..."
                      className="w-full bg-transparent border-none focus:outline-none text-brand-dark font-semibold placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
                  />
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-slate-200 shrink-0 mx-2"></div>
              <div className="flex-1 flex items-center px-4 py-2 w-full group border-t border-slate-100 md:border-none">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <div className="ml-3 w-full text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Where?</label>
                  <input
                      type="text"
                      placeholder="e.g. Kathmandu, Bus Park..."
                      className="w-full bg-transparent border-none focus:outline-none text-brand-dark font-semibold placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
                  />
                </div>
              </div>
              <button onClick={fetchItems} className="w-full md:w-auto bg-brand-primary text-white px-8 py-3.5 sm:py-4 rounded-xl md:rounded-full font-bold hover:bg-brand-dark transition-colors shadow-md shadow-brand-primary/30 mt-2 md:mt-0 flex items-center justify-center shrink-0">
                <span className="md:hidden mr-2">Search Items</span>
                <svg className="w-5 h-5 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-7xl mx-auto min-h-[50vh] transition-all duration-300 ease-in-out">
            {isLoadingItems ? (
                <div className="w-full py-20 flex justify-center">
                  <svg className="animate-spin h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            ) : items.length > 0 ? (
                items.map((item) => (
                    <div key={item.id} className="w-full sm:max-w-sm sm:w-[320px]">
                      <ItemCard item={item} onClaimClick={(it) => requireAuth(() => setSelectedItemForClaim(it))} />
                    </div>
                ))
            ) : (
                <div className="w-full py-16 sm:py-20 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-2">No items found</h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium">Try adjusting your keywords or location filters.</p>
                </div>
            )}
          </div>
        </main>

        {/* --- FOOTER --- */}
        <footer className="bg-brand-dark text-slate-300 py-10 sm:py-12 mt-auto border-t border-brand-dark">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-white/10 pb-8 text-center md:text-left">
              <div className="md:col-span-2 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white">Lost And Found Nepal.</span>
                </div>
                <p className="text-sm text-slate-400 mb-4 max-w-sm leading-relaxed">
                  A secure, community-driven platform dedicated to reuniting people with their lost belongings. Built with privacy and security in mind.
                </p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4 tracking-wide">Resources</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => setLegalPageOpen('HOW_IT_WORKS')} className="text-slate-400 hover:text-brand-light transition-colors focus:outline-none">How it Works</button></li>
                  <li><button onClick={() => setLegalPageOpen('SAFETY')} className="text-slate-400 hover:text-brand-light transition-colors focus:outline-none">Safety Guidelines</button></li>
                  <li><button onClick={() => setLegalPageOpen('PRIVACY')} className="text-slate-400 hover:text-brand-light transition-colors focus:outline-none">Privacy Policy</button></li>
                  <li><button onClick={() => setLegalPageOpen('TERMS')} className="text-slate-400 hover:text-brand-light transition-colors focus:outline-none">Terms of Service</button></li>
                </ul>
              </div>

              <div className="flex flex-col items-center md:items-start">
                <h4 className="text-white font-bold mb-4 tracking-wide">Help us improve</h4>
                <p className="text-sm text-slate-400 mb-4">Found a bug or have a suggestion?</p>
                <button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-bold text-white transition-all w-full sm:w-auto text-left flex items-center justify-center md:justify-between group"
                >
                  <span>Send Feedback</span>
                  <svg className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
              <p>© {new Date().getFullYear()} Lost And Found Nepal. All rights reserved.</p>
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
                <span className="text-brand-light font-bold">Developed by [maheshzrawal333]</span>
                <div className="w-px h-4 bg-slate-700 hidden sm:block"></div>
                <a href="https://www.linkedin.com/in/maheshzrawal333/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
                <a href="https://github.com/maheshzrawal333" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
              </div>
            </div>
          </div>
        </footer>

        {/* --- MODALS & DRAWERS --- */}
        <ReportModal isOpen={isReportModalOpen} onClose={() => { setIsReportModalOpen(false); fetchItems(); }} />
        <LoginDrawer isOpen={isLoginDrawerOpen} onClose={() => setIsLoginDrawerOpen(false)} onLoginSuccess={() => {}} />
        <ClaimModal isOpen={!!selectedItemForClaim} item={selectedItemForClaim} onClose={() => setSelectedItemForClaim(null)} />
        <MessagesInbox isOpen={isMessagesInboxOpen} onClose={() => setIsMessagesInboxOpen(false)} currentUser={userProfile} />
        <LegalModal isOpen={legalPageOpen !== null} page={legalPageOpen} onClose={() => setLegalPageOpen(null)} />
        <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />

        {/* --- USER PROFILE CUSTOMIZATION MODAL --- */}
        {isProfileModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-brand-lightest max-h-[90vh]">

                <div className="bg-slate-950 p-5 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    Account Settings
                  </h2>
                  {!isVerifyingEmail && (
                      <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  )}
                </div>

                {isVerifyingEmail ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
                      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 border-4 border-blue-100 shadow-sm">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </div>
                        <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Verify Changes</h3>
                        <p className="text-sm text-slate-500 font-medium mb-8 max-w-sm">
                          To secure your account, we sent a verification code to <span className="font-bold text-brand-dark">{draftProfile.email}</span>.
                        </p>

                        <div className="w-full max-w-xs">
                          <input
                              type="text"
                              maxLength={6}
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                              className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono shadow-sm bg-white ${
                                  otpError ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                              }`}
                              placeholder="------"
                              disabled={isSavingProfile}
                          />
                          {otpError && <p className="text-red-500 text-xs font-semibold mt-2">{otpError}</p>}
                          <p className="text-xs text-slate-400 mt-4">Use code <span className="font-bold text-brand-dark">123456</span> for testing.</p>
                        </div>
                      </div>

                      <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
                        <button
                            onClick={() => setIsVerifyingEmail(false)}
                            disabled={isSavingProfile}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          Back to Edit
                        </button>
                        <button
                            onClick={handleVerifyAndSave}
                            disabled={isSavingProfile}
                            className="px-8 py-2.5 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md shadow-brand-primary/30 hover:bg-brand-dark transition-all min-w-[140px] flex justify-center items-center"
                        >
                          {isSavingProfile ? (
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : 'Verify & Save'}
                        </button>
                      </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300">
                      <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                        />

                        <div className="flex flex-col items-center mb-8">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 border-4 border-white shadow-lg rounded-full flex items-center justify-center font-bold text-slate-400 text-3xl overflow-hidden">
                              {draftProfile.avatarUrl ? (
                                  <img src={draftProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                  getInitials(draftProfile.name)
                              )}
                            </div>
                            <div className="absolute inset-0 bg-brand-dark/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </div>
                          </div>
                          <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-xs font-bold text-brand-primary hover:text-brand-dark transition-colors">Change Profile Picture</button>
                        </div>

                        <div className="space-y-5">
                          <div>
                            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-1.5">Full Name</label>
                            <input type="text" value={draftProfile.name} onChange={(e) => setDraftProfile({...draftProfile, name: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium" />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-1.5">Email Address</label>
                            <input type="email" value={draftProfile.email} onChange={(e) => setDraftProfile({...draftProfile, email: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium" />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-1.5 flex items-center justify-between">
                              Verified Phone
                              <span className="text-red-500 flex items-center gap-1 text-[10px] bg-red-50 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Security Locked
                          </span>
                            </label>
                            <input type="text" value={draftProfile.phone} disabled className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold cursor-not-allowed select-none" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-1.5">Province (Optional)</label>
                              <input type="text" value={draftProfile.province} onChange={(e) => setDraftProfile({...draftProfile, province: e.target.value})} placeholder="e.g. Bagmati" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-1.5">District (Optional)</label>
                              <input type="text" value={draftProfile.district} onChange={(e) => setDraftProfile({...draftProfile, district: e.target.value})} placeholder="e.g. Kathmandu" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium text-sm" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                        <button onClick={() => setIsLogoutModalOpen(true)} className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                          Sign Out
                        </button>
                        <button
                            onClick={handleInitiateSave}
                            disabled={isSavingProfile}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md shadow-brand-primary/30 hover:bg-brand-dark transition-all flex justify-center items-center min-w-[150px]"
                        >
                          {isSavingProfile ? (
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* --- LOGOUT WARNING MODAL --- */}
        {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[140] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-brand-lightest text-center p-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Sign Out</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">
                  Are you sure you want to log out? You must be signed in to modify or interact with the platform.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleLogoutConfirm} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 shadow-md hover:bg-red-700 transition-all">
                    Yes, Sign Out
                  </button>
                </div>
              </div>
            </div>
        )}

      </div>
  );
};

export default App;