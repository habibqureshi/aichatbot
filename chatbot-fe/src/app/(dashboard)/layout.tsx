import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import Bottombar from '@/components/dashboard/Bottombar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />

        <main className="flex-1 p-1 bg-gray-50 overflow-hidden">
          <div className="h-[calc(100vh-10rem)] w-full overflow-auto">
            {children}
          </div>
        </main>
        <Bottombar />
      </div>
    </div>
  )
}
