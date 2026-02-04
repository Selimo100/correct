import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

type Category = {
  id: string
  slug: string
  name: string
  icon: string | null
  is_active: boolean
  is_default: boolean
  created_at: string
}

function formatWhen(d: string) {
  return new Date(d).toLocaleString()
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function statusBadge(isActive: boolean) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
  return isActive
    ? `${base} bg-emerald-50 text-emerald-700 border-emerald-200`
    : `${base} bg-red-50 text-red-700 border-red-200`
}

export default async function AdminCategoriesPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()

  // @ts-expect-error - RPC typing might be outdated
  const { data: categories, error } = await supabase.rpc("fn_list_categories", {
    p_include_inactive: true,
  })

  if (error) {
    console.error("Error fetching categories:", error)
  }

  const categoryList = (categories as unknown as Category[]) || []

  const counts = categoryList.reduce(
    (acc, c) => {
      acc.total += 1
      if (c.is_active) acc.active += 1
      else acc.inactive += 1
      if (c.is_default) acc.defaults += 1
      return acc
    },
    { total: 0, active: 0, inactive: 0, defaults: 0 }
  )

  async function createCategory(formData: FormData) {
    "use server"

    const user = await requireAdmin()
    const supabase = await createClient()

    const name = (formData.get("name") as string) || ""
    const slugRaw = (formData.get("slug") as string) || ""
    const icon = (formData.get("icon") as string) || ""

    if (!name.trim() || !slugRaw.trim()) {
      throw new Error("Name and Slug are required")
    }

    const slug = slugRaw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    // @ts-expect-error - RPC typing might be outdated
    const { error } = await supabase.rpc("fn_create_category", {
      p_name: name.trim(),
      p_slug: slug,
      p_icon: icon.trim() || null,
      p_admin_id: user.id,
    })

    if (error) {
      console.error("Create category error:", error)
      throw new Error(error.message)
    }

    revalidatePath("/admin/categories")
  }

  async function toggleCategoryStatus(formData: FormData) {
    "use server"

    const user = await requireAdmin()
    const supabase = await createClient()

    const categoryId = formData.get("category_id") as string
    const currentStatus = formData.get("current_status") === "true"
    const newStatus = !currentStatus

    // @ts-expect-error - RPC typing might be outdated
    const { error } = await supabase.rpc("fn_update_category", {
      p_category_id: categoryId,
      p_is_active: newStatus,
      p_admin_id: user.id,
    })

    if (error) {
      console.error("Update category status error:", error)
      throw new Error(error.message)
    }

    revalidatePath("/admin/categories")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Categories
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Create, enable/disable, and manage default categories for bets.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Admin only
              </span>
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Used in bet creation
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Defaults are protected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{counts.total}</div>
            <div className="text-sm font-semibold text-gray-500">categories</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-emerald-700">{counts.active}</div>
            <div className="text-sm font-semibold text-gray-500">enabled</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Inactive</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-red-700">{counts.inactive}</div>
            <div className="text-sm font-semibold text-gray-500">disabled</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Defaults</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-primary-700">{counts.defaults}</div>
            <div className="text-sm font-semibold text-gray-500">protected</div>
          </div>
        </div>
      </div>

      {/* Create + List */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Add Category</h2>
              <p className="mt-1 text-sm text-gray-600">Create a new bet category.</p>
            </div>

            <div className="p-5">
              <form action={createCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Technology"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-soft outline-none transition focus:border-primary-200 focus:ring-4 focus:ring-primary-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    placeholder="e.g. technology"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-soft outline-none transition focus:border-primary-200 focus:ring-4 focus:ring-primary-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    URL-friendly, lowercase. We will sanitize it automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Icon (emoji)</label>
                  <input
                    type="text"
                    name="icon"
                    placeholder="e.g. 💻"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-soft outline-none transition focus:border-primary-200 focus:ring-4 focus:ring-primary-100"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100"
                >
                  Create Category
                </button>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">Note:</span>{" "}
                  Default categories cannot be disabled unless you are a Super Admin.
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">All Categories</h2>
                  <p className="mt-1 text-sm text-gray-600">Includes inactive categories.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {categoryList.length}
                </span>
              </div>
            </div>

            {categoryList.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-gray-900">No categories found.</p>
                <p className="mt-1 text-sm text-gray-600">Run migration/seed or create one.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {categoryList.map((category) => {
                  const disabledByPolicy = category.is_default && !admin.is_super_admin
                  return (
                    <div
                      key={category.id}
                      className={cn(
                        "px-5 py-4 sm:px-6 transition hover:bg-primary-50/40",
                        !category.is_active && "bg-gray-50"
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-100 text-lg">
                              {category.icon || "📁"}
                            </span>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-gray-900">{category.name}</div>

                                {category.is_default && (
                                  <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                                    Default
                                  </span>
                                )}

                                <span className={statusBadge(category.is_active)}>
                                  {category.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <span className="font-semibold text-gray-900">/{category.slug}</span>
                                <span className="text-gray-300">•</span>
                                <span>Created {formatWhen(category.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleCategoryStatus}>
                            <input type="hidden" name="category_id" value={category.id} />
                            <input
                              type="hidden"
                              name="current_status"
                              value={String(category.is_active)}
                            />
                            <button
                              type="submit"
                              disabled={disabledByPolicy}
                              className={cn(
                                "rounded-full px-4 py-2 text-sm font-semibold shadow-soft ring-1 ring-inset transition",
                                category.is_active
                                  ? "bg-white text-red-700 ring-red-200 hover:bg-red-50"
                                  : "bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50",
                                disabledByPolicy && "opacity-50 cursor-not-allowed hover:bg-white"
                              )}
                              title={
                                disabledByPolicy
                                  ? "Only Super Admins can disable default categories."
                                  : category.is_active
                                  ? "Disable category"
                                  : "Enable category"
                              }
                            >
                              {category.is_active ? "Disable" : "Enable"}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
