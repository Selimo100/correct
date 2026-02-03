export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <span className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700">
          About
        </span>

        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          About <span className="text-primary-700">Correct?</span>
        </h1>

        <p className="mt-4 max-w-2xl text-gray-600 text-lg">
          A statement-based betting platform focused on transparency, fairness,
          and fun — powered by Neos.
        </p>
      </div>

      {/* What is Correct */}
      <section className="mb-12 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          What is Correct?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Correct? is a statement-based betting platform where users can create
          and place bets on clear, measurable statements using our internal
          currency called <strong>Neos</strong>.
        </p>
        <p className="mt-3 text-gray-700 leading-relaxed">
          From tech trends to real-world events, Correct? lets you put your Neos
          where your conviction is — without real-money gambling.
        </p>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          How it works
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Sign up and receive 100 Neos',
            'Browse or create bets',
            'Stake FOR or AGAINST',
            'Wait until the bet closes',
            'Admins resolve the outcome',
            'Winners receive proportional payouts',
          ].map((step, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 text-sm font-semibold text-primary-700">
                Step {i + 1}
              </div>
              <p className="text-gray-700">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key features */}
      <section className="mb-12 rounded-3xl border border-gray-200 bg-gray-50 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Key Features
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            'Create clear, measurable bets',
            'Optional participant limits',
            'Live pot & distribution tracking',
            'Wallet & transaction history',
            'Fair proportional payout system',
            'Admin-moderated for quality',
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-white p-4 border border-gray-200"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Built by */}
      <section className="mb-12 rounded-3xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 p-8">
        <h2 className="text-xl font-semibold text-primary-900 mb-3">
          Built by
        </h2>
        <p className="text-lg font-bold text-primary-900 mb-2">
          Luana &amp; Selina
        </p>
        <p className="text-gray-700">
          This project was built as a full-stack demonstration using modern web
          technologies and clean, maintainable architecture.
        </p>
      </section>

      {/* Tech stack */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Tech Stack
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Frontend</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Next.js 14 (App Router)</li>
              <li>• TypeScript</li>
              <li>• Tailwind CSS</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Backend</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Supabase (Postgres)</li>
              <li>• Row Level Security</li>
              <li>• Server Actions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Philosophy
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We believe in transparent, fair betting with clear rules. All Neos
          transactions are recorded in an append-only ledger, ensuring full
          traceability and trust. Neos have no real-world value — the platform is
          purely about fun, competition, and prediction skill.
        </p>
      </section>
    </div>
  )
}
