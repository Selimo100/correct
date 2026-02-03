export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">About Correct?</h1>

      <div className="prose prose-lg">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What is Correct?</h2>
          <p className="text-gray-700">
            Correct? is a statement-based betting platform where users can create and place bets
            on measurable statements using our internal currency called <strong>Neos</strong>.
          </p>
          <p className="text-gray-700">
            Whether it's predicting tech trends, sports outcomes, or real-world events, Correct?
            lets you put your Neos where your mouth is!
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Sign up and receive 100 Neos as a starter bonus</li>
            <li>Browse or create bets on statements you find interesting</li>
            <li>Place stakes on either FOR (correct) or AGAINST (incorrect)</li>
            <li>Wait for the bet to close and be resolved by admins</li>
            <li>Win proportional payouts based on your stake if you're on the winning side</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Create bets with clear, measurable statements</li>
            <li>Set end dates and optional participant limits</li>
            <li>Track your wallet balance and transaction history</li>
            <li>Real-time pot tracking and distribution visualization</li>
            <li>Fair, proportional payout system</li>
            <li>Moderated by admins for quality assurance</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Built By</h2>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <p className="text-lg font-semibold text-primary-900 mb-2">Luana & Selina</p>
            <p className="text-gray-700">
              This project was built as a full-stack demonstration of modern web technologies
              including Next.js, TypeScript, Tailwind CSS, and Supabase.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Tech Stack</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Frontend</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Next.js 14 (App Router)</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Backend</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Supabase (Postgres)</li>
                <li>• Row Level Security</li>
                <li>• Server Actions</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Philosophy</h2>
          <p className="text-gray-700">
            We believe in transparent, fair betting with clear rules. All transactions are recorded
            in an append-only ledger, ensuring complete transparency. Neos have no real-world value
            and are purely for fun and competitive engagement.
          </p>
        </section>
      </div>
    </div>
  )
}
