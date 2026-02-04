export default function PrivacyPage() {
  const updatedAt = new Date().toLocaleDateString()

  const sections = [
    {
      id: "intro",
      title: "Introduction",
      icon: "🔒",
      intro:
        "We respect your privacy and are committed to protecting your personal data. This policy explains what we collect, why we collect it, and how we keep it safe.",
    },
    {
      id: "collect",
      title: "Information We Collect",
      icon: "🧾",
      intro: "We only collect information that is needed to run the platform.",
      bullets: [
        { label: "Email", desc: "Used for authentication and account access." },
        { label: "First & last name", desc: "Used to generate your username." },
        { label: "Betting activity", desc: "Bets you create, join, and their outcomes." },
        { label: "Transaction history", desc: "Wallet ledger entries for Neos." },
        { label: "Profile info you provide", desc: "Any optional details you add to your profile." },
      ],
    },
    {
      id: "use",
      title: "How We Use Your Information",
      icon: "⚙️",
      intro: "Your data is used to deliver the core features of Correct?.",
      bullets: [
        { label: "Operate the platform", desc: "Provide features and keep everything running." },
        { label: "Secure authentication", desc: "Log you in and protect your account." },
        { label: "Wallet & Neos", desc: "Track balances, stakes, payouts, and refunds." },
        { label: "Participation in bets", desc: "Allow joining, staking, and resolution." },
        { label: "Public display (limited)", desc: "Show your username where needed (bets, leaderboards, etc.)." },
      ],
    },
    {
      id: "storage",
      title: "Data Storage & Security",
      icon: "🛡️",
      intro:
        "Your data is stored in Supabase (PostgreSQL). Sensitive operations are protected with Row Level Security (RLS).",
      bullets: [
        { label: "Encryption", desc: "Industry-standard encryption is used by our infrastructure provider." },
        { label: "RLS policies", desc: "Database rules restrict access to sensitive rows and operations." },
        { label: "Least access", desc: "We aim to access only what is required for features." },
      ],
    },
    {
      id: "sharing",
      title: "Data Sharing",
      icon: "🤝",
      intro:
        "We do not sell or share your personal information with third parties. Your email and private details are not publicly visible.",
      bullets: [
        { label: "No selling", desc: "We do not sell your personal data." },
        { label: "No third-party sharing", desc: "We do not share personal data for marketing." },
        { label: "What is visible", desc: "Your username and betting activity may appear inside the platform." },
      ],
    },
    {
      id: "rights",
      title: "Your Rights",
      icon: "✅",
      intro: "You can control your data and request changes.",
      bullets: [
        { label: "Access", desc: "Request access to the personal data we store." },
        { label: "Update", desc: "Update profile information from your profile page." },
        { label: "Deletion", desc: "Request deletion of your account via support." },
        { label: "Export", desc: "Export your transaction history (wallet ledger)." },
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      icon: "🍪",
      intro:
        "We use essential cookies for authentication and session management. They are required for the platform to function.",
      bullets: [
        { label: "Essential only", desc: "Auth/session cookies are required for login." },
        { label: "No ad cookies", desc: "We do not use marketing cookies for ads." },
      ],
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      icon: "🗓️",
      intro: "We may update this policy from time to time. Material changes will be reflected on this page.",
    },
    {
      id: "contact",
      title: "Contact Us",
      icon: "📩",
      intro: "If you have questions, contact us through the platform.",
    },
  ] as const

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -bottom-24 left-[-10%] h-64 w-64 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-200/60 to-transparent" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-800 shadow-sm">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary-600" />
          Privacy
          <span className="text-primary-700/70">•</span>
          Correct?
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Last updated: <span className="font-semibold text-gray-900">{updatedAt}</span>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,280px]">
        {/* Main */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-800" />

          <div className="p-6 sm:p-10">
            {/* Quick summary */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quick summary</div>
                  <div className="text-xs text-gray-600">
                    We collect the minimum needed to run Correct? and keep accounts secure.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                    Essential only
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                    No selling
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                    RLS protected
                  </span>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-primary-200 hover:bg-primary-50/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-sm font-extrabold text-primary-800 ring-1 ring-primary-200">
                      {s.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                        {s.title}
                      </h2>

                      <p className="mt-1 text-sm leading-relaxed text-gray-700">{s.intro}</p>

                      {"bullets" in s && s.bullets?.length ? (
                        <div className="mt-4 space-y-2">
                          {s.bullets.map((b, idx) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{b.label}</div>
                                  <div className="text-sm text-gray-600">{b.desc}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              ))}

              <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
                <p className="text-sm font-semibold text-primary-900">
                  By using Correct?, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </div>
            </div>
          </div>

          {/* Footer strip */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="text-center text-xs font-semibold text-gray-500">
              Your privacy matters. We collect only what is necessary to run the platform.
            </p>
          </div>
        </div>

        {/* Sticky TOC (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              On this page
            </div>

            <nav className="space-y-1 text-sm">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-xl px-3 py-2 font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-800"
                >
                  {s.icon} {s.title}
                </a>
              ))}
            </nav>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-700">Reading tip</div>
              <p className="mt-1 text-xs text-gray-600">
                Use the sidebar to jump between sections.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
