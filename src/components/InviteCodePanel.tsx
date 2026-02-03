'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, RefreshCw, Check } from 'lucide-react'
import { getInviteCodeAction, rotateInviteCodeAction } from '@/app/actions/bets'

interface Props {
  betId: string
  initialCode?: string | null
}

export default function InviteCodePanel({ betId, initialCode }: Props) {
  const [code, setCode] = useState<string | null>(initialCode || null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleReveal = async () => {
    if (code && !isVisible) {
      setIsVisible(true)
      return
    }
    
    setIsLoading(true)
    try {
      const fetchedCode = await getInviteCodeAction(betId)
      setCode(fetchedCode)
      setIsVisible(true)
    } catch (e: any) {
      alert('Failed to get code: ' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRotate = async () => {
    if (!confirm('Are you sure? The old code will stop working immediately.')) return;
    
    setIsLoading(true)
    try {
      const newCode = await rotateInviteCodeAction(betId)
      setCode(newCode)
      setIsVisible(true)
    } catch (e: any) {
      alert('Failed to rotate code: ' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/bets/${betId}?code=${code}` : ''

  if (!code && !isVisible && !isLoading) {
     return (
       <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
          <div className="flex items-center justify-between">
             <div>
                <h4 className="text-sm font-semibold text-gray-900">Private Invite Code</h4>
                <p className="text-xs text-gray-500">Only you can see this.</p>
             </div>
             <button
               onClick={handleReveal}
               className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
             >
                <Eye className="w-4 h-4" /> Reveal Code
             </button>
          </div>
       </div>
     )
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wide">Creator Invite Control</h4>
        <div className="flex gap-2">
           <button
             onClick={() => setIsVisible(!isVisible)}
             className="p-1.5 text-purple-700 hover:bg-purple-100 rounded"
             title={isVisible ? "Hide" : "Show"}
           >
             {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
           </button>
           <button
             onClick={handleRotate}
             className="p-1.5 text-purple-700 hover:bg-purple-100 rounded"
             title="Regenerate Code"
           >
             <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Code Display */}
        <div className="flex gap-2">
           <div className="flex-1 bg-white border border-purple-200 rounded-md p-3 font-mono text-center tracking-widest text-lg font-bold">
              {isVisible ? code : '••••••••'}
           </div>
           <button
             onClick={handleCopy}
             className="bg-purple-600 text-white px-4 rounded-md font-medium hover:bg-purple-700 transition flex items-center gap-2"
           >
             {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
             {isCopied ? 'Copied' : 'Copy'}
           </button>
        </div>

        {/* Link Display */}
         {isVisible && (
           <div className="text-xs text-purple-800">
             <span className="font-semibold block mb-1">Share Link:</span>
             <code className="block bg-white/50 p-2 rounded break-all select-all">
                {shareLink || '...'}
             </code>
           </div>
         )}
      </div>
    </div>
  )
}
