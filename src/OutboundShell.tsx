import { useState, useCallback, useRef, useEffect, useId } from "react";
import {
  SidePanel,
  InteriorPanel,
  PageHeader,
  TreeMenu,
  cn,
  MAIN_CONTENT_ID,
} from "@nicecxone/lyra-ui";
import type { PageHeaderBreadcrumb, TreeMenuItem } from "@nicecxone/lyra-ui";

/* Local copy of lyra-ui's `AdminShell` (components/admin-shell.tsx) — identical
   except for the left nav panel's sizing, which the library shell doesn't
   expose: it opens at its 350px minimum, can't shrink below that, and can be dragged out
   to 75% of the window width.
   Re-sync with the library shell when `.lyra-ui-sync` moves. */
const LEFT_PANEL_MIN_WIDTH = 350;
const LEFT_PANEL_MAX_WIDTH_RATIO = 0.75;

/* ── Cookie helpers (left-panel pinned state only — mirrors the pattern
   already used by OutboundEngagementPage / DesktopDesignsPage) ── */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}
function readBoolCookie(name: string, fallback: boolean): boolean {
  const val = getCookie(name);
  if (val === "true") return true;
  if (val === "false") return false;
  return fallback;
}

export interface OutboundShellProps {
  /** Cookie key prefix for the left panel's pinned state, e.g. "lyra_outbound" or "lyra_panel". */
  storageKeyPrefix: string;
  /** Label shown in both side panels' header (e.g. "Outbound", "Designer"). */
  navTitle: string;
  /** Left nav tree items. */
  navItems?: TreeMenuItem[];
  /** Replaces the left panel's nav tree (and removes its pin toggle — the panel stays pinned). */
  leftPanelContent?: React.ReactNode;
  /** Hides the page header's left-panel toggle so the panel can't be closed (e.g. during a call). */
  lockLeftPanel?: boolean;
  /**
   * Forces the internal `TreeMenu` to fully remount when this value
   * changes (passed straight through as its `key`) — needed whenever
   * `navItems` can swap between entirely different datasets at the same
   * page (e.g. Monitor's "Call Centers" vs. "Service Groups" view
   * switcher, via `navHeaderBadge`). Without this, `TreeMenu`'s rows track
   * their own open/closed state via `useState(item.defaultOpen ?? false)`
   * initialized once per component instance — if the dataset changes but
   * `TreeMenu` itself doesn't remount, React's index-based reconciliation
   * reuses each row's existing instance (and its stale open state) for
   * whatever new item now lands at that same index, even though the new
   * item's own `defaultOpen` says otherwise. Omit when `navItems` is the
   * one fixed dataset every other `AdminShell` page has.
   */
  navKey?: React.Key;
  /**
   * Rendered inline immediately after `navTitle` in the left panel's own
   * header row (forwarded to `SidePanel`'s `headerTitleBadge`) — e.g. a
   * view-switcher trigger (a bare chevron opening a small `Select` of view
   * options) sitting right next to the nav title text, for a page whose
   * left tree can show more than one dataset (Outbound-Campaigns' Monitor
   * dashboard: "Call Centers" vs. "Service Groups"). Omit for the plain
   * title-only header every other `AdminShell` page uses.
   */
  navHeaderBadge?: React.ReactNode;
  /**
   * Forwarded to the left panel's `TreeMenu` — makes selection exact (no
   * parent-active cascade, any selected row at any depth gets the same
   * background pill) instead of the default cascading-parent-active
   * behavior every other `AdminShell` left nav uses. Off by default so
   * existing consumers are unaffected; only turn this on for a tree meant
   * to have exactly one selected row at a time, at any depth. See
   * `TreeMenu`'s own `exactSelection` doc comment (tree-menu.tsx).
   */
  navExactSelection?: boolean;
  /** Pinned state to fall back to before the cookie is read. */
  defaultLeftPinned?: boolean;

  /** Renders the PageHeader row. Off for the bare "Shell" template. */
  showPageHeader?: boolean;
  pageTitle?: string;
  /**
   * Caption shown below `pageTitle` (forwarded to `PageHeader`'s
   * `subtitle`) — e.g. the Monitor dashboard's "Call Centers"/"Service
   * Groups" category label under its static "Monitor" title. Omit for a
   * plain title with no caption, same as every other `AdminShell` page.
   */
  pageSubtitle?: string;
  pageBadge?: string;
  pageActions?: React.ReactNode;
  /**
   * Parent breadcrumb(s) shown before `pageTitle`, e.g. `{ label: "Forms",
   * onClick: goBackToList }` — passed straight through to PageHeader's own
   * `breadcrumb` prop (see page-header.tsx), which renders "ParentName /
   * Title" (or a full multi-crumb trail for an array). Omit for a plain
   * title with no trail, same as before this prop existed.
   */
  pageBreadcrumb?: PageHeaderBreadcrumb | PageHeaderBreadcrumb[];

  /**
   * Interior (in-content) detail panel. Left fully controlled by the
   * consumer since it's usually opened from inside `children` (e.g. a
   * TableToolbar button) rather than by the shell itself.
   */
  interiorPanelTitle?: string;
  interiorPanelOpen?: boolean;
  onInteriorPanelClose?: () => void;
  interiorPanelContent?: React.ReactNode;

  /** Right side panel content — mirrors the left nav panel. */
  rightPanelContent?: React.ReactNode;

  /** Main content, rendered below the PageHeader. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * AdminShell — shared page template for admin-style CRUD/config screens
 * (left nav-tree side panel, PageHeader, main content, interior detail
 * panel, right side panel). Extracted from the Outbound Engagement page;
 * also used by Agent Workspace Premium's Designer page and (per an
 * explicit "every new page should be in AdminShell" directive)
 * Outbound-Campaigns' Monitor dashboard.
 *
 * Every new page in a consuming app should render this rather than
 * hand-rolling its own root layout/side panel/page header — that already
 * happened once (Monitor dashboard originally built its own `SidePanel` +
 * `PageHeader` + pin/hover/narrow-container-guard wiring from scratch
 * instead of reaching for this), duplicating everything `AdminShell`
 * already owns. `navHeaderBadge`/`navExactSelection`/`pageSubtitle` exist
 * specifically because that migration needed them — check whether an
 * existing `AdminShellProps` field already covers what a new page needs
 * before reaching for a one-off layout.
 *
 * See Storybook: "Templates/Admin UIs".
 */
export function OutboundShell({
  storageKeyPrefix,
  navTitle,
  navItems = [],
  leftPanelContent,
  lockLeftPanel = false,
  navKey,
  navHeaderBadge,
  navExactSelection = false,
  defaultLeftPinned = false,
  showPageHeader = false,
  pageTitle,
  pageSubtitle,
  pageBadge,
  pageActions,
  pageBreadcrumb,
  interiorPanelTitle = "Details",
  interiorPanelOpen = false,
  onInteriorPanelClose,
  interiorPanelContent,
  rightPanelContent,
  children,
  className,
}: OutboundShellProps) {
  const pinCookieKey = `${storageKeyPrefix}_panel_pinned`;
  /* Tracks collapsed/expanded state *while pinned*, independent of the pin
     flag itself — without this, toggling the panel closed (still pinned)
     only lived in this mount's React state, so navigating to a page that
     remounts AdminShell (e.g. a list ↔ detail swap) re-derived
     `leftPanelOpen` from the pin cookie alone and snapped it back open. */
  const openCookieKey = `${storageKeyPrefix}_panel_open`;
  const mainRef = useRef<HTMLElement>(null);

  /* ── Container-width pin guard ──
     Measures this shell's own rendered width (not window.innerWidth) so
     pinning is correctly disabled any time the available space is narrow —
     whether that's a narrow browser window, a narrow Storybook canvas, or
     the content area having shrunk because something else (e.g. a docked
     AI panel) is eating width while the window itself stays wide. Mirrors
     the `isNarrowContainer` pattern used by the Agent Next Gen template. */
  const [containerWidth, setContainerWidth] = useState(9999);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    setContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isNarrowContainer = containerWidth < 1024;

  const [leftPanelMaxWidth, setLeftPanelMaxWidth] = useState(() =>
    Math.max(LEFT_PANEL_MIN_WIDTH, window.innerWidth * LEFT_PANEL_MAX_WIDTH_RATIO)
  );
  useEffect(() => {
    const onResize = () =>
      setLeftPanelMaxWidth(Math.max(LEFT_PANEL_MIN_WIDTH, window.innerWidth * LEFT_PANEL_MAX_WIDTH_RATIO));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Left side panel ── */
  const [leftPanelPinned, setLeftPanelPinned] = useState(() => (leftPanelContent !== undefined ? true : readBoolCookie(pinCookieKey, defaultLeftPinned)));
  const [leftPanelOpen, setLeftPanelOpen] = useState(() =>
    leftPanelContent !== undefined ? true : readBoolCookie(openCookieKey, readBoolCookie(pinCookieKey, defaultLeftPinned))
  );
  const effectiveLeftPinned = isNarrowContainer ? false : leftPanelPinned;
  const leftHoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Id of the left panel — `aria-controls` target of the header's toggle button, and what
  // the keyboard-open flow below focuses / looks the toggle up by.
  const leftPanelId = useId();
  // True while an UNPINNED (flyout) left panel was opened from the keyboard rather than by
  // hover — drives the focus-out / Escape close below.
  const leftKeyboardOpenRef = useRef(false);

  const handleLeftToggle = useCallback(() => {
    if (!effectiveLeftPinned) {
      // Keyboard / assistive-tech activation of the toggle while unpinned (a mouse click never
      // reaches here — see PageHeader). The flyout normally opens on hover only, which left
      // keyboard users with no way to open it. Toggle it, and on open move focus into the panel
      // (its region is focusable) so the next Tab enters its content — the panel sits before the
      // header in tab order, so otherwise focus would be left behind it.
      clearTimeout(leftHoverTimeout.current);
      const next = !leftPanelOpen;
      leftKeyboardOpenRef.current = next;
      setLeftPanelOpen(next);
      if (next) requestAnimationFrame(() => document.getElementById(leftPanelId)?.focus());
      return;
    }
    setLeftPanelOpen((v) => {
      const next = !v;
      setCookie(openCookieKey, String(next));
      return next;
    });
  }, [effectiveLeftPinned, openCookieKey, leftPanelOpen, leftPanelId]);

  // A keyboard-opened flyout has no mouse-leave to close it, so close it when focus moves out
  // of both the panel and its toggle, or on Escape (returning focus to the toggle if it was
  // inside the panel).
  useEffect(() => {
    if (!leftPanelOpen || effectiveLeftPinned || !leftKeyboardOpenRef.current) return;
    const panelEl = () => document.getElementById(leftPanelId);
    const toggleEl = () => document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(leftPanelId)}"]`);
    const close = () => {
      leftKeyboardOpenRef.current = false;
      setLeftPanelOpen(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Node | null;
      if (t && (panelEl()?.contains(t) || toggleEl()?.contains(t))) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // `defaultPrevented`: a Radix popover / menu inside the panel already consumed this Escape.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const focusWasInside = panelEl()?.contains(document.activeElement) ?? false;
      close();
      if (focusWasInside) toggleEl()?.focus();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [leftPanelOpen, effectiveLeftPinned, leftPanelId]);

  const handleLeftHoverStart = useCallback(() => {
    if (!effectiveLeftPinned) { clearTimeout(leftHoverTimeout.current); setLeftPanelOpen(true); }
  }, [effectiveLeftPinned]);

  const handleLeftHoverEnd = useCallback(() => {
    if (!effectiveLeftPinned) { leftHoverTimeout.current = setTimeout(() => setLeftPanelOpen(false), 300); }
  }, [effectiveLeftPinned]);

  const handleLeftPinToggle = useCallback(() => {
    setLeftPanelPinned((prev) => {
      const next = !prev;
      setCookie(pinCookieKey, String(next));
      setCookie(openCookieKey, String(next));
      setLeftPanelOpen(next);
      return next;
    });
  }, [pinCookieKey, openCookieKey]);

  /* ── Right side panel ── */
  const [rightSidePanelOpen, setRightSidePanelOpen] = useState(false);
  const [rightSidePanelPinned, setRightSidePanelPinned] = useState(false);
  const effectiveRightPinned = isNarrowContainer ? false : rightSidePanelPinned;
  const rightHoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleRightHoverStart = useCallback(() => {
    if (!effectiveRightPinned) { clearTimeout(rightHoverTimeout.current); setRightSidePanelOpen(true); }
  }, [effectiveRightPinned]);

  const handleRightHoverEnd = useCallback(() => {
    if (!effectiveRightPinned) { rightHoverTimeout.current = setTimeout(() => setRightSidePanelOpen(false), 300); }
  }, [effectiveRightPinned]);

  const handleRightPinToggle = useCallback(() => {
    setRightSidePanelPinned((prev) => { const next = !prev; setRightSidePanelOpen(next); return next; });
  }, []);

  // `effectiveLeftPinned`/`effectiveRightPinned` above already force the
  // rendered `pinned` prop to `false` below 1024px, but that alone isn't
  // enough: `leftPanelOpen`/`rightSidePanelOpen` are untouched by it, so a
  // panel that was open-and-pinned when the container crossed the
  // threshold would instantly become an open-and-FLOATING overlay sitting
  // on top of the content, rather than collapsing away and requiring a
  // deliberate hover to reveal it again.
  //
  // Deliberately does NOT reset `leftPanelPinned`/`rightSidePanelPinned`
  // themselves, though — only the rendered `open` state. `leftPanelPinned`
  // stays exactly as the user left it, so the moment the container widens
  // back out past 1024px, `effectiveLeftPinned` naturally reverts to it —
  // the panel automatically returns to open-and-pinned, no re-pin click
  // needed. Per "I wanted it to go behave like the storybook" — the
  // Storybook demo's own `SidePanelPinGuardDemo` never touches its
  // `pinned` state at all, only the derived-at-render `effectivePinned`,
  // which is what let it auto-restore; a prior pass here mistakenly
  // "fixed" this shell to instead PERMANENTLY clear the pin (matching what
  // turned out to be undesired behavior in the Agent Next Gen template),
  // which is now reversed.
  //
  // `skipFirstRun` guards the initial mount: `useEffect` fires once
  // immediately after the first render too, and without this guard, a page
  // that loads already wide with `leftPanelOpen` legitimately `false`
  // (i.e. the user had previously collapsed the panel while still pinned —
  // see `handleLeftToggle` above) would have that intentional collapsed
  // state clobbered back open by the `else` branch below, on every fresh
  // load. Only real narrow⇄wide TRANSITIONS after mount should touch it.
  const skipFirstRun = useRef(true);
  useEffect(() => {
    if (skipFirstRun.current) { skipFirstRun.current = false; return; }
    if (isNarrowContainer) {
      setLeftPanelOpen(false);
      setRightSidePanelOpen(false);
    } else {
      setLeftPanelOpen(leftPanelPinned);
      setRightSidePanelOpen(rightSidePanelPinned);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNarrowContainer]);

  return (
    <main ref={mainRef} className={cn("flex flex-1 overflow-hidden bg-lyra-bg-surface-base relative animate-in fade-in-0 duration-500", className)}>

      {/* ════ Left side panel ════
          z-[8] sits between the interior panel's z-[5] and the app-level
          icon LeftNav's z-10 chevron toggle / z-20 hover-open overlay
          (see left-nav.tsx): high enough that this panel still stacks above
          the interior detail panel when both are overlays at once, but low
          enough that it never covers the icon rail's own toggle affordance. */}
      <SidePanel
        side="left"
        open={leftPanelOpen}
        pinned={effectiveLeftPinned}
        headerTitle={navTitle}
        headerTitleBadge={navHeaderBadge}
        width={LEFT_PANEL_MIN_WIDTH}
        minWidth={LEFT_PANEL_MIN_WIDTH}
        maxWidth={leftPanelMaxWidth}
        onPinToggle={isNarrowContainer || leftPanelContent !== undefined ? undefined : handleLeftPinToggle}
        onMouseEnter={!effectiveLeftPinned ? handleLeftHoverStart : undefined}
        onMouseLeave={!effectiveLeftPinned ? handleLeftHoverEnd : undefined}
        id={leftPanelId}
        tabIndex={-1}
        className="z-[8] focus:outline-none"
      >
        {leftPanelContent ?? (
          <TreeMenu key={navKey} className="px-2" items={navItems} exactSelection={navExactSelection} />
        )}
      </SidePanel>

      {/* ════ Main content column ════ */}
      {/* `id` + `tabIndex={-1}` — the target of the left nav / side panel's "Skip to main content" link. */}
      <div id={MAIN_CONTENT_ID} tabIndex={-1} className="flex flex-col flex-1 min-h-0 overflow-hidden focus:outline-none">

        {/* ════ Page Header ════ */}
        {showPageHeader && (
          <PageHeader
            title={pageTitle ?? ""}
            subtitle={pageSubtitle}
            breadcrumb={pageBreadcrumb}
            panelToggle={lockLeftPanel ? undefined : "left"}
            badge={pageBadge}
            panelPinned={effectiveLeftPinned}
            panelOpen={leftPanelOpen}
            panelControlsId={leftPanelId}
            onPanelToggle={handleLeftToggle}
            onPanelHoverStart={!effectiveLeftPinned ? handleLeftHoverStart : undefined}
            onPanelHoverEnd={!effectiveLeftPinned ? handleLeftHoverEnd : undefined}
            onInnerPanelHoverStart={!effectiveRightPinned ? handleRightHoverStart : undefined}
            onInnerPanelHoverEnd={!effectiveRightPinned ? handleRightHoverEnd : undefined}
            actions={pageActions}
          />
        )}

        {/* ════ Interior panels row ════
            `relative` here (not just on the outer `<main>`) matters:
            `InteriorPanel` switches to `position: absolute; top: 0; height:
            100%` below 1024px of this row's width, and without a positioned
            ancestor of its own it anchors to `<main>` instead — which
            starts at the same top edge as the PageHeader, so the panel
            renders over the header instead of below it. Scoping the
            positioned ancestor to this row keeps it confined to the area
            below the PageHeader. */}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">

          {/* ════ Main content column ════ */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {children}
          </div>

          {/* Interior right panel — `storageKey` scoped by both
              `storageKeyPrefix` and `interiorPanelTitle` (not just the
              prefix alone): `FormsPage.tsx` and `FormDetailPage.tsx` share
              the same `storageKeyPrefix` on purpose (so the left panel's
              pin state stays consistent across both), but their interior
              panels are different panels ("Details" vs. "Settings") that
              need independently remembered widths, not one shared value. */}
          {interiorPanelContent !== undefined && (
            <InteriorPanel
              side="right"
              open={interiorPanelOpen}
              headerTitle={interiorPanelTitle}
              onClose={onInteriorPanelClose}
              storageKey={`${storageKeyPrefix}_interior_width_${interiorPanelTitle}`}
            >
              {interiorPanelContent}
            </InteriorPanel>
          )}

        </div>
      </div>

      {/* ════ Right side panel ════ */}
      {rightPanelContent !== undefined && (
        <SidePanel
          side="right"
          open={rightSidePanelOpen}
          pinned={effectiveRightPinned}
          headerTitle={navTitle}
          onPinToggle={isNarrowContainer ? undefined : handleRightPinToggle}
          onMouseEnter={!effectiveRightPinned ? handleRightHoverStart : undefined}
          onMouseLeave={!effectiveRightPinned ? handleRightHoverEnd : undefined}
        >
          {rightPanelContent}
        </SidePanel>
      )}

    </main>
  );
}
