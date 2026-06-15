import { db } from "@/lib/db";
import type { Role, SessionUser } from "@/lib/session";
import type { ActionResult } from "@/lib/action-results";
import {
  LedgerService,
  type LedgerEntryStatus,
  type LedgerEntryType,
} from "@/services/ledger-service";
import type { ShopPurchaseStatus } from "@/services/shop-service";

export type TransactionLogItem = {
  id: string;
  amount: number;
  createdAt: string;
  description: string;
  entryStatus: LedgerEntryStatus;
  isVoided: boolean;
  reason: string;
  studentName: string;
  studentUsername: string;
  type: LedgerEntryType;
  voidedAt: string | null;
  purchaseStatus: ShopPurchaseStatus | null;
};

type TransactionLogRow = {
  id: string;
  amount: number;
  created_at: Date;
  description: string;
  entry_status: LedgerEntryStatus;
  is_voided: boolean;
  reason: string;
  student_name: string;
  student_username: string;
  type: LedgerEntryType;
  voided_at: Date | null;
  purchase_status: ShopPurchaseStatus | null;
};

type LedgerVoidRow = {
  entry_type: LedgerEntryType;
  related_entity_id: string | null;
  related_entity_type: string | null;
};

export type CreateLedgerAdjustmentInput = {
  amount: number;
  reason: string;
  studentUserId: string;
};

const ledgerService = new LedgerService();

export class TransactionService {
  async getStudentBalance(userId: string): Promise<number> {
    const client = await db.connect();

    try {
      return await ledgerService.getAvailableBalance(client, userId);
    } finally {
      client.release();
    }
  }

  async listTransactions(userId: string, role: Role): Promise<TransactionLogItem[]> {
    const canViewAllTransactions = role === "admin" || role === "teacher";

    const result = await db.query<TransactionLogRow>(
      `
        select
          ledger_entries.id,
          ledger_entries.amount,
          ledger_entries.created_at,
          ledger_entries.description,
          ledger_entries.status as entry_status,
          ledger_entries.is_voided,
          ledger_entries.description as reason,
          trim(users.first_name || ' ' || users.last_name) as student_name,
          users.username as student_username,
          ledger_entries.entry_type as type,
          ledger_entries.voided_at,
          shop_purchases.status as purchase_status
        from ledger_entries
        join accounts on accounts.id = ledger_entries.account_id
        join users on users.id = accounts.user_id
        left join shop_purchases
          on ledger_entries.related_entity_type = 'shop_purchase'
          and shop_purchases.id = ledger_entries.related_entity_id
        where $1::boolean = true
          or accounts.user_id = $2
        order by ledger_entries.created_at desc
      `,
      [canViewAllTransactions, userId],
    );

    return result.rows.map(this.mapTransactionRow);
  }

  async voidTransaction(
    currentUser: SessionUser,
    transactionId: string,
    voidReason: string,
  ): Promise<ActionResult> {
    if (currentUser.role !== "admin") {
      return {
        ok: false,
        message: "Only admins can void transactions.",
      };
    }

    if (!transactionId) {
      return {
        ok: false,
        message: "Transaction was not found.",
      };
    }

    const reason = voidReason.trim();

    if (!reason) {
      return {
        ok: false,
        message: "Enter a reason for voiding this transaction.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const entryResult = await client.query<LedgerVoidRow>(
        `
          select entry_type, related_entity_id, related_entity_type
          from ledger_entries
          where id = $1
          for update
        `,
        [transactionId],
      );

      const entry = entryResult.rows[0];

      if (!entry || entry.entry_type === "void_reversal") {
        await client.query("rollback");
        return {
          ok: false,
          message: "Transaction was not found or cannot be voided.",
        };
      }

      if (
        entry.related_entity_type === "shop_purchase" &&
        entry.related_entity_id
      ) {
        await this.voidShopPurchaseRecord(client, entry.related_entity_id);
      }

      const voidedEntry = await ledgerService.voidEntry(
        client,
        transactionId,
        currentUser.id,
        reason,
      );

      if (!voidedEntry) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Transaction was not found or is already voided.",
        };
      }

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Void transaction failed", error);

      return {
        ok: false,
        message: "Could not void transaction.",
      };
    } finally {
      client.release();
    }
  }

  async createLedgerAdjustment(
    currentUser: SessionUser,
    input: CreateLedgerAdjustmentInput,
  ): Promise<ActionResult> {
    const reason = input.reason.trim();

    if (currentUser.role !== "teacher") {
      return {
        ok: false,
        message: "Only teachers can create ledger adjustments.",
      };
    }

    if (!input.studentUserId || !reason) {
      return {
        ok: false,
        message: "Select a student and enter a reason.",
      };
    }

    if (!Number.isInteger(input.amount) || input.amount === 0) {
      return {
        ok: false,
        message: "Enter a whole number amount that is not zero.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      await ledgerService.createEntry(client, {
        amount: input.amount,
        createdByUserId: currentUser.id,
        description: reason,
        entryType: input.amount > 0 ? "reward" : "penalty",
        status: "posted",
        userId: input.studentUserId,
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Create ledger adjustment failed", error);

      return {
        ok: false,
        message: "Could not create transaction.",
      };
    } finally {
      client.release();
    }
  }

  private mapTransactionRow(row: TransactionLogRow): TransactionLogItem {
    return {
      id: row.id,
      amount: row.amount,
      createdAt: row.created_at.toISOString(),
      description: formatLedgerType(row.type),
      entryStatus: row.entry_status,
      isVoided: row.is_voided || row.entry_status === "voided",
      reason: row.reason,
      studentName: row.student_name,
      studentUsername: row.student_username,
      type: row.type,
      voidedAt: row.voided_at ? row.voided_at.toISOString() : null,
      purchaseStatus: row.purchase_status,
    };
  }

  private async voidShopPurchaseRecord(
    client: import("pg").PoolClient,
    purchaseId: string,
  ) {
    const result = await client.query<{
      shop_item_id: string;
      status: ShopPurchaseStatus;
    }>(
      `
        update shop_purchases
        set is_voided = true,
            voided_at = now()
        where id = $1
          and is_voided = false
        returning shop_item_id, status
      `,
      [purchaseId],
    );

    const purchase = result.rows[0];

    if (purchase?.status === "pending" || purchase?.status === "approved") {
      await client.query(
        `
          update shop_items
          set quantity = quantity + 1,
              updated_at = now()
          where id = $1
        `,
        [purchase.shop_item_id],
      );
    }
  }
}

function formatLedgerType(type: LedgerEntryType) {
  const labels: Record<LedgerEntryType, string> = {
    manual_adjustment: "Manual adjustment",
    penalty: "Penalty",
    reward: "Reward",
    shop_hold: "Shop hold",
    shop_purchase: "Shop purchase",
    shop_refund: "Shop refund",
    void_reversal: "Void reversal",
  };

  return labels[type];
}
