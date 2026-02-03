import GroupsManager from '@/components/GroupsManager'
import { requireAuth } from '@/lib/auth'

export default async function GroupsPage() {
  await requireAuth()
  return <GroupsManager />
}
