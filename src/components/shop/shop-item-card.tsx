import { IconButton } from "@/components/ui/icon-button";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PackageIcon,
  PencilIcon,
  ShoppingBagIcon,
  TicketIcon,
  TrashIcon,
} from "@/components/ui/icons";
import type { ShopItem } from "@/services/shop-service";

type ShopItemCardProps = {
  canManage: boolean;
  currencyName: string;
  item: ShopItem;
  onDuplicate?: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onView: (item: ShopItem) => void;
  requested: boolean;
};

export function ShopItemCard({
  canManage,
  currencyName,
  item,
  onDuplicate,
  onEdit,
  onPurchase,
  onRemove,
  onView,
  requested,
}: ShopItemCardProps) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition-all duration-200 hover:border-brand-soft-strong hover:shadow-md ${
        requested ? "border-success-border" : "border-border-subtle"
      } ${!item.isActive ? "opacity-70" : ""}`}
    >
      <ShopItemImage item={item} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold text-brand-ink">
              {item.name}
            </h3>
            <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-text-muted">
              {item.description || "No description"}
            </p>
          </div>
          {!item.isActive && (
            <span className="shrink-0 rounded-full border border-danger-border bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger-strong">
              Removed
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-3xl font-bold leading-none text-brand-ink">
            {item.price}
            <span className="ml-1 text-sm font-semibold text-text-muted">
              {currencyName}
            </span>
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              item.quantity <= 0
                ? "bg-danger-soft text-danger-strong"
                : "bg-success-soft text-success"
            }`}
          >
            <PackageIcon className="h-3.5 w-3.5" />
            {item.quantity <= 0 ? "Sold out" : `${item.quantity} left`}
          </span>
        </div>

        <ShopItemActions
          canManage={canManage}
          currencyName={currencyName}
          item={item}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onPurchase={onPurchase}
          onRemove={onRemove}
          onView={onView}
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
        className="h-36 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <div className="reward-shine flex h-36 items-center justify-center bg-brand-soft text-brand">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface/85 shadow-sm">
        <TicketIcon className="h-8 w-8" />
      </div>
    </div>
  );
}

function ShopItemActions({
  canManage,
  item,
  onEdit,
  onDuplicate,
  onPurchase,
  onRemove,
  onView,
  requested,
}: ShopItemCardProps) {
  if (!canManage) {
    return (
      <div className="mt-auto flex gap-2 pt-4">
        <IconButton label={`View ${item.name}`} onClick={() => onView(item)}>
          <EyeIcon />
        </IconButton>
        <button
          className={`inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
            requested
              ? "border border-success-border bg-success-soft text-success"
              : "bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow-md"
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
    <div className="mt-auto flex gap-2 pt-4">
      <IconButton label={`View ${item.name}`} onClick={() => onView(item)}>
        <EyeIcon />
      </IconButton>
      {onDuplicate && (
        <IconButton label={`Duplicate ${item.name}`} onClick={() => onDuplicate(item)}>
          <CopyIcon />
        </IconButton>
      )}
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
