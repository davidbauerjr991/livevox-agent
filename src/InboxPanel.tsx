import { useEffect, useState } from "react";
import { Check, Download, Pause, Play, Volume1, Volume2, Voicemail } from "lucide-react";
import {
  Accordion,
  ActionIconButton,
  Avatar,
  Badge,
  ContainerHeader,
  Label,
  MenuItem,
  SearchInput,
  Slider,
} from "@nicecxone/lyra-ui";

/* Inbox side panel — three drill-down levels (all inside the one panel):
   1. voicemail boxes   2. a box's messages   3. one message with its player.
   Voicemail data and playback are placeholders (no audio behind the player). */

interface VoicemailMessage {
  id: string;
  number: string;
  received: string;
  unread?: boolean;
}

interface VoicemailBox {
  id: string;
  name: string;
  messages: VoicemailMessage[];
}

const BOXES: VoicemailBox[] = [
  { id: "cc", name: "Customer Care (DO NOT CHANGE)", messages: [] },
  { id: "ibcc", name: "IB Customer Care 8774910769", messages: [] },
  {
    id: "jared",
    name: "Jared_IB_7707463074",
    messages: [
      { id: "m1", number: "(770) 369-0725", received: "10/16/2026 16:17", unread: true },
      { id: "m2", number: "(770) 891-6782", received: "09/21/2026 13:59" },
    ],
  },
];

/** Sum of every box's unread count — drives the Inbox rail icon's badge. */
export const TOTAL_UNREAD = BOXES.reduce((sum, b) => sum + b.messages.filter((m) => m.unread).length, 0);

export interface InboxView {
  boxId: string | null;
  messageId: string | null;
}

const PLAYBACK_SECONDS = 30;

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label label="Type to search" />
      <SearchInput aria-label="Type to search" value={value} onValueChange={onChange} />
    </div>
  );
}

function MessagePlayer({ message }: { message: VoicemailMessage }) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPosition((p) => {
        if (p >= PLAYBACK_SECONDS) {
          setPlaying(false);
          return 0;
        }
        return p + 0.25;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-lyra-border-subtle px-4 py-3">
        <div className="flex flex-col">
          <span className="lyra-body-lg text-lyra-fg-default">{message.number}</span>
          <span className="lyra-body-sm text-lyra-fg-secondary">{message.received}</span>
        </div>
        <Check className="h-5 w-5 text-lyra-fg-secondary" strokeWidth={1.5} aria-label="Listened" />
      </div>
      <div className="flex flex-col gap-6 px-4 py-6">
        <Slider
          label="Playback position"
          className="[&>label]:sr-only"
          showTicks={false}
          min={0}
          max={PLAYBACK_SECONDS}
          step={0.25}
          value={position}
          onChange={setPosition}
        />
        <div className="flex items-center justify-between gap-2">
          <ActionIconButton title={playing ? "Pause" : "Play"} onClick={() => setPlaying((v) => !v)}>
            {playing ? <Pause className="h-5 w-5" strokeWidth={1.5} /> : <Play className="h-5 w-5" strokeWidth={1.5} />}
          </ActionIconButton>
          <div className="flex min-w-0 items-center gap-2">
            <ActionIconButton title="Download">
              <Download className="h-5 w-5" strokeWidth={1.5} />
            </ActionIconButton>
            <Volume1 className="h-5 w-5 shrink-0 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
            <Slider
              label="Volume"
              className="w-28 [&>label]:sr-only"
              showTicks={false}
              min={0}
              max={100}
              value={volume}
              onChange={setVolume}
            />
            <Volume2 className="h-5 w-5 shrink-0 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InboxPanel({ view, onViewChange }: { view: InboxView; onViewChange: (view: InboxView) => void }) {
  const [search, setSearch] = useState("");
  const box = BOXES.find((b) => b.id === view.boxId) ?? null;
  const message = box?.messages.find((m) => m.id === view.messageId) ?? null;
  const q = search.trim().toLowerCase();

  if (box && message) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ContainerHeader title={box.name} onBack={() => onViewChange({ boxId: box.id, messageId: null })} />
        <MessagePlayer key={message.id} message={message} />
      </div>
    );
  }

  if (box) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ContainerHeader
          title={box.name}
          onBack={() => {
            setSearch("");
            onViewChange({ boxId: null, messageId: null });
          }}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-4">
          <SearchField value={search} onChange={setSearch} />
          <div className="flex flex-col rounded-lyra-sm border border-lyra-border-subtle bg-lyra-bg-control">
            {box.messages
              .filter((m) => !q || `${m.number} ${m.received}`.toLowerCase().includes(q))
              .map((m) => (
                <MenuItem
                  key={m.id}
                  label={m.number}
                  description={m.received}
                  active={m.unread}
                  onClick={() => onViewChange({ boxId: box.id, messageId: m.id })}
                />
              ))}
          </div>
        </div>
      </div>
    );
  }

  const boxes = BOXES.filter((b) => !q || b.name.toLowerCase().includes(q));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <SearchField value={search} onChange={setSearch} />
      <Accordion
        defaultValue="voicemail"
        items={[
          {
            id: "voicemail",
            title: "Voicemail",
            content: (
              <div className="flex flex-col rounded-lyra-sm border border-lyra-border-subtle bg-lyra-bg-control">
                {boxes.map((b) => {
                  const unread = b.messages.filter((m) => m.unread).length;
                  return (
                    <MenuItem
                      key={b.id}
                      label={b.name}
                      icon={
                        <Avatar
                          icon={Voicemail}
                          shape="rounded"
                          color="active"
                          badge={unread > 0 ? <Badge shape="circle" variant="critical" size="sm" count={unread} /> : undefined}
                          badgePosition="bottom-right"
                        />
                      }
                      rightElement={<span className="lyra-body-sm text-lyra-fg-secondary">({b.messages.length})</span>}
                      // Only a box with unread messages (the badged one) opens.
                      disabled={unread === 0}
                      onClick={() => {
                        setSearch("");
                        onViewChange({ boxId: b.id, messageId: null });
                      }}
                    />
                  );
                })}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
