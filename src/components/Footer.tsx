export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-600">
              Built by{" "}
              <span className="font-semibold text-gray-900">Luana &amp; Selina</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Correct?
              </span>
            </div>
          </div>

          {/* Right */}
          <nav className="flex flex-wrap gap-2 sm:justify-end">
            <a
              href="/about"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
            >
              About
            </a>
            <a
              href="/privacy"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
            >
              Terms
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center">
          <p className="text-xs font-semibold text-gray-500">
            © {new Date().getFullYear()}{" "}
            <span className="text-primary-700">Correct?</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
