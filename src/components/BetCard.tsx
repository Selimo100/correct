import Link from "next/link";
import { Database } from "@/lib/database.types";
import { formatToZurich } from "@/lib/date";

type Bet = Database["public"]["Tables"]["bets"]["Row"] & {
  profiles?: {
    username: string;
  };
  stats?: {
    total_pot: number;
    participant_count: number;
    for_stake: number;
    against_stake: number;
  };
  group?: { id: string; name: string }; // optional convenience
};

interface BetCardProps {
  bet: Bet;
  showCreator?: boolean;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function BetCard({ bet, showCreator = true }: BetCardProps) {
  const isLocked = new Date(bet.end_at) <= new Date() && bet.status === "OPEN";
  const isEnded = bet.status === "RESOLVED" || bet.status === "VOID";

  const totalPot = bet.stats?.total_pot || 0;
  const forStake = bet.stats?.for_stake || 0;
  const againstStake = bet.stats?.against_stake || 0;
  const participantCount = bet.stats?.participant_count || 0;

  const forPercentage =
    totalPot > 0 ? Math.round((forStake / totalPot) * 100) : 50;
  const againstPercentage =
    totalPot > 0 ? Math.round((againstStake / totalPot) * 100) : 50;

  const audience = (bet as any).audience as
    | "PUBLIC"
    | "PRIVATE"
    | "FRIENDS"
    | "GROUP"
    | undefined;

  const groupName =
    (bet as any).group?.name || (bet as any).group_name || bet.group?.name;

  const timeRemaining = () => {
    const endDate = new Date(bet.end_at);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m remaining`;
  };

  const StatusBadge = () => {
    if (bet.status === "RESOLVED") {
      const label = bet.resolution ? "FOR wins" : "AGAINST wins";
      return (
        <span className="inline-flex items-center rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-xs font-semibold text-[#22C55E]">
          {label}
        </span>
      );
    }

    if (bet.status === "VOID") {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
          Voided
        </span>
      );
    }

    if (isLocked) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Locked
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
        Open
      </span>
    );
  };

  const ScopeBadges = () => {
    if (bet.status !== "OPEN" || isLocked) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        {(audience === "PRIVATE" || bet.visibility === "PRIVATE") && (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
            Private
          </span>
        )}

        {audience === "FRIENDS" && (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            Friends
          </span>
        )}

        {audience === "GROUP" && (
          <span
            className="inline-flex max-w-[160px] items-center truncate rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700"
            title={groupName || "Group"}
          >
            {groupName || "Group"}
          </span>
        )}
      </div>
    );
  };

  return (
    <Link href={`/bets/${bet.id}`} className="group block h-full">
      <div
        className={cn(
          "h-full rounded-3xl border border-gray-200 bg-white p-5 shadow-soft transition",
          "hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary-700">
              {bet.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge />
              <ScopeBadges />
            </div>

            {showCreator && bet.profiles?.username && (
              <p className="mt-2 text-xs font-medium text-gray-500">
                by{" "}
                <span className="text-gray-800">@{bet.profiles.username}</span>
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {bet.description && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600">
            {bet.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-5 border-t border-gray-100 pt-4 space-y-3">
          {/* Pot + participants */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                {/* coin icon (css) */}
                <span className="text-sm font-bold">N</span>
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {totalPot} Neos
                </div>
                <div className="text-xs text-gray-500">Total pot</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {participantCount}
                {bet.max_participants ? `/${bet.max_participants}` : ""}
              </div>
              <div className="text-xs text-gray-500">Participants</div>
            </div>
          </div>

          {/* Distribution */}
          {totalPot > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-gray-500">
                <span>FOR {forPercentage}%</span>
                <span>AGAINST {againstPercentage}%</span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="flex h-full">
                  <div
                    className="h-full bg-[#22C55E]"
                    style={{ width: `${forPercentage}%` }}
                    aria-label={`For stake ${forPercentage}%`}
                  />
                  <div
                    className="h-full bg-[#EF4444]"
                    style={{ width: `${againstPercentage}%` }}
                    aria-label={`Against stake ${againstPercentage}%`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Time + category */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-medium",
                  isEnded ? "text-gray-500" : "text-gray-700",
                )}
                title={formatToZurich(bet.end_at)}
              >
                {timeRemaining()}
              </div>
              <div className="text-xs text-gray-500">
                Ends: {formatToZurich(bet.end_at)}
              </div>
            </div>

            {bet.category && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {bet.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
