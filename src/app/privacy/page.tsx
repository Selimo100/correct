export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700">
          Privacy
        </div>

        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
          Privacy Policy
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Last updated:{" "}
          <span className="font-semibold text-gray-900">
            {new Date().toLocaleDateString()}
          </span>
        </p>
      </div>

      {/* Content Card */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="prose prose-gray max-w-none prose-h2:mt-10 prose-h2:text-xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
            <h2>Introduction</h2>
            <p>
              Welcome to Correct?. We respect your privacy and are committed to
              protecting your personal data. This privacy policy explains how we
              collect, use, and safeguard your information.
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
              <li>To provide and maintain the Correct? platform</li>
              <li>To authenticate your account and ensure security</li>
              <li>To track your Neo balance and transactions</li>
              <li>To enable participation in bets</li>
              <li>To display your username publicly where required</li>
            </ul>

            <h2>Data Storage</h2>
            <p>
              Your data is stored securely using Supabase&apos;s PostgreSQL
              infrastructure with industry-standard encryption. All sensitive
              operations are protected by Row Level Security (RLS) policies.
            </p>

            <h2>Data Sharing</h2>
            <p>
              We do not sell or share your personal information with third
              parties. Your email address and private details are never publicly
              visible. Only your username and betting activity may be displayed
              within the platform.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Update your profile information</li>
              <li>Request deletion of your account</li>
              <li>Export your transaction history</li>
            </ul>

            <h2>Cookies</h2>
            <p>
              We use essential cookies for authentication and session
              management. These cookies are required for the platform to
              function properly and cannot be disabled.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any material
              changes will be reflected on this page.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact
              us through the platform.
            </p>

            <hr />

            <p className="text-sm text-gray-600">
              By using Correct?, you acknowledge that you have read and
              understood this Privacy Policy.
            </p>
          </div>
        </div>

        {/* Footer strip */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-center text-xs text-gray-500">
            Your privacy matters. We collect only what is necessary to run the
            platform.
          </p>
        </div>
      </div>
    </div>
  )
}
