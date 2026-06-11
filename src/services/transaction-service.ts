import { db } from "@/lib/db";
import type { Role, SessionUser } from "@/lib/session";
import type { ActionResult } from "@/lib/action-results";

export type TransactionLogItem = {
  id: string;
  amount: number;
  createdAt: string;
  description: string;
  reason: string;
  studentName: string;
  studentUsername: string;
  type: "shop_purchase" | "point_adjustment";
};

type TransactionLogRow = {
  id: string;
  amount: number;
  created_at: Date;
  description: string;
  reason: string;
  student_name: string;
  student_username: string;
  type: TransactionLogItem["type"];
};

export type CreatePointTransactionInput = {
  amount: number;
  reason: string;
  studentUserId: string;
};

export class TransactionService {
  async getStudentBalance(userId: string): Promise<number> {
    const result = await db.query<{ balance: number }>(
      `
        select
          coalesce((
            select sum(amount)
            from point_transactions
            where student_user_id = $1
          ), 0)
          -
          coalesce((
            select sum(price_at_purchase)
            from shop_purchases
            where purchased_by_user_id = $1
          ), 0) as balance
      `,
      [userId],
    );

    return Number(result.rows[0]?.balance ?? 0);
  }

  async listTransactions(userId: string, role: Role): Promise<TransactionLogItem[]> {
    const canViewAllTransactions = role === "admin" || role === "teacher";

    const result = await db.query<TransactionLogRow>(
      `
        select *
        from (
          select
            shop_purchases.id,
            -shop_purchases.price_at_purchase as amount,
            shop_purchases.purchased_at as created_at,
            'Shop purchase' as description,
            shop_items.name as reason,
            trim(users.first_name || ' ' || users.last_name) as student_name,
            users.username as student_username,
            'shop_purchase' as type
          from shop_purchases
          join shop_items on shop_items.id = shop_purchases.shop_item_id
          join users on users.id = shop_purchases.purchased_by_user_id
          where $1::boolean = true
            or shop_purchases.purchased_by_user_id = $2

          union all

          select
            point_transactions.id,
            point_transactions.amount,
            point_transactions.created_at,
            'Point adjustment' as description,
            point_transactions.reason,
            trim(users.first_name || ' ' || users.last_name) as student_name,
            users.username as student_username,
            'point_adjustment' as type
          from point_transactions
          join users on users.id = point_transactions.student_user_id
          where $1::boolean = true
            or point_transactions.student_user_id = $2
        ) as transaction_log
        order by created_at desc
      `,
      [canViewAllTransactions, userId],
    );

    return result.rows.map(this.mapTransactionRow);
  }

  async createPointTransaction(
    currentUser: SessionUser,
    input: CreatePointTransactionInput,
  ): Promise<ActionResult> {
    const reason = input.reason.trim();

    if (currentUser.role !== "teacher") {
      return {
        ok: false,
        message: "Only teachers can create point transactions.",
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

    try {
      await db.query(
        `
          insert into point_transactions (
            student_user_id,
            created_by_user_id,
            amount,
            reason
          )
          values ($1, $2, $3, $4)
        `,
        [input.studentUserId, currentUser.id, input.amount, reason],
      );

      return { ok: true };
    } catch (error) {
      console.error("Create point transaction failed", error);

      return {
        ok: false,
        message: "Could not create transaction.",
      };
    }
  }

  private mapTransactionRow(row: TransactionLogRow): TransactionLogItem {
    return {
      id: row.id,
      amount: row.amount,
      createdAt: row.created_at.toISOString(),
      description: row.description,
      reason: row.reason,
      studentName: row.student_name,
      studentUsername: row.student_username,
      type: row.type,
    };
  }
}
