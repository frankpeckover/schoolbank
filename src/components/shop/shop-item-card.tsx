import type { ShopItem } from "@/services/shop-service";

type ShopItemCardProps = {
  canManage: boolean;
  currencyName: string;
  item: ShopItem;
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

export function ShopItemCard({
  canManage,
  currencyName,
  item,
  onEdit,
  onPurchase,
  onRemove,
}: ShopItemCardProps) {
  return (
    <article className="rounded-md border border-border-subtle bg-panel-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <p className="mt-1 text-sm text-text-muted">
            {item.description || "No description"}
          </p>
        </div>
        {!item.isActive && (
          <span className="rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
            Removed
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-brand">
          {item.price} {currencyName}
        </span>
        <span className="text-text-muted">{item.quantity} available</span>
      </div>

      <ShopItemActions
        canManage={canManage}
        currencyName={currencyName}
        item={item}
        onEdit={onEdit}
        onPurchase={onPurchase}
        onRemove={onRemove}
      />
    </article>
  );
}

function ShopItemActions({
  canManage,
  item,
  onEdit,
  onPurchase,
  onRemove,
}: ShopItemCardProps) {
  if (!canManage) {
    return (
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={item.quantity <= 0}
          onClick={() => onPurchase(item.id)}
          type="button"
        >
          Request
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <button
        className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface"
        onClick={() => onEdit(item)}
        type="button"
      >
        Edit
      </button>
      {item.isActive && (
        <button
          className="rounded-md border border-danger-button-border px-3 py-2 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft"
          onClick={() => onRemove(item.id)}
          type="button"
        >
          Remove
        </button>
      )}
    </div>
  );
}
