'use client'
import { useSettings } from '@/app/hooks/settings'
import Pagination from '@/components/common/pagination'
import SettingList from '@/app/(dashboard)/settings/components/settingList'
import SettingsLoading from '@/app/(dashboard)/settings/loading'
export default function SettingsPage() {
    const { settings, loading, error, currentPage, setCurrentPage, totalPages } = useSettings()
    console.log("settings", settings, loading)
    return (
        <div className="p-6 text-black">
            <h1 className="text-2xl font-bold mb-6 text-black">Settings</h1>
            <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-6">
                    {/* Settings List */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        setCurrentPage={setCurrentPage}
                        loading={loading} />
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-black">System Settings</h2>
                        {loading && <div className=" text-black">Loading...</div>}
                        {error && <div className="p-6 text-black">{error}</div>}
                    </div>
                    {settings.length === 0 ? <SettingsLoading /> : <SettingList settings={settings} />}
                </div>
            </div>
        </div>
    )
}