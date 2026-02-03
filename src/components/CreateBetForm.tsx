"use client"

import { useEffect, useState } from "react"
import {
  Globe,
  Lock,
  Users,
  EyeOff,
  Hash,
  UserCheck,
  Info,
  ChevronDown,
} from "lucide-react"
import { createBetAction } from "@/app/actions/bets"
import { useRouter } from "next/navigation"
import { groups } from "@/lib/friends"

type Category = {
  id: string
  name: string
  icon: string
}

type Group = {
  id: string
  name: string
  description: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

const fieldBase =
  "block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
  "placeholder:text-gray-500 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-200"

export default function CreateBetForm({ categories }: { categories: Category[] }) {
  const router = useRouter()

  const [audience, setAudience] = useState<"PUBLIC" | "FRIENDS" | "GROUP" | "PRIVATE">(
    "PUBLIC"
  )
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [inviteEnabled, setInviteEnabled] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    groups
      .list()
      .then((data) => setMyGroups(data || []))
      .catch((err) => console.error("Failed to load groups:", err))
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      if (audience === "GROUP" && !selectedGroupId) {
        alert("Please select a group.")
        setLoading(false)
        return
      }

      const res = await createBetAction(formData)

      if (audience === "PRIVATE" && res.invite_code) {
        router.push(`/bets/${res.id}?new=true&code=${res.invite_code}`)
      } else {
        router.push(`/bets/${res.id}`)
      }
    } catch (e: any) {
      alert("Error creating bet: " + e.message)
      setLoading(false)
    }
  }

  const selectedGroupName = myGroups.find((g) => g.id === selectedGroupId)?.name

  const audienceOptions = [
    {
      key: "PUBLIC" as const,
      title: "Public",
      desc: "Visible to everyone. Anyone can find and join.",
      Icon: Globe,
    },
    {
      key: "FRIENDS" as const,
      title: "Friends Only",
      desc: "Only your confirmed friends can see and join.",
      Icon: UserCheck,
    },
    {
      key: "GROUP" as const,
      title: "Specific Group",
      desc: "Visible only to members of a selected group.",
      Icon: Users,
    },
    {
      key: "PRIVATE" as const,
      title: "Private Link",
      desc: "Hidden from feed. Invite via link/code only.",
      Icon: Lock,
    },
  ]

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden inputs to sync state with FormData */}
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="group_id" value={selectedGroupId} />
      <input
        type="hidden"
        name="invite_code_enabled"
        value={inviteEnabled && audience === "PRIVATE" ? "on" : "off"}
      />
      <input type="hidden" name="hide_participants" value={isAnonymous ? "on" : "off"} />

      {/* SECTION: Audience */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Audience</h3>
            <p className="mt-1 text-sm text-gray-600">
              Choose who can see and join this bet.
            </p>
          </div>

          <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            {audience}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {audienceOptions.map(({ key, title, desc, Icon }) => {
            const active = audience === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAudience(key)}
                className={cn(
                  "text-left rounded-3xl border p-4 transition",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  active
                    ? "border-primary-300 bg-primary-50 shadow-soft"
                    : "border-gray-200 bg-white hover:border-primary-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-2xl",
                      active ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        active ? "text-primary-900" : "text-gray-900"
                      )}
                    >
                      {title}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">{desc}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Group Picker */}
        {audience === "GROUP" && (
          <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 p-4 animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Group
            </label>

            <div className="relative">
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className={cn(fieldBase, "appearance-none pr-10")}
              >
                <option value="">-- Choose a group --</option>
                {myGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {myGroups.length === 0 && (
              <p className="mt-2 text-xs text-gray-600">
                No groups found.{" "}
                <a href="/groups" target="_blank" className="font-semibold text-primary-700 underline">
                  Create a group
                </a>{" "}
                first.
              </p>
            )}

            {selectedGroupName && (
              <p className="mt-2 text-xs font-semibold text-primary-800">
                Posting into: {selectedGroupName}
              </p>
            )}
          </div>
        )}

        {/* Private settings */}
        {audience === "PRIVATE" && (
          <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Hash className="h-4 w-4 text-primary-700" />
                  Require Invite Code
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Recommended for extra privacy.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={inviteEnabled}
                onClick={() => setInviteEnabled(!inviteEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  inviteEnabled ? "bg-primary-600" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    inviteEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: Anonymity */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Anonymity</h3>
            <p className="mt-1 text-sm text-gray-600">
              Control whether participant usernames are visible.
            </p>
          </div>

          {isAnonymous && (
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              Hidden
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={cn(
            "mt-5 w-full rounded-3xl border p-4 text-left transition",
            "hover:-translate-y-0.5 hover:shadow-md",
            isAnonymous
              ? "border-primary-300 bg-primary-50 shadow-soft"
              : "border-gray-200 bg-white hover:border-primary-200"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  isAnonymous ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
                )}
              >
                <EyeOff className="h-5 w-5" />
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-900">Hide Participants</div>
                <div className="mt-1 text-sm text-gray-600">
                  Only totals are shown. Usernames are hidden.
                </div>
              </div>
            </div>

            <span
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                isAnonymous ? "bg-primary-600" : "bg-gray-200"
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                )}
              />
            </span>
          </div>
        </button>

        {/* Live settings pills */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-4 text-xs font-semibold">
          <span className="text-gray-400 uppercase tracking-wider py-1">Settings</span>

          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-primary-700">
            <Globe className="h-3 w-3" />
            {audience === "PUBLIC"
              ? "Public"
              : audience === "FRIENDS"
                ? "Friends"
                : audience === "GROUP"
                  ? `Group${selectedGroupName ? `: ${selectedGroupName}` : ""}`
                  : "Private"}
          </span>

          {audience === "PRIVATE" && inviteEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-primary-700">
              <Hash className="h-3 w-3" />
              Invite Code
            </span>
          )}

          {isAnonymous && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-primary-700">
              <EyeOff className="h-3 w-3" />
              Participants hidden
            </span>
          )}
        </div>
      </div>

      {/* SECTION: Details */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft">
        <h3 className="text-base font-semibold text-gray-900">Bet Details</h3>
        <p className="mt-1 text-sm text-gray-600">
          Define the statement, category, and resolution date.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-semibold text-gray-900">
              Statement / Title <span className="text-primary-700">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={200}
              className={fieldBase}
              placeholder="e.g., Bitcoin will reach $100k by end of 2026"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-gray-900"
            >
              Description <span className="text-xs font-semibold text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className={fieldBase}
              placeholder="Add more context or clarifications…"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="category_id"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Category
              </label>

              <div className="relative">
                <select id="category_id" name="category_id" className={cn(fieldBase, "appearance-none pr-10")}>
                  <option value="">Select a category…</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="end_at" className="mb-2 block text-sm font-semibold text-gray-900">
                Resolution Date <span className="text-primary-700">*</span>
              </label>
              <input type="datetime-local" id="end_at" name="end_at" required className={fieldBase} />
            </div>
          </div>

          <div>
            <label
              htmlFor="max_participants"
              className="mb-2 block text-sm font-semibold text-gray-900"
            >
              Max Participants{" "}
              <span className="text-xs font-semibold text-gray-400">(optional)</span>
            </label>
            <input
              type="number"
              id="max_participants"
              name="max_participants"
              min={2}
              className={fieldBase}
              placeholder="No limit"
            />
          </div>

          {/* Info */}
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-primary-700" />
              <p className="text-sm text-gray-700">
                Once created, you cannot change the betting terms or resolution criteria. The creator
                (you) is responsible for resolving this bet unless overruled by moderators.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition",
              "bg-primary-600 hover:bg-primary-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? "Creating…" : "Create Bet"}
          </button>

          <p className="text-center text-xs text-gray-500">
            By creating a bet, you agree to resolve it honestly and follow the community rules.
          </p>
        </div>
      </div>
    </form>
  )
}
