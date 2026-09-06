export type ItemType = 'LOST' | 'FOUND';

// Expanded and ranked by real-world frequency & importance
export type ItemCategory =
    | 'ELECTRONICS'          // Phones, Laptops, Tablets, Earbuds
    | 'WALLET_PURSE'         // Wallets, Purses, Cash
    | 'DOCUMENTS_ID'         // Passports, Citizenship, Licenses, Bank Cards
    | 'KEYS'                 // Car Keys, House Keys
    | 'BAGS_LUGGAGE'         // Backpacks, Suitcases, Briefcases
    | 'JEWELRY_WATCHES'      // Rings, Watches, Necklaces
    | 'CLOTHING_ACCESSORIES' // Jackets, Sunglasses, Umbrellas
    | 'PETS'                 // Dogs, Cats, Birds
    | 'OTHER';               // Catch-all

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
    status: ItemStatus;
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