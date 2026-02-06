'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CreditCard, UserPlus, AlertTriangle, Info, Flag, Users, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { getUnreadCount, listNotifications, markAllRead, markRead } from '@/app/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

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
  'user-check': Users, // Or similar
  'alert-triangle': AlertTriangle,
  'flag': Flag,
  'users': Users,
  'refresh-cw': RefreshCw,
  'default': Info
} 

export default function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const [unreadCount, setUnreadCount] = useState(initialCount)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Polling for unread count
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getUnreadCount()
      setUnreadCount(count)
    }, 60000) // 1 min

    return () => clearInterval(interval)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const list = await listNotifications(5)
      setNotifications(list as any)
      // Also refresh count
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleDropdown = () => {
    if (!isOpen) {
      setIsOpen(true)
      loadNotifications()
    } else {
      setIsOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({...n, read_at: new Date().toISOString()})))
    router.refresh()
  }

  const handleItemClick = async (n: Notification) => {
    if (!n.read_at) {
      await markRead(n.id)
      setUnreadCount(c => Math.max(0, c - 1))
      setNotifications(prev => prev.map(item => item.id === n.id ? {...item, read_at: new Date().toISOString()} : item))
      router.refresh()
    }
    setIsOpen(false)
    if (n.action_url) router.push(n.action_url)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg ring-1 ring-black/5 z-50 overflow-hidden text-left origin-top-right animate-in fade-in zoom-in-95 duration-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-3">
                  <Check className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => {
                  const Icon = ICONS[notif.icon || 'default'] || ICONS['default']
                  const isUnread = !notif.read_at
                  
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`
                        p-4 flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors
                        ${isUnread ? 'bg-primary-50/30' : ''}
                      `}
                    >
                      <div className={`
                        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1
                        ${isUnread ? 'bg-white text-primary-600 shadow-sm border border-primary-100' : 'bg-gray-100 text-gray-500'}
                      `}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                             {notif.body}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          {isUnread && (
                            <span className="w-1.5 h-1.5 bg-primary-600 rounded-full inline-block" />
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-100 bg-gray-50/50 text-center">
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
