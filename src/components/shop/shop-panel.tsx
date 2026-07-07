"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStudentBalance,
  listShopItems,
  removeShopItem,
  requestShopItem,
} from "@/lib/actions";
import { formatCurrencyAmount } from "@/lib/formatters";
import { canManageShopItems } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type { ShopItem } from "@/services/shop-service";
import { ShopItemCard } from "@/components/shop/shop-item-card";
import { ShopItemDetailsModal } from "@/components/shop/shop-item-details-modal";
import { ShopItemModal } from "@/components/shop/shop-item-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { FileDownIcon, FilterIcon, PlusIcon, ShoppingBagIcon, WalletIcon } from "@/components/ui/icons";
import { PanelToolbar } from "@/components/ui/panel-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { downloadCsv } from "@/lib/client-csv";

type ShopPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

export function ShopPanel({ currencyName, currentUser }: ShopPanelProps) {
  const canManage = canManageShopItems(currentUser);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [search, setSearch] = useState("");
  const [showArchivedItems, setShowArchivedItems] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [duplicatingItem, setDuplicatingItem] = useState<ShopItem | null>(null);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ShopItem | null>(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
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
    setEditingItem(null);
    setViewingItem(null);
    setDuplicatingItem(item);
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
    setViewingItem((current) =>
      current?.id === itemId ? { ...current, quantity: current.quantity - 1 } : current,
    );
    setRequestedItemIds((current) =>
      current.includes(itemId) ? current : [...current, itemId],
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
        matchesShopFilters(item, search, canManage && showArchivedItems),
      ),
    [canManage, items, search, showArchivedItems],
  );

  return (
    <section className="motion-panel mt-5">
      {canManage ? (
        <ShopPanelHeader
          areFiltersOpen={areFiltersOpen}
          count={visibleItems.length}
          onFilterToggle={() => setAreFiltersOpen((isOpen) => !isOpen)}
          onItemsExport={() => downloadShopItems(visibleItems)}
          onNewItem={openNewItemModal}
          totalCount={items.length}
        />
      ) : (
        <StudentShopWallet balance={balance} currencyName={currencyName} />
      )}
      {canManage && areFiltersOpen && (
        <ShopFilters
          onSearchChange={setSearch}
          onShowArchivedItemsChange={setShowArchivedItems}
          search={search}
          showArchivedItems={showArchivedItems}
        />
      )}
      <ShopMessages error={error} message={message} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading shop...</p>
        )}
        {!isLoading &&
          visibleItems.map((item) => (
            <ShopItemCard
              canManage={canManage}
              currencyName={currencyName}
              item={item}
              key={item.id}
              onDuplicate={canManage ? openDuplicateItemModal : undefined}
              onEdit={openEditItemModal}
              onPurchase={handlePurchase}
              onRemove={handleRemove}
              onView={setViewingItem}
              requested={requestedItemIds.includes(item.id)}
            />
          ))}
        {!isLoading && visibleItems.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState
              description={
                items.length === 0
                  ? canManage
                    ? "Create the first reward item so students have something to request."
                    : "Rewards will appear here once staff add them."
                  : "Try changing the search or archived-item filter."
              }
              icon={<ShoppingBagIcon />}
              title={items.length === 0 ? "No shop items yet" : "No matching shop items"}
            />
          </div>
        )}
      </div>

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
  areFiltersOpen,
  count,
  onFilterToggle,
  onItemsExport,
  onNewItem,
  totalCount,
}: {
  areFiltersOpen: boolean;
  count: number;
  onFilterToggle: () => void;
  onItemsExport: () => void;
  onNewItem: () => void;
  totalCount: number;
}) {
  return (
    <PanelToolbar
      actions={
        <div className="flex items-center gap-2">
          <IconButton
            ariaExpanded={areFiltersOpen}
            label={areFiltersOpen ? "Hide filters" : "Show filters"}
            onClick={onFilterToggle}
            text="Filters"
          >
            <FilterIcon />
          </IconButton>
          <IconButton
            disabled={count === 0}
            label="Export shop items"
            onClick={onItemsExport}
            text="Export"
          >
            <FileDownIcon />
          </IconButton>
          <IconButton
            label="New item"
            onClick={onNewItem}
            text="New Item"
            tone="primary"
          >
            <PlusIcon />
          </IconButton>
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

function StudentShopWallet({
  balance,
  currencyName,
}: {
  balance: number | null;
  currencyName: string;
}) {
  const walletLabel =
    balance === null ? "Loading wallet..." : formatCurrencyAmount(balance, currencyName);

  return (
    <div className="wallet-card flex min-h-24 items-center justify-between gap-4 rounded-3xl border border-brand-soft-strong px-5 py-4 text-foreground shadow-sm sm:px-6">
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

function ShopFilters({
  onSearchChange,
  onShowArchivedItemsChange,
  search,
  showArchivedItems,
}: {
  onSearchChange: (value: string) => void;
  onShowArchivedItemsChange: (value: boolean) => void;
  search: string;
  showArchivedItems: boolean;
}) {
  return (
    <div className="theme-subpanel mt-4 p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="shopSearch">
            Search items
          </label>
          <SearchInput
            className="mt-2"
            id="shopSearch"
            onChange={onSearchChange}
            placeholder="Search by item name or description"
            value={search}
          />
        </div>
        <label className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-3 text-sm font-semibold text-text-control">
          <input
            checked={showArchivedItems}
            className="h-4 w-4"
            onChange={(event) => onShowArchivedItemsChange(event.target.checked)}
            type="checkbox"
          />
          Show archived items
        </label>
      </div>
    </div>
  );
}

function ShopMessages({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  return (
    <>
      {message && (
        <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}
    </>
  );
}

function matchesShopFilters(
  item: ShopItem,
  search: string,
  showArchivedItems: boolean,
) {
  if (!showArchivedItems && !item.isActive) {
    return false;
  }

  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [item.name, item.description].some((value) =>
    value.toLowerCase().includes(query),
  );
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
