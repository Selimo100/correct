import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/database.types"
import AdminGrantFundsForm from "@/components/AdminGrantFundsForm"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export const dynamic = "force-dynamic"

function formatWhen(d: string) {
  return new Date(d).toLocaleString()
}

function formatDay(d: string) {
  return new Date(d).toLocaleDateString()
}

function roleBadge(u: Profile) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
  if (u.is_super_admin) return `${base} bg-gray-900 text-white border-gray-900`
  if (u.is_admin) return `${base} bg-primary-50 text-primary-700 border-primary-200`
  return `${base} bg-gray-100 text-gray-700 border-gray-200`
}

function roleLabel(u: Profile) {
  if (u.is_super_admin) return "Super Admin"
  if (u.is_admin) return "Admin"
  return "User"
}

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin()
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("status", { ascending: true }) // PENDING first
    .order("created_at", { ascending: false })

  if (error) console.error("Error fetching users:", error)

  const userList = (users as Profile[]) || []
  const pendingUsers = userList.filter((u) => u.status === "PENDING")
  const activeUsers = userList.filter((u) => u.status === "ACTIVE")
  const bannedUsers = userList.filter((u) => u.status === "BANNED")

  async function approveUser(formData: FormData) {
    "use server"
    const admin = await requireAdmin()
    const supabase = await createClient()
    const userId = formData.get("user_id") as string

    // @ts-expect-error - Supabase RPC typing issue
    const { error } = await supabase.rpc("fn_approve_user", {
      p_target_user_id: userId,
      p_admin_id: admin.id,
    })

    if (error) console.error("Error approving user:", error)
    revalidatePath("/admin/users")
  }

  async function setUserStatus(formData: FormData) {
    "use server"
    const admin = await requireAdmin()
    const supabase = await createClient()
    const userId = formData.get("user_id") as string
    const newStatus = formData.get("new_status") as string
    const reason = (formData.get("reason") as string) || null

    // @ts-expect-error - Supabase RPC typing issue
    const { error } = await supabase.rpc("fn_set_user_status", {
      p_target_user_id: userId,
      p_new_status: newStatus,
      p_admin_id: admin.id,
      p_reason: reason,
    })

    if (error) console.error("Error setting user status:", error)
    revalidatePath("/admin/users")
  }

  async function rejectUser(formData: FormData) {
    "use server"
    const admin = await requireAdmin()
    const userId = formData.get("user_id") as string
    const reason = (formData.get("reason") as string) || "Rejected by admin"
    const supabase = await createClient()

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("is_super_admin, username")
      .eq("id", userId)
      .single()

    // @ts-expect-error - targetProfile types might be strict
    if (targetProfile?.is_super_admin && !admin.is_super_admin) {
      throw new Error("Cannot delete super admin")
    }

    // @ts-expect-error - admin_actions type outdated
    await supabase.from("admin_actions").insert({
      admin_id: admin.id,
      action: "REJECT_USER",
      target_type: "USER",
      target_id: userId,
      details: { reason, username: (targetProfile as any)?.username },
    })

    const { createClient: createServiceClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) console.error("Error deleting auth user:", authError)

    revalidatePath("/admin/users")
  }

  async function toggleAdmin(formData: FormData) {
    "use server"
    const admin = await requireAdmin()
    if (!admin.is_super_admin) throw new Error("Super admin access required")

    const supabase = await createClient()
    const userId = formData.get("user_id") as string
    const isAdmin = formData.get("is_admin") === "true"
    const isSuperAdmin = formData.get("is_super_admin") === "true"

    // @ts-expect-error - Supabase RPC typing issue
    await supabase.rpc("set_admin_status", {
      p_target_user_id: userId,
      p_is_admin: isAdmin,
      p_is_super_admin: isSuperAdmin,
    })

    revalidatePath("/admin/users")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              User Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Approve new users, manage roles, and enforce bans.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Approvals
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Roles
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Ban control
              </span>
            </div>
          </div>

          <a
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
          >
            ← Back to Admin
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total Users
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{userList.length}</div>
            <div className="text-sm font-semibold text-gray-500">profiles</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Pending Approval
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-amber-700">{pendingUsers.length}</div>
            <div className="text-sm font-semibold text-gray-500">waiting</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Active
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-primary-700">{activeUsers.length}</div>
            <div className="text-sm font-semibold text-gray-500">enabled</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Banned
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{bannedUsers.length}</div>
            <div className="text-sm font-semibold text-gray-500">blocked</div>
          </div>
        </div>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Pending Approval</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Review new signups and approve or reject.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {pendingUsers.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingUsers.map((user) => (
              <div key={user.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        PENDING
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Registered {formatWhen(user.created_at)}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-wrap gap-2">
                    <form action={approveUser}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                      >
                        Approve
                      </button>
                    </form>

                    <form action={rejectUser}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <input type="hidden" name="reason" value="Rejected during approval" />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Users */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Active Users</h2>
              <p className="mt-1 text-sm text-gray-600">Grant funds, ban users, and assign roles.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {activeUsers.length}
            </span>
          </div>
        </div>

        {activeUsers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-gray-900">No active users.</p>
            <p className="mt-1 text-sm text-gray-600">Approved users will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeUsers.map((user) => (
              <div key={user.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                      <span className={roleBadge(user)}>{roleLabel(user)}</span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        Joined {formatDay(user.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Wallet
                      </div>
                      <AdminGrantFundsForm userId={user.id} username={user.username} />
                    </div>

                    {user.id !== currentUser.id && (
                      <div className="flex flex-wrap gap-2">
                        <form action={setUserStatus}>
                          <input type="hidden" name="user_id" value={user.id} />
                          <input type="hidden" name="new_status" value="BANNED" />
                          <input type="hidden" name="reason" value="Banned by admin" />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            Ban
                          </button>
                        </form>

                        {currentUser.is_super_admin && (
                          <form action={toggleAdmin}>
                            <input type="hidden" name="user_id" value={user.id} />

                            {!user.is_admin ? (
                              <button
                                type="submit"
                                name="is_admin"
                                value="true"
                                className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                              >
                                Make Admin
                              </button>
                            ) : !user.is_super_admin ? (
                              <button
                                type="submit"
                                name="is_admin"
                                value="false"
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                Remove Admin
                              </button>
                            ) : null}
                          </form>
                        )}
                      </div>
                    )}

                    {user.id === currentUser.id && (
                      <div className="text-xs font-semibold text-gray-500">
                        You cannot modify your own status.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banned Users */}
      {bannedUsers.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Banned Users</h2>
                <p className="mt-1 text-sm text-gray-600">Restore access by unbanning a user.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {bannedUsers.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {bannedUsers.map((user) => (
              <div key={user.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </div>
                  </div>

                  {user.id !== currentUser.id && (
                    <form action={setUserStatus} className="shrink-0">
                      <input type="hidden" name="user_id" value={user.id} />
                      <input type="hidden" name="new_status" value="ACTIVE" />
                      <input type="hidden" name="reason" value="Unbanned by admin" />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                      >
                        Unban
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
