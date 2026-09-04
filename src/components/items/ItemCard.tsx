import React from 'react';
import { Item } from '../../types/item.types';

interface ItemCardProps {
    item: Item;
    onClaimClick: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClaimClick }) => {
    const isLost = item.type === 'LOST';

    return (
        <article className="item-card">
            <div className="item-badge-container">
        <span className={`badge ${isLost ? 'badge-lost' : 'badge-found'}`}>
          {item.type}
        </span>
                <span className="badge badge-category">{item.category}</span>
            </div>

            <div className="item-image-placeholder">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="item-image" />
                ) : (
                    <div className="no-image-text">No Photo Attached</div>
                )}
            </div>

            <div className="item-body">
                <h3 className="item-title">{item.title}</h3>
                <p className="item-desc">{item.description}</p>

                <div className="item-meta">
                    <p>📍 {item.location.addressText}</p>
                    <p>📅 {new Date(item.dateLostOrFound).toLocaleDateString()}</p>
                </div>

                <button
                    className="btn-primary"
                    onClick={() => onClaimClick(item)}
                >
                    {isLost ? 'I Found This' : 'Claim This Item'}
                </button>
            </div>
        </article>
    );
};