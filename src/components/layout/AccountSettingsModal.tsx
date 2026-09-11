import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NEPAL_LOCATIONS } from '../../constants/nepalLocations';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = 'https://lostandfoundbackend-lt0z.onrender.com/api/v1';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, token, updateUser, logout } = useAuth();

    const [draftProfile, setDraftProfile] = useState({
        name: '',
        email: '',
        phone: '',
        province: '',
        district: '',
        avatarUrl: ''
    });

    const [previewAvatar, setPreviewAvatar] = useState<string>('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [emailOtp, setEmailOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setDraftProfile({
                name: user?.name || '',
                email: user?.email || '',
                phone: user?.phone || '+977 ',
                province: user?.province || '',
                district: user?.district || '',
                avatarUrl: user?.avatarUrl || ''
            });
            setPreviewAvatar(user?.avatarUrl || '');
            setIsVerifyingEmail(false);
            setEmailOtp('');
            setOtpError('');
            setIsSavingProfile(false);

            if (token) {
                fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data) {
                            updateUser(data);
                            setDraftProfile({
                                name: data.name || '',
                                email: data.email || '',
                                phone: data.phone || '+977 ',
                                province: data.province || '',
                                district: data.district || '',
                                avatarUrl: data.avatarUrl || ''
                            });
                            setPreviewAvatar(data.avatarUrl || '');
                        }
                    })
                    .catch(err => console.error("Failed to fetch fresh profile data", err));
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSignOut = () => {
        onClose();
        logout();
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        if (file.size > 6291456) {
            setOtpError('Profile picture cannot exceed 6MB.');
            return;
        }

        setOtpError('');
        const localPreviewUrl = URL.createObjectURL(file);
        setPreviewAvatar(localPreviewUrl);

        try {
            // FRONTEND COMPRESSION
            const options = {
                maxSizeMB: 0.2, // Compress to max 200 KB
                maxWidthOrHeight: 800, // Resize to 800x800px max
                useWebWorker: true,
                fileType: 'image/jpeg' // Standardize all outputs to JPG
            };

            const compressedFile = await imageCompression(file, options);
            const formData = new FormData();
            formData.append('file', compressedFile, file.name);

            const res = await fetch(`${API_BASE_URL}/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const uploadedUrl = data.url || data.fileUrl || data.path;
                setDraftProfile(prev => ({ ...prev, avatarUrl: uploadedUrl }));
                setPreviewAvatar(uploadedUrl);
            } else {
                const errData = await res.json().catch(() => ({}));
                setOtpError(errData.message || 'Failed to upload picture.');
                setPreviewAvatar(draftProfile.avatarUrl);
            }
        } catch (error) {
            console.error("Compression/Upload error:", error);
            setOtpError('Error compressing or uploading image.');
            setPreviewAvatar(draftProfile.avatarUrl);
        }
    };

    const saveProfileToBackend = async (profileData: typeof draftProfile, otpCode?: string) => {
        try {
            const payload = {
                name: profileData.name,
                email: profileData.email,
                province: profileData.province || null,
                district: profileData.district || null,
                avatarUrl: profileData.avatarUrl || null,
                otp: otpCode || null
            };

            const res = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updated = await res.json();
                updateUser(updated);
                onClose();
                return true;
            } else {
                const errData = await res.json().catch(() => ({}));
                setOtpError(errData.message || errData.error || 'Failed to update profile.');
                return false;
            }
        } catch (err) {
            setOtpError('Network error occurred while saving.');
            return false;
        }
    };

    const handleInitiateSave = async () => {
        setIsSavingProfile(true);
        setOtpError('');

        try {
            const res = await fetch(`${API_BASE_URL}/users/me/request-update-otp`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setIsVerifyingEmail(true);
            } else {
                const err = await res.json().catch(() => ({}));
                setOtpError(err.message || 'Failed to send OTP. You may have reached your update limit.');
            }
        } catch (err) {
            setOtpError('Failed to connect to the server.');
        } finally {
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

        const success = await saveProfileToBackend(draftProfile, emailOtp);
        if (!success) {
            setIsSavingProfile(false);
        }
    };

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-brand-lightest max-h-[90vh]">
                <div className="bg-slate-950 p-5 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        Account Settings
                    </h2>
                    {!isVerifyingEmail && (
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}
                </div>

                {isVerifyingEmail ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
                        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 border-4 border-blue-100 shadow-sm">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Verify Changes</h3>
                            <p className="text-sm text-slate-500 font-medium mb-8 max-w-sm">
                                To secure your account, we sent a verification code to your current email address: <br/><strong className="text-brand-dark mt-1 block">{user?.email}</strong>
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
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
                            <button onClick={() => setIsVerifyingEmail(false)} disabled={isSavingProfile} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-100 transition-colors disabled:opacity-50">Back to Edit</button>
                            <button onClick={handleVerifyAndSave} disabled={isSavingProfile} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md shadow-brand-primary/30 hover:bg-brand-dark transition-all min-w-[140px] flex justify-center items-center">
                                {isSavingProfile ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Verify & Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300">
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">

                            {otpError && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">
                                    {otpError}
                                </div>
                            )}

                            <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />

                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 border-4 border-white shadow-lg rounded-full flex items-center justify-center font-bold text-slate-400 text-3xl overflow-hidden">
                                        {previewAvatar ? (
                                            <img src={previewAvatar} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(draftProfile.name || 'User')
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
                                    <div className="flex justify-between items-end mb-1.5">
                                        <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide">Full Name</label>
                                        <span className={`text-[10px] font-bold ${draftProfile.name.length >= 16 ? 'text-red-500' : 'text-slate-400'}`}>{draftProfile.name.length}/16</span>
                                    </div>
                                    <input type="text" maxLength={16} value={draftProfile.name} onChange={(e) => setDraftProfile({...draftProfile, name: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium" />
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
                                        <select
                                            value={draftProfile.province || ""}
                                            onChange={(e) => setDraftProfile({...draftProfile, province: e.target.value, district: ''})}
                                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium text-sm"
                                        >
                                            <option value="">Select Province</option>
                                            {Object.keys(NEPAL_LOCATIONS).map((prov) => (
                                                <option key={prov} value={prov}>{prov}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-1.5">District (Optional)</label>
                                        <select
                                            value={draftProfile.district || ""}
                                            onChange={(e) => setDraftProfile({...draftProfile, district: e.target.value})}
                                            disabled={!draftProfile.province}
                                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium text-sm transition-colors ${!draftProfile.province ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400' : 'bg-white border-slate-300'}`}
                                        >
                                            <option value="">Select District</option>
                                            {draftProfile.province && NEPAL_LOCATIONS[draftProfile.province] ? NEPAL_LOCATIONS[draftProfile.province].map((dist) => (
                                                <option key={dist} value={dist}>{dist}</option>
                                            )) : null}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                            <button onClick={handleSignOut} className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                Sign Out
                            </button>
                            <button onClick={handleInitiateSave} disabled={isSavingProfile} className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md shadow-brand-primary/30 hover:bg-brand-dark transition-all flex justify-center items-center min-w-[150px]">
                                {isSavingProfile ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};