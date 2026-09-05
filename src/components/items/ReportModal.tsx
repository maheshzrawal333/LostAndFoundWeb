import React, { useState, useRef } from 'react';
import { ItemType, ItemCategory } from '../../types/item.types';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();

    // Steps: FORM -> OTP
    const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data State
    const [reportType, setReportType] = useState<ItemType | ''>('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<ItemCategory | ''>('');
    const [description, setDescription] = useState('');

    // Address State
    const [province, setProvince] = useState('');
    const [district, setDistrict] = useState('');
    const [municipality, setMunicipality] = useState('');
    const [ward, setWard] = useState('');

    // Image & OTP State
    const [images, setImages] = useState<File[]>([]);
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const availableSlots = 3 - images.length;
            const filesToAdd = selectedFiles.slice(0, availableSlots);
            setImages((prev) => [...prev, ...filesToAdd]);
        }
    };

    const removeImage = (indexToRemove: number) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!reportType) newErrors.reportType = 'Please select if the item is Lost or Found.';
        if (!title.trim()) newErrors.title = 'Title is required.';
        if (!category) newErrors.category = 'Category is required.';
        if (!description.trim()) newErrors.description = 'Description is required.';
        if (!province) newErrors.province = 'State/Province is required.';
        if (!district) newErrors.district = 'District is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = () => {
        if (validateForm()) {
            setStep('OTP');
            setErrors({});
            setOtp('');
        }
    };

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        for (const file of images) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE_URL}/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                uploadedUrls.push(data.url);
            }
        }
        return uploadedUrls;
    };

    const handleSubmit = async () => {
        if (otp.length !== 6) {
            setErrors({ otp: 'Please enter a valid 6-digit verification code.' });
            return;
        }

        // Mock OTP Verification Check
        if (otp !== '123456') {
            setErrors({ otp: 'Invalid verification code. Please try again.' });
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const imageUrls = await uploadImages();
            const addressText = [ward, municipality, district, province].filter(Boolean).join(', ');

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
                // Send nulls to bypass backend secret requirements
                secretVerificationQuestion: null,
                secretAnswer: null
            };

            const response = await fetch(`${API_BASE_URL}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to create item');

            resetAndClose();
        } catch (error) {
            setErrors({ general: 'Failed to publish post. Please try again.' });
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

                            {/* Type Selection */}
                            <div>
                                <label className="block text-sm font-bold text-brand-dark mb-3">What are you reporting? <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={() => setReportType('LOST')} className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${reportType === 'LOST' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-red-200'}`}>I Lost Something</button>
                                    <button type="button" onClick={() => setReportType('FOUND')} className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${reportType === 'FOUND' ? 'border-brand-primary bg-brand-lightest text-brand-dark shadow-sm' : 'border-slate-200 text-slate-500 hover:border-brand-light'}`}>I Found Something</button>
                                </div>
                                {errors.reportType && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.reportType}</p>}
                            </div>

                            {/* Basic Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-brand-dark mb-1.5">Item Title <span className="text-red-500">*</span></label>
                                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Black Leather Wallet" className={`w-full px-4 py-3 bg-white border ${errors.title ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium transition-all`} />
                                    {errors.title && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.title}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-brand-dark mb-1.5">Category <span className="text-red-500">*</span></label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)} className={`w-full px-4 py-3 bg-white border ${errors.category ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium transition-all`}>
                                        <option value="">Select Category</option>
                                        <option value="ELECTRONICS">Electronics</option>
                                        <option value="WALLET">Wallet & Purses</option>
                                        <option value="DOCUMENTS">Documents & IDs</option>
                                        <option value="KEYS">Keys</option>
                                        <option value="PETS">Pets</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                    {errors.category && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.category}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-brand-dark mb-1.5">Description <span className="text-red-500">*</span></label>
                                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item clearly..." className={`w-full px-4 py-3 bg-white border ${errors.description ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium resize-none transition-all`} />
                                    {errors.description && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.description}</p>}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Address Section */}
                            <div>
                                <h3 className="text-sm font-bold text-brand-dark mb-4">Location Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-brand-dark mb-1.5">State <span className="text-red-500">*</span></label>
                                        <select value={province} onChange={(e) => setProvince(e.target.value)} className={`w-full px-4 py-2.5 bg-white border ${errors.province ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium text-sm`}>
                                            <option value="">Select Province</option>
                                            <option value="Koshi">Koshi</option>
                                            <option value="Madhesh">Madhesh</option>
                                            <option value="Bagmati">Bagmati</option>
                                            <option value="Gandaki">Gandaki</option>
                                            <option value="Lumbini">Lumbini</option>
                                            <option value="Karnali">Karnali</option>
                                            <option value="Sudurpashchim">Sudurpashchim</option>
                                        </select>
                                        {errors.province && <p className="text-red-500 text-xs font-semibold mt-1">{errors.province}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-brand-dark mb-1.5">District <span className="text-red-500">*</span></label>
                                        <select value={district} onChange={(e) => setDistrict(e.target.value)} className={`w-full px-4 py-2.5 bg-white border ${errors.district ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-dark font-medium text-sm`}>
                                            <option value="">Select District</option>
                                            <option value="Kathmandu">Kathmandu</option>
                                            <option value="Bhaktapur">Bhaktapur</option>
                                            <option value="Lalitpur">Lalitpur</option>
                                            <option value="Kaski">Kaski</option>
                                            <option value="Morang">Morang</option>
                                            <option value="Rupandehi">Rupandehi</option>
                                            <option value="Chitwan">Chitwan</option>
                                            <option value="Other">Other...</option>
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

                            {/* Photos */}
                            <div>
                                <label className="block text-sm font-bold text-brand-dark mb-3">
                                    Photos (Max 3) <span className="text-slate-400 font-normal text-xs ml-2">{images.length}/3 Uploaded</span>
                                </label>
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
                                        <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-brand-primary cursor-pointer hover:bg-brand-lightest hover:border-brand-primary transition-all">
                                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                            <span className="text-xs font-bold">Add</span>
                                        </div>
                                    )}
                                </div>
                                <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
                            </div>
                        </>

                    ) : (

                        /* --- OTP STEP --- */
                        <div className="py-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="w-16 h-16 bg-brand-lightest text-brand-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Security Verification</h3>
                            <p className="text-slate-500 font-medium mb-8 max-w-sm">
                                To prevent spam and secure your post, please enter the 6-digit code sent to your registered mobile number.
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
                                <p className="text-xs text-slate-400 mt-4">Use code <span className="font-bold text-brand-dark">123456</span> to continue.</p>
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-6 border-t border-brand-lightest bg-slate-50 flex justify-between items-center">
                    {step === 'OTP' ? (
                        <button onClick={() => setStep('FORM')} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-200 transition-colors">
                            Back to Edit
                        </button>
                    ) : (
                        <button onClick={resetAndClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                    )}

                    {step === 'FORM' ? (
                        <button onClick={handleNextStep} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-brand-dark text-white shadow-md shadow-brand-dark/30 hover:bg-brand-primary transition-all flex items-center gap-2">
                            Next Step
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
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