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
    location: GeoLocation;
    dateLostOrFound: string;
    status: ItemStatus;
    hasSecretDetail: boolean;
    reportedByUserId: string;
    createdAt: string;
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