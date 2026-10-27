import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, User, UserPlus, X } from "lucide-react";
import {
  Select,
  Table,
  TableHeader,
  TableRow,
  SortableTableHead,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
  TableToolbar,
  ColumnToggle,
  TabList,
  Tab,
  useColumnReorder,
  cn,
} from "@nicecxone/lyra-ui";
import type { FilterChipOption, SortDirection } from "@nicecxone/lyra-ui";
import { CREATE_NEW_CUSTOMERS } from "@nicecxone/lyra-ui/customers-data";
import { CustomerRecordView } from "./CustomerRecordView";
import type { CustomerRecord as OpenCustomer } from "./CustomerRecordView";

/* Trimmed local port of agent-next-gen-v3's `CustomersListView`
   (agent-next-gen-customers-table.tsx) plus its Customers / Accounts /
   Tickets tab row. Same `CREATE_NEW_CUSTOMERS` fixture, columns, filters,
   toolbar, sort and pagination. Left out: channel icons / the row info panel
   (both need interaction state this app doesn't have). */

interface CustomerRecord {
  contactNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  firstPhone: string;
  emailAddress: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  originalCustomerId: string;
  dateOfBirth: string;
  agent: string;
  agentTeam: string;
  paymentBalance: string;
}

const RECORDS: CustomerRecord[] = CREATE_NEW_CUSTOMERS.map((c) => ({
  contactNumber: c.customerId,
  firstName: c.firstName,
  lastName: c.lastName,
  group: c.group,
  firstPhone: c.firstPhone,
  emailAddress: c.emailAddress,
  address1: c.address1,
  city: c.city,
  state: c.state,
  postalCode: c.postalCode,
  originalCustomerId: c.originalCustomerId,
  dateOfBirth: c.dateOfBirth,
  agent: c.agent,
  agentTeam: c.agentTeam,
  paymentBalance: c.paymentBalance,
}));

type ColKey =
  | "contactNumber" | "firstName" | "lastName" | "group" | "firstPhone"
  | "emailAddress" | "address1" | "city" | "state" | "postalCode";

const COLUMNS: Record<ColKey, { label: string; flex: string }> = {
  contactNumber: { label: "Contact Number", flex: "flex-1" },
  firstName:     { label: "First Name",     flex: "flex-1" },
  lastName:      { label: "Last Name",      flex: "flex-1" },
  group:         { label: "Group",          flex: "flex-[0.7]" },
  firstPhone:    { label: "First Phone",    flex: "flex-[1.2]" },
  emailAddress:  { label: "Email Address",  flex: "flex-[1.6]" },
  address1:      { label: "Address 1",      flex: "flex-[1.6]" },
  city:          { label: "City",           flex: "flex-1" },
  state:         { label: "State",          flex: "flex-[0.6]" },
  postalCode:    { label: "Postal Code",    flex: "flex-[0.8]" },
};
const COLUMN_KEYS = Object.keys(COLUMNS) as ColKey[];
const COLUMN_DEFS = COLUMN_KEYS.map((key) => ({ key, label: COLUMNS[key].label }));

type FilterKey = Exclude<keyof CustomerRecord, never>;
const FILTER_FIELDS: { key: FilterKey; label: string }[] = [
  { key: "contactNumber", label: "Customer ID" },
  { key: "originalCustomerId", label: "Original customer ID" },
  { key: "firstPhone", label: "Phone" },
  { key: "emailAddress", label: "Email address" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "group", label: "Group" },
  { key: "agent", label: "Agent" },
  { key: "agentTeam", label: "Agent team" },
  { key: "address1", label: "Address 1" },
  { key: "paymentBalance", label: "Payment balance" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
];
const FILTER_OPTIONS = Object.fromEntries(
  FILTER_FIELDS.map(({ key }) => [
    key,
    Array.from(new Set(RECORDS.map((r) => r[key]).filter(Boolean))).map((v) => ({ value: v, label: v })),
  ])
) as Record<FilterKey, FilterChipOption[]>;

const FIXED_TABS = ["Customers", "Accounts", "Tickets"] as const;

function CustomersTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addedFilterKeys, setAddedFilterKeys] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(COLUMN_KEYS));
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { columnOrder: allColumnOrder, dragOverKey, dragHandlers } = useColumnReorder<ColKey>(COLUMN_KEYS);
  const columnOrder = allColumnOrder.filter((k: ColKey) => visibleCols.has(k));

  const filterDefs = addedFilterKeys.map((key) => {
    const def = FILTER_FIELDS.find((f) => f.key === key)!;
    return { key: def.key, label: def.label, options: FILTER_OPTIONS[def.key] };
  });
  const handleAddedFiltersChange = (keys: string[]) => {
    setAddedFilterKeys(keys);
    setFilterValues((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => keys.includes(k))));
    setCurrentPage(1);
  };

  const handleSort = (key: ColKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  };

  const sortedRows = useMemo(() => {
    const filtered = RECORDS.filter((row) => {
      if (searchQuery) {
        const haystack = `${row.firstName} ${row.lastName} ${row.contactNumber} ${row.emailAddress}`.toLowerCase();
        if (!haystack.includes(searchQuery.toLowerCase())) return false;
      }
      for (const key of addedFilterKeys) {
        const selected = filterValues[key];
        if (selected?.length && !selected.includes(row[key as FilterKey])) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (!sortKey || !sortDir) return 0;
      const aVal = String(a[sortKey]).toLowerCase();
      const bVal = String(b[sortKey]).toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchQuery, addedFilterKeys, filterValues, sortKey, sortDir]);

  const totalRecords = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const pageRows = sortedRows.slice(startIdx, startIdx + rowsPerPage);

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
      <TableToolbar
        className="px-6"
        searchQuery={searchQuery}
        onSearchChange={(q: string) => { setSearchQuery(q); setCurrentPage(1); }}
        filterDefs={filterDefs}
        filterValues={filterValues}
        onFilterChange={(key: string, values: string[]) => setFilterValues((prev) => ({ ...prev, [key]: values }))}
        onFilterClear={() => setFilterValues({})}
        filters={
          <Select
            options={FILTER_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
            multiple
            searchable
            showSelectAll
            dropdownAlign="left"
            values={addedFilterKeys}
            onValuesChange={handleAddedFiltersChange}
            trigger={
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lyra-sm lyra-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus focus-visible:ring-offset-2 border border-lyra-border-soft bg-lyra-bg-control text-lyra-fg-action hover:bg-lyra-state-hover active:bg-lyra-state-pressed h-8 px-3"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Filter
              </button>
            }
            className="inline-flex relative"
          />
        }
        actionDefs={[
          { key: "refresh", label: "Refresh", icon: <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> },
          { key: "new", label: "New Customer", icon: <UserPlus className="h-4 w-4" strokeWidth={1.5} /> },
        ]}
        actions={<ColumnToggle columns={COLUMN_DEFS} visibleColumns={visibleCols} onVisibilityChange={setVisibleCols} />}
      />

      <div className="flex-1 min-h-0 overflow-auto px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columnOrder.map((key: ColKey) => (
                <SortableTableHead
                  key={key}
                  className={cn(COLUMNS[key].flex, "relative")}
                  sortDirection={sortKey === key ? sortDir : null}
                  onSort={() => handleSort(key)}
                  columnKey={key}
                  dragHandlers={dragHandlers}
                  isDragOver={dragOverKey === key}
                  resizable
                  minWidth={80}
                >
                  {COLUMNS[key].label}
                </SortableTableHead>
              ))}
              <TableHead className="w-[48px] shrink-0 sticky right-0 bg-lyra-bg-surface-base">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.contactNumber} selectable className="group cursor-pointer">
                {columnOrder.map((key: ColKey) => (
                  <TableCell key={key} columnKey={key} className={COLUMNS[key].flex}>
                    {row[key]}
                  </TableCell>
                ))}
                <TableCell
                  className="w-[48px] shrink-0 sticky right-0 bg-lyra-bg-surface-base"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <button
                    aria-label={`Delete ${row.firstName} ${row.lastName}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lyra-sm text-lyra-fg-secondary hover:bg-lyra-bg-surface-shell transition-colors"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TableFooter
        className="px-6 shrink-0"
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(val: number) => { setRowsPerPage(val); setCurrentPage(1); }}
        totalRecords={totalRecords}
        displayStart={totalRecords === 0 ? 0 : startIdx + 1}
        displayEnd={Math.min(startIdx + rowsPerPage, totalRecords)}
      />
    </div>
  );
}

export function CustomersView({
  openCustomers,
  activeTab,
  onActiveTabChange,
  onCloseCustomer,
}: {
  /** Customer records open as closable tabs after the fixed ones. */
  openCustomers: OpenCustomer[];
  /** A fixed tab label, or an open customer's `id`. */
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onCloseCustomer: (id: string) => void;
}) {
  const activeCustomer = openCustomers.find((c) => c.id === activeTab);

  return (
    <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
      <TabList className="px-4" overflowMenu>
        {FIXED_TABS.map((label) => (
          <Tab key={label} active={activeTab === label} onClick={() => onActiveTabChange(label)}>
            {label}
          </Tab>
        ))}
        {openCustomers.map((c) => (
          <Tab
            key={c.id}
            active={activeTab === c.id}
            icon={<User className="h-4 w-4" strokeWidth={1.5} />}
            onClick={() => onActiveTabChange(c.id)}
            onRemove={(e: React.MouseEvent) => { e.stopPropagation(); onCloseCustomer(c.id); }}
            removeVariant="close"
            removeIcon={<X className="h-4 w-4" strokeWidth={1.5} />}
            removeLabel={`Close ${c.name}`}
          >
            {c.name}
          </Tab>
        ))}
      </TabList>
      {activeCustomer ? (
        <CustomerRecordView customer={activeCustomer} onClose={() => onCloseCustomer(activeCustomer.id)} />
      ) : activeTab === "Customers" ? (
        <CustomersTable />
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
