import React, { useState, useRef } from 'react';
import { ItemType, ItemCategory } from '../../types/item.types';
import { useAuth } from '../../context/AuthContext';
import { NEPAL_LOCATIONS } from '../../constants/nepalLocations';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RAW_SIZE_BYTES = 6 * 1024 * 1024; // 6MB

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();

    const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);

    const [reportType, setReportType] = useState<ItemType | ''>('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<ItemCategory | ''>('');
    const [description, setDescription] = useState('');

    const [province, setProvince] = useState('');
    const [district, setDistrict] = useState('');
    const [municipality, setMunicipality] = useState('');
    const [ward, setWard] = useState('');

    const [images, setImages] = useState<File[]>([]);
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);

            // Format validation
            const invalidTypeFiles = selectedFiles.filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
            if (invalidTypeFiles.length > 0) {
                setErrors(prev => ({ ...prev, images: 'Only image files (JPG, PNG, WEBP) are supported.' }));
                return;
            }

            // Size validation (6MB limit)
            const oversizedFiles = selectedFiles.filter(f => f.size > MAX_RAW_SIZE_BYTES);
            if (oversizedFiles.length > 0) {
                setErrors(prev => ({ ...prev, images: 'Each photo must be under 6MB.' }));
                return;
            }

            setImages((prev) => {
                // Anti-duplicate filter
                const uniqueNewFiles = selectedFiles.filter(newFile =>
                    !prev.some(existingFile =>
                        existingFile.name === newFile.name && existingFile.size === newFile.size
                    )
                );

                if (selectedFiles.length !== uniqueNewFiles.length) {
                    setErrors(prevErrs => ({ ...prevErrs, images: 'Duplicate photos detected and removed.' }));
                } else {
                    setErrors(prevErrs => ({ ...prevErrs, images: '' }));
                }

                const availableSlots = 3 - prev.length;
                const filesToAdd = uniqueNewFiles.slice(0, availableSlots);
                return [...prev, ...filesToAdd];
            });
        }
    };

    const removeImage = (indexToRemove: number) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setProvince(e.target.value);
        setDistrict('');
        if (errors.province) setErrors(prev => ({ ...prev, province: '' }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!reportType) newErrors.reportType = 'Please select if the item is Lost or Found.';
        if (!title.trim()) newErrors.title = 'Title is required.';
        if (title.length > 16) newErrors.title = 'Title cannot exceed 16 characters.';
        if (!category) newErrors.category = 'Category is required.';
        if (!description.trim()) newErrors.description = 'Description is required.';
        if (description.length > 250) newErrors.description = 'Description cannot exceed 250 characters.';
        if (!province) newErrors.province = 'State/Province is required.';
        if (!district) newErrors.district = 'District is required.';
        if (images.length === 0) newErrors.images = 'At least one photo is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = async () => {
        if (validateForm()) {
            setIsRequestingOtp(true);
            setErrors({});

            try {
                // API call to trigger the OTP email before advancing to the OTP input screen
                const response = await fetch(`${API_BASE_URL}/items/request-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to send OTP to your email.');
                }

                setStep('OTP');
                setOtp('');
            } catch (error: any) {
                setErrors({ general: error.message || 'Failed to request verification code. Please check your connection.' });
            } finally {
                setIsRequestingOtp(false);
            }
        }
    };

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = [];

        // Industry standard compression settings for lost/found listings
        const options = {
            maxSizeMB: 0.25, // Compress to ~250KB
            maxWidthOrHeight: 1200, // HD max bounds
            useWebWorker: true,
            fileType: 'image/jpeg'
        };

        for (const file of images) {
            try {
                const compressedFile = await imageCompression(file, options);
                const formData = new FormData();
                formData.append('file', compressedFile, file.name);

                const response = await fetch(`${API_BASE_URL}/files/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    uploadedUrls.push(data.url || data.fileUrl);
                } else {
                    throw new Error('Failed to upload image to server.');
                }
            } catch (err: any) {
                console.error("Compression/Upload error:", err);
                throw new Error(err.message || "Failed to process photos.");
            }
        }
        return uploadedUrls;
    };

    const handleSubmit = async () => {
        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            setErrors({ otp: 'Please enter a valid 6-digit verification code.' });
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const imageUrls = await uploadImages();

            const addressParts = [];
            if (ward) addressParts.push(`Ward ${ward}`);
            if (municipality) addressParts.push(municipality);
            if (district) addressParts.push(district);
            if (province) addressParts.push(province);
            const addressText = addressParts.join(', ');

            const payload = {
                title,
                category,
                type: reportType,
                description,
                imageUrls,
                latitude: 27.7172,
                longitude: 85.3240,
                addressText,
                dateLostOrFound: new Date().toISOString(),
                secretVerificationQuestion: null,
                secretAnswer: null,
                otp // The real OTP is now passed to the backend for cryptographic validation
            };

            const response = await fetch(`${API_BASE_URL}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // If the backend rejects the OTP specifically, map the error to the OTP field
                if (errorData.message?.toLowerCase().includes('otp') || errorData.message?.toLowerCase().includes('code')) {
                    throw new Error(`OTP:${errorData.message}`);
                }

                throw new Error(errorData.message || errorData.general || 'Failed to create item');
            }

            resetAndClose();
        } catch (error: any) {
            const msg = error.message;
            if (msg.startsWith('OTP:')) {
                setErrors({ otp: msg.replace('OTP:', '') });
            } else {
                setErrors({ general: msg || 'Failed to publish post. Please try again.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetAndClose = () => {
        setStep('FORM');
        setReportType('');
        setTitle('');
        setCategory('');
        setDescription('');
        setProvince('');
        setDistrict('');
        setMunicipality('');
        setWard('');
        setImages([]);
        setOtp('');
        setErrors({});
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-brand-lightest">

                <div className="flex justify-between items-center p-6 border-b border-brand-lightest bg-brand-lightest/20">
                    <div>
                        <h2 className="text-xl font-extrabold text-brand-dark">
                            {step === 'FORM' ? 'Report an Item' : 'Verify Report'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            {step === 'FORM' ? 'Help us secure the network with accurate details.' : 'Final security check before publishing.'}
                        </p>
                    </div>
                    <button onClick={resetAndClose} className="text-slate-400 hover:text-brand-dark transition-colors bg-white p-2 rounded-full shadow-sm border border-slate-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col gap-8 custom-scrollbar">
                    {step === 'FORM' ? (
                        <>
                            {errors.general && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">
                                    {errors.general}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-brand-dark mb-3">What are you reporting? <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={() => setReportType('LOST')} className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${reportType === 'LOST' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-red-200'}`}>I Lost Something</button>
                                    <button type="button" onClick={() => setReportType('FOUND')} className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${reportType === 'FOUND' ? 'border-brand-primary bg-brand-lightest text-brand-dark shadow-sm' : 'border-slate-200 text-slate-500 hover:border-brand-light'}`}>I Found Something</button>
                                </div>
                                {errors.reportType && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.reportType}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <label className="block text-sm font-bold text-brand-dark">Item Title <span className="text-red-500">*</span></label>
                                        <span className={`text-xs font-bold ${title.length > 16 ? 'text-red-500' : 'text-slate-400'}`}>{title.length}/16</span>
                                    </div>
                                    <input type="text" maxLength={16} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sony Headphones" className={`w-full px-4 py-3 bg-white border ${errors.title ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium transition-all`} />
                                    {errors.title && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.title}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-brand-dark mb-1.5">Category <span className="text-red-500">*</span></label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)} className={`w-full px-4 py-3 bg-white border ${errors.category ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium transition-all`}>
                                        <option value="">Select Category</option>
                                        <option value="ELECTRONICS">Electronics (Phones, Laptops)</option>
                                        <option value="WALLET_PURSE">Wallet, Purse & Cash</option>
                                        <option value="DOCUMENTS_ID">Documents & IDs</option>
                                        <option value="KEYS">Keys</option>
                                        <option value="BAGS_LUGGAGE">Bags & Luggage</option>
                                        <option value="JEWELRY_WATCHES">Jewelry & Watches</option>
                                        <option value="CLOTHING_ACCESSORIES">Clothing & Accessories</option>
                                        <option value="PETS">Pets</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                    {errors.category && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.category}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <label className="block text-sm font-bold text-brand-dark">Description <span className="text-red-500">*</span></label>
                                        <span className={`text-xs font-bold ${description.length > 250 ? 'text-red-500' : 'text-slate-400'}`}>{description.length}/250</span>
                                    </div>
                                    <textarea rows={3} maxLength={250} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item clearly..." className={`w-full px-4 py-3 bg-white border ${errors.description ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium resize-none transition-all`} />
                                    {errors.description && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.description}</p>}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <h3 className="text-sm font-bold text-brand-dark mb-4">Location Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-brand-dark mb-1.5">State <span className="text-red-500">*</span></label>
                                        <select value={province} onChange={handleProvinceChange} className={`w-full px-4 py-2.5 bg-white border ${errors.province ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium text-sm`}>
                                            <option value="" disabled>Select Province</option>
                                            {Object.keys(NEPAL_LOCATIONS).map((prov) => (
                                                <option key={prov} value={prov}>{prov}</option>
                                            ))}
                                        </select>
                                        {errors.province && <p className="text-red-500 text-xs font-semibold mt-1">{errors.province}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-brand-dark mb-1.5">District <span className="text-red-500">*</span></label>
                                        <select value={district} onChange={(e) => { setDistrict(e.target.value); if (errors.district) setErrors(prev => ({ ...prev, district: '' })); }} disabled={!province} className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium text-sm transition-colors ${!province ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400' : errors.district ? 'bg-white border-red-500' : 'bg-white border-slate-300'}`}>
                                            <option value="" disabled>Select District</option>
                                            {province && NEPAL_LOCATIONS[province].map((dist) => (
                                                <option key={dist} value={dist}>{dist}</option>
                                            ))}
                                        </select>
                                        {errors.district && <p className="text-red-500 text-xs font-semibold mt-1">{errors.district}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-brand-dark mb-1.5">Municipality/VDC <span className="text-slate-400 font-normal text-xs ml-1">(Optional)</span></label>
                                        <input type="text" value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="e.g. Pokhara Metropolitan" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium text-sm" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-brand-dark mb-1.5">Ward Number <span className="text-slate-400 font-normal text-xs ml-1">(Optional)</span></label>
                                        <input type="number" min="1" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. 10" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium text-sm" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <label className="block text-sm font-bold text-brand-dark mb-2">
                                    Photos (Max 3, up to 6MB each) <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs ml-2">{images.length}/3 Uploaded</span>
                                </label>

                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                                    <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    <p className="text-[13px] font-medium text-amber-800 leading-relaxed">
                                        <strong>Privacy Warning:</strong> Please do not post photos containing sensitive personal information (e.g., Citizenship numbers, ID numbers, or banking details).
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    {images.map((file, idx) => (
                                        <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-brand-light shadow-sm group">
                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < 3 && (
                                        <div onClick={() => fileInputRef.current?.click()} className={`w-24 h-24 rounded-xl border-2 border-dashed bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all ${errors.images ? 'border-red-500 text-red-500 bg-red-50' : 'border-slate-300 text-brand-primary hover:bg-brand-lightest hover:border-brand-primary'}`}>
                                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                            <span className="text-xs font-bold">Add Photo</span>
                                        </div>
                                    )}
                                </div>
                                {errors.images && <p className="text-red-500 text-xs font-semibold mt-2">{errors.images}</p>}
                                <input type="file" multiple accept="image/jpeg, image/png, image/webp" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
                            </div>
                        </>
                    ) : (
                        <div className="py-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8 duration-300">
                            {errors.general && (
                                <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">
                                    {errors.general}
                                </div>
                            )}
                            <div className="w-16 h-16 bg-brand-lightest text-brand-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Security Verification</h3>
                            <p className="text-slate-500 font-medium mb-8 max-w-sm">
                                To prevent spam and secure your post, please enter the 6-digit code sent to your registered email.
                            </p>

                            <div className="w-full max-w-xs">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono shadow-sm ${
                                        errors.otp ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                    }`}
                                    placeholder="------"
                                    disabled={isSubmitting}
                                />
                                {errors.otp && <p className="text-red-500 text-xs font-semibold mt-2">{errors.otp}</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-brand-lightest bg-slate-50 flex justify-between items-center">
                    {step === 'OTP' ? (
                        <button onClick={() => { setStep('FORM'); setErrors({}); }} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-200 transition-colors">
                            Back to Edit
                        </button>
                    ) : (
                        <button onClick={resetAndClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                    )}

                    {step === 'FORM' ? (
                        <button onClick={handleNextStep} disabled={isRequestingOtp} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-brand-dark text-white shadow-md shadow-brand-dark/30 hover:bg-brand-primary transition-all flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-70 disabled:cursor-not-allowed">
                            {isRequestingOtp ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <>Next Step <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg></>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md shadow-brand-primary/30 hover:bg-brand-dark transition-all disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] flex justify-center"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : 'Publish Post'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};