import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/action-results";

export type SchoolInfo = {
  name: string;
  address: string;
  planType: string;
  currencyName: string;
  logoUrl: string;
};

export type UpdateSchoolInfoInput = Omit<SchoolInfo, "planType">;

export type UploadSchoolLogoResult =
  | {
      ok: true;
      logoUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

type SchoolInfoRow = {
  name: string;
  address: string;
  plan_type: string;
  currency_name: string;
  logo_url: string;
};

const logoUploadDirectory = path.join(process.cwd(), "public", "uploads", "logos");
const logoPublicPath = "/uploads/logos";
const bytesPerKilobyte = 1024;
const kilobytesPerMegabyte = 1024;
const maxLogoFileSizeMegabytes = 2;
const maxLogoFileSizeBytes =
  maxLogoFileSizeMegabytes * kilobytesPerMegabyte * bytesPerKilobyte;
const allowedLogoTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export class SchoolService {
  async getSchoolInfo(): Promise<SchoolInfo> {
    const result = await db.query<SchoolInfoRow>(`
      select name, address, plan_type, currency_name, logo_url
      from school_info
      where id = 1
      limit 1
    `);

    const schoolInfo = result.rows[0];

    if (!schoolInfo) {
      return {
        name: "SchoolBank School",
        address: "",
        planType: "trial",
        currencyName: "credits",
        logoUrl: "",
      };
    }

    return this.mapSchoolInfoRow(schoolInfo);
  }

  async updateSchoolInfo(input: UpdateSchoolInfoInput): Promise<ActionResult> {
    const name = input.name.trim();
    const address = input.address.trim();
    const currencyName = input.currencyName.trim();
    const logoUrl = input.logoUrl.trim();

    if (!name || !currencyName) {
      return {
        ok: false,
        message: "School name and currency name are required.",
      };
    }

    try {
      await db.query(
        `
          insert into school_info (id, name, address, currency_name, logo_url)
          values (1, $1, $2, $3, $4)
          on conflict (id) do update
          set name = excluded.name,
              address = excluded.address,
              currency_name = excluded.currency_name,
              logo_url = excluded.logo_url,
              updated_at = now()
        `,
        [name, address, currencyName, logoUrl],
      );

      return { ok: true };
    } catch (error) {
      console.error("Update school info failed", error);

      return {
        ok: false,
        message: "Could not update school info.",
      };
    }
  }

  async uploadLogo(file: File): Promise<UploadSchoolLogoResult> {
    if (!file || file.size === 0) {
      return {
        ok: false,
        message: "Choose a logo file.",
      };
    }

    if (file.size > maxLogoFileSizeBytes) {
      return {
        ok: false,
        message: `Logo must be ${maxLogoFileSizeMegabytes} MB or smaller.`,
      };
    }

    const extension = allowedLogoTypes.get(file.type);

    if (!extension) {
      return {
        ok: false,
        message: "Logo must be a PNG, JPG, WebP, or GIF file.",
      };
    }

    try {
      await mkdir(logoUploadDirectory, { recursive: true });

      const fileName = `${randomUUID()}.${extension}`;
      const filePath = path.join(logoUploadDirectory, fileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, fileBytes);

      return {
        ok: true,
        logoUrl: `${logoPublicPath}/${fileName}`,
      };
    } catch (error) {
      console.error("Upload school logo failed", error);

      return {
        ok: false,
        message: "Could not upload logo.",
      };
    }
  }

  private mapSchoolInfoRow(row: SchoolInfoRow): SchoolInfo {
    return {
      name: row.name,
      address: row.address,
      planType: row.plan_type,
      currencyName: row.currency_name,
      logoUrl: row.logo_url,
    };
  }
}
