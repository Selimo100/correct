export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto prose prose-lg">
      <h1>Terms of Service</h1>
      <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using Correct?, you accept and agree to be bound by these Terms of Service.
        If you do not agree to these terms, please do not use the platform.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Correct? is a statement-based betting platform using an internal currency called "Neos."
        Neos have no real-world monetary value and cannot be exchanged for cash or other goods.
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
        Admins reserve the right to hide, modify, or remove any bet that violates these terms or
        community standards. Users who repeatedly violate terms may have their accounts suspended.
      </p>

      <h2>8. Payouts</h2>
      <p>
        Payouts are calculated proportionally based on stake amounts. The formula is:
      </p>
      <pre className="bg-gray-100 p-4 rounded">
        payout = (your_stake / total_winning_stakes) × (total_pot - fees)
      </pre>

      <h2>9. Disclaimer of Warranties</h2>
      <p>
        Correct? is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
        service or error-free operation.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        We are not liable for any losses, damages, or disputes arising from use of the platform.
        This includes but is not limited to: loss of Neos, technical errors, or disputed bet outcomes.
      </p>

      <h2>11. Changes to Terms</h2>
      <p>
        We reserve the right to modify these terms at any time. Continued use of the platform after
        changes constitutes acceptance of the new terms.
      </p>

      <h2>12. Account Termination</h2>
      <p>
        We reserve the right to terminate accounts that violate these terms or engage in abusive behavior.
        Users may also request account deletion by contacting support.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These terms are governed by applicable laws. Any disputes shall be resolved through good-faith
        discussion or arbitration.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these terms, please contact us through the platform or reach out to the
        administrators.
      </p>

      <hr />

      <p className="text-sm text-gray-600">
        By using Correct?, you acknowledge that you have read, understood, and agree to be bound by
        these Terms of Service.
      </p>
    </div>
  )
}
