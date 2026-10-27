import { useState } from "react";
import { Accordion, EmptyState, Label, SearchInput } from "@nicecxone/lyra-ui";

/* Chat side panel: a search field over collapsible Customers / Agents /
   Supervisors sections. No chat backend, so each section shows its empty state. */

const SECTIONS = [
  { id: "customers", title: "Customers", empty: "No customers yet. Hang tight" },
  { id: "agents", title: "Agents", empty: "It's only you for now" },
  { id: "supervisors", title: "Supervisors", empty: "No supervisors at the moment." },
];

export function ChatPanel() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <div className="flex flex-col gap-1">
        <Label label="Type to search" />
        <SearchInput aria-label="Type to search" value={search} onValueChange={setSearch} />
      </div>
      <Accordion
        type="multiple"
        items={SECTIONS.map((s) => ({
          id: s.id,
          title: s.title,
          content: <EmptyState message={s.empty} />,
        }))}
      />
    </div>
  );
}
