import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

// Define explicit types matching the RPC return structure or table structure
type Category = {
  id: string
  slug: string
  name: string
  icon: string | null
  is_active: boolean
  is_default: boolean
  created_at: string
}

export default async function AdminCategoriesPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  
  // Use the RPC to get all categories including inactive ones
  const { data: categories, error } = await supabase.rpc('fn_list_categories', {
    p_include_inactive: true
  })
  
  if (error) {
    console.error('Error fetching categories:', error)
  }
  
  const categoryList = (categories as Category[]) || []

  async function createCategory(formData: FormData) {
    'use server'
    
    // Auth check inside server action
    const user = await requireAdmin()
    const supabase = await createClient()
    
    const name = formData.get('name') as string
    const slugRaw = formData.get('slug') as string
    const icon = formData.get('icon') as string
    
    if (!name || !slugRaw) {
      throw new Error('Name and Slug are required')
    }
    
    // Sanitize slug
    const slug = slugRaw.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    
    const { error } = await supabase.rpc('fn_create_category', {
      p_name: name,
      p_slug: slug,
      p_icon: icon || null,
      p_admin_id: user.id
    })
    
    if (error) {
      console.error('Create category error:', error)
      // Ideally show error to user but simple implementation for now
      throw new Error(error.message)
    }
    
    revalidatePath('/admin/categories')
  }

  async function toggleCategoryStatus(formData: FormData) {
    'use server'
    
    const user = await requireAdmin()
    const supabase = await createClient()
    
    const categoryId = formData.get('category_id') as string
    const currentStatus = formData.get('current_status') === 'true'
    const newStatus = !currentStatus
    
    const { error } = await supabase.rpc('fn_update_category', {
      p_category_id: categoryId,
      p_is_active: newStatus,
      p_admin_id: user.id
    })
    
    if (error) {
      console.error('Update category status error:', error)
      throw new Error(error.message)
    }
    
    revalidatePath('/admin/categories')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Categories</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h2>
            <form action={createCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Technology"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL friendly)
                </label>
                <input
                  type="text"
                  name="slug"
                  placeholder="e.g. technology"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  name="icon"
                  placeholder="e.g. 💻"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Create Category
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No categories found. Run migration/seed.
                    </td>
                  </tr>
                ) : (
                  categoryList.map((category) => (
                    <tr key={category.id} className={!category.is_active ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{category.icon || '📁'}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {category.name}
                            </div>
                            {category.is_default && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          category.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <form action={toggleCategoryStatus}>
                          <input type="hidden" name="category_id" value={category.id} />
                          <input type="hidden" name="current_status" value={String(category.is_active)} />
                          
                          <button
                            type="submit"
                            disabled={category.is_default && !admin.is_super_admin}
                            className={`text-sm ${
                              category.is_active 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            } ${
                              (category.is_default && !admin.is_super_admin) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {category.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded text-sm text-gray-500">
            Note: Default categories cannot be disabled except by Super Admins.
          </div>
        </div>
        
      </div>
    </div>
  )
}
