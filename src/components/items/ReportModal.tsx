import React, { useState } from 'react';
import { ItemType, ItemCategory, CreateItemDTO } from '../../types/item.types';
import { itemService } from '../../services/itemService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Triggered to refresh the item list
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [type, setType] = useState<ItemType>('FOUND');
    const [category, setCategory] = useState<ItemCategory>('ELECTRONICS');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locationText, setLocationText] = useState('');
    const [secretQuestion, setSecretQuestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const newItem: CreateItemDTO = {
            type,
            category,
            title,
            description,
            addressText: locationText,
            latitude: 27.671, // In a real app, map this using Mapbox or Geolocation API
            longitude: 85.391,
            dateLostOrFound: new Date().toISOString(),
            secretVerificationDetail: type === 'FOUND' ? secretQuestion : undefined
        };

        try {
            await itemService.createItem(newItem);
            onSuccess(); // Tell the parent (App.tsx) to refresh the data
            onClose();   // Close the modal
        } catch (err) {
            console.error('Failed to report item', err);
            alert('Failed to save item to backend.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal title={`Report an Item`} isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="form-stack">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="radio" checked={type === 'FOUND'} onChange={() => setType('FOUND')} />
                        I Found Something
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="radio" checked={type === 'LOST'} onChange={() => setType('LOST')} />
                        I Lost Something
                    </label>
                </div>

                <Input
                    label="Item Title (e.g., Blue iPhone 13)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />

                <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Category
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ItemCategory)}
                        style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    >
                        <option value="ELECTRONICS">Electronics</option>
                        <option value="WALLET">Wallet & Cash</option>
                        <option value="DOCUMENTS">IDs & Documents</option>
                        <option value="KEYS">Keys</option>
                        <option value="PETS">Pets</option>
                        <option value="OTHER">Other</option>
                    </select>
                </label>

                <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Description
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit' }}
                        required
                        placeholder={type === 'FOUND' ? "Don't reveal everything! Withhold a detail so the true owner can prove it." : "Describe the item in detail."}
                    />
                </label>

                <Input
                    label="Location (Where did you find/lose it?)"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    required
                />

                {type === 'FOUND' && (
                    <Input
                        label="Secret Verification Question (Optional)"
                        value={secretQuestion}
                        onChange={(e) => setSecretQuestion(e.target.value)}
                        placeholder="e.g. 'What is the lockscreen wallpaper?'"
                    />
                )}

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button variant="primary" type="submit" isLoading={isSubmitting}>
                        {type === 'FOUND' ? 'Submit Found Report' : 'Submit Lost Report'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};