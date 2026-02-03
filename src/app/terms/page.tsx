export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700">
          Correct?
        </div>

        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
          Terms of Service
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Last updated:{" "}
          <span className="font-semibold text-gray-900">
            {new Date().toLocaleDateString()}
          </span>
        </p>
      </div>

      {/* Content Card */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="prose prose-gray max-w-none prose-h2:mt-10 prose-h2:text-xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Correct?, you accept and agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the platform.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Correct? is a statement-based betting platform using an internal currency called
              &quot;Neos.&quot; Neos have no real-world monetary value and cannot be exchanged for
              cash or other goods.
            </p>

            <h2>3. User Accounts</h2>
            <ul>
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be 18+ years old to use this platform</li>
              <li>One account per person</li>
              <li>Usernames are auto-generated and follow our naming convention</li>
            </ul>

            <h2>4. Neos Currency</h2>
            <ul>
              <li>Neos are virtual tokens with no real-world value</li>
              <li>New users receive 100 Neos as a starter bonus</li>
              <li>Neos cannot be purchased, sold, or transferred for real money</li>
              <li>We reserve the right to adjust Neos balances in case of errors</li>
            </ul>

            <h2>5. Betting Rules</h2>
            <ul>
              <li>Bets must be clear, measurable statements</li>
              <li>Inappropriate, offensive, or illegal content is prohibited</li>
              <li>Once placed, stakes cannot be withdrawn before bet resolution</li>
              <li>Bet outcomes are determined by admin review after the end date</li>
              <li>Admin decisions on bet resolutions are final</li>
              <li>Bets may be voided at admin discretion with full refunds</li>
            </ul>

            <h2>6. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Create bets about illegal activities</li>
              <li>Manipulate or attempt to manipulate bet outcomes</li>
              <li>Use multiple accounts</li>
              <li>Harass or abuse other users</li>
              <li>Attempt to exploit bugs or vulnerabilities</li>
              <li>Post spam or misleading information</li>
            </ul>

            <h2>7. Content Moderation</h2>
            <p>
              Admins reserve the right to hide, modify, or remove any bet that violates these terms
              or community standards. Users who repeatedly violate terms may have their accounts
              suspended.
            </p>

            <h2>8. Payouts</h2>
            <p>Payouts are calculated proportionally based on stake amounts. The formula is:</p>

            {/* Formula Callout */}
            <div className="not-prose my-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Payout formula
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
payout = (your_stake / total_winning_stakes) × (total_pot - fees)
              </pre>
            </div>

            <h2>9. Disclaimer of Warranties</h2>
            <p>
              Correct? is provided &quot;as is&quot; without warranties of any kind. We do not
              guarantee uninterrupted service or error-free operation.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              We are not liable for any losses, damages, or disputes arising from use of the
              platform. This includes but is not limited to: loss of Neos, technical errors, or
              disputed bet outcomes.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the platform
              after changes constitutes acceptance of the new terms.
            </p>

            <h2>12. Account Termination</h2>
            <p>
              We reserve the right to terminate accounts that violate these terms or engage in
              abusive behavior. Users may also request account deletion by contacting support.
            </p>

            <h2>13. Governing Law</h2>
            <p>
              These terms are governed by applicable laws. Any disputes shall be resolved through
              good-faith discussion or arbitration.
            </p>

            <h2>14. Contact</h2>
            <p>
              For questions about these terms, please contact us through the platform or reach out
              to the administrators.
            </p>

            <hr />

            <p className="text-sm text-gray-600">
              By using Correct?, you acknowledge that you have read, understood, and agree to be
              bound by these Terms of Service.
            </p>
          </div>
        </div>

        {/* Footer strip */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-center text-xs text-gray-500">
            Tip: Keep bets clear and measurable. If in doubt, ask an admin before posting.
          </p>
        </div>
      </div>
    </div>
  )
}
