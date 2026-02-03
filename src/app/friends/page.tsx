import FriendsList from '@/components/FriendsList'
import { requireAuth } from '@/lib/auth'

export default async function FriendsPage() {
  await requireAuth()
  
  return <FriendsList />
}
