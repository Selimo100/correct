import AdminNav from "@/components/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft mb-4">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Admin Console
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage system, users, and content.
            </p>
          </div>
        </div>
      </div>

      <AdminNav />
      {children}
    </div>
  );
}
