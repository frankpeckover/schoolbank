import type { ActionResult } from "@/lib/action-results";
import { db } from "@/lib/db";
import type { PoolClient } from "pg";

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

type ShopItemRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  is_active: boolean;
};

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

  async purchaseItem(userId: string, itemId: string): Promise<ActionResult> {
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

      await client.query(
        `
          select id
          from users
          where id = $1
          for update
        `,
        [userId],
      );

      const balance = await this.getStudentBalance(client, userId);

      if (balance < item.price) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Not enough currency to purchase this item.",
        };
      }

      await client.query(
        `
          insert into shop_purchases (
            shop_item_id,
            purchased_by_user_id,
            price_at_purchase
          )
          values ($1, $2, $3)
        `,
        [itemId, userId, item.price],
      );

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
      console.error("Purchase shop item failed", error);

      return {
        ok: false,
        message: "Could not purchase item.",
      };
    } finally {
      client.release();
    }
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
    const result = await client.query<{ balance: number }>(
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
}
