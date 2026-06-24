import { IconButton } from "@/components/ui/icon-button";
import {
  CheckIcon,
  PackageIcon,
  PencilIcon,
  ShoppingBagIcon,
  TrashIcon,
} from "@/components/ui/icons";
import type { ShopItem } from "@/services/shop-service";

type ShopItemCardProps = {
  canManage: boolean;
  currencyName: string;
  item: ShopItem;
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  requested: boolean;
};

export function ShopItemCard({
  canManage,
  currencyName,
  item,
  onEdit,
  onPurchase,
  onRemove,
  requested,
}: ShopItemCardProps) {
  return (
    <article className="group overflow-hidden rounded-md border border-border-subtle bg-surface shadow-sm transition hover:border-brand-soft-strong hover:shadow-md">
      <ShopItemImage item={item} />

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <p className="mt-1 line-clamp-1 text-sm text-text-muted">
              {item.description || "No description"}
            </p>
          </div>
          {!item.isActive && (
            <span className="rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
              Removed
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span className="rounded-md bg-brand-soft px-2.5 py-1.5 font-semibold text-brand-ink shadow-sm">
            {item.price} {currencyName}
          </span>
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              item.quantity <= 0
                ? "bg-danger-soft text-danger-strong"
                : "bg-panel-soft text-text-muted"
            }`}
          >
            {item.quantity <= 0 ? "Sold out" : `${item.quantity} left`}
          </span>
        </div>

        <ShopItemActions
          canManage={canManage}
          currencyName={currencyName}
          item={item}
          onEdit={onEdit}
          onPurchase={onPurchase}
          onRemove={onRemove}
          requested={requested}
        />
      </div>
    </article>
  );
}

function ShopItemImage({ item }: { item: ShopItem }) {
  if (item.imageUrl) {
    return (
      <div
        aria-label={`${item.name} image`}
        className="aspect-[5/3] bg-cover bg-center transition duration-200 group-hover:scale-[1.02]"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <div className="reward-shine flex aspect-[5/3] items-center justify-center bg-brand-soft text-brand">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface/85 shadow-sm">
        <PackageIcon className="h-7 w-7" />
      </div>
    </div>
  );
}

function ShopItemActions({
  canManage,
  item,
  onEdit,
  onPurchase,
  onRemove,
  requested,
}: ShopItemCardProps) {
  if (!canManage) {
    return (
      <div className="mt-3">
        <button
          className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
            requested
              ? "border border-success-border bg-success-soft text-success"
              : "bg-brand text-white shadow-sm hover:bg-brand-hover"
          }`}
          disabled={item.quantity <= 0 || requested}
          onClick={() => onPurchase(item.id)}
          type="button"
        >
          {requested ? (
            <>
              <CheckIcon />
              Requested
            </>
          ) : (
            <>
              <ShoppingBagIcon />
              Request
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <IconButton label={`Edit ${item.name}`} onClick={() => onEdit(item)}>
        <PencilIcon />
      </IconButton>
      {item.isActive && (
        <IconButton
          label={`Remove ${item.name}`}
          onClick={() => onRemove(item.id)}
          tone="danger"
        >
          <TrashIcon />
        </IconButton>
      )}
    </div>
  );
}
