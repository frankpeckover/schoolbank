import type { ActionResult } from "@/lib/action-results";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/session";
import { LedgerService } from "@/services/ledger-service";
import type { PoolClient } from "pg";

export type ShopPurchaseStatus = "pending" | "approved" | "denied";

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  isActive: boolean;
};

export type SaveShopItemInput = {
  id?: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
};

export type ShopPurchaseRequest = {
  decidedAt: string | null;
  decisionNote: string;
  id: string;
  isVoided: boolean;
  itemName: string;
  price: number;
  purchasedAt: string;
  status: ShopPurchaseStatus;
  studentName: string;
  studentUsername: string;
};

export type StudentShopRequest = {
  id: string;
  itemName: string;
  price: number;
  purchasedAt: string;
  decidedAt: string | null;
  decisionNote: string;
  isVoided: boolean;
  status: ShopPurchaseStatus;
};

type ShopItemRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  is_active: boolean;
};

type ShopPurchaseRequestRow = {
  decided_at: Date | null;
  decision_note: string;
  id: string;
  is_voided: boolean;
  item_name: string;
  price: number;
  purchased_at: Date;
  status: ShopPurchaseStatus;
  student_name: string;
  student_username: string;
};

type StudentShopRequestRow = {
  id: string;
  item_name: string;
  price: number;
  purchased_at: Date;
  decided_at: Date | null;
  decision_note: string;
  is_voided: boolean;
  status: ShopPurchaseStatus;
};

const ledgerService = new LedgerService();

export class ShopService {
  async listItems(includeInactive = false): Promise<ShopItem[]> {
    const result = await db.query<ShopItemRow>(
      `
        select id, name, description, price, quantity, is_active
        from shop_items
        where $1::boolean = true or is_active = true
        order by name
      `,
      [includeInactive],
    );

    return result.rows.map(this.mapShopItemRow);
  }

  async saveItem(input: SaveShopItemInput): Promise<ActionResult> {
    const name = input.name.trim();
    const description = input.description.trim();

    if (!name) {
      return {
        ok: false,
        message: "Enter an item name.",
      };
    }

    if (input.price < 0 || input.quantity < 0) {
      return {
        ok: false,
        message: "Price and quantity cannot be negative.",
      };
    }

    try {
      if (input.id) {
        await this.updateItem(input.id, name, description, input.price, input.quantity);
      } else {
        await this.createItem(name, description, input.price, input.quantity);
      }

      return { ok: true };
    } catch (error) {
      console.error("Save shop item failed", error);

      return {
        ok: false,
        message: "Could not save shop item.",
      };
    }
  }

  async removeItem(itemId: string): Promise<ActionResult> {
    await db.query(
      `
        update shop_items
        set is_active = false,
            updated_at = now()
        where id = $1
      `,
      [itemId],
    );

    return { ok: true };
  }

  async listPendingPurchaseRequests(
    currentUser: SessionUser,
  ): Promise<ShopPurchaseRequest[]> {
    return this.listStaffShopRequests(currentUser, true);
  }

  async listStaffShopRequests(
    currentUser: SessionUser,
    pendingOnly = false,
  ): Promise<ShopPurchaseRequest[]> {
    if (!this.canManagePurchases(currentUser)) {
      return [];
    }

    const result = await db.query<ShopPurchaseRequestRow>(
      `
        select
          shop_purchases.id,
          shop_items.name as item_name,
          shop_purchases.price_at_purchase as price,
          shop_purchases.purchased_at,
          shop_purchases.decided_at,
          shop_purchases.decision_note,
          shop_purchases.is_voided,
          shop_purchases.status,
          trim(users.first_name || ' ' || users.last_name) as student_name,
          users.username as student_username
        from shop_purchases
        join shop_items on shop_items.id = shop_purchases.shop_item_id
        join users on users.id = shop_purchases.purchased_by_user_id
        where ($1::boolean = false or shop_purchases.status = 'pending')
          and shop_purchases.is_voided = false
        order by
          case when shop_purchases.status = 'pending' then 0 else 1 end,
          shop_purchases.purchased_at desc
        limit 50
      `,
      [pendingOnly],
    );

    return result.rows.map(this.mapPurchaseRequestRow);
  }

  async listStudentShopRequests(
    currentUser: SessionUser,
  ): Promise<StudentShopRequest[]> {
    if (currentUser.role !== "student") {
      return [];
    }

    const result = await db.query<StudentShopRequestRow>(
      `
        select
          shop_purchases.id,
          shop_items.name as item_name,
          shop_purchases.price_at_purchase as price,
          shop_purchases.purchased_at,
          shop_purchases.decided_at,
          shop_purchases.decision_note,
          shop_purchases.is_voided,
          shop_purchases.status
        from shop_purchases
        join shop_items on shop_items.id = shop_purchases.shop_item_id
        where shop_purchases.purchased_by_user_id = $1
        order by shop_purchases.purchased_at desc
      `,
      [currentUser.id],
    );

    return result.rows.map(this.mapStudentShopRequestRow);
  }

  async requestPurchase(
    currentUser: SessionUser,
    itemId: string,
  ): Promise<ActionResult> {
    if (currentUser.role !== "student") {
      return {
        ok: false,
        message: "Only students can request shop items.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const itemResult = await client.query<ShopItemRow>(
        `
          select id, name, description, price, quantity, is_active
          from shop_items
          where id = $1
          for update
        `,
        [itemId],
      );

      const item = itemResult.rows[0];

      if (!item || !item.is_active || item.quantity <= 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "This item is not available.",
        };
      }

      const userResult = await client.query(
        `
          select id
          from users
          where id = $1
            and role = 'student'
            and is_active = true
          for update
        `,
        [currentUser.id],
      );

      if (userResult.rowCount === 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Student account was not found.",
        };
      }

      const balance = await this.getStudentBalance(client, currentUser.id);

      if (balance < item.price) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Not enough currency to purchase this item.",
        };
      }

      const purchaseResult = await client.query<{ id: string }>(
        `
          insert into shop_purchases (
            shop_item_id,
            purchased_by_user_id,
            price_at_purchase,
            status
          )
          values ($1, $2, $3, 'pending')
          returning id
        `,
        [itemId, currentUser.id, item.price],
      );

      const purchaseId = purchaseResult.rows[0].id;

      await ledgerService.createEntry(client, {
        amount: -item.price,
        createdByUserId: currentUser.id,
        description: item.name,
        entryType: "shop_hold",
        relatedEntityId: purchaseId,
        relatedEntityType: "shop_purchase",
        status: "pending",
        userId: currentUser.id,
      });

      await client.query(
        `
          update shop_items
          set quantity = quantity - 1,
              updated_at = now()
          where id = $1
        `,
        [itemId],
      );

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Request shop item failed", error);

      return {
        ok: false,
        message: "Could not request item.",
      };
    } finally {
      client.release();
    }
  }

  async approvePurchaseRequest(
    currentUser: SessionUser,
    purchaseId: string,
  ): Promise<ActionResult> {
    if (!this.canManagePurchases(currentUser)) {
      return {
        ok: false,
        message: "Only teachers can approve shop requests.",
      };
    }

    return this.decidePurchaseRequest(
      currentUser.id,
      purchaseId,
      "approved",
      "",
    );
  }

  async denyPurchaseRequest(
    currentUser: SessionUser,
    purchaseId: string,
    decisionNote: string,
  ): Promise<ActionResult> {
    if (!this.canManagePurchases(currentUser)) {
      return {
        ok: false,
        message: "Only teachers can deny shop requests.",
      };
    }

    return this.decidePurchaseRequest(
      currentUser.id,
      purchaseId,
      "denied",
      decisionNote.trim(),
    );
  }

  private canManagePurchases(currentUser: SessionUser) {
    return currentUser.role === "teacher";
  }

  private async decidePurchaseRequest(
    decidedByUserId: string,
    purchaseId: string,
    status: Extract<ShopPurchaseStatus, "approved" | "denied">,
    decisionNote: string,
  ): Promise<ActionResult> {
    const client = await db.connect();

    try {
      await client.query("begin");

      const result = await client.query<{ shop_item_id: string }>(
        `
          update shop_purchases
          set status = $1,
              decided_by_user_id = $2,
              decided_at = now(),
              decision_note = $3
          where id = $4
            and status = 'pending'
            and is_voided = false
          returning shop_item_id
        `,
        [status, decidedByUserId, decisionNote, purchaseId],
      );

      const purchase = result.rows[0];

      if (!purchase) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Request was not found or has already been actioned.",
        };
      }

      if (status === "denied") {
        await this.restoreReservedStock(client, purchase.shop_item_id);
        await ledgerService.voidRelatedEntry(
          client,
          "shop_purchase",
          purchaseId,
          decidedByUserId,
          decisionNote,
        );
      } else {
        await ledgerService.postRelatedEntry(
          client,
          "shop_purchase",
          purchaseId,
          "shop_purchase",
        );
      }

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Decide shop request failed", error);

      return {
        ok: false,
        message: "Could not update shop request.",
      };
    } finally {
      client.release();
    }
  }

  private async restoreReservedStock(client: PoolClient, itemId: string) {
    await client.query(
      `
        update shop_items
        set quantity = quantity + 1,
            updated_at = now()
        where id = $1
      `,
      [itemId],
    );
  }

  private async createItem(
    name: string,
    description: string,
    price: number,
    quantity: number,
  ) {
    await db.query(
      `
        insert into shop_items (name, description, price, quantity)
        values ($1, $2, $3, $4)
      `,
      [name, description, price, quantity],
    );
  }

  private async updateItem(
    itemId: string,
    name: string,
    description: string,
    price: number,
    quantity: number,
  ) {
    await db.query(
      `
        update shop_items
        set name = $1,
            description = $2,
            price = $3,
            quantity = $4,
            updated_at = now()
        where id = $5
      `,
      [name, description, price, quantity, itemId],
    );
  }

  private async getStudentBalance(client: PoolClient, userId: string) {
    return ledgerService.getAvailableBalance(client, userId);
  }

  private mapShopItemRow(item: ShopItemRow): ShopItem {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      isActive: item.is_active,
    };
  }

  private mapPurchaseRequestRow(
    purchase: ShopPurchaseRequestRow,
  ): ShopPurchaseRequest {
    return {
      decidedAt: purchase.decided_at ? purchase.decided_at.toISOString() : null,
      decisionNote: purchase.decision_note,
      id: purchase.id,
      isVoided: purchase.is_voided,
      itemName: purchase.item_name,
      price: purchase.price,
      purchasedAt: purchase.purchased_at.toISOString(),
      status: purchase.status,
      studentName: purchase.student_name,
      studentUsername: purchase.student_username,
    };
  }

  private mapStudentShopRequestRow(
    request: StudentShopRequestRow,
  ): StudentShopRequest {
    return {
      id: request.id,
      itemName: request.item_name,
      price: request.price,
      purchasedAt: request.purchased_at.toISOString(),
      decidedAt: request.decided_at ? request.decided_at.toISOString() : null,
      decisionNote: request.decision_note,
      isVoided: request.is_voided,
      status: request.status,
    };
  }
}
