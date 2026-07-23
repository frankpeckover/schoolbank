"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStudentBalance,
  listShopItems,
  removeShopItem,
  requestShopItem,
} from "@/lib/actions";
import { downloadCsv } from "@/lib/client-csv";
import { formatCurrencyAmount } from "@/lib/formatters";
import { canManageShopItems } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type { ShopItem } from "@/services/shop-service";
import { ShopImportModal } from "@/components/shop/shop-import-modal";
import { ShopItemCard } from "@/components/shop/shop-item-card";
import { ShopItemDetailsModal } from "@/components/shop/shop-item-details-modal";
import { ShopItemModal } from "@/components/shop/shop-item-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import {
  CopyIcon,
  EyeIcon,
  FileDownIcon,
  FileUpIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { PanelToolbar } from "@/components/ui/panel-toolbar";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";

type ShopPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

type ShopFiltersState = {
  priceMax: string;
  priceMin: string;
  search: string;
  showArchivedItems: boolean;
};

export function ShopPanel({ currencyName, currentUser }: ShopPanelProps) {
  const canManage = canManageShopItems(currentUser);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filters, setFilters] = useState<ShopFiltersState>({
    priceMax: "",
    priceMin: "",
    search: "",
    showArchivedItems: false,
  });
  const [balance, setBalance] = useState<number | null>(null);
  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [duplicatingItem, setDuplicatingItem] = useState<ShopItem | null>(null);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ShopItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshItems() {
    setIsLoading(true);

    try {
      const loadedItems = await listShopItems(canManage);
      setItems(loadedItems);
      setError(null);
    } catch {
      setError("Could not load shop items.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshBalance() {
    if (canManage) {
      return;
    }

    try {
      const currentBalance = await getStudentBalance();
      setBalance(currentBalance);
    } catch {
      setError("Could not load wallet balance.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        const loadedItems = await listShopItems(canManage);

        if (isMounted) {
          setItems(loadedItems);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load shop items.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [canManage]);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      if (canManage) {
        return;
      }

      try {
        const currentBalance = await getStudentBalance();

        if (isMounted) {
          setBalance(currentBalance);
        }
      } catch {
        if (isMounted) {
          setError("Could not load wallet balance.");
        }
      }
    }

    loadBalance();

    return () => {
      isMounted = false;
    };
  }, [canManage, currentUser]);

  function updateFilter<Field extends keyof ShopFiltersState>(
    field: Field,
    value: ShopFiltersState[Field],
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function openNewItemModal() {
    setDuplicatingItem(null);
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function openEditItemModal(item: ShopItem) {
    setDuplicatingItem(null);
    setEditingItem(item);
    setViewingItem(null);
    setIsModalOpen(true);
  }

  function openDuplicateItemModal(item: ShopItem) {
    setDuplicatingItem(item);
    setEditingItem(null);
    setViewingItem(null);
    setIsModalOpen(true);
  }

  async function handleRemove(itemId: string) {
    const result = await removeShopItem(itemId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Item removed.");
    refreshItems();
  }

  async function handlePurchase(itemId: string) {
    const result = await requestShopItem(itemId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Request submitted.");
    setViewingItem((currentItem) =>
      currentItem?.id === itemId
        ? { ...currentItem, quantity: currentItem.quantity - 1 }
        : currentItem,
    );
    setRequestedItemIds((currentItemIds) =>
      currentItemIds.includes(itemId)
        ? currentItemIds
        : [...currentItemIds, itemId],
    );
    refreshBalance();
    refreshItems();
  }

  function handleItemSaved() {
    setDuplicatingItem(null);
    setIsModalOpen(false);
    setMessage("Shop item saved.");
    refreshItems();
  }

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        matchesShopFilters(item, {
          ...filters,
          showArchivedItems: canManage && filters.showArchivedItems,
        }),
      ),
    [canManage, filters, items],
  );
  const {
    page,
    pageItems,
    setPage,
    totalPages,
  } = usePagedList(visibleItems);

  return (
    <section className="motion-panel mt-5">
      <FixedNotification error={error} message={message} />

      {canManage ? (
        <ShopPanelHeader
          count={pageItems.length}
          onImportItems={() => setIsImportModalOpen(true)}
          onItemsExport={() => downloadShopItems(visibleItems)}
          onNewItem={openNewItemModal}
          totalCount={visibleItems.length}
        />
      ) : (
        <StudentShopWallet balance={balance} currencyName={currencyName} />
      )}

      {canManage ? (
        <ShopManagementList
          currencyName={currencyName}
          filters={filters}
          isLoading={isLoading}
          items={pageItems}
          onDuplicate={openDuplicateItemModal}
          onEdit={openEditItemModal}
          onPriceMaxChange={(value) => updateFilter("priceMax", value)}
          onPriceMinChange={(value) => updateFilter("priceMin", value)}
          onRemove={handleRemove}
          onSearchChange={(value) => updateFilter("search", value)}
          onShowArchivedItemsChange={(value) =>
            updateFilter("showArchivedItems", value)
          }
          onView={setViewingItem}
          totalItemCount={items.length}
          visibleItemCount={visibleItems.length}
        />
      ) : (
        <StudentShopGrid
          currencyName={currencyName}
          isLoading={isLoading}
          items={items}
          onEdit={openEditItemModal}
          onPurchase={handlePurchase}
          onRemove={handleRemove}
          onView={setViewingItem}
          pageItems={pageItems}
          requestedItemIds={requestedItemIds}
          visibleItemCount={visibleItems.length}
        />
      )}

      {!isLoading && visibleItems.length > 0 && (
        <ListPagination
          onPageChange={setPage}
          page={page}
          totalCount={visibleItems.length}
          totalPages={totalPages}
        />
      )}

      {isModalOpen && (
        <ShopItemModal
          initialForm={
            duplicatingItem
              ? {
                  description: duplicatingItem.description,
                  imageUrl: duplicatingItem.imageUrl,
                  name: `${duplicatingItem.name} Copy`,
                  price: String(duplicatingItem.price),
                  quantity: String(duplicatingItem.quantity),
                }
              : undefined
          }
          item={editingItem}
          onClose={() => {
            setDuplicatingItem(null);
            setIsModalOpen(false);
          }}
          onSaved={handleItemSaved}
        />
      )}

      {isImportModalOpen && (
        <ShopImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshItems}
          onImported={(importMessage, shouldClose = true) => {
            setMessage(importMessage);
            if (shouldClose) {
              setIsImportModalOpen(false);
            }
          }}
        />
      )}

      {viewingItem && (
        <ShopItemDetailsModal
          canManage={canManage}
          currencyName={currencyName}
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={openEditItemModal}
          onPurchase={handlePurchase}
          requested={requestedItemIds.includes(viewingItem.id)}
        />
      )}
    </section>
  );
}

function ShopPanelHeader({
  count,
  onImportItems,
  onItemsExport,
  onNewItem,
  totalCount,
}: {
  count: number;
  onImportItems: () => void;
  onItemsExport: () => void;
  onNewItem: () => void;
  totalCount: number;
}) {
  return (
    <PanelToolbar
      actions={
        <div className="flex items-center gap-2">
          <IconButton
            label="New item"
            onClick={onNewItem}
            text="New Item"
            tone="primary"
          >
            <PlusIcon />
          </IconButton>
          <TableActionMenu
            label="Open shop tools"
            items={[
              {
                icon: <FileUpIcon />,
                label: "Import shop items",
                onSelect: onImportItems,
              },
              {
                disabled: count === 0,
                icon: <FileDownIcon />,
                label: "Export shop items",
                onSelect: onItemsExport,
              },
            ]}
          />
        </div>
      }
    >
      {totalCount > 0 && (
        <p className="text-sm font-semibold text-text-muted">
          Showing {count} of {totalCount} items.
        </p>
      )}
    </PanelToolbar>
  );
}

function ShopManagementList({
  currencyName,
  filters,
  isLoading,
  items,
  onDuplicate,
  onEdit,
  onPriceMaxChange,
  onPriceMinChange,
  onRemove,
  onSearchChange,
  onShowArchivedItemsChange,
  onView,
  totalItemCount,
  visibleItemCount,
}: {
  currencyName: string;
  filters: ShopFiltersState;
  isLoading: boolean;
  items: ShopItem[];
  onDuplicate: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onPriceMaxChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onRemove: (itemId: string) => void;
  onSearchChange: (value: string) => void;
  onShowArchivedItemsChange: (value: boolean) => void;
  onView: (item: ShopItem) => void;
  totalItemCount: number;
  visibleItemCount: number;
}) {
  if (isLoading) {
    return <p className="mt-4 text-sm text-text-muted">Loading shop...</p>;
  }

  if (visibleItemCount === 0) {
    return (
      <div className="mt-4">
        <ShopEmptyState isManagementView totalItemCount={totalItemCount} />
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 grid gap-3 md:hidden">
        {items.map((item) => (
          <ShopManagementCard
            currencyName={currencyName}
            item={item}
            key={item.id}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onRemove={onRemove}
            onView={onView}
          />
        ))}
      </div>

      <table className="mt-4 hidden w-full table-fixed border-collapse text-left text-sm md:table">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[34%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.search)}
                label="Item"
                onClear={() => onSearchChange("")}
              >
                <TableHeaderFilterInput
                  label="Search items"
                  onChange={onSearchChange}
                  value={filters.search}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.search)}
                label="Description"
                onClear={() => onSearchChange("")}
              >
                <TableHeaderFilterInput
                  label="Search descriptions"
                  onChange={onSearchChange}
                  value={filters.search}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 text-right font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.priceMin || filters.priceMax)}
                label="Price"
                onClear={() => {
                  onPriceMaxChange("");
                  onPriceMinChange("");
                }}
              >
                <div className="grid gap-3">
                  <TableHeaderFilterInput
                    label="Minimum"
                    onChange={onPriceMinChange}
                    type="number"
                    value={filters.priceMin}
                  />
                  <TableHeaderFilterInput
                    label="Maximum"
                    onChange={onPriceMaxChange}
                    type="number"
                    value={filters.priceMax}
                  />
                </div>
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 text-right font-semibold">Quantity</th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={filters.showArchivedItems}
                label="Status"
                onClear={() => onShowArchivedItemsChange(false)}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) =>
                    onShowArchivedItemsChange(value === "includeArchived")
                  }
                  options={[
                    { label: "Active only", value: "activeOnly" },
                    { label: "Include archived", value: "includeArchived" },
                  ]}
                  value={
                    filters.showArchivedItems
                      ? "includeArchived"
                      : "activeOnly"
                  }
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-b border-border-subtle" key={item.id}>
              <td className="py-3 pr-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ShopTableImage item={item} />
                  <span className="truncate font-semibold">{item.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-text-muted">
                <span className="line-clamp-2">{item.description || "-"}</span>
              </td>
              <td className="py-3 pr-4 text-right font-semibold">
                {item.price}
                <span className="ml-1 text-xs font-normal text-text-muted">
                  {currencyName}
                </span>
              </td>
              <td className="py-3 pr-4 text-right text-text-muted">
                {item.quantity}
              </td>
              <td className="py-3 pr-4">
                <ShopItemStatusBadge item={item} />
              </td>
              <td className="py-3 text-right">
                <ShopManagementActions
                  item={item}
                  onDuplicate={onDuplicate}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onView={onView}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ShopManagementCard({
  currencyName,
  item,
  onDuplicate,
  onEdit,
  onRemove,
  onView,
}: {
  currencyName: string;
  item: ShopItem;
  onDuplicate: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onRemove: (itemId: string) => void;
  onView: (item: ShopItem) => void;
}) {
  return (
    <article className="rounded-md bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShopTableImage item={item} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <p className="mt-1 truncate text-sm text-text-muted">
              {item.description || "No description"}
            </p>
          </div>
        </div>
        <ShopManagementActions
          item={item}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onRemove={onRemove}
          onView={onView}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span>
          {item.price} {currencyName}
        </span>
        <span>{item.quantity} in stock</span>
        <ShopItemStatusBadge item={item} />
      </div>
    </article>
  );
}

function StudentShopGrid({
  currencyName,
  isLoading,
  items,
  onEdit,
  onPurchase,
  onRemove,
  onView,
  pageItems,
  requestedItemIds,
  visibleItemCount,
}: {
  currencyName: string;
  isLoading: boolean;
  items: ShopItem[];
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onView: (item: ShopItem) => void;
  pageItems: ShopItem[];
  requestedItemIds: string[];
  visibleItemCount: number;
}) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading && (
        <p className="text-sm text-text-muted">Loading shop...</p>
      )}
      {!isLoading &&
        pageItems.map((item) => (
          <ShopItemCard
            canManage={false}
            currencyName={currencyName}
            item={item}
            key={item.id}
            onEdit={onEdit}
            onPurchase={onPurchase}
            onRemove={onRemove}
            onView={onView}
            requested={requestedItemIds.includes(item.id)}
          />
        ))}
      {!isLoading && visibleItemCount === 0 && (
        <div className="sm:col-span-2 lg:col-span-4">
          <ShopEmptyState
            isManagementView={false}
            totalItemCount={items.length}
          />
        </div>
      )}
    </div>
  );
}

function StudentShopWallet({
  balance,
  currencyName,
}: {
  balance: number | null;
  currencyName: string;
}) {
  const walletLabel =
    balance === null
      ? "Loading wallet..."
      : formatCurrencyAmount(balance, currencyName);

  return (
    <div className="shop-wallet-card wallet-card flex min-h-24 items-center justify-between gap-4 rounded-3xl border border-transparent px-5 py-4 text-foreground shadow-sm sm:px-6">
      <div className="relative flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface/80 text-brand shadow-sm">
          <WalletIcon />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-kicker">
            Wallet
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
            {walletLabel}
          </p>
        </div>
      </div>
      <ShoppingBagIcon className="relative hidden h-8 w-8 shrink-0 text-brand sm:block" />
    </div>
  );
}

function ShopTableImage({ item }: { item: ShopItem }) {
  if (item.imageUrl) {
    return (
      <div
        aria-label={`${item.name} image`}
        className="h-10 w-10 shrink-0 rounded-md bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
      <PackageIcon className="h-4 w-4" />
    </span>
  );
}

function ShopManagementActions({
  item,
  onDuplicate,
  onEdit,
  onRemove,
  onView,
}: {
  item: ShopItem;
  onDuplicate: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onRemove: (itemId: string) => void;
  onView: (item: ShopItem) => void;
}) {
  return (
    <TableActionMenu
      label={`Open actions for ${item.name}`}
      items={[
        {
          icon: <EyeIcon />,
          label: "View",
          onSelect: () => onView(item),
        },
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEdit(item),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicate(item),
        },
        {
          disabled: !item.isActive,
          icon: <TrashIcon />,
          label: "Archive",
          onSelect: () => onRemove(item.id),
          tone: "danger",
        },
      ]}
    />
  );
}

function ShopItemStatusBadge({ item }: { item: ShopItem }) {
  if (!item.isActive) {
    return (
      <span className="inline-flex rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
        Archived
      </span>
    );
  }

  if (item.quantity <= 0) {
    return (
      <span className="inline-flex rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
        Sold out
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-sm bg-success-soft px-2 py-1 text-xs font-semibold text-success">
      Active
    </span>
  );
}

function ShopEmptyState({
  isManagementView,
  totalItemCount,
}: {
  isManagementView: boolean;
  totalItemCount: number;
}) {
  return (
    <EmptyState
      description={
        totalItemCount === 0
          ? isManagementView
            ? "Create the first reward item so students have something to request."
            : "Rewards will appear here once staff add them."
          : "Try changing the shop filters."
      }
      icon={<ShoppingBagIcon />}
      title={totalItemCount === 0 ? "No shop items yet" : "No matching shop items"}
    />
  );
}

function matchesShopFilters(item: ShopItem, filters: ShopFiltersState) {
  if (!filters.showArchivedItems && !item.isActive) {
    return false;
  }

  if (!matchesPriceFilter(item.price, filters.priceMin, filters.priceMax)) {
    return false;
  }

  const query = filters.search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [item.name, item.description].some((value) =>
    value.toLowerCase().includes(query),
  );
}

function matchesPriceFilter(price: number, minimum: string, maximum: string) {
  const minimumPrice = parsePriceFilter(minimum);
  const maximumPrice = parsePriceFilter(maximum);

  if (minimumPrice !== null && price < minimumPrice) {
    return false;
  }

  if (maximumPrice !== null && price > maximumPrice) {
    return false;
  }

  return true;
}

function parsePriceFilter(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.abs(parsedValue);
}

function downloadShopItems(items: ShopItem[]) {
  downloadCsv(
    "shop-items.csv",
    [
      "id",
      "name",
      "description",
      "price",
      "quantity",
      "status",
      "image_url",
    ],
    items.map((item) => [
      item.id,
      item.name,
      item.description,
      item.price,
      item.quantity,
      item.isActive ? "active" : "archived",
      item.imageUrl,
    ]),
  );
}
