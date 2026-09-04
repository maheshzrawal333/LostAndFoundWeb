import React, { useState } from 'react';
import { Item } from '../../types/item.types';
import { itemService } from '../../services/itemService';

interface ClaimModalProps {
    item: Item;
    onClose: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ item, onClose }) => {
    const [proofText, setProofText] = useState('');
    const [secretAnswer, setSecretAnswer] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await itemService.submitClaim({
                itemId: item.id,
                proofDescription: proofText,
                secretAnswer: secretAnswer,
                contactEmailOrPhone: contactInfo,
            });
            setFeedback('Claim request submitted successfully! The finder will review your details.');
            setTimeout(onClose, 2000);
        } catch (err) {
            setFeedback('Failed to submit claim. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Claim: {item.title}</h2>
                <p className="modal-subtitle">
                    Provide identifying proof to verify genuine ownership.
                </p>

                {feedback && <div className="alert-box">{feedback}</div>}

                <form onSubmit={handleSubmit} className="form-stack">
                    <label>
                        Identifying Proof:
                        <textarea
                            required
                            rows={3}
                            placeholder="Unique marks, stickers, exact purchase date, or receipts..."
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                        />
                    </label>

                    <label>
                        Security Question / Verification Detail:
                        <input
                            type="text"
                            required
                            placeholder="e.g., exact lockscreen picture description or hidden identifier"
                            value={secretAnswer}
                            onChange={(e) => setSecretAnswer(e.target.value)}
                        />
                    </label>

                    <label>
                        Your Contact Info (Phone or Email):
                        <input
                            type="text"
                            required
                            placeholder="Where should the finder contact you?"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                        />
                    </label>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Claim'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};