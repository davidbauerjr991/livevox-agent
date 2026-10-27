/* Admin UI "With Page Header" template — composed from real @nicecxone/lyra-ui
   components (mirrors lyra-ui's AdminShell.stories.tsx `WithPageHeader`).
   Edit freely; follow ../lyra-ui/CLAUDE.md and CONTRIBUTING.md for any UI. */
import { useState, useRef, useEffect } from "react";
import type React from "react";
import {
  Plus,
  Gauge,
  Settings,
  BarChart3,
  CircleHelp,
  Bell,
  PanelRight,
} from "lucide-react";
import {
  AdminShell,
  Button,
  AiIcon,
  AppHeader,
  AppNameMenu,
  CXoneLogo,
  LeftNav,
  ContentArea,
  Container,
  ActionIconButton,
  ProfileMenu,
  defaultProfileMenuGroups,
  DashboardIcon,
  AiPanel,
} from "@nicecxone/lyra-ui";
import type {
  DraggableVariant,
  AppMenuGroup,
  NavItem,
  AiPanelSuggestion,
  TreeMenuItem,
} from "@nicecxone/lyra-ui";
import appIcon from "./assets/app-icon.svg";

/* ── Sample nav data (mirrors Outbound Engagement) ── */
const PANEL_ITEMS: TreeMenuItem[] = [
  { label: "Campaigns", active: true },
  { label: "Contact Lists" },
  { label: "Do Not Call" },
  { label: "Call Results" },
  { label: "Scripts" },
  { label: "Schedules" },
  { label: "Reports" },
  { label: "Settings" },
];

/* ── Sample left icon rail — same "Outbound Engagement Left Nav" set as
   LeftNav.stories.tsx (Monitor/Configure/Review, Monitor active), since
   this demo chrome's AppHeader already says "Outbound Engagement" too. ── */
const NAV_ITEMS: NavItem[] = [
  { icon: <Gauge className="h-4 w-4" strokeWidth={1.5} />, label: "Monitor", active: true },
  { icon: <Settings className="h-4 w-4" strokeWidth={1.5} />, label: "Configure" },
  { icon: <BarChart3 className="h-4 w-4" strokeWidth={1.5} />, label: "Review" },
];

/* ── App menu — same page-switcher content as lyra-ux-templates'
   Header.tsx (Agent Next Gen / Agent Workspace Premium / Outbound
   Engagement), with "Outbound Engagement" active since that's what this
   demo's AppHeader displays. Click-to-open wiring comes from the shared
   `AppNameMenu` component (app-name-menu.tsx) — only these group fixtures
   are duplicated locally, since story files don't import from one
   another. ── */
const APP_MENU_GROUPS: AppMenuGroup[] = [
  {
    items: [
      { label: "Agent Next Gen" },
      { label: "Agent Workspace Premium" },
      { label: "Outbound Engagement", active: true },
    ],
  },
];

function AppNameWithMenu({ name }: { name: string }) {
  return (
    <AppNameMenu
      icon={<img src={appIcon} alt="" className="h-6 w-6" />}
      name={name}
      groups={APP_MENU_GROUPS}
      menuFooter={<CXoneLogo />}
    />
  );
}

const HEADER_ACTIONS = (
  <>
    <ActionIconButton size="xl" title="Help">
      <CircleHelp className="h-5 w-5" strokeWidth={1.5} />
    </ActionIconButton>
    <ActionIconButton size="xl" title="Dashboards">
      <DashboardIcon className="text-lyra-fg-default" />
    </ActionIconButton>
    <ActionIconButton size="xl" title="Notifications" badge={4}>
      <Bell className="h-5 w-5" strokeWidth={1.5} />
    </ActionIconButton>
    <ProfileMenu
      initials="JS"
      avatarColor="#5d6a79"
      groups={defaultProfileMenuGroups}
      showThemeToggle
      className="ml-1"
    />
  </>
);

const AI_PANEL_DEFAULT_WIDTH = 360;
const AI_SUGGESTIONS: AiPanelSuggestion[] = [
  { id: "1", label: "Summarise this campaign's performance" },
  { id: "2", label: "Draft a follow-up call script" },
  { id: "3", label: "What changed since yesterday?" },
];

/**
 * Page chrome (top AppHeader + icon LeftNav + ContentArea/Container), plus a fully wired "Ask AI" panel using
 * the same docking/undocking + resize behavior as the Agent Next Gen
 * template (see AgentNextGenTemplate.stories.tsx) — draggable float mode by
 * default, dockable into the layout, resizable while docked.
 *
 * This demo only ever wires up ONE Draggable panel — for a demo with
 * MULTIPLE Draggable panels sharing a single dock slot under an AppHeader
 * (the same shape of problem as this file's AI panel + Agent Next Gen's
 * Notifications panel, but in an isolated, controllable Storybook sandbox),
 * see Draggable.stories.tsx's `MultiplePanelsSingleDock` story and its
 * "App Header" control.
 */
function AppChrome({ children }: { children: (onAskAi: () => void) => React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  type PanelState = "closed" | "open" | "closing";

  const [aiPanelOpen,  setAiPanelOpen]  = useState(false);
  const [aiMounted,    setAiMounted]    = useState(false);
  const [aiState,      setAiState]      = useState<PanelState>("closed");
  const [aiVariant,    setAiVariant]    = useState<DraggableVariant>("docked");
  const [aiWidth,      setAiWidth]      = useState(AI_PANEL_DEFAULT_WIDTH);
  const [aiHeight,     setAiHeight]     = useState(860);
  const [aiIsResizing, setAiIsResizing] = useState(false);
  const aiFloatLeft = useRef<number | null>(null);
  const aiFloatTop  = useRef<number | null>(null);
  const aiPanelRef  = useRef<HTMLDivElement>(null);
  const aiAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const MAX_PANEL_HEIGHT = 860;
  const BOTTOM_PADDING   = 8;

  const computePanelHeight = () => {
    if (!containerRef.current) return MAX_PANEL_HEIGHT;
    const top = containerRef.current.getBoundingClientRect().top;
    return Math.min(window.innerHeight - top - BOTTOM_PADDING, MAX_PANEL_HEIGHT);
  };

  useEffect(() => {
    clearTimeout(aiAnimTimer.current);
    if (aiPanelOpen) {
      if (containerRef.current && aiFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16;
      }
      setAiHeight(computePanelHeight());
      setAiMounted(true);
      setAiState("open");
    } else {
      setAiState("closing");
      aiAnimTimer.current = setTimeout(() => setAiState("closed"), 150);
    }
    return () => clearTimeout(aiAnimTimer.current);
  }, [aiPanelOpen]);

  useEffect(() => {
    if (!aiPanelOpen) return;
    const onResize = () => setAiHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aiPanelOpen]);

  const handleAiVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && aiPanelRef.current) {
      const r = aiPanelRef.current.getBoundingClientRect();
      aiFloatLeft.current = r.left;
      aiFloatTop.current  = r.top;
    }
    setAiVariant(v);
  };

  const getAiFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = aiFloatLeft.current !== null
      ? aiFloatLeft.current
      : containerRef.current
        ? (rect?.left ?? 0) + containerRef.current.offsetWidth - aiWidth - 16
        : 0;
    const top = aiFloatTop.current !== null ? aiFloatTop.current : (rect?.top ?? 0);
    return { position: "fixed", top, left, zIndex: 9999 };
  };

  const aiPanel = aiMounted ? (
    <AiPanel
      ref={aiPanelRef}
      draggable
      draggableVariant={aiVariant}
      defaultDraggableWidth={aiWidth}
      defaultDraggableHeight={aiHeight}
      onVariantChange={handleAiVariantChange}
      onWidthChange={setAiWidth}
      onResizeStateChange={setAiIsResizing}
      userName="John"
      suggestions={AI_SUGGESTIONS}
      onClose={() => setAiPanelOpen(false)}
      className={aiVariant === "docked" ? "h-full" : undefined}
    />
  ) : null;

  return (
    /* Shell background must sit on this ROOT div (matching AgentNextGen-
       Template's root) so it extends behind the AppHeader — AppHeader itself
       is transparent, and only Storybook's preview.ts body-background sync
       makes a bg-less root look correct inside Storybook. Standalone builds
       (e.g. prototype exports) have no such decorator. */
    <div className="flex h-screen flex-col overflow-hidden bg-lyra-bg-surface-shell">
      <AppHeader
        appName={<AppNameWithMenu name="Outbound Engagement Agent" />}
        actions={HEADER_ACTIONS}
      />
      <div className="flex flex-1 overflow-hidden bg-lyra-bg-surface-shell">
        <LeftNav items={NAV_ITEMS} open={navOpen} onToggle={() => setNavOpen((v) => !v)} />

        <ContentArea ref={containerRef} className="relative min-w-0">
          <Container className="relative flex flex-1 overflow-hidden">
            {children(() => setAiPanelOpen((v) => !v))}
          </Container>

          {/* AI panel — float (fixed position, doesn't take layout space).
              No inner `pointerEvents:"auto"` wrapper div here: `Draggable`'s
              own root already sets `pointer-events:auto` on itself and
              moves with the drag's CSS `transform`, so an ancestor wrapper
              gains nothing and is actively harmful — an ancestor's layout
              box does NOT follow a descendant's transform, so after
              dragging the panel away from its start position, a stray
              wrapper like this is left behind as an invisible "ghost" hit
              area at the panel's ORIGINAL position, silently swallowing
              clicks meant for whatever real UI sits there instead (this
              bug has recurred at least 3 times across consumer apps that
              copied this story as a reference — see `draggable.tsx`'s own
              `onInteract` prop doc comment, and lyra-form-generator's/
              lyra-ux-templates'/Outbound-Campaigns' `App.tsx` fixes). This
              div now exists purely to hold the fade/slide open-close
              animation styles, with `pointerEvents:"none"` so it never
              itself intercepts anything. */}
          {aiVariant === "float" && aiMounted && (
            <div
              style={{
                ...getAiFloatStyle(),
                pointerEvents: "none",
                visibility: aiState === "closed" ? "hidden" : "visible",
                opacity: aiState === "open" ? 1 : 0,
                transform: aiState === "open" ? "translateY(0)" : "translateY(-8px)",
                transition: aiState === "open"
                  ? "opacity 150ms ease, transform 150ms ease"
                  : "opacity 100ms ease, transform 100ms ease",
              }}
            >
              {aiPanel}
            </div>
          )}
        </ContentArea>

        {/* AI panel — docked (sibling of the content column so flex layout keeps it in-bounds) */}
        {aiVariant === "docked" && (
          <div className="pb-3" style={{
            width: aiState === "open" ? aiWidth : 0,
            marginRight: aiState === "open" ? 12 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: aiIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div
              className="h-full animate-in fade-in-0 duration-150"
              style={{ width: aiWidth, display: aiState === "open" ? "block" : "none" }}
            >
              {aiPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [interiorPanelOpen, setInteriorPanelOpen] = useState(false);

  return (
    <AppChrome>
      {(onAskAi) => (
        <AdminShell
          storageKeyPrefix="livevox_agent"
          navTitle="Outbound"
          navItems={PANEL_ITEMS}
          defaultLeftPinned
          showPageHeader
          pageTitle="Campaigns"
          pageActions={
            <>
              <Button variant="outline">Secondary</Button>
              <Button>
                <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} />
                New Campaign
              </Button>
              <div className="mx-1 h-6 w-px bg-lyra-border-subtle" />
              <Button variant="outline" onClick={onAskAi}>
                <AiIcon className="h-4 w-4" />
                Ask AI
              </Button>
              <ActionIconButton
                title="Toggle details panel"
                onClick={() => setInteriorPanelOpen((v) => !v)}
              >
                <PanelRight className="h-5 w-5" strokeWidth={1.5} />
              </ActionIconButton>
            </>
          }
          interiorPanelOpen={interiorPanelOpen}
          onInteriorPanelClose={() => setInteriorPanelOpen(false)}
          interiorPanelContent={
            <div className="p-4">
              <p className="lyra-body-md text-lyra-fg-secondary">Panel content goes here.</p>
            </div>
          }
          rightPanelContent={
            <div className="p-4">
              <p className="lyra-body-md text-lyra-fg-secondary">Side panel content.</p>
            </div>
          }
        >
          <div className="flex-1" />
        </AdminShell>
      )}
    </AppChrome>
  );
}

