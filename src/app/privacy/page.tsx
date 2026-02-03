export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto prose prose-lg">
      <h1>Privacy Policy</h1>
      <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>Introduction</h2>
      <p>
        Welcome to Correct?. We respect your privacy and are committed to protecting your personal data.
        This privacy policy explains how we collect, use, and safeguard your information.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>Email address (for authentication)</li>
        <li>First and last name (for username generation)</li>
        <li>Betting activity and transaction history</li>
        <li>Profile information you provide</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To provide and maintain our betting platform</li>
        <li>To authenticate your account and ensure security</li>
        <li>To track your Neo balance and transactions</li>
        <li>To enable participation in bets</li>
        <li>To display your username publicly on bets and leaderboards</li>
      </ul>

      <h2>Data Storage</h2>
      <p>
        Your data is stored securely in Supabase's PostgreSQL database with industry-standard encryption.
        All sensitive operations are protected by Row Level Security policies.
      </p>

      <h2>Data Sharing</h2>
      <p>
        We do not sell or share your personal information with third parties. Your email and personal
        details remain private. Only your username and betting activity are publicly visible.
      </p>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Update your profile information</li>
        <li>Delete your account (contact us)</li>
        <li>Export your transaction history</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for authentication and session management. These cookies are necessary
        for the platform to function properly.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this privacy policy from time to time. We will notify users of any material
        changes by posting the new policy on this page.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions about this privacy policy, please contact us through the platform.
      </p>
    </div>
  )
}
