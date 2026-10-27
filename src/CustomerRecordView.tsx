import { useState } from "react";
import { Clock, FileText, Mail, MessageCircle, Pencil, Phone, X } from "lucide-react";
import {
  Accordion,
  ActionIconButton,
  Badge,
  Button,
  KebabMenuButton,
  Label,
  Separator,
  Tab,
  TabList,
  formatPhoneForDisplay,
} from "@nicecxone/lyra-ui";
import { CREATE_NEW_AGENTS } from "@nicecxone/lyra-ui/agents-data";
import { CREATE_NEW_CUSTOMERS } from "@nicecxone/lyra-ui/customers-data";

/* Trimmed local port of agent-next-gen-v3's customer record
   (agent-next-gen-customer-info-panel.tsx): the record header and the
   Overview tab — Customer Overview, Latest Interaction and Latest Note cards,
   with the same deterministic per-customer synthesized interaction/note data.
   Left out: Copilot / Contacts / Detail / Directory / Tasks / Notes /
   Accounts / Tickets tab bodies and in-place editing (need state this app
   doesn't have) — those tabs are shown but empty. */

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  balance: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** The customer whose phone matches the dialed number (any +1 prefix/format), or `null`. */
export function findCustomerByPhone(dialed: string): CustomerRecord | null {
  const wanted = digitsOnly(dialed).replace(/^1(?=\d{10}$)/, "");
  const c = CREATE_NEW_CUSTOMERS.find((r) => digitsOnly(r.firstPhone).replace(/^1(?=\d{10}$)/, "") === wanted);
  if (!c) return null;
  return {
    id: c.customerId,
    name: `${c.firstName} ${c.lastName}`,
    phone: c.firstPhone,
    email: c.emailAddress,
    balance: c.paymentBalance,
    address: c.address1,
    city: c.city,
    state: c.state,
    zipCode: c.postalCode,
  };
}

/** Record shown for a dialed number that isn't in the customer database. */
export function unknownCustomer(dialed: string): CustomerRecord {
  return {
    id: `NEW-${digitsOnly(dialed).slice(-4)}`,
    name: "Unknown Customer",
    phone: dialed,
    email: "",
    balance: "$0.00",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  };
}

const STATUS_POOL = [
  { status: "Resolved", variant: "success" },
  { status: "Escalated", variant: "critical" },
  { status: "Pending", variant: "warning" },
] as const;
const CHANNEL_POOL = ["Email", "Voice", "Chat", "SMS"];
const INTERACTION_TIME_POOL = ["3 days ago", "9 days ago", "2 weeks ago", "3 weeks ago", "1 month ago", "6 weeks ago"];
const SUMMARY_POOL = [
  "Asked about upgrading to the Pro tier for additional storage. Walked through the upgrade flow and confirmed the new billing amount.",
  "Reported trouble accessing the account after a password reset. Verified identity via KBA and confirmed access was restored.",
  "Requested a copy of the most recent invoice. Located the billing record and sent it over by email.",
  "Called in to update the account's mailing address. Confirmed the new address and applied the change.",
  "Flagged a recent charge that looked unfamiliar. Reviewed the transaction history and clarified the charge.",
  "Wanted to add an additional user seat to the plan. Walked through the add-seat flow and confirmed the updated price.",
];
const NOTE_TIME_POOL = ["1 day ago", "4 days ago", "1 week ago", "2 weeks ago", "1 month ago", "2 months ago"];
const NOTE_POOL = [
  "Customer prefers email follow-up over phone calls going forward.",
  "Flagged as a long-tenured account — check for loyalty offers before escalating.",
  "Prefers to be addressed by first name; mentioned this during last contact.",
  "Has a pending shipment; hold off on billing-related outreach until it arrives.",
  "Requested callback outside of standard business hours — see availability note on file.",
  "Previously disputed a charge that was resolved in the customer's favor; handle related questions with extra care.",
];

const ACCORDION_CLASSNAME =
  "rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle overflow-hidden h-fit";

const RECORD_TABS = ["Overview", "Contacts", "Detail", "Directory", "Tasks", "Notes", "Accounts", "Tickets"] as const;

export function CustomerRecordView({ customer, onClose }: { customer: CustomerRecord; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<(typeof RECORD_TABS)[number]>("Overview");

  const seed = hashSeed(`${customer.id}-latest-interaction`);
  const { status, variant } = STATUS_POOL[seed % STATUS_POOL.length];
  const interaction = {
    timeAgo: INTERACTION_TIME_POOL[Math.floor(seed / 7) % INTERACTION_TIME_POOL.length],
    channel: CHANNEL_POOL[Math.floor(seed / 3) % CHANNEL_POOL.length],
    summary: SUMMARY_POOL[Math.floor(seed / 11) % SUMMARY_POOL.length],
    caseId: `CASE-${40000 + (seed % 9000)}`,
    handledBy: CREATE_NEW_AGENTS[seed % CREATE_NEW_AGENTS.length]?.name ?? "Support Team",
  };
  const noteSeed = hashSeed(`${customer.id}-latest-note`);
  const note = {
    timeAgo: NOTE_TIME_POOL[noteSeed % NOTE_TIME_POOL.length],
    text: NOTE_POOL[Math.floor(noteSeed / 3) % NOTE_POOL.length],
    author: CREATE_NEW_AGENTS[Math.floor(noteSeed / 7) % CREATE_NEW_AGENTS.length]?.name ?? "Support Team",
  };

  const fields = [
    { label: "Phone #", value: formatPhoneForDisplay(customer.phone) },
    { label: "Contact #", value: customer.id },
    { label: "Email", value: customer.email },
    { label: "Balance", value: customer.balance },
    { label: "Address", value: customer.address },
    { label: "City", value: customer.city },
    { label: "State", value: customer.state },
    { label: "Zip Code", value: customer.zipCode },
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-4 pt-4">
        <div className="flex flex-col min-w-0">
          <span className="lyra-heading-md text-lyra-fg-default truncate">{customer.name}</span>
          <span className="lyra-body-sm text-lyra-fg-secondary">{customer.id}</span>
        </div>
        <div className="flex items-center gap-1">
          <KebabMenuButton
            ariaLabel="Customer actions"
            items={[{ id: "close", label: "Close record", onClick: onClose }]}
          />
          <ActionIconButton title="Close" onClick={onClose}>
            <X className="h-5 w-5" strokeWidth={1.5} />
          </ActionIconButton>
        </div>
      </div>

      <TabList className="px-2" overflowMenu>
        {RECORD_TABS.map((label) => (
          <Tab key={label} active={activeTab === label} onClick={() => setActiveTab(label)}>
            {label}
          </Tab>
        ))}
      </TabList>

      {activeTab === "Overview" && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <div className="lyra-card-split-wrap">
            <div className="lyra-card-split" style={{ gap: "1rem" }}>
              <Accordion
                className={`${ACCORDION_CLASSNAME} lyra-card-split-even h-auto`}
                defaultValue="customer-overview"
                items={[
                  {
                    id: "customer-overview",
                    title: "Customer Overview",
                    content: (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Button size="sm" className="gap-1.5">
                              <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                              Call
                            </Button>
                            <ActionIconButton title="Email">
                              <Mail className="h-4 w-4" strokeWidth={1.5} />
                            </ActionIconButton>
                            <ActionIconButton title="WhatsApp">
                              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                            </ActionIconButton>
                          </div>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            Edit
                          </Button>
                        </div>
                        {fields.map((field, index) => (
                          <div key={field.label} className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-4">
                              <Label label={field.label} className="flex-shrink-0" />
                              <span className="lyra-body-md text-lyra-fg-secondary break-words min-w-0">{field.value}</span>
                            </div>
                            {index < fields.length - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />

              <div className="flex flex-col gap-4 lyra-card-split-even">
                <Accordion
                  className={ACCORDION_CLASSNAME}
                  defaultValue="latest-interaction"
                  items={[
                    {
                      id: "latest-interaction",
                      title: "Latest Interaction",
                      content: (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
                              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                              {interaction.timeAgo} · {interaction.channel}
                            </span>
                            <span className="inline-flex items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
                              <Badge shape="circle" dot size="sm" variant={variant} aria-hidden="true" />
                              {status}
                            </span>
                          </div>
                          <p className="lyra-body-md text-lyra-fg-default">{interaction.summary}</p>
                          <span className="lyra-body-sm text-lyra-fg-secondary">
                            {interaction.caseId} · Handled by {interaction.handledBy}
                          </span>
                          <Button variant="outline" size="sm" className="self-start">
                            View All Contacts
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
                <Accordion
                  className={`${ACCORDION_CLASSNAME} flex-1 h-auto`}
                  defaultValue="latest-note"
                  items={[
                    {
                      id: "latest-note",
                      title: "Latest Note",
                      content: (
                        <div className="flex flex-col gap-3">
                          <span className="inline-flex items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                            {note.timeAgo}
                          </span>
                          <p className="lyra-body-md text-lyra-fg-default">{note.text}</p>
                          <span className="lyra-body-sm text-lyra-fg-secondary">By {note.author}</span>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
