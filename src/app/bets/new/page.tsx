import { createClient } from "@/lib/supabase/server"
import CreateBetForm from "@/components/CreateBetForm"

export default async function NewBetPage() {
  const supabase = await createClient()

  let categories: any[] = []

  try {
    const { data } = await (supabase.rpc as any)("fn_list_categories", {
      p_include_inactive: false,
    })
    categories = data || []
  } catch (e) {
    const { data } = await supabase
      .from("categories")
      .select("id, name, icon")
      .eq("active", true)
      .order("name")
    categories = data || []
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Create a New Bet
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Start a new prediction market for your community.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              Burgundy feed
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Set audience + rules
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Publish & share
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CreateBetForm categories={categories} />
      </div>
    </div>
  )
}
