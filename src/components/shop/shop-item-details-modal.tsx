import { formatCurrencyAmount } from "@/lib/formatters";
import type { ShopItem } from "@/services/shop-service";
import { CheckIcon, PencilIcon, ShoppingBagIcon, TicketIcon } from "@/components/ui/icons";

type ShopItemDetailsModalProps = {
  canManage: boolean;
  currencyName: string;
  item: ShopItem;
  onClose: () => void;
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  requested: boolean;
};

export function ShopItemDetailsModal({
  canManage,
  currencyName,
  item,
  onClose,
  onEdit,
  onPurchase,
  requested,
}: ShopItemDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop max-h-full w-full max-w-xl overflow-y-auto p-5 shadow-lg">
        <ShopItemDetailsImage item={item} />

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-semibold">{item.name}</h3>
            {!item.isActive && (
              <span className="mt-2 inline-flex rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
                Removed
              </span>
            )}
          </div>
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ShopItemDetail label="Price" value={formatCurrencyAmount(item.price, currencyName)} />
          <ShopItemDetail
            label="Available"
            value={item.quantity <= 0 ? "Sold out" : `${item.quantity} left`}
          />
        </div>

        <div className="theme-subpanel mt-4 p-3">
          <p className="text-sm font-semibold text-text-control">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-muted">
            {item.description || "No description"}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {canManage ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
              onClick={() => onEdit(item)}
              type="button"
            >
              <PencilIcon />
              Edit Item
            </button>
          ) : (
            <button
              className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                requested
                  ? "border border-success-border bg-success-soft text-success"
                  : "bg-brand text-white hover:bg-brand-hover"
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
          )}
        </div>
      </div>
    </div>
  );
}

function ShopItemDetailsImage({ item }: { item: ShopItem }) {
  if (item.imageUrl) {
    return (
      <div
        aria-label={`${item.name} image`}
        className="aspect-[5/3] rounded-md bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <div className="reward-shine flex aspect-[5/3] items-center justify-center rounded-md bg-accent-soft text-accent">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface/85 shadow-sm">
        <TicketIcon className="h-8 w-8" />
      </div>
    </div>
  );
}

function ShopItemDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="theme-card p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
