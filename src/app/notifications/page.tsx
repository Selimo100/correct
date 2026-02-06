import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listNotifications, markAllRead } from "@/app/actions/notifications"
import NotificationsList from "@/components/NotificationsList"
import { CheckCheck } from "lucide-react"

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth/sign-in")

  const notifications = await listNotifications(50)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated with your bets and friends.</p>
        </div>
        <form action={markAllRead}>
            <button 
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
                <CheckCheck className="w-4 h-4" />
                Mark all read
            </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <NotificationsList initialNotifications={notifications as any} />
      </div>
    </div>
  )
}
