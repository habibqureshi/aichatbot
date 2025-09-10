'use server'

import { API } from '@/app/http/axio'
import { ENDPOINTS } from '@/app/http/endpoints'
import { SettingsResponse, Setting } from '@/app/types/settings'

export async function getSettings(page: number = 0, size: number = 10): Promise<SettingsResponse> {
    try {
        console.log(ENDPOINTS.SETTINGS.LIST(page, size))
        const response = await API.get<SettingsResponse>(ENDPOINTS.SETTINGS.LIST(page, size))
        await new Promise(resolve => setTimeout(resolve, 500)) // Add 5 second delay
        return response.data
    } catch (error) {
        console.error('Error fetching settings:', error)
        throw error
    }
}

export async function updateSetting(id: number, value: string): Promise<Setting> {
    try {
        const response = await API.put<Setting>(ENDPOINTS.SETTINGS.UPDATE(id), { value })
        return response.data
    } catch (error) {
        console.error('Error updating setting:', error)
        throw error
    }
} 