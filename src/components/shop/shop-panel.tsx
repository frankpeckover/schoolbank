"use client";

import { useEffect, useState } from "react";
import {
  listShopItems,
  removeShopItem,
  requestShopItem,
} from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { ShopItem } from "@/services/shop-service";
import { ShopItemCard } from "@/components/shop/shop-item-card";
import { ShopItemModal } from "@/components/shop/shop-item-modal";

type ShopPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

export function ShopPanel({ currencyName, currentUser }: ShopPanelProps) {
  const canManage = currentUser.role === "admin" || currentUser.role === "teacher";
  const [items, setItems] = useState<ShopItem[]>([]);
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
    const result = await requestShopItem(currentUser, itemId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Request submitted.");
    refreshItems();
  }

  function handleItemSaved() {
    setIsModalOpen(false);
    setMessage("Shop item saved.");
    refreshItems();
  }

  return (
    <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
      <ShopPanelHeader canManage={canManage} onNewItem={openNewItemModal} />
      <ShopMessages error={error} message={message} />

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
  canManage,
  onNewItem,
}: {
  canManage: boolean;
  onNewItem: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold">Shop</h2>
        <p className="mt-1 text-sm text-text-muted">
          {canManage
            ? "Manage store items students can purchase."
            : "Request available rewards."}
        </p>
      </div>
      {canManage && (
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={onNewItem}
          type="button"
        >
          New Item
        </button>
      )}
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
