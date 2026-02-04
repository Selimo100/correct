export default function TermsPage() {
  const updatedAt = new Date().toLocaleDateString()

  const sections = [
    {
      id: "acceptance",
      nr: "1",
      title: "Acceptance of Terms",
      intro:
        "By accessing and using Correct?, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
      bullets: [
        "Using the platform means you accept these terms.",
        "If you disagree with any part, you must stop using Correct?.",
      ],
    },
    {
      id: "service",
      nr: "2",
      title: "Description of Service",
      intro:
        'Correct? is a statement-based betting platform using an internal currency called "Neos." Neos have no real-world monetary value and cannot be exchanged for cash or other goods.',
      bullets: [
        "Neos are an in-app currency for gameplay only.",
        "Neos cannot be redeemed for real money or real-world goods.",
      ],
    },
    {
      id: "accounts",
      nr: "3",
      title: "User Accounts",
      intro: "To use Correct?, you must create an account and keep it secure.",
      bullets: [
        "Provide accurate information when creating an account.",
        "You are responsible for securing your login and account access.",
        "One account per person.",
        "Usernames are auto-generated based on the platform naming convention.",
      ],
    },
    {
      id: "neos",
      nr: "4",
      title: "Neos Currency",
      intro: "Neos are virtual tokens used for placing stakes on bets.",
      bullets: [
        "Neos have no real-world value.",
        "New users receive 100 Neos as a starter bonus.",
        "Neos cannot be bought, sold, or exchanged for real money.",
        "We may adjust balances to correct errors or abuse.",
      ],
    },
    {
      id: "betting",
      nr: "5",
      title: "Betting Rules",
      intro: "Bets must be clear and resolvable after the end date.",
      bullets: [
        "Bets must be clear, measurable statements.",
        "Illegal, offensive, or inappropriate content is prohibited.",
        "Once placed, stakes cannot be withdrawn before resolution.",
        "Outcomes are determined by admins after the end date.",
        "Admin decisions are final.",
        "Admins may void bets and refund stakes at their discretion.",
      ],
    },
    {
      id: "prohibited",
      nr: "6",
      title: "Prohibited Conduct",
      intro: "You agree not to misuse the platform or harm others.",
      bullets: [
        "Create bets about illegal activities.",
        "Manipulate or attempt to manipulate outcomes.",
        "Use multiple accounts.",
        "Harass, threaten, or abuse other users.",
        "Exploit bugs or vulnerabilities.",
        "Post spam, scams, or misleading content.",
      ],
    },
    {
      id: "moderation",
      nr: "7",
      title: "Content Moderation",
      intro:
        "Admins may hide, modify, or remove content that violates rules or community standards.",
      bullets: [
        "Admins can hide or remove bets that violate rules.",
        "Repeated violations may lead to account restrictions or suspension.",
      ],
    },
    {
      id: "payouts",
      nr: "8",
      title: "Payouts",
      intro: "Payouts are proportional and depend on the winning side total stakes.",
      custom: (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-800 ring-1 ring-primary-200">
                ∑
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">Payout formula</div>
                <div className="text-xs text-gray-500">Proportional distribution after fees</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary-800/80">Neos</span>
          </div>

          <pre className="overflow-x-auto bg-white p-4 text-sm text-gray-800">
            payout = (your_stake / total_winning_stakes) × (total_pot - fees)
          </pre>
        </div>
      ),
    },
    {
      id: "warranties",
      nr: "9",
      title: "Disclaimer of Warranties",
      intro:
        'Correct? is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service or error-free operation.',
      bullets: [
        "No guarantee of uninterrupted availability.",
        "No guarantee of error-free operation.",
      ],
    },
    {
      id: "liability",
      nr: "10",
      title: "Limitation of Liability",
      intro:
        "We are not liable for losses, damages, or disputes arising from the use of the platform.",
      bullets: [
        "We are not responsible for loss of Neos.",
        "We are not responsible for technical errors or downtime.",
        "We are not responsible for disputes over outcomes beyond admin resolution rules.",
      ],
    },
    {
      id: "changes",
      nr: "11",
      title: "Changes to Terms",
      intro:
        "We may modify these terms at any time. Continued use after changes means you accept the new terms.",
      bullets: ["Terms can change over time.", "Continuing to use the platform means you accept changes."],
    },
    {
      id: "termination",
      nr: "12",
      title: "Account Termination",
      intro:
        "We may terminate accounts that violate rules or engage in abusive behavior. Users may request deletion by contacting support.",
      bullets: [
        "Accounts may be terminated for repeated violations or abuse.",
        "Account deletion can be requested through support.",
      ],
    },
    {
      id: "law",
      nr: "13",
      title: "Governing Law",
      intro:
        "These terms are governed by applicable laws. Disputes should be handled through good-faith discussion or arbitration.",
      bullets: ["Disputes should be resolved in good faith first.", "Arbitration may apply where relevant."],
    },
    {
      id: "contact",
      nr: "14",
      title: "Contact",
      intro:
        "For questions about these terms, please contact us through the platform or reach out to the administrators.",
      bullets: ["Use in-app contact routes where available.", "Or reach out to an administrator."],
    },
  ] as const

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -bottom-24 left-[-10%] h-64 w-64 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-200/60 to-transparent" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-800 shadow-sm">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary-600" />
          Correct?
          <span className="text-primary-700/70">•</span>
          Terms
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Terms of Service
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Last updated: <span className="font-semibold text-gray-900">{updatedAt}</span>
        </p>
      </div>

      {/* Layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr,280px]">
        {/* Main card */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-800" />

          <div className="p-6 sm:p-10">
            <div className="space-y-6">
              {/* Quick summary */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Quick summary</div>
                    <div className="text-xs text-gray-600">
                      Neos are virtual. Bets must be clear. Admins moderate and resolve outcomes.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      Virtual currency
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      Fair payouts
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      Moderated
                    </span>
                  </div>
                </div>
              </div>

              {/* Sections as readable cards */}
              <div className="space-y-4">
                {sections.map((s) => (
                  <section
                    key={s.id}
                    id={s.id}
                    className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-primary-200 hover:bg-primary-50/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-sm font-extrabold text-primary-800 ring-1 ring-primary-200">
                        {s.nr}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                          {s.title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-gray-700">
                          {s.intro}
                        </p>

                        {"bullets" in s && s.bullets?.length ? (
                          <ul className="mt-4 space-y-2">
                            {s.bullets.map((b, idx) => (
                              <li key={idx} className="flex gap-3">
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                                <p className="text-sm leading-relaxed text-gray-700">{b}</p>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {"custom" in s && s.custom ? s.custom : null}
                      </div>
                    </div>
                  </section>
                ))}

                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
                  <p className="text-sm font-semibold text-primary-900">
                    By using Correct?, you acknowledge that you have read, understood, and agree to
                    be bound by these Terms of Service.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer strip */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="text-center text-xs font-semibold text-gray-500">
              Tip: Keep bets clear and measurable. If in doubt, ask an admin before posting.
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
                  {s.nr}. {s.title}
                </a>
              ))}
            </nav>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-700">Reading tip</div>
              <p className="mt-1 text-xs text-gray-600">
                Use the right sidebar to jump to a section. On mobile, scroll the cards.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
