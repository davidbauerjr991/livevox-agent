/* Admin UI "With Page Header" template — composed from real @nicecxone/lyra-ui
   components (mirrors lyra-ui's AdminShell.stories.tsx `WithPageHeader`).
   Edit freely; follow ../lyra-ui/CLAUDE.md and CONTRIBUTING.md for any UI. */
import { useState, useRef, useEffect } from "react";
import type React from "react";
import {
  Plus,
  Phone,
  PhoneForwarded,
  MessageSquare,
  Inbox,
} from "lucide-react";
import {
  Button,
  SearchInput,
  AppHeader,
  Separator,
  LeftNav,
  ContentArea,
  Container,
  AiPanel,
} from "@nicecxone/lyra-ui";
import type {
  DraggableVariant,
  NavItem,
  AiPanelSuggestion,
  MenuEntry,
} from "@nicecxone/lyra-ui";
import { AgentProfile } from "./AgentProfileWithMenu";
import type { AgentStatus as AgentStatusValue } from "./AgentProfileWithMenu";
import { CustomersView } from "./CustomersView";
import { findCustomerByPhone, unknownCustomer } from "./CustomerRecordView";
import type { CustomerRecord } from "./CustomerRecordView";
import { InboxPanel } from "./InboxPanel";
import { TOTAL_UNREAD } from "./InboxPanel";
import type { InboxView } from "./InboxPanel";
import { ChatPanel } from "./ChatPanel";
import { CallPanel } from "./CallPanel";
import { DialPad } from "./DialPad";
import { OutboundShell } from "./OutboundShell";
import appIcon from "./assets/app-icon.svg";

/* ── Left icon rail — Voice / Direct / Chat / Inbox. Rendered collapsed, so
   only the icons show; the labels remain as accessible names. ── */
const NAV_SECTIONS = ["Voice", "Direct", "Chat", "Inbox"] as const;
type NavSection = (typeof NAV_SECTIONS)[number];

const NAV_ICONS: Record<NavSection, React.ReactNode> = {
  Voice: <Phone className="h-4 w-4" strokeWidth={1.5} />,
  Direct: <PhoneForwarded className="h-4 w-4" strokeWidth={1.5} />,
  Chat: <MessageSquare className="h-4 w-4" strokeWidth={1.5} />,
  Inbox: <Inbox className="h-4 w-4" strokeWidth={1.5} />,
};

const buildNavItems = (active: NavSection, onSelect: (s: NavSection) => void): NavItem[] =>
  NAV_SECTIONS.map((label) => ({
    icon: NAV_ICONS[label],
    label,
    active: label === active,
    badge: label === "Inbox" ? TOTAL_UNREAD : undefined,
    onClick: () => onSelect(label),
  }));

/* ── App name — static (no dropdown): icon + name, a divider, and a two-line
   environment/service copy block. ── */
function AppNameBlock() {
  return (
    <div className="flex items-center gap-4 p-2">
      <img src={appIcon} alt="" className="h-6 w-6 flex-shrink-0" />
      <span className="lyra-body-lg text-lyra-fg-default">
        <span className="lyra-body-lg-emphasis">Outbound Engagement</span> Agent
      </span>
      <Separator orientation="vertical" className="h-8" />
      <div className="flex flex-col">
        <span className="lyra-body-lg text-lyra-fg-default">QAE_SGC_AUTO_27_STG4</span>
        <span className="lyra-body-xs text-lyra-fg-secondary">AGENTUI_PREVIEW_SERVICE</span>
      </div>
    </div>
  );
}

const SERVICES = [
  "Cloud IVR Service (DO NOT MODIFY)",
  "Commercial Card Manual",
  "Customer Care (DO NOT CHANGE)",
  "Customer Care Digital Agent",
  "Customer Care Extended Panel",
  "Customer Care Knowledge Worker",
  "D Manual",
  "IB_SMS_Fallback_48693",
  "International_Manual",
  "JD_SINCH_TEST",
];

const PROFILE_MENU_ITEMS: MenuEntry[] = [
  { id: "change-password", label: "Change Password" },
  {
    id: "change-service",
    label: "Change Service",
    submenu: [
      ...SERVICES.map((label): MenuEntry => ({ id: label, label })),
      { id: "show-more", label: "Show more…" },
    ],
  },
  { id: "settings", label: "Settings" },
];

/* Agent status + elapsed-time-in-status, shown beside the avatar. The timer
   restarts whenever the status changes. */
function formatElapsed(totalSeconds: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
}

function AgentStatus() {
  const [status, setStatus] = useState<AgentStatusValue>("available");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  return (
    <AgentProfile
      name="John Smith"
      initials="JS"
      status={status}
      onStatusChange={setStatus}
      timer={formatElapsed(seconds)}
      hideAgentLeg
      hideConnectedApps
      profileMenuItems={PROFILE_MENU_ITEMS}
    />
  );
}

const HEADER_ACTIONS = (
  <>
    <span className="lyra-body-md mx-2 whitespace-nowrap text-lyra-fg-default">
      CIP: 0 | HOLD: 0 | REM: 0
    </span>
    <Separator orientation="vertical" className="mx-2 h-8" />
    <AgentStatus />
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
function AppChrome({ navItems, children }: { navItems: NavItem[]; children: (onAskAi: () => void) => React.ReactNode }) {
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
        appName={<AppNameBlock />}
        actions={HEADER_ACTIONS}
      />
      <div className="flex flex-1 overflow-hidden bg-lyra-bg-surface-shell">
        <LeftNav items={navItems} open={false} collapsible={false} />

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
  const [dbSearch, setDbSearch] = useState("");
  const [openCustomers, setOpenCustomers] = useState<CustomerRecord[]>([]);
  const [activeTab, setActiveTab] = useState("Customers");
  const [inboxView, setInboxView] = useState<InboxView>({ boxId: null, messageId: null });
  const [activeNav, setActiveNav] = useState<NavSection>("Voice");
  const [activeCall, setActiveCall] = useState<{ number: string; accountNumber: string; customer: CustomerRecord | null } | null>(null);

  // The call controls own the side panel for the length of a call, so the rail can't navigate away.
  const section: NavSection = activeCall ? "Voice" : activeNav;
  const navItems = buildNavItems(section, (s) => { if (!activeCall) setActiveNav(s); });

  // Dialing opens the matching customer's record in its own tab (or focuses it if already open).
  const handleDial = (number: string, accountNumber: string) => {
    const match = findCustomerByPhone(number);
    setActiveCall({ number, accountNumber, customer: match });
    const customer = match ?? unknownCustomer(number);
    setOpenCustomers((prev) => (prev.some((c) => c.id === customer.id) ? prev : [...prev, customer]));
    setActiveTab(customer.id);
  };

  const handleCloseCustomer = (id: string) => {
    setOpenCustomers((prev) => prev.filter((c) => c.id !== id));
    setActiveTab((current) => (current === id ? "Customers" : current));
  };

  return (
    <AppChrome navItems={navItems}>
      {() => (
        <OutboundShell
          storageKeyPrefix="livevox_agent"
          // No title while a call is live — that hides the panel header so the call controls sit at the very top.
          // Inbox drill-down levels draw their own back-arrow header, so the panel header is hidden there too.
          navTitle={activeCall || (section === "Inbox" && inboxView.boxId) ? "" : section}
          lockLeftPanel={activeCall !== null}
          leftPanelContent={
            <div key={`${section}-${inboxView.boxId}-${inboxView.messageId}`} className="h-full animate-in fade-in-0 duration-200">
              {activeCall ? (
                <CallPanel number={activeCall.number} accountNumber={activeCall.accountNumber} customer={activeCall.customer} onEndCall={() => setActiveCall(null)} />
              ) : section === "Voice" ? (
                <DialPad onDial={handleDial} />
              ) : section === "Chat" ? (
                <ChatPanel />
              ) : section === "Inbox" ? (
                <InboxPanel view={inboxView} onViewChange={setInboxView} />
              ) : null}
            </div>
          }
          defaultLeftPinned
          showPageHeader
          pageTitle="Agent Workspace"
          pageActions={
            <>
              <SearchInput
                className="w-80"
                placeholder="Search Customers, Accounts, Tickets"
                aria-label="Search Customers, Accounts, Tickets"
                value={dbSearch}
                onValueChange={setDbSearch}
              />
              <Button>
                <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} />
                New
              </Button>
            </>
          }
          rightPanelContent={
            <div className="p-4">
              <p className="lyra-body-md text-lyra-fg-secondary">Side panel content.</p>
            </div>
          }
        >
          <CustomersView
            openCustomers={openCustomers}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            onCloseCustomer={handleCloseCustomer}
          />
        </OutboundShell>
      )}
    </AppChrome>
  );
}

