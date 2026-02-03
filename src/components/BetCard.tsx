import Link from 'next/link'
import { Database } from '@/lib/database.types'
import { formatToZurich } from '@/lib/date'

type Bet = Database['public']['Tables']['bets']['Row'] & {
  profiles?: {
    username: string
  }
  stats?: {
    total_pot: number
    participant_count: number
    for_stake: number
    against_stake: number
  }
}

interface BetCardProps {
  bet: Bet
  showCreator?: boolean
}

export default function BetCard({ bet, showCreator = true }: BetCardProps) {
  const isLocked = new Date(bet.end_at) <= new Date() && bet.status === 'OPEN'
  const isEnded = bet.status === 'RESOLVED' || bet.status === 'VOID'
  
  const totalPot = bet.stats?.total_pot || 0
  const forStake = bet.stats?.for_stake || 0
  const againstStake = bet.stats?.against_stake || 0
  const participantCount = bet.stats?.participant_count || 0
  
  const forPercentage = totalPot > 0 ? Math.round((forStake / totalPot) * 100) : 50
  const againstPercentage = totalPot > 0 ? Math.round((againstStake / totalPot) * 100) : 50
  
  const statusBadge = () => {
    if (bet.status === 'RESOLVED') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          {bet.resolution ? 'FOR WINS' : 'AGAINST WINS'}
        </span>
      )
    }
    if (bet.status === 'VOID') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          VOIDED
        </span>
      )
    }
    if (isLocked) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          LOCKED
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
        OPEN
      </span>
    )
  }
  
  const timeRemaining = () => {
    const endDate = new Date(bet.end_at)
    const now = new Date()
    const diff = endDate.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ended'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${minutes}m remaining`
  }

  return (
    <Link href={`/bets/${bet.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{bet.title}</h3>
            {showCreator && bet.profiles && (
              <p className="text-sm text-gray-500">by {bet.profiles.username}</p>
            )}
          </div>
          <div>{statusBadge()}</div>
        </div>
        
        {bet.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bet.description}</p>
        )}
        
        <div className="space-y-3">
          {/* Pot and Participants */}
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-gray-500">Pot:</span>
              <span className="ml-2 font-semibold text-primary-600">{totalPot} Neos</span>
            </div>
            <div>
              <span className="text-gray-500">Participants:</span>
              <span className="ml-2 font-semibold">
                {participantCount}
                {bet.max_participants && ` / ${bet.max_participants}`}
              </span>
            </div>
          </div>
          
          {/* Distribution Bar */}
          {totalPot > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>FOR {forPercentage}%</span>
                <span>AGAINST {againstPercentage}%</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                <div
                  className="bg-green-500"
                  style={{ width: `${forPercentage}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${againstPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Time and Category */}
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-500" title={formatToZurich(bet.end_at)}>{timeRemaining()}</div>
            {bet.category && (
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                {bet.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
