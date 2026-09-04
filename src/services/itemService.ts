// src/services/itemService.ts
import { apiClient } from './apiClient';
import { Item, CreateItemDTO, ClaimRequestDTO } from '../types/item.types';

export const itemService = {
    getAllItems: async (type?: 'LOST' | 'FOUND', query?: string): Promise<Item[]> => {
        const response = await apiClient.get<Item[]>('/items', {
            params: { type, query },
        });
        return response.data;
    },

    getItemById: async (id: string): Promise<Item> => {
        const response = await apiClient.get<Item>(`/items/${id}`);
        return response.data;
    },

    createItem: async (dto: CreateItemDTO): Promise<Item> => {
        const response = await apiClient.post<Item>('/items', dto);
        return response.data;
    },

    submitClaim: async (dto: ClaimRequestDTO): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post<{ success: boolean; message: string }>('/claims', dto);
        return response.data;
    },
};