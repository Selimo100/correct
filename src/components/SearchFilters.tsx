'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition, useEffect } from 'react'

type Category = {
  id: string
  name: string
  icon: string | null
}

export default function SearchFilters({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Initial state from URL
  const [query, setQuery] = useState(searchParams.get('q') || '')
  
  // Get active filters
  const activeCategory = searchParams.get('category') || ''
  const activeStatus = searchParams.get('status') || 'OPEN' // Default to OPEN
  const activeSort = searchParams.get('sort') || 'newest'

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      
      // Special Handling: If changing category, don't reset status necessarily
      // But if user clicks "All" statuses, handle that too.
      
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (term: string) => {
    setQuery(term)
    startTransition(() => {
      router.push(`/?${createQueryString('q', term)}`)
    })
  }

  const handleFilterChange = (name: string, value: string) => {
    startTransition(() => {
      router.push(`/?${createQueryString(name, value)}`)
    })
  }
  
  // Helper to reorder categories to putting defaults first
  const defaultOrder = ['love', 'sunrise', 'school', 'random']
  const sortedCategories = [...categories].sort((a, b) => {
     const aIndex = defaultOrder.indexOf(a.name.toLowerCase())
     const bIndex = defaultOrder.indexOf(b.name.toLowerCase())
     
     if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
     if (aIndex !== -1) return -1
     if (bIndex !== -1) return 1
     return a.name.localeCompare(b.name)
  })

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-gray-100">
      {/* Search Bar - Full Width & Clean */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
           <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search bets by title or username..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
        />
      </div>

      <div className="space-y-4">
        {/* Category Tabs - Scrollable */}
        <div>
           <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Categories</h3>
           <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleFilterChange('category', '')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === '' 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {sortedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleFilterChange('category', cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeCategory === cat.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
           </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Open', value: 'OPEN' },
                { label: 'Locked', value: 'LOCKED' },
                { label: 'Resolved', value: 'RESOLVED' },
                { label: 'Void', value: 'VOID' },
                { label: 'All', value: '' }, // Empty string for all
              ].map((status) => (
                <button
                  key={status.label}
                  onClick={() => handleFilterChange('status', status.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                    (activeStatus === status.value) || (status.value === '' && !searchParams.has('status') && false) // We handle default logic in parent, usually
                    // Wait, URL param 'status' might be empty for 'All'. 
                    // But we want Default to be OPEN. 
                    // If URL param is missing, we consider it OPEN based on Page logic.
                    // So visually we match activeStatus variable which defaults to OPEN.
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sort Tabs - Simplified */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:text-right">Sort</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
               {[
                 { label: 'Newest', value: 'newest' },
                 { label: 'Popular', value: 'popular' },
                 { label: 'Ending', value: 'ending_soon' },
                 // removed Pot to keep it cleaner, fits in 3 items
               ].map((sortOption) => (
                 <button
                   key={sortOption.value}
                   onClick={() => handleFilterChange('sort', sortOption.value)}
                   className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                     activeSort === sortOption.value
                       ? 'bg-white text-gray-900 shadow-sm'
                       : 'text-gray-500 hover:text-gray-700'
                   }`}
                 >
                   {sortOption.label}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>
      
      {isPending && (
        <div className="absolute top-4 right-4 h-2 w-2 bg-primary-500 rounded-full animate-ping"></div>
      )}
    </div>
  )
}
