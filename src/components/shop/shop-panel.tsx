"use client";

import { useEffect, useState } from "react";
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
import { ShopItemModal } from "@/components/shop/shop-item-modal";
import { PlusIcon, ShoppingBagIcon, WalletIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";

type ShopPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

export function ShopPanel({ currencyName, currentUser }: ShopPanelProps) {
  const canManage = canManageShopItems(currentUser);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
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

  return (
    <section className="theme-panel motion-panel mt-5 p-4 sm:p-5">
      <ShopPanelHeader
        balance={balance}
        canManage={canManage}
        currencyName={currencyName}
        onNewItem={openNewItemModal}
      />
      <ShopMessages error={error} message={message} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading shop...</p>
        )}
        {!isLoading &&
          items.map((item) => (
            <ShopItemCard
              canManage={canManage}
              currencyName={currencyName}
              item={item}
              key={item.id}
              onEdit={openEditItemModal}
              onPurchase={handlePurchase}
              onRemove={handleRemove}
              requested={requestedItemIds.includes(item.id)}
            />
          ))}
      </div>

      {isModalOpen && (
        <ShopItemModal
          item={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleItemSaved}
        />
      )}
    </section>
  );
}

function ShopPanelHeader({
  balance,
  canManage,
  currencyName,
  onNewItem,
}: {
  balance: number | null;
  canManage: boolean;
  currencyName: string;
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
            <button
              aria-label="New item"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover"
              onClick={onNewItem}
              title="New item"
              type="button"
            >
              <PlusIcon />
            </button>
          )}
        </div>
      }
      description={
        canManage
          ? "Manage store items."
          : "Browse rewards."
      }
      icon={<ShoppingBagIcon />}
      title="Shop"
      titleSize="base"
    />
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
