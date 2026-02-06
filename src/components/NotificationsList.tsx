'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CreditCard, UserPlus, AlertTriangle, Info, Flag, Users, RefreshCw } from 'lucide-react'
import { markRead } from '@/app/actions/notifications'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  created_at: string
  title: string
  body: string | null
  type: string
  icon: string | null
  read_at: string | null
  action_url: string | null
}

const ICONS: Record<string, any> = {
  'bell': Bell,
  'check': Check,
  'coins': CreditCard,
  'user-plus': UserPlus,
  'user-check': Users,
  'alert-triangle': AlertTriangle,
  'flag': Flag,
  'users': Users,
  'refresh-cw': RefreshCw,
  'default': Info
}

export default function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const router = useRouter()

  const handleItemClick = async (n: Notification) => {
    // Optimistic update
    if (!n.read_at) {
      const newNotifs = notifications.map(item => 
        item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
      )
      setNotifications(newNotifs)
      
      // Background server call
      await markRead(n.id)
      router.refresh()
    }
    
    if (n.action_url) {
      router.push(n.action_url)
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Bell className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
        <p className="mt-1">You&apos;re all caught up!</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notif) => {
        const Icon = ICONS[notif.icon || 'default'] || ICONS['default']
        const isUnread = !notif.read_at
        
        return (
          <div 
            key={notif.id}
            onClick={() => handleItemClick(notif)}
            className={`
              p-6 flex gap-4 hover:bg-gray-50 cursor-pointer transition-colors group
              ${isUnread ? 'bg-primary-50/20' : ''}
            `}
          >
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1
              ${isUnread ? 'bg-white text-primary-600 shadow-sm border border-primary-100' : 'bg-gray-100 text-gray-500'}
            `}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className={`text-base ${isUnread ? 'font-semibold text-gray-900 block' : 'font-medium text-gray-700'}`}>
                  {notif.title}
                </p>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {notif.body && (
                <p className={`mt-1 text-sm ${isUnread ? 'text-gray-800' : 'text-gray-500'}`}>
                   {notif.body}
                </p>
              )}
            </div>
            
            {isUnread && (
              <div className="self-center">
                <div className="w-2.5 h-2.5 bg-primary-600 rounded-full" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
