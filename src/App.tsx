import React, { useState, useEffect } from 'react';
import { Item } from './types/item.types';
import { ItemCard } from './components/items/ItemCard';
import { ReportModal } from './components/items/ReportModal';
import { LoginDrawer } from './components/layout/LoginDrawer';
import { ClaimModal } from './components/items/ClaimModal';
import { MessagesInbox } from './components/chat/MessagesInbox';
import { LegalModal, LegalPageType } from './components/legal/LegalModal';
import { FeedbackModal } from './components/layout/FeedbackModal';
import { useAuth } from './context/AuthContext';
import { ItemDetailsModal } from './components/items/ItemDetailsModal';
import { AccountSettingsModal } from './components/layout/AccountSettingsModal';

const API_BASE_URL = 'http://localhost:8081/api/v1';

export const App: React.FC = () => {
  const { user, token, isAuthenticated, logout } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [viewMode, setViewMode] = useState<'ALL' | 'LOST' | 'FOUND' | 'MY_POSTS' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  // TRUE BACKEND PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8;

  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<Item | null>(null);
  const [isMessagesInboxOpen, setIsMessagesInboxOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [legalPageOpen, setLegalPageOpen] = useState<LegalPageType | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);

  const fetchItems = async () => {
    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams();

      // Map frontend tabs directly to backend queries
      if (viewMode === 'LOST' || viewMode === 'FOUND') {
        params.append('type', viewMode);
        params.append('status', 'OPEN');
      } else if (viewMode === 'ALL') {
        params.append('status', 'OPEN');
      } else if (viewMode === 'RESOLVED') {
        params.append('status', 'RESOLVED');
      } else if (viewMode === 'MY_POSTS') {
        params.append('myPosts', 'true');
      }

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (locationQuery.trim()) params.append('location', locationQuery.trim());

      // Backend pages are 0-indexed
      params.append('page', (currentPage - 1).toString());
      params.append('size', itemsPerPage.toString());

      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/items?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const fetchedItems = data.content || (Array.isArray(data) ? data : []);
        setItems(fetchedItems);

        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch items", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Refetch items when viewMode or token changes, explicitly resetting page to 1
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1); // Changing this triggers the other useEffect below
    } else {
      fetchItems();
    }
  }, [viewMode, token]);

  // Refetch items when page changes
  useEffect(() => {
    fetchItems();
  }, [currentPage]);

  const requireAuth = (action: () => void) => {
    if (isAuthenticated) action();
    else setIsLoginDrawerOpen(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setViewMode('ALL');
    setIsLogoutModalOpen(false);
    setIsProfileModalOpen(false);
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const getHeaderTitle = () => {
    if (viewMode === 'RESOLVED') return "Success Stories.";
    if (viewMode === 'MY_POSTS') return "Manage Your Posts.";
    return "Recover what matters.";
  };

  const getHeaderSubtitle = () => {
    if (viewMode === 'RESOLVED') return "Items that have been successfully returned to their rightful owners.";
    if (viewMode === 'MY_POSTS') return "View and track the status of items you have reported.";
    return "Search our secure database to find your lost belongings or help someone recover theirs.";
  };

  return (
      <div className="min-h-screen flex flex-col bg-background text-brand-dark selection:bg-brand-lightest selection:text-brand-dark">
        <header className="sticky top-0 z-50 w-full bg-slate-950 border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => setViewMode('ALL')}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-primary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <span className="text-lg sm:text-2xl font-bold tracking-tight text-white hidden sm:block">Lost And Found Nepal.</span>
              <span className="text-lg font-bold tracking-tight text-white sm:hidden">L&F Nepal.</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {isAuthenticated ? (
                  <>
                    <button onClick={() => requireAuth(() => setIsReportModalOpen(true))} className="bg-brand-primary text-white p-2 sm:px-5 sm:py-2.5 rounded-lg text-sm font-bold shadow-md shadow-brand-primary/20 hover:bg-brand-light hover:text-brand-dark transition-all duration-300 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                      <span className="hidden sm:inline">+ Report Item</span>
                    </button>
                    <div className="h-6 sm:h-8 w-px bg-slate-700 hidden sm:block mx-0.5 sm:mx-1"></div>
                    <button onClick={() => requireAuth(() => setIsMessagesInboxOpen(true))} className="relative p-2 text-slate-400 hover:text-white transition-colors focus:outline-none">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    </button>

                    <div onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer group ml-1 sm:ml-2 hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-bold text-white group-hover:text-brand-light transition-colors">{user?.name || 'User'}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verified User</span>
                      </div>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 border-2 border-slate-600 rounded-full flex items-center justify-center font-bold text-brand-light group-hover:border-brand-light transition-colors overflow-hidden shrink-0">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            getInitials(user?.name || 'U')
                        )}
                      </div>
                    </div>
                  </>
              ) : (
                  <button onClick={() => setIsLoginDrawerOpen(true)} className="group flex items-center gap-2 px-5 sm:px-7 py-2 sm:py-2.5 bg-gradient-to-b from-[#1e3a8a] to-[#113b92] text-white rounded-full text-sm font-bold shadow-[0_4px_14px_0_rgba(17,59,146,0.39)] hover:shadow-[0_6px_20px_rgba(17,59,146,0.23)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-[#2a4db3]">
                    <svg className="w-4 h-4 hidden sm:block opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    Sign In
                  </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
          <div className="mb-8 sm:mb-10 max-w-2xl mx-auto text-center px-2 animate-in fade-in duration-300">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-dark mb-3 sm:mb-4 leading-tight">{getHeaderTitle()}</h1>
            <p className="text-base sm:text-lg text-slate-500 font-medium">{getHeaderSubtitle()}</p>
          </div>

          <div className="flex flex-col items-center gap-6 mb-10 sm:mb-12 w-full">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-full overflow-x-auto border border-slate-200 custom-scrollbar shadow-inner">
              {(['ALL', 'LOST', 'FOUND', 'MY_POSTS', 'RESOLVED'] as const).map((mode) => (
                  <button
                      key={mode}
                      onClick={() => {
                        if (mode === 'MY_POSTS' && !isAuthenticated) {
                          setIsLoginDrawerOpen(true);
                          return;
                        }
                        setViewMode(mode);
                      }}
                      className={`flex-1 min-w-[100px] sm:min-w-[120px] px-3 sm:px-6 py-3 text-[11px] sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                          viewMode === mode
                              ? mode === 'LOST'
                                  ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                                  : mode === 'FOUND'
                                      ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                                      : mode === 'RESOLVED'
                                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                          : 'bg-white text-brand-dark shadow-md border border-slate-200/50'
                              : 'text-slate-500 hover:text-brand-dark hover:bg-slate-200/50'
                      }`}
                  >
                    {mode === 'ALL' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>}
                    {mode === 'LOST' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>}
                    {mode === 'FOUND' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                    {mode === 'MY_POSTS' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>}
                    {mode === 'RESOLVED' && <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                    {mode === 'ALL' ? 'Active Items' : mode === 'LOST' ? 'Lost' : mode === 'FOUND' ? 'Found' : mode === 'MY_POSTS' ? 'My Posts' : 'Resolved'}
                  </button>
              ))}
            </div>

            {(viewMode === 'ALL' || viewMode === 'LOST' || viewMode === 'FOUND') && (
                <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col md:flex-row items-center gap-2 md:gap-0 w-full max-w-4xl animate-in slide-in-from-top-4 duration-300">
                  <div className="flex-1 flex items-center px-4 py-2 w-full group">
                    <svg className="w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <div className="ml-3 w-full text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">What are you looking for?</label>
                      <input type="text" placeholder="e.g. Wallet, Sony, Keys..." className="w-full bg-transparent border-none focus:outline-none text-brand-dark font-semibold placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchItems()} />
                    </div>
                  </div>
                  <div className="hidden md:block w-px h-12 bg-slate-200 shrink-0 mx-2"></div>
                  <div className="flex-1 flex items-center px-4 py-2 w-full group border-t border-slate-100 md:border-none">
                    <svg className="w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <div className="ml-3 w-full text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Where?</label>
                      <input type="text" placeholder="e.g. Kathmandu, Bus Park..." className="w-full bg-transparent border-none focus:outline-none text-brand-dark font-semibold placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchItems()} />
                    </div>
                  </div>
                  <button onClick={() => { setCurrentPage(1); fetchItems(); }} className="w-full md:w-auto bg-brand-primary text-white px-8 py-3.5 sm:py-4 rounded-xl md:rounded-full font-bold hover:bg-brand-dark transition-colors shadow-md shadow-brand-primary/30 mt-2 md:mt-0 flex items-center justify-center shrink-0">
                    <span className="md:hidden mr-2">Search Items</span>
                    <svg className="w-5 h-5 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </button>
                </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-7xl mx-auto min-h-[50vh] transition-all duration-300">
            {isLoadingItems ? (
                <div className="w-full py-20 flex justify-center">
                  <svg className="animate-spin h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            ) : items.length > 0 ? (
                <>
                  {items.map((item) => (
                      <div key={item.id} className="w-full sm:max-w-sm sm:w-[320px] animate-in fade-in zoom-in-95 duration-300">
                        <ItemCard item={item} onClaimClick={(it) => requireAuth(() => setSelectedItemForClaim(it))} onViewDetails={(it) => setSelectedItemForDetails(it)} onOpenInbox={() => requireAuth(() => setIsMessagesInboxOpen(true))} />
                      </div>
                  ))}

                  {totalPages > 1 && (
                      <div className="w-full flex justify-center items-center gap-4 mt-8 pt-8 border-t border-slate-200">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                      </div>
                  )}
                </>
            ) : (
                <div className="w-full py-16 sm:py-20 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    {viewMode === 'RESOLVED' ? (
                        <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"></path></svg>
                    ) : viewMode === 'MY_POSTS' ? (
                        <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    ) : (
                        <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-2">
                    {viewMode === 'RESOLVED' ? 'No success stories yet' : viewMode === 'MY_POSTS' ? "You haven't posted any items" : 'No items found'}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium">
                    {viewMode === 'RESOLVED' ? "Check back later to see items that have been reunited." : viewMode === 'MY_POSTS' ? "When you report a lost or found item, it will appear here." : "Try adjusting your keywords or location filters."}
                  </p>
                </div>
            )}
          </div>
        </main>

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
                <button onClick={() => setIsFeedbackModalOpen(true)} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-bold text-white transition-all w-full sm:w-auto text-left flex items-center justify-center md:justify-between group">
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

        <ReportModal isOpen={isReportModalOpen} onClose={() => { setIsReportModalOpen(false); fetchItems(); }} />
        <LoginDrawer isOpen={isLoginDrawerOpen} onClose={() => setIsLoginDrawerOpen(false)} onLoginSuccess={() => {}} />

        <ClaimModal
            isOpen={!!selectedItemForClaim}
            item={selectedItemForClaim}
            onClose={() => { setSelectedItemForClaim(null); fetchItems(); }}
            onSuccessOpenInbox={() => { setSelectedItemForClaim(null); fetchItems(); setIsMessagesInboxOpen(true); }}
        />

        <MessagesInbox
            isOpen={isMessagesInboxOpen}
            onClose={() => { setIsMessagesInboxOpen(false); fetchItems(); }}
            currentUser={{
              name: user?.name || 'User',
              avatarUrl: user?.avatarUrl || ''
            }}
        />
        <LegalModal isOpen={legalPageOpen !== null} page={legalPageOpen} onClose={() => setLegalPageOpen(null)} />
        <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
        <ItemDetailsModal isOpen={!!selectedItemForDetails} item={selectedItemForDetails} onClose={() => setSelectedItemForDetails(null)} onClaimClick={(it) => requireAuth(() => { setSelectedItemForDetails(null); setSelectedItemForClaim(it); })} onOpenInbox={() => requireAuth(() => { setSelectedItemForDetails(null); setIsMessagesInboxOpen(true); })} />

        <AccountSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

        {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[140] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-brand-lightest text-center p-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Sign Out</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">Are you sure you want to log out? You must be signed in to modify or interact with the platform.</p>
                <div className="flex gap-3">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button onClick={handleLogoutConfirm} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 shadow-md hover:bg-red-700 transition-all">Yes, Sign Out</button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default App;