import * as React from "react";
import { ChevronDown, Moon, Sun, Activity, LogOut, Link2Off, Link2, Loader2, CircleHelp, Check, Minus, TriangleAlert } from "lucide-react";
import {
  cn,
  Menu,
  ConnectedAppsPanel,
  Popover,
  Tooltip,
  FavoriteButton,
  Badge,
  SearchInput,
  Modal,
  Button,
} from "@nicecxone/lyra-ui";
import type { MenuEntry, ConnectedApp, BadgeProps } from "@nicecxone/lyra-ui";

/* Local copy of lyra-ui's `AgentProfile` (components/agent-profile.tsx) —
   identical except for `profileMenuItems`, extra rows (e.g. Change Password /
   Change Service / Settings) pinned at the top of the footer menu so there's a
   single dropdown instead of a status menu plus a separate profile menu.
   Re-sync with the library component when `.lyra-ui-sync` moves. */

/* ── Types ──
   Was "available" | "busy" | "away" | "offline" — "away" was dropped
   (three real states plus Offline was one too many to tell apart at a
   glance, color-only) and "busy" renamed to "unavailable" to match the
   same terminology `AgentDashboard`'s "Unavailable Agents" badge already
   uses (see agent-dashboard.tsx) — same word, same red/critical color,
   now also the same icon. "offline" was dropped too, per explicit
   request: just Available and Unavailable for now.

   Per a later explicit request, 15 more granular "unavailable, and here's
   why" reason codes were added on top of that — real call-center ACD/ACW
   reason-code vocabulary (lunch, break, coaching, system down, etc.), so
   `AgentProfile`'s own status search/Favorites/scrolling menu has enough
   real rows to stress-test with instead of just the two. Every one of
   these 15 reuses `"unavailable"`'s own icon/color in `statusConfig`
   below verbatim (same `Minus` glyph, same critical/red badge) rather than
   getting a distinct glyph each — per that same request, they're meant to
   read as "flavors of Unavailable," not 15 new semantically-distinct
   states `StatusIcon`/`Avatar`/anything else in this file would need to
   tell apart. Add a real per-reason icon later if that ever changes.

   `"working"`, per a later explicit request ("when an agent is in a call
   the status should change to 'working' — do not add this as a selectable
   status"): a SYSTEM-DRIVEN status, not a manual one. Deliberately left
   OUT of `allStatuses` below (the list the status menu actually renders),
   so it never appears in Favorites, "All Codes," or search results, and an
   agent can never pick it by hand — only a consumer's own `status` prop
   ever sets it (e.g. an effect watching for a live voice call, see
   `AgentNextGenPage.tsx`'s own `isOnVoiceCall`). Still a completely normal
   member of this union otherwise — `statusConfig`/`StatusIcon`/`Avatar`
   all handle it exactly like every selectable status — the ONLY thing that
   makes it unpickable is its absence from `allStatuses`. */

export type AgentStatus =
  | "available"
  | "unavailable"
  | "lunch"
  | "break"
  | "meeting"
  | "training"
  | "coaching"
  | "team-huddle"
  | "after-call-work"
  | "bio-break"
  | "technical-issue"
  | "system-outage"
  | "administrative-work"
  | "back-office"
  | "do-not-disturb"
  | "end-of-shift"
  | "emergency"
  | "working";

export interface AgentProfileProps {
  /** Extra rows pinned at the top of the footer menu, above Dark Mode. */
  profileMenuItems?: MenuEntry[];
  name: string;
  initials?: string;
  avatarSrc?: string;
  status?: AgentStatus;
  onStatusChange?: (status: AgentStatus) => void;
  timer?: string;
  /** Pass apps to show the Connected Apps flyout panel */
  connectedApps?: ConnectedApp[];
  /** Called when reconnect is triggered for an app */
  onReconnect?: (appId: string) => void;
  /**
   * Called when the Dark Mode row is clicked. When BOTH this and
   * `isDarkMode` are omitted, AgentProfile self-manages the theme exactly
   * like `ProfileMenu` does: it reads/writes `data-theme` on
   * `document.documentElement` itself, so the toggle works out of the box.
   * Provide these props only to take controlled ownership of theming.
   */
  onDarkModeToggle?: () => void;
  /** Whether dark mode is currently active — controls the label/icon shown in the menu */
  isDarkMode?: boolean;
  /** Shows a "Help" row (below "Agent Leg Disconnected") when provided */
  onHelpClick?: () => void;
  onLogOut?: () => void;
  /** Fired once the agent leg finishes connecting or disconnecting — after
   *  the ~2s "connecting" animation settles into "connected" (see this
   *  file's own `handleAgentLegToggle`), or immediately on disconnect
   *  (no animation on that transition). NOT fired for the "connecting"
   *  state itself, and never fired for the initial mount-time value — only
   *  real, agent-caused transitions. Lets the consumer show its own toast
   *  (or anything else) confirming what just happened; this component has
   *  no toast infrastructure of its own to show one directly with (see
   *  `AgentNextGenPage.tsx`'s own `useToast`/`ToastContainer` for where
   *  that actually lives, app-side). */
  onAgentLegStatusChange?: (status: "disconnected" | "connected") => void;
  /** Bump this to a new number (e.g. `n => n + 1`) to imperatively start
   *  connecting the agent leg from OUTSIDE this component — e.g. a
   *  "Connect" button on the toast `onAgentLegStatusChange`'s own
   *  disconnected event already fired (see `AgentNextGenPage.tsx`'s
   *  `showAgentLegToast`/`handleConnectAgentLeg`), so the agent doesn't
   *  have to also open this menu and click the "Agent Leg Disconnected" row
   *  by hand. Only the VALUE CHANGING matters (same "signal" convention as
   *  a counter-based re-run trigger elsewhere) — the number itself is never
   *  read or displayed. No-ops if the agent leg isn't currently
   *  `"disconnected"` (already connected, or already mid-connect), same as
   *  clicking the row/avatar itself would. Left undefined, agent leg
   *  connect/disconnect stays fully self-managed via that row/avatar click
   *  exactly as before this prop existed — this is purely an additive
   *  external trigger, not a controlled-value takeover the way `isDarkMode`/
   *  `onDarkModeToggle` is. */
  connectAgentLegSignal?: number;
  /** Seeds this menu's own agent-leg connection state at mount, instead of
   *  the plain `"disconnected"` default below — for a consuming app that
   *  persists the agent leg's connected/disconnected status ACROSS
   *  separate top-level page mounts (e.g. switching between Agent Workspace
   *  tiers, each its own route/component — see `AgentWorkspace2WithDeskPage
   *  .tsx`'s own doc comment on why those are separate mounts, not one
   *  shared page), so a fresh mount can start already reflecting whatever
   *  the agent leg was actually doing on the PREVIOUS page rather than
   *  every switch silently reverting it to disconnected. Purely an initial
   *  value, not a controlled prop — this component still owns
   *  `agentLegStatus` after mount exactly as before (see
   *  `onAgentLegStatusChange`'s own doc comment for why this isn't fully
   *  controlled). Deliberately excludes `"connecting"` — that's a
   *  transient in-flight state with no sensible meaning as a starting
   *  point. Defaults to `"disconnected"`, matching this component's
   *  pre-existing behavior when omitted. `isFirstAgentLegRender`'s own
   *  mount-skip guard below still applies to whatever this seeds —
   *  hydrating from a previous page is not, itself, a new connect/
   *  disconnect event, so it must never fire `onAgentLegStatusChange` (and
   *  therefore never fire a consumer's own toast) on its own. */
  initialAgentLegStatus?: "disconnected" | "connected";
  /** Controlled agent-leg status, for a consumer whose leg state lives
   *  outside this component (e.g. a telephony provider). When this or
   *  `onAgentLegToggle` is passed, the component only displays this value
   *  and never changes it itself: no internal state, no connect timer, and
   *  `initialAgentLegStatus` is ignored. Omit both for the self-managed
   *  behavior above. */
  agentLegStatus?: "disconnected" | "connecting" | "connected";
  /** Controlled mode: fired when the agent clicks the "Agent Leg" row or the
   *  attention avatar (or `connectAgentLegSignal` changes while
   *  disconnected), with the action that click asks for. Not fired while
   *  `"connecting"`. The consumer updates `agentLegStatus` once the action
   *  actually lands. */
  onAgentLegToggle?: (action: "connect" | "disconnect") => void;
  /** Hides the "Agent Leg" row and the avatar's leg indicator/tooltip — for
   *  a consumer with no agent leg to show (or not loaded yet). */
  hideAgentLeg?: boolean;
  /** Hides the "Connected Apps" row (and its flyout panel) entirely — for
   *  a consumer with no real integrations to surface here at all, rather
   *  than showing a permanently-empty "0" row. Unlike `onHelpClick`
   *  (shown only when a handler is passed), Connected Apps has no such
   *  natural "nothing to show" signal on its own — `connectedApps`
   *  defaults to `[]` and the row still renders (just with a "0" badge)
   *  when omitted, so this is an explicit opt-out instead. */
  hideConnectedApps?: boolean;
  className?: string;
}

/* ── Status config ──
   `badgeVariant`/`icon` are set for every current status so each gets a
   real icon badge in the status menu (ADA — color alone isn't an
   accessible signal). `StatusIcon` below still falls back to a plain dot
   for any future status added without a dedicated icon. */

type StatusBadgeVariant = NonNullable<Extract<BadgeProps, { shape: "circle" }>["variant"]>;

// Shared by "unavailable" and all 15 reason-code statuses below — same
// icon/color for every one of them, see `AgentStatus`'s own doc comment
// above for why these deliberately don't get distinct glyphs.
const UNAVAILABLE_STATUS_STYLE = {
  color: "bg-lyra-status-critical-strong",
  textColor: "text-lyra-status-critical-strong",
  icon: Minus,
  badgeVariant: "critical" as StatusBadgeVariant,
};

const statusConfig: Record<AgentStatus, { label: string; color: string; textColor: string; icon?: typeof Check; badgeVariant?: StatusBadgeVariant }> = {
  available:            { label: "Available",            color: "bg-lyra-status-success-strong", textColor: "text-lyra-status-success-strong", icon: Check, badgeVariant: "success" },
  unavailable:          { label: "Unavailable",           ...UNAVAILABLE_STATUS_STYLE },
  lunch:                { label: "Lunch",                 ...UNAVAILABLE_STATUS_STYLE },
  break:                { label: "Break",                 ...UNAVAILABLE_STATUS_STYLE },
  meeting:              { label: "Meeting",                ...UNAVAILABLE_STATUS_STYLE },
  training:             { label: "Training",               ...UNAVAILABLE_STATUS_STYLE },
  coaching:             { label: "Coaching",                ...UNAVAILABLE_STATUS_STYLE },
  "team-huddle":        { label: "Team Huddle",             ...UNAVAILABLE_STATUS_STYLE },
  "after-call-work":    { label: "After Call Work",         ...UNAVAILABLE_STATUS_STYLE },
  "bio-break":          { label: "Bio Break",               ...UNAVAILABLE_STATUS_STYLE },
  "technical-issue":    { label: "Technical Issue",         ...UNAVAILABLE_STATUS_STYLE },
  "system-outage":      { label: "System Outage",           ...UNAVAILABLE_STATUS_STYLE },
  "administrative-work":{ label: "Administrative Work",     ...UNAVAILABLE_STATUS_STYLE },
  "back-office":        { label: "Back Office",             ...UNAVAILABLE_STATUS_STYLE },
  "do-not-disturb":     { label: "Do Not Disturb",          ...UNAVAILABLE_STATUS_STYLE },
  "end-of-shift":       { label: "End of Shift",            ...UNAVAILABLE_STATUS_STYLE },
  emergency:            { label: "Emergency",               ...UNAVAILABLE_STATUS_STYLE },
  // Per explicit request ("the badge should be a warning with a dot"): NO
  // `icon` field, unlike every other status above — `StatusIcon` below
  // renders a plain colored dot (no glyph) for any status missing one, and
  // this is deliberately the one status that wants that bare-dot look
  // rather than a check/minus/whatever glyph. `badgeVariant: "warning"` is
  // still set (previously that fallback path ignored `badgeVariant`
  // entirely and always rendered `variant="neutral"` — see `StatusIcon`'s
  // own fix) so the dot itself actually reads warning/orange, not gray.
  working:              { label: "Working",                 color: "bg-lyra-status-warning-strong", textColor: "text-lyra-status-warning-strong", badgeVariant: "warning" },
};

/** Status menu row icon — circle-shape `Badge` with the status glyph as
 *  its content (same badge used for the Connected Apps count, just an
 *  icon instead of a number) for statuses that have one, `Badge`'s own
 *  `dot` mode as a fallback for any status without one. */
function StatusIcon({ status, className }: { status: AgentStatus; className?: string }) {
  const { icon: StatusGlyph, badgeVariant } = statusConfig[status];
  if (StatusGlyph && badgeVariant) {
    return (
      <Badge shape="circle" variant={badgeVariant} size="sm" className={className}>
        <StatusGlyph className="h-2 w-2" strokeWidth={3} aria-hidden="true" />
      </Badge>
    );
  }
  // Was hardcoded `variant="neutral"` regardless of this status's OWN
  // `badgeVariant` (only ever reachable before now via a status with
  // neither `icon` nor `badgeVariant` set at all, so the two happened to
  // never conflict) — per explicit request ("the badge should be a warning
  // with a dot"), `"working"` (statusConfig above) sets `badgeVariant:
  // "warning"` with NO `icon`, which needs this same bare-dot rendering
  // but colored warning/orange, not gray. `badgeVariant ?? "neutral"` keeps
  // the old gray-dot fallback for any status that genuinely has neither.
  return (
    <Badge shape="circle" variant={badgeVariant ?? "neutral"} size="sm" className={className} aria-label={statusConfig[status].label}>
      <span className="block h-2 w-2 rounded-full bg-white" aria-hidden="true" />
    </Badge>
  );
}

/** Per explicit request: while the agent LEG (softphone/telephony
 *  connection — `agentLegStatus`, distinct from `status`'s own available/
 *  unavailable/etc. presence) isn't connected, this avatar's own circle
 *  swaps its usual initials for a real signal of that — `Link2Off` while
 *  fully disconnected, the same spinning `Loader2` the "Agent Leg
 *  Connecting…" menu row already uses while reconnecting is in flight —
 *  and reverts to plain initials the moment `agentLegStatus` reads
 *  "connected" again. `status`'s own corner `StatusIcon` badge is
 *  untouched either way — that's a separate concept (availability, not
 *  connectivity) and keeps reading whatever it already did. Purely
 *  presentational: the click-to-connect behavior/tooltip live on whichever
 *  element wraps this (see this file's own render return — that wrapper
 *  differs by state, so it doesn't belong in here). */
function Avatar({
  initials,
  src,
  status,
  agentLegStatus,
}: {
  initials?: string;
  src?: string;
  status: AgentStatus;
  agentLegStatus?: "disconnected" | "connecting" | "connected";
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "h-9 w-9 rounded-full overflow-hidden flex items-center justify-center",
          // Warning-colored CIRCLE (not just the glyph) while disconnected,
          // per explicit request — same solid-fill + white-icon treatment
          // `Badge`'s own `warning` circle variant uses (`bg-lyra-status-
          // warning-strong text-white`, badge.tsx), reused here directly so
          // this reads as "needs attention" at a glance instead of blending
          // into the same neutral slate every other avatar state uses.
          agentLegStatus === "disconnected" ? "bg-lyra-status-warning-strong" : "bg-lyra-avatar-default-bg"
        )}
      >
        {src ? (
          <img src={src} alt={initials} className="h-full w-full object-cover" />
        ) : agentLegStatus === "disconnected" ? (
          <Link2Off className="h-4 w-4 text-white" strokeWidth={1.75} aria-hidden="true" />
        ) : agentLegStatus === "connecting" ? (
          <Loader2 className="h-4 w-4 text-white animate-spin" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <span className="lyra-label text-white">{initials}</span>
        )}
      </div>
      <StatusIcon status={status} className="absolute bottom-[-2px] right-[-2px] px-0 border border-lyra-bg-surface-base" />
    </div>
  );
}

/* ── Component ── */

const AgentProfile = React.forwardRef<HTMLDivElement, AgentProfileProps>(
  ({
    name, initials = "AG", avatarSrc,
    status = "available", onStatusChange,
    timer,
    profileMenuItems = [],
    connectedApps = [],
    onReconnect,
    onDarkModeToggle, isDarkMode: isDarkModeProp, onHelpClick, onLogOut,
    onAgentLegStatusChange,
    connectAgentLegSignal,
    initialAgentLegStatus,
    agentLegStatus: agentLegStatusProp,
    onAgentLegToggle,
    hideAgentLeg = false,
    hideConnectedApps = false,
    className,
  }, ref) => {
    /* Uncontrolled dark mode — same self-managing mechanism as ProfileMenu
       (profile-menu.tsx): only active when neither `isDarkMode` nor
       `onDarkModeToggle` is supplied. */
    const [internalDark, setInternalDark] = React.useState(() =>
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "dark"
    );
    const darkControlled = isDarkModeProp !== undefined || onDarkModeToggle !== undefined;
    const isDarkMode = darkControlled ? (isDarkModeProp ?? false) : internalDark;
    const handleDarkModeToggle = () => {
      if (darkControlled) {
        onDarkModeToggle?.();
        return;
      }
      const next = !internalDark;
      setInternalDark(next);
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    };
    const [open, setOpen] = React.useState(false);
    // Gates the actual `onLogOut` call behind an explicit "Log Out"/"Cancel"
    // confirmation modal — per explicit request. Lives here (not left to
    // each consumer wrapping its own `onLogOut` in a confirm step) so every
    // `AgentProfile` consumer gets the same confirmation for free; see the
    // "logout" `footerMenuItems` entry and the `Modal` in the render return
    // below.
    const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);
    const [statusSearch, setStatusSearch] = React.useState("");
    const [favoriteStatuses, setFavoriteStatuses] = React.useState<Set<AgentStatus>>(new Set());
    const [internalAgentLegStatus, setInternalAgentLegStatus] = React.useState<"disconnected" | "connecting" | "connected">(
      initialAgentLegStatus ?? "disconnected"
    );
    // Same controlled/uncontrolled split as dark mode above.
    const agentLegControlled = agentLegStatusProp !== undefined || onAgentLegToggle !== undefined;
    const agentLegStatus = agentLegControlled ? (agentLegStatusProp ?? "disconnected") : internalAgentLegStatus;
    const agentLegConnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    React.useEffect(() => () => clearTimeout(agentLegConnectTimerRef.current), []);
    const [reconnectedIds, setReconnectedIds] = React.useState<Set<string>>(new Set());
    const contentRef = React.useRef<HTMLDivElement>(null);
    const issueCount = connectedApps.filter((a) => a.status !== "healthy" && !reconnectedIds.has(a.id)).length;

    const handleReconnect = (appId: string) => {
      onReconnect?.(appId);
      setTimeout(() => setReconnectedIds((prev) => new Set([...prev, appId])), 2500);
    };

    const MAX_FAVORITE_STATUSES = 5;
    const toggleFavoriteStatus = (s: AgentStatus) => {
      setFavoriteStatuses((prev) => {
        const next = new Set(prev);
        if (next.has(s)) next.delete(s);
        else if (next.size < MAX_FAVORITE_STATUSES) next.add(s);
        return next;
      });
    };

    const handleAgentLegToggle = () => {
      if (agentLegStatus === "connecting") return;
      if (agentLegControlled) {
        onAgentLegToggle?.(agentLegStatus === "disconnected" ? "connect" : "disconnect");
        return;
      }
      if (agentLegStatus === "disconnected") {
        setInternalAgentLegStatus("connecting");
        agentLegConnectTimerRef.current = setTimeout(() => setInternalAgentLegStatus("connected"), 2000);
      } else {
        setInternalAgentLegStatus("disconnected");
      }
    };

    // Watches `connectAgentLegSignal` (see that prop's own doc comment) —
    // any CHANGE to it (not its value) starts the same connect sequence
    // `handleAgentLegToggle` already runs from the row/avatar click, just
    // triggered from outside instead of a direct click. Guarded the same
    // "skip the mount-time run" way `onAgentLegStatusChange`'s own effect
    // below is, via a ref holding the last-seen value rather than an
    // `isFirstRender` flag specifically, since the "did this actually
    // change" comparison doubles as that same skip-on-mount guard for free
    // (the ref starts equal to the first render's own value, so a still-
    // undefined or unchanged prop never fires). Only acts while actually
    // `"disconnected"` — already connected/mid-connecting silently no-ops,
    // same as the row/avatar click already does via `handleAgentLegToggle`'s
    // own guard.
    const lastConnectAgentLegSignalRef = React.useRef(connectAgentLegSignal);
    React.useEffect(() => {
      if (connectAgentLegSignal === undefined) return;
      if (connectAgentLegSignal === lastConnectAgentLegSignalRef.current) return;
      lastConnectAgentLegSignalRef.current = connectAgentLegSignal;
      if (agentLegStatus === "disconnected") handleAgentLegToggle();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectAgentLegSignal]);

    const agentLegIconMap = {
      // Warning-colored per explicit request (was neutral gray,
      // `text-lyra-fg-secondary`) — matches the same disconnected `Link2Off`
      // glyph's own recoloring in `Avatar` above, so this footer row and the
      // avatar agree on how "disconnected" reads instead of one flagging it
      // and the other treating it as neutral.
      disconnected: { icon: <Link2Off className="h-4 w-4" strokeWidth={1.4} />, color: "text-lyra-status-warning-strong", tooltip: "Click to connect"    },
      connecting:   { icon: <Loader2  className="h-4 w-4 animate-spin" strokeWidth={1.4} />, color: "text-lyra-status-warning-strong", tooltip: "Connecting..."       },
      connected:    { icon: <Link2    className="h-4 w-4" strokeWidth={1.4} />, color: "text-lyra-status-success-strong", tooltip: "Click to disconnect" },
    };

    // Fires `onAgentLegStatusChange` for a real connect/disconnect, not for
    // "connecting" (the in-between state — see that prop's own doc comment
    // for why) and not on mount with nothing having actually happened yet.
    // Guarded by comparing against the LAST SEEN value (same shape as
    // `lastConnectAgentLegSignalRef` just above), not a `isFirstRender`
    // boolean ref — this app renders under React 18 `<StrictMode>`
    // (main.tsx), which in dev double-invokes this effect on mount
    // (mount → cleanup → mount) without resetting any ref in between. A
    // plain "first render" boolean flips to `false` on that first, PHANTOM
    // invocation, so the second (real, kept) invocation then reads the flag
    // as already-consumed and incorrectly treats the still-unchanged mount
    // value as a genuine change — firing a spurious "Agent Leg Connected"
    // toast on every fresh load. Comparing values instead is immune to
    // that: both the phantom and the real invocation see the same
    // `agentLegStatus` as `lastAgentLegStatusRef.current` (seeded from the
    // same mount-time value), so neither one fires — only an actual later
    // transition (e.g. a real disconnect, then reconnect) does.
    const lastAgentLegStatusRef = React.useRef(agentLegStatus);
    React.useEffect(() => {
      if (agentLegStatus === lastAgentLegStatusRef.current) return;
      lastAgentLegStatusRef.current = agentLegStatus;
      if (agentLegStatus === "connected" || agentLegStatus === "disconnected") {
        onAgentLegStatusChange?.(agentLegStatus);
      }
    }, [agentLegStatus]);

    // Clear search when main menu closes. The Connected Apps flyout no
    // longer needs a matching reset — its open state now lives inside
    // Menu's own MenuItemRow (via submenuContent) and unmounts along with
    // the rest of the popover content.
    React.useEffect(() => {
      if (!open) setStatusSearch("");
    }, [open]);

    // Shared between the "Favorites" shortcut section and the "All Codes"
    // list below — every status row gets the same favorite star, including
    // rows inside the Favorites section itself, so a status can be
    // unfavorited from either place.
    const favoritesAtCap = favoriteStatuses.size >= MAX_FAVORITE_STATUSES;
    const favoriteRightElement = (s: AgentStatus) => (
      <FavoriteButton
        favorited={favoriteStatuses.has(s)}
        disabled={favoritesAtCap}
        onClick={() => toggleFavoriteStatus(s)}
        label={statusConfig[s].label}
        placement="left"
        // Menu's own item root (this row) is already a real <button> —
        // nesting another <button> inside it is invalid HTML with
        // unreliable click bubbling, so this renders as a
        // <span role="button"> instead. Its hover-reveal keys off Menu's
        // `group/item`, not the default `group/row`. See favorite-button.tsx.
        as="span"
        hoverGroup="item"
        className="h-6 w-6"
        // This tooltip's trigger lives inside the z-[10001] status menu
        // panel below, so the default z-[10000] tooltip level would render
        // behind it. See CONTRIBUTING.md §5.
        tooltipClassName="z-[10002]"
      />
    );

    /* Build Menu entries using the Menu component's interface */
    const allStatuses = [
      "available",
      "unavailable",
      "lunch",
      "break",
      "meeting",
      "training",
      "coaching",
      "team-huddle",
      "after-call-work",
      "bio-break",
      "technical-issue",
      "system-outage",
      "administrative-work",
      "back-office",
      "do-not-disturb",
      "end-of-shift",
      "emergency",
    ] as AgentStatus[];
    const filteredStatuses = statusSearch.trim()
      ? allStatuses.filter((s) => statusConfig[s].label.toLowerCase().includes(statusSearch.toLowerCase()))
      : allStatuses;

    const noStatusMatch = filteredStatuses.length === 0;
    const favoriteStatusList = filteredStatuses.filter((s) => favoriteStatuses.has(s));

    // Per explicit request: split into two independent `Menu`s (below,
    // render return) instead of one flat list — `statusMenuItems` (this
    // one) is the part that scrolls once the status list is long enough to
    // overflow (now up to 17 rows, see `AgentStatus`'s own doc comment);
    // `footerMenuItems` (right after) is Dark Mode/Connected Apps/Agent
    // Leg/Help/Log Out, which need to stay pinned/visible at the bottom of
    // the popover instead of scrolling out of view along with the statuses
    // above them. Splitting the DATA here (not just wrapping one `Menu` in
    // two scroll regions) is what actually keeps this footer out of the
    // scrollable area — a single `Menu` renders one continuous list with no
    // way to make only PART of its own rows sticky/pinned.
    const statusMenuItems: MenuEntry[] = [
      // Favorites shortcut — only shown once something's been starred, and
      // only lists whatever still matches the active search (so it hides
      // itself naturally when a search excludes every favorite).
      ...(favoriteStatusList.length > 0
        ? [
            { sectionLabel: "Favorites" },
            ...favoriteStatusList.map((s) => ({
              id: `favorite-${s}`,
              label: statusConfig[s].label,
              icon: <StatusIcon status={s} />,
              active: status === s,
              onClick: () => { onStatusChange?.(s); setOpen(false); },
              rightElement: favoriteRightElement(s),
            })),
            "separator" as const,
          ]
        : []),
      ...(noStatusMatch
        ? [{
            id: "_no-results",
            label: "No matching statuses",
            disabled: true,
            icon: <span className="h-5 w-5" />,
          }]
        : [
            { sectionLabel: `All Codes (${filteredStatuses.length})` },
            ...filteredStatuses.map((s) => ({
              id: s,
              label: statusConfig[s].label,
              icon: <StatusIcon status={s} />,
              active: status === s,
              onClick: () => { onStatusChange?.(s); setOpen(false); },
              rightElement: favoriteRightElement(s),
            })),
          ]),
    ];

    // No leading "separator" entry here (unlike the old single-list
    // version) — the wrapping `border-t` at this Menu's own render call
    // site (below) already draws that same divider line, between this
    // fixed footer and the scrollable status list right above it; a
    // "separator" row here on top of that border would double it up.
    const footerMenuItems: MenuEntry[] = [
      ...(profileMenuItems.length > 0 ? [...profileMenuItems, "separator" as const] : []),
      {
        id: "dark-mode",
        label: isDarkMode ? "Light Mode" : "Dark Mode",
        icon: isDarkMode
          ? <Sun  className="h-4 w-4" strokeWidth={1.5} />
          : <Moon className="h-4 w-4" strokeWidth={1.5} />,
        onClick: handleDarkModeToggle,
        // Keep the menu open so the new theme is visible immediately —
        // matches ProfileMenu's theme-toggle entry.
        closeOnSelect: false,
      },
      // Omitted entirely when `hideConnectedApps` is set — see that prop's
      // own doc comment for why this needs an explicit opt-out rather than
      // just relying on an empty `connectedApps` list (the row still shows
      // a "0" badge in that case, which is the default, existing behavior
      // every other consumer already expects).
      ...(hideConnectedApps
        ? []
        : [{
            id: "connected-apps",
            label: "Connected Apps",
            icon: <Activity className="h-4 w-4" strokeWidth={1.5} />,
            // Submenu hover/click-to-open, portal-to-body, and viewport-edge
            // flip positioning are all handled by Menu itself (same mechanism
            // as a regular `submenu`) — this just supplies the rich panel
            // content instead of a flat list of menu items.
            submenuContent: <ConnectedAppsPanel apps={connectedApps} onReconnect={handleReconnect} />,
            // Menu's own submenu flyout defaults to `z-[9999]` — correct for a
            // top-level submenu, but this one is nested inside the status
            // menu's own `z-[10001]` panel, so it needs to clear that parent
            // (same reason the tooltips on this row and below are bumped to
            // `z-[10002]`). See CONTRIBUTING.md §5 — this is a new documented
            // tier (`10004`) since `10002`/`10003` are already claimed by other
            // specific cases.
            submenuZIndexClassName: "z-[10004]",
            rightElement: (
              issueCount > 0 ? (
                <Tooltip content={`${issueCount} app${issueCount > 1 ? "s" : ""} not fully connected`} placement="left" className="z-[10002]">
                  <span>
                    <Badge shape="circle" variant="warning" size="sm">{connectedApps.length}</Badge>
                  </span>
                </Tooltip>
              ) : connectedApps.length > 0 ? (
                <Badge shape="circle" variant="success" size="sm">{connectedApps.length}</Badge>
              ) : (
                <Badge shape="circle" variant="neutral" size="sm">0</Badge>
              )
            ),
          }]),
      ...(hideAgentLeg
        ? []
        : [{
            id: "agent-leg",
            label: agentLegStatus === "connected" ? "Agent Leg Connected" : agentLegStatus === "connecting" ? "Agent Leg Connecting…" : "Agent Leg Disconnected",
            icon: (
              <Tooltip content={agentLegIconMap[agentLegStatus].tooltip} placement="left" className="z-[10002]">
                <span className={cn("flex items-center", agentLegIconMap[agentLegStatus].color)}>
                  {agentLegIconMap[agentLegStatus].icon}
                </span>
              </Tooltip>
            ),
            onClick: handleAgentLegToggle,
          }]),
      // Only shown when `onHelpClick` is actually passed — see that prop's
      // own doc comment ("shows a 'Help' row ... when provided"). Was
      // previously added unconditionally regardless of whether a handler
      // existed, which put a dead "Help" row in every consumer's status
      // menu. `agent-next-gen-v1` had briefly added its own standalone "?"
      // AppHeader icon instead of using this prop, then moved back to this
      // row per user request (screenshot of the status dropdown, asked for
      // "Help" below "Agent Leg Disconnected" — exactly this row's position).
      // `AgentNextGenTemplate.stories.tsx` and `lyra-ux-templates` don't
      // currently pass `onHelpClick` at all (no Help entry point in either
      // right now) — flagging, not fixing, since this request was scoped to
      // `agent-next-gen-v1` only.
      ...(onHelpClick
        ? [{
            id: "help",
            label: "Help",
            icon: <CircleHelp className="h-4 w-4" strokeWidth={1.5} />,
            onClick: onHelpClick,
          }]
        : []),
      "separator" as const,
      {
        id: "logout",
        label: "Log Out",
        icon: <LogOut className="h-4 w-4" strokeWidth={1.5} />,
        // Closes the status popover and opens the confirmation modal
        // instead of calling `onLogOut` directly — the modal's own "Log
        // Out" button is what actually fires `onLogOut`, on confirm.
        onClick: () => {
          setOpen(false);
          setLogoutConfirmOpen(true);
        },
        destructive: true,
      },
    ];

    // Per explicit request: the avatar stays put INSIDE the "Agent Status
    // and More" trigger button in every state (not pulled out as a
    // standalone sibling control) — while the agent leg isn't connected, it
    // just needs to swallow its own click instead of opening the status
    // popover. A real `<button>` can't nest inside another `<button>`
    // (invalid HTML, unreliable click bubbling), so this reuses the same
    // `<span role="button">` + `stopPropagation` pattern `FavoriteButton`
    // already uses to sit inside Menu's own row buttons (see
    // `favoriteRightElement` above) rather than a second real button.
    const agentLegNeedsAttention = !hideAgentLeg && (agentLegStatus === "disconnected" || agentLegStatus === "connecting");
    const avatarAgentLegStatus = hideAgentLeg ? undefined : agentLegStatus;

    return (
      <div ref={ref} className={cn("flex items-center gap-2", className)}>
        {/* Disabled (not just "would be redundant") while the avatar needs
            its own attention-tooltip below — this Tooltip's Trigger spans
            the ENTIRE button including the avatar, so leaving it enabled
            here risked both this one and the avatar's own inner Tooltip
            being open at once while hovering the avatar. Simplest fix:
            only one of the two tooltips is ever "live" per state. */}
        {/* No `asLabel`: it put aria-label on the wrapper <span> (no role —
            axe aria-prohibited-attr); the <button> inside already carries
            its own aria-label. */}
        <Tooltip content="Agent Status and More" placement="bottom" disabled={open || agentLegNeedsAttention}>
          {/* Wrap the whole Popover (not just its trigger) in a plain span —
              Tooltip's own Trigger clones its hover/focus props onto its
              immediate child via Radix Slot, which only works on a plain
              DOM element or another Slot-forwarding component. Popover
              itself doesn't forward arbitrary cloned props to its internals,
              so it has to sit *inside* the span, not be the span's stand-in.
              Same pattern as the advanced-search Popover+Tooltip combo in
              table.tsx. */}
          <span className="inline-flex">
            <Popover
              ref={contentRef}
              open={open}
              onOpenChange={setOpen}
              placement="bottom"
              align="end"
              sideOffset={6}
              showArrow={false}
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                // Focus the search input instead
                setTimeout(() => contentRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
              }}
              onInteractOutside={(e) => {
                // The Connected Apps submenu (rendered by Menu via
                // submenuContent) is portaled to document.body, outside this
                // popover's own DOM subtree — without this it would register
                // as an "outside" click and close the whole status menu the
                // moment someone clicks reconnect on an app.
                if ((e.target as HTMLElement)?.closest('[data-menu-submenu-for="connected-apps"]')) e.preventDefault();
              }}
              className={cn(
                /* "md" on the Menu/Popover width scale (CONTRIBUTING.md) —
                   a search row above the list warrants one step above sm. */
                "z-[10001] w-64"
              )}
              // The search row and Menu below both already own their full
              // padding end to end — Popover's default 16px body inset
              // would double up on the search row and inset Menu's own
              // edge-to-edge rows.
              bodyPadding={false}
              content={
                // Radix's avoidCollisions (on by default) only repositions
                // the popover — it flips/shifts to whichever side has more
                // room, it never shrinks the content. With the trigger near
                // a screen edge and a variable-length list (Favorites can
                // make this tall), nothing capped the height, so it could
                // run off the viewport with no way to scroll to the rest.
                // `h-[80vh] max-h-[768px]` — per explicit request, the same
                // fixed height constraint the Customer Information hover
                // preview uses (agent-next-gen-customer-info-panel.tsx's own
                // `CustomerInfoHoverPreview`, see that component's own doc
                // comment): scales with the viewport on a normal display but
                // never grows past 768px on a very tall one. Replaces the
                // earlier `--radix-popper-available-height`-driven cap
                // (Radix's own live-computed free space, with a 400px
                // fallback) — that dynamic approach guaranteed this never
                // ran off-screen near a trigger close to a screen edge, but
                // per explicit follow-up request this popover should now
                // match the other one's height exactly rather than shrink
                // itself around whatever room Radix happens to find. The
                // list below still scrolls independently either way (see
                // its own `overflow-y-auto` div, unchanged), so a long
                // status list still can't push the fixed footer off-screen.
                <div className="flex h-[80vh] max-h-[768px] flex-col">
                  {/* Search statuses — SearchInput (not the generic Input +
                      manual startIcon this used before), so typing a query
                      gets the built-in clear ("x") button for free instead
                      of leaving no way to clear the field but backspacing. */}
                  <div className="px-3 py-2.5 border-b border-lyra-border-subtle flex-shrink-0">
                    <SearchInput
                      placeholder="Search statuses"
                      value={statusSearch}
                      onValueChange={setStatusSearch}
                    />
                  </div>

                  {/* Statuses — the one part of this popover that scrolls.
                      Per explicit request, split out of what used to be one
                      flat `menuItems` list specifically so Dark Mode/
                      Connected Apps/Agent Leg/Help/Log Out (the separate
                      `footerMenuItems` `Menu` right below, OUTSIDE this
                      `overflow-y-auto` div) stay pinned/visible at the
                      bottom of the popover instead of scrolling away with a
                      long status list (now up to 17 rows). No
                      `rounded-b-lyra-lg` here any more — this `Menu` no
                      longer touches the popover's own bottom edge, that
                      rounding moved to `footerMenuItems`' `Menu` below. */}
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <Menu
                      items={statusMenuItems}
                      className="border-0 shadow-none rounded-none bg-transparent"
                    />
                  </div>

                  {/* Fixed footer — `flex-shrink-0` (not part of the
                      `overflow-y-auto` region above) is what actually keeps
                      this pinned in place regardless of how tall the status
                      list above gets. `border-t` here is the divider line
                      between the two (see `footerMenuItems`' own comment
                      for why that's not also a "separator" row). */}
                  <div className="flex-shrink-0 border-t border-lyra-border-subtle">
                    <Menu
                      items={footerMenuItems}
                      className="border-0 shadow-none rounded-none rounded-b-lyra-lg bg-transparent"
                    />
                  </div>
                </div>
              }
            >
              <button
                type="button"
                aria-label={
                  avatarAgentLegStatus === "disconnected"
                    ? "Agent Status and More, agent leg disconnected"
                    : avatarAgentLegStatus === "connecting"
                    ? "Agent Status and More, agent leg connecting"
                    : "Agent Status and More"
                }
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lyra-sm hover:bg-lyra-state-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus"
              >
                {/* While the agent leg needs attention, wrap the avatar in
                    its own click target + tooltip so it swallows the click
                    (connect/reconnect) instead of also opening the status
                    popover — see this component's own doc comment above
                    the render return for why this is a `<span role="button">`
                    and not a real nested `<button>`. */}
                {agentLegNeedsAttention ? (
                  <Tooltip
                    content={
                      agentLegStatus === "connecting"
                        ? "Connecting…"
                        : "Agent Leg Disconnected, Click To Connect"
                    }
                    placement="bottom"
                  >
                    {/* Mouse-only shortcut: no role/tabIndex, so it isn't a
                        focusable control nested inside the status <button>
                        (axe nested-interactive). Keyboard and screen-reader
                        users reach the same connect/reconnect action via
                        the popover's own "Agent Leg" footer row, and the
                        button's aria-label below announces the state. */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAgentLegToggle();
                      }}
                      className="shrink-0 rounded-full"
                    >
                      <Avatar initials={initials} src={avatarSrc} status={status} agentLegStatus={avatarAgentLegStatus} />
                    </span>
                  </Tooltip>
                ) : (
                  <Avatar initials={initials} src={avatarSrc} status={status} agentLegStatus={avatarAgentLegStatus} />
                )}
                <div className="flex flex-col items-start min-w-0">
                  <span className={cn("lyra-label leading-tight", statusConfig[status].textColor)}>{statusConfig[status].label}</span>
                  {timer && <span className={cn("lyra-body-sm tabular-nums", statusConfig[status].textColor)}>{timer}</span>}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-lyra-fg-secondary shrink-0 transition-transform duration-200", open && "rotate-180")} strokeWidth={1.5} />
              </button>
            </Popover>
          </span>
        </Tooltip>

        {/* Log-out confirmation — per explicit request, "Log Out" no longer
            calls `onLogOut` immediately (see the "logout" `footerMenuItems`
            entry above); this modal is what actually fires it, only once
            the agent confirms. `closeOnBackdropClick` stays the default
            `false` (matches `Modal.stories.tsx`'s own "Warning"/
            "Destructive" examples) — a logout confirmation is exactly the
            "must be dismissed via an explicit button" case that prop's own
            doc comment calls out, not something to lose to a stray
            backdrop click.

            Header goes through the real `headerIcon`/`headerTitle` props
            (→ `ContainerHeader`, same as every other `Modal` consumer)
            instead of a hand-rolled row inside `children` — that's what
            gives the title the same `lyra-heading-md` treatment as the
            "Warning"/"Destructive" stories rather than a mismatched,
            manually-sized one. `headerBordered` is left at its default
            (false), same as those stories, and `headerActions` is left
            unset (no corner close button) — a logout confirmation should
            only be dismissed via Log Out/Cancel, not an incidental X.
            Footer buttons are right-aligned with Cancel first, matching
            `Modal.stories.tsx`'s own Warning/Destructive footer convention,
            not the left-aligned order from the original screenshot mock.
            Width is `w-[480px]`, the canonical "md" size those same two
            stories use (`Modal.stories.tsx`'s `widths.md`) — not an ad-hoc
            number. Icon is `h-5 w-5` (matching those stories' own
            `headerIcon` size) at `strokeWidth={1.4}`, CONTRIBUTING.md §5's
            documented default for a Lucide icon. */}
        <Modal
          open={logoutConfirmOpen}
          onClose={() => setLogoutConfirmOpen(false)}
          className="w-[480px]"
          headerIcon={<TriangleAlert className="h-5 w-5 text-lyra-status-critical-strong" strokeWidth={1.4} aria-hidden="true" />}
          headerTitle="Log out Confirmation"
        >
          <div className="flex flex-col gap-4 px-5">
            <p className="lyra-body-md font-semibold text-lyra-fg-default">
              Are you sure you want to log out?
            </p>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5 mt-6">
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setLogoutConfirmOpen(false);
                onLogOut?.();
              }}
            >
              Log Out
            </Button>
          </div>
        </Modal>
      </div>
    );
  }
);
AgentProfile.displayName = "AgentProfile";

export { AgentProfile };
