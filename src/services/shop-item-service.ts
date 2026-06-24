import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ActionResult } from "@/lib/action-results";
import { db } from "@/lib/db";
import { canManageShopItems } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import { AuditService } from "@/services/audit-service";
import type {
  SaveShopItemInput,
  ShopItem,
  ShopItemRow,
} from "@/services/shop-types";

const auditService = new AuditService();
const imageUploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "shop-items",
);
const imagePublicPath = "/uploads/shop-items";
const bytesPerKilobyte = 1024;
const kilobytesPerMegabyte = 1024;
const maxImageFileSizeMegabytes = 2;
const maxImageFileSizeBytes =
  maxImageFileSizeMegabytes * kilobytesPerMegabyte * bytesPerKilobyte;
const allowedImageTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type UploadShopItemImageResult =
  | {
      ok: true;
      imageUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export class ShopItemService {
  async listItems(includeInactive = false): Promise<ShopItem[]> {
    await ensureShopItemColumns();

    const result = await db.query<ShopItemRow>(
      `
        select id, name, description, image_url, price, quantity, is_active
        from shop_items
        where $1::boolean = true or is_active = true
        order by name
      `,
      [includeInactive],
    );

    return result.rows.map(mapShopItemRow);
  }

  async saveItem(
    currentUser: SessionUser,
    input: SaveShopItemInput,
  ): Promise<ActionResult> {
    if (!canManageShopItems(currentUser)) {
      return {
        ok: false,
        message: "Only staff can manage shop items.",
      };
    }

    const name = input.name.trim();
    const description = input.description.trim();
    const imageUrl = input.imageUrl.trim();

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

    const client = await db.connect();

    try {
      await client.query("begin");
      await ensureShopItemColumns(client);

      let itemId = input.id;

      if (input.id) {
        await updateItem(
          client,
          input.id,
          name,
          description,
          imageUrl,
          input.price,
          input.quantity,
        );
      } else {
        itemId = await createItem(
          client,
          name,
          description,
          imageUrl,
          input.price,
          input.quantity,
        );
      }

      await auditService.logWithClient(client, {
        action: input.id ? "shop_item.updated" : "shop_item.created",
        actorUserId: currentUser.id,
        details: {
          name,
          hasImage: Boolean(imageUrl),
          price: input.price,
          quantity: input.quantity,
        },
        entityId: itemId,
        entityType: "shop_item",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Save shop item failed", error);

      return {
        ok: false,
        message: "Could not save shop item.",
      };
    } finally {
      client.release();
    }
  }

  async removeItem(currentUser: SessionUser, itemId: string): Promise<ActionResult> {
    if (!canManageShopItems(currentUser)) {
      return {
        ok: false,
        message: "Only staff can manage shop items.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      await client.query(
        `
          update shop_items
          set is_active = false,
              updated_at = now()
          where id = $1
        `,
        [itemId],
      );

      await auditService.logWithClient(client, {
        action: "shop_item.removed",
        actorUserId: currentUser.id,
        entityId: itemId,
        entityType: "shop_item",
      });

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      console.error("Remove shop item failed", error);

      return {
        ok: false,
        message: "Could not remove shop item.",
      };
    } finally {
      client.release();
    }

    return { ok: true };
  }

  async uploadImage(file: File): Promise<UploadShopItemImageResult> {
    if (!file || file.size === 0) {
      return {
        ok: false,
        message: "Choose an item image.",
      };
    }

    if (file.size > maxImageFileSizeBytes) {
      return {
        ok: false,
        message: `Image must be ${maxImageFileSizeMegabytes} MB or smaller.`,
      };
    }

    const extension = allowedImageTypes.get(file.type);

    if (!extension) {
      return {
        ok: false,
        message: "Image must be a PNG, JPG, WebP, or GIF file.",
      };
    }

    try {
      await mkdir(imageUploadDirectory, { recursive: true });

      const fileName = `${randomUUID()}.${extension}`;
      const filePath = path.join(imageUploadDirectory, fileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, fileBytes);

      return {
        ok: true,
        imageUrl: `${imagePublicPath}/${fileName}`,
      };
    } catch (error) {
      console.error("Upload shop item image failed", error);

      return {
        ok: false,
        message: "Could not upload item image.",
      };
    }
  }
}

async function createItem(
  client: import("pg").PoolClient,
  name: string,
  description: string,
  imageUrl: string,
  price: number,
  quantity: number,
) {
  const result = await client.query<{ id: string }>(
    `
      insert into shop_items (name, description, image_url, price, quantity)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [name, description, imageUrl, price, quantity],
  );

  return result.rows[0].id;
}

async function updateItem(
  client: import("pg").PoolClient,
  itemId: string,
  name: string,
  description: string,
  imageUrl: string,
  price: number,
  quantity: number,
) {
  await client.query(
    `
      update shop_items
      set name = $1,
          description = $2,
          image_url = $3,
          price = $4,
          quantity = $5,
          updated_at = now()
      where id = $6
    `,
    [name, description, imageUrl, price, quantity, itemId],
  );
}

function mapShopItemRow(item: ShopItemRow): ShopItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.image_url,
    price: item.price,
    quantity: item.quantity,
    isActive: item.is_active,
  };
}

async function ensureShopItemColumns(client: Pick<typeof db, "query"> = db) {
  await client.query(`
    alter table shop_items
      add column if not exists image_url text not null default ''
  `);
}
