import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/action-results";

export type SchoolInfo = {
  name: string;
  address: string;
  planType: string;
  currencyName: string;
};

export type UpdateSchoolInfoInput = Omit<SchoolInfo, "planType">;

type SchoolInfoRow = {
  name: string;
  address: string;
  plan_type: string;
  currency_name: string;
};

export class SchoolService {
  async getSchoolInfo(): Promise<SchoolInfo> {
    const result = await db.query<SchoolInfoRow>(`
      select name, address, plan_type, currency_name
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
      };
    }

    return this.mapSchoolInfoRow(schoolInfo);
  }

  async updateSchoolInfo(input: UpdateSchoolInfoInput): Promise<ActionResult> {
    const name = input.name.trim();
    const address = input.address.trim();
    const currencyName = input.currencyName.trim();

    if (!name || !currencyName) {
      return {
        ok: false,
        message: "School name and currency name are required.",
      };
    }

    try {
      await db.query(
        `
          insert into school_info (id, name, address, currency_name)
          values (1, $1, $2, $3)
          on conflict (id) do update
          set name = excluded.name,
              address = excluded.address,
              currency_name = excluded.currency_name,
              updated_at = now()
        `,
        [name, address, currencyName],
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

  private mapSchoolInfoRow(row: SchoolInfoRow): SchoolInfo {
    return {
      name: row.name,
      address: row.address,
      planType: row.plan_type,
      currencyName: row.currency_name,
    };
  }
}
