export type ItemType = 'LOST' | 'FOUND';
export type ItemCategory = 'ELECTRONICS' | 'WALLET' | 'DOCUMENTS' | 'KEYS' | 'PETS' | 'OTHER';
export type ItemStatus = 'OPEN' | 'VERIFYING' | 'RESOLVED' | 'ARCHIVED';

export interface GeoLocation {
    latitude: number;
    longitude: number;
    addressText: string;
}

export interface Item {
    id: string;
    title: string;
    category: ItemCategory;
    type: ItemType;
    description: string;
    imageUrls?: string[];
    createdAt: string;
    location?: {
        latitude: number;
        longitude: number;
        addressText: string;
    };
    addressText?: string;
    dateLostOrFound: string;
    status: 'OPEN' | 'VERIFYING' | 'RESOLVED' | 'ARCHIVED';
    hasSecretDetail: boolean;
    secretVerificationQuestion?: string;
    reportedByUserId?: string;
    hasAlreadyClaimed?: boolean;
}

export interface CreateItemDTO {
    title: string;
    category: ItemCategory;
    type: ItemType;
    description: string;
    imageUrls?: string[];
    latitude: number;
    longitude: number;
    addressText: string;
    dateLostOrFound: string;
    secretVerificationQuestion?: string;
}

export interface ClaimRequestDTO {
    itemId: string;
    proofDescription: string;
    secretAnswer: string;
    contactEmailOrPhone: string;
}