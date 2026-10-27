import { useState } from "react";
import {
  AlarmClock,
  ArrowLeftRight,
  CircleDot,
  CreditCard,
  FileText,
  Grid3x3,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Plus,
  Receipt,
  User,
  Volume2,
  Wifi,
} from "lucide-react";
import {
  Accordion,
  ActionIconButton,
  Avatar,
  Button,
  Label,
  MenuItem,
  SearchInput,
  formatPhoneForDisplay,
} from "@nicecxone/lyra-ui";
import type { CustomerRecord } from "./CustomerRecordView";

/* Active-call panel for the left side panel (replaces the dial pad while a
   call is live): contact header, Transfer / Hold / End Call, a call-tools
   row, Contact Details, Disposition Call, and a bottom tool row. Composed
   from Lyra's Avatar, Button (default / warning / destructive), ActionIconButton,
   Label, SearchInput and Accordion. Transfer, the tool buttons and the
   disposition rows are placeholders — there's no telephony behind them. */

const DISPOSITION_GROUPS = ["DNC", "CHAT", "SMS", "RPC", "PTP", "CHAT RPC"];
const RECENT_DISPOSITIONS = ["Payment Made", "sms222"];

const formatClock = (d: Date) =>
  [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");

export function CallPanel({
  number,
  accountNumber,
  customer,
  onEndCall,
}: {
  number: string;
  accountNumber: string;
  customer: CustomerRecord | null;
  onEndCall: () => void;
}) {
  const [onHold, setOnHold] = useState(false);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(true);
  const [startTime] = useState(() => formatClock(new Date()));
  const [dispositionSearch, setDispositionSearch] = useState("");

  const [firstName = "--", ...rest] = (customer?.name ?? "").split(" ").filter(Boolean);
  const lastName = rest.join(" ") || "--";
  const phone = formatPhoneForDisplay(customer?.phone ?? number);

  const fields = [
    { label: "First Name", value: customer ? firstName : "--" },
    { label: "Last Name", value: customer ? lastName : "--" },
    { label: "Account Number", value: accountNumber || customer?.id || "--" },
    { label: "Phone Number", value: phone },
    { label: "Call Start Time", value: startTime },
    { label: "Call Type", value: "Outbound" },
  ];

  const matches = (label: string) => label.toLowerCase().includes(dispositionSearch.trim().toLowerCase());
  const recent = RECENT_DISPOSITIONS.filter(matches);
  const groups = DISPOSITION_GROUPS.filter(matches);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Call controls — fixed at the top; only the content below scrolls. */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 pb-3">
          <Avatar icon={User} />
          <div className="flex flex-col min-w-0">
            <span className="lyra-body-lg text-lyra-fg-default truncate">{customer?.name ?? "Unknown"}</span>
            <span className="lyra-body-sm text-lyra-fg-secondary">{phone}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button className="gap-1.5 px-2">
            <ArrowLeftRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Transfer
          </Button>
          <Button variant="warning" className="gap-1.5 px-2" onClick={() => setOnHold((v) => !v)}>
            <PhoneCall className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {onHold ? "Resume" : "Hold"}
          </Button>
          <Button variant="destructive" className="gap-1.5 px-2" onClick={onEndCall}>
            <PhoneOff className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            End Call
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lyra-sm bg-lyra-bg-control-subtle px-4 py-1">
          <ActionIconButton title={recording ? "Stop recording" : "Start recording"} onClick={() => setRecording((v) => !v)}>
            <CircleDot
              className={recording ? "h-5 w-5 text-lyra-status-critical-strong" : "h-5 w-5"}
              strokeWidth={1.5}
            />
          </ActionIconButton>
          <ActionIconButton title={muted ? "Unmute" : "Mute"} onClick={() => setMuted((v) => !v)}>
            {muted ? <MicOff className="h-5 w-5" strokeWidth={1.5} /> : <Mic className="h-5 w-5" strokeWidth={1.5} />}
          </ActionIconButton>
          <ActionIconButton title="Volume">
            <Volume2 className="h-5 w-5" strokeWidth={1.5} />
          </ActionIconButton>
          <ActionIconButton title="Connection: good">
            <Wifi className="h-5 w-5 text-lyra-status-success-strong" strokeWidth={1.5} />
          </ActionIconButton>
          <ActionIconButton title="Keypad">
            <Grid3x3 className="h-5 w-5" strokeWidth={1.5} />
          </ActionIconButton>
        </div>

      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        <h3 className="lyra-heading-sm mt-2 mb-2 text-lyra-fg-default">Contact Details</h3>
        <div className="rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
                <Label label={f.label} />
                <span className="lyra-body-md text-lyra-fg-default break-words">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center border-t border-lyra-border-subtle pt-2">
            <Button variant="ghost" size="sm" className="gap-1.5">
              Expand Details
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <h3 className="lyra-heading-sm mt-4 mb-2 text-lyra-fg-default">Disposition Call</h3>
        <SearchInput
          placeholder="Search for a disposition"
          aria-label="Search for a disposition"
          value={dispositionSearch}
          onValueChange={setDispositionSearch}
        />
        <Accordion
          className="mt-3"
          defaultValue="recent"
          items={[
            ...(recent.length > 0
              ? [
                  {
                    id: "recent",
                    title: "Recent",
                    contentClassName: "p-0",
                    content: (
                      <div className="flex flex-col">
                        {recent.map((label) => (
                          <MenuItem key={label} label={label} divider={false} />
                        ))}
                      </div>
                    ),
                  },
                ]
              : []),
            ...groups.map((label) => ({
              id: label,
              title: label,
              content: <p className="lyra-body-sm text-lyra-fg-secondary">No dispositions in this group yet.</p>,
            })),
          ]}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-lyra-border-subtle px-6 py-1">
        <ActionIconButton title="Notes"><FileText className="h-5 w-5" strokeWidth={1.5} /></ActionIconButton>
        <ActionIconButton title="Schedule callback"><AlarmClock className="h-5 w-5" strokeWidth={1.5} /></ActionIconButton>
        <ActionIconButton title="Payments"><CreditCard className="h-5 w-5" strokeWidth={1.5} /></ActionIconButton>
        <ActionIconButton title="Receipts"><Receipt className="h-5 w-5" strokeWidth={1.5} /></ActionIconButton>
      </div>
    </div>
  );
}
