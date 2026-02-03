'use client'

import { useState } from 'react'
import { createComment } from '@/app/actions/comments'
import { formatToZurich } from '@/lib/date'

type Profile = {
  username: string
  first_name: string
  last_name: string
}

export type CommentType = {
  id: string
  content: string
  created_at: string
  parent_id: string | null
  user_id: string
  profiles?: Profile
  replies?: CommentType[]
}

export default function CommentSection({ 
  comments, 
  betId, 
  userStatus 
}: { 
  comments: CommentType[]
  betId: string
  userStatus: string | null 
}) {
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canComment = userStatus === 'ACTIVE'

  async function handleSubmit(parentId: string | null = null) {
    if (!canComment) return
    
    const text = parentId ? replyContent : content
    if (!text.trim()) return

    setIsSubmitting(true)
    const result = await createComment(betId, text, parentId)
    setIsSubmitting(false)

    if (result.error) {
      alert(result.error)
    } else {
      setContent('')
      setReplyTo(null)
      setReplyContent('')
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Comments ({comments.length})</h3>

      {/* Main Comment Form */}
      {canComment ? (
        <div className="mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => handleSubmit(null)}
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
          {userStatus ? 'Only approved users can post comments.' : 'Sign in to join the discussion.'}
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-white">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                  {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-900">
                      {comment.profiles?.username || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500" title={formatToZurich(comment.created_at)}>
                       {formatToZurich(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                </div>
                
                {/* Actions */}
                <div className="mt-1 ml-2 text-sm text-gray-500 space-x-4">
                  {canComment && (
                    <button 
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="hover:text-primary-600 font-medium"
                    >
                      Reply
                    </button>
                  )}
                  {/* Report Button could go here */}
                </div>

                {/* Reply Form */}
                {replyTo === comment.id && (
                  <div className="mt-3 ml-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Reply to ${comment.profiles?.username}...`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                      autoFocus
                    />
                    <div className="mt-2 flex justify-end space-x-2">
                      <button
                        onClick={() => setReplyTo(null)}
                        className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmit(comment.id)}
                        disabled={isSubmitting || !replyContent.trim()}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 disabled:opacity-50"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-12 mt-4 space-y-4 border-l-2 border-gray-100 pl-4">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                        {reply.profiles?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-900 text-sm">
                            {reply.profiles?.username || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500" title={formatToZurich(reply.created_at)}>
                            {formatToZurich(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
