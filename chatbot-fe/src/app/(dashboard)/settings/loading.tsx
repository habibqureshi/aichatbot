export default function SettingsLoading() {
    return (
        <div className="p-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-6">
                    <div>
                        <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border rounded">
                                    <div className="space-y-2">
                                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
                                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center space-x-2 mt-6">
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    )
} 