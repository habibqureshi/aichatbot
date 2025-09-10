import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Users | Dashboard',
    description: 'Manage users',
}

export default function UsersPage() {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Users</h1>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Add User
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* User rows will be mapped here */}
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                No users found
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
} 