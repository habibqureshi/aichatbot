import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Setting } from '@/app/types/settings'

interface SettingsStore {
    settings: {
        [key: number]: Setting[]
    }
    setSettingsByPage: (settings: Setting[], key: number) => void
    getSettingsByPage: (key: number) => Setting[]
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set, get) => ({
            settings: {},
            setSettingsByPage: (settings: Setting[], key: number) =>
                set((state) => ({
                    settings: { ...state.settings, [key]: settings }
                })),
            getSettingsByPage: (key: number) =>
                get().settings[key] || []
        }),
        {
            name: 'settings',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
)
