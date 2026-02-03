import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Built by <span className="font-medium text-gray-900">Luana & Selina</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">
              About
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
              Terms
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Correct?. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
