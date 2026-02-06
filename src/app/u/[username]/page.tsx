import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatToZurich } from "@/lib/date";
import Link from "next/link";
import CategoryChip from "@/components/CategoryChip";

interface PageProps {
  params: { username: string };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const username = params.username;
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  // 1. Fetch Profile
  const { data } = await supabase
    .rpc("fn_get_public_profile", { p_username: username })
    .single();

  const profile = data as any;

  if (!profile) {
    return notFound();
  }

  // 2. Fetch Bets
  const { data: bets } = await supabase.rpc("fn_list_user_bets", {
    p_username: username,
    p_filter_status: "ALL",
  });

  const stats = profile.stats || {};
  const creationDate = new Date(profile.created_at);
  const memberSince = creationDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-8 py-8 md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-bold text-primary-600 shadow-sm ring-4 ring-white/50">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={username}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                profile.display_name.charAt(0)
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.display_name}
              </h1>
              <p className="text-gray-600">@{profile.username}</p>
            </div>
          </div>
          <div className="mt-4 text-sm font-medium text-gray-500 md:mt-0">
            Member since {memberSince}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/50 sm:grid-cols-4">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.bets_created || 0}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Bets Created
            </div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.bets_participated || 0}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Participated
            </div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.wins || 0}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Wins
            </div>
          </div>
          <div className="p-4 text-center">
             <div className="text-2xl font-bold text-primary-600">
              {stats.balance?.toLocaleString() || 0}
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Neos Won
            </div>
           </div>
        </div>
      </div>

      {/* Bets List */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Recent Activity</h2>
        <div className="space-y-4">
          {!bets || bets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">No public bets found.</p>
            </div>
          ) : (
            bets.map((bet: any) => (
              <Link
                href={`/bets/${bet.id}`}
                key={bet.id}
                className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-primary-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       {bet.category_name && <CategoryChip category={bet.category_name} />}
                       <span className="text-xs text-gray-400">
                         {formatToZurich(bet.created_at)}
                       </span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-primary-700">
                      {bet.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-900">
                          {bet.total_pot || 0}
                        </span>{" "}
                        Neos Pot
                      </span>
                      {bet.comment_count > 0 && (
                        <span className="flex items-center gap-1">
                           💬 {bet.comment_count}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 shrink-0">
                     <StatusBadge status={bet.status} endAt={bet.end_at} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, endAt }: { status: string; endAt: string }) {
  const isEnded = new Date(endAt) <= new Date();
  
  if (status === "RESOLVED") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
        RESOLVED
      </span>
    );
  }
  if (status === "VOID") {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
        VOID
      </span>
    );
  }
  if (isEnded) {
      return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
        ENDED
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800">
      OPEN
    </span>
  );
}
