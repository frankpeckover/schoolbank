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
import { FilterIcon, PlusIcon, ShoppingBagIcon, WalletIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";

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
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function openEditItemModal(item: ShopItem) {
    setEditingItem(item);
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
    <section className="theme-panel motion-panel mt-5 p-4 sm:p-5">
      <ShopPanelHeader
        areFiltersOpen={areFiltersOpen}
        balance={balance}
        canManage={canManage}
        currencyName={currencyName}
        onFilterToggle={() => setAreFiltersOpen((isOpen) => !isOpen)}
        onNewItem={openNewItemModal}
      />
      {canManage && areFiltersOpen && (
        <ShopFilters
          onSearchChange={setSearch}
          onShowArchivedItemsChange={setShowArchivedItems}
          search={search}
          showArchivedItems={showArchivedItems}
        />
      )}
      <ShopMessages error={error} message={message} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
              onEdit={openEditItemModal}
              onPurchase={handlePurchase}
              onRemove={handleRemove}
              onView={setViewingItem}
              requested={requestedItemIds.includes(item.id)}
            />
          ))}
        {!isLoading && visibleItems.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
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
          item={editingItem}
          onClose={() => setIsModalOpen(false)}
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
  balance,
  canManage,
  currencyName,
  onFilterToggle,
  onNewItem,
}: {
  areFiltersOpen: boolean;
  balance: number | null;
  canManage: boolean;
  currencyName: string;
  onFilterToggle: () => void;
  onNewItem: () => void;
}) {
  const walletLabel =
    balance === null ? "Loading wallet..." : formatCurrencyAmount(balance, currencyName);

  return (
    <PageHeader
      actions={
        <div className="flex items-center gap-2">
          {!canManage && (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-brand-soft-strong bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-ink shadow-sm">
              <WalletIcon />
              <span>{walletLabel}</span>
            </div>
          )}
          {canManage && (
            <>
              <IconButton
                ariaExpanded={areFiltersOpen}
                label={areFiltersOpen ? "Hide filters" : "Show filters"}
                onClick={onFilterToggle}
              >
                <FilterIcon />
              </IconButton>
              <button
                aria-label="New item"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover"
                onClick={onNewItem}
                title="New item"
                type="button"
              >
                <PlusIcon />
              </button>
            </>
          )}
        </div>
      }
      icon={<ShoppingBagIcon />}
      iconTone="brand"
      title="Shop"
      titleSize="base"
    />
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
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="shopSearch">
            Search items
          </label>
          <input
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            id="shopSearch"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by item name or description"
            value={search}
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-text-control">
        <input
          checked={showArchivedItems}
          className="h-4 w-4"
          onChange={(event) => onShowArchivedItemsChange(event.target.checked)}
          type="checkbox"
        />
        Show archived items
      </label>
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
