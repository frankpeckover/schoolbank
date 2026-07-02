import type { PoolClient } from "pg";
import type { ActionResult } from "@/lib/action-results";
import { db } from "@/lib/db";
import { isAdmin, isStudent } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import { AuditService } from "@/services/audit-service";
import { LedgerService } from "@/services/ledger-service";

export type TermDepositSettings = {
  interestRate: number;
  isEnabled: boolean;
  maximumActiveDeposits: number;
  maximumAmount: number;
  minimumAmount: number;
  termDays: number;
};

export type UpdateTermDepositSettingsInput = TermDepositSettings;

export type CreateTermDepositInput = {
  amount: number;
};

export type StudentTermDeposit = {
  id: string;
  interestAmount: number;
  interestRate: number;
  maturesAt: string;
  maturityAmount: number;
  principalAmount: number;
  startsAt: string;
  status: TermDepositStatus;
};

type TermDepositStatus = "active" | "paid_out" | "cancelled";

type TermDepositSettingsRow = {
  interest_rate: string;
  is_enabled: boolean;
  maximum_active_deposits: number;
  maximum_amount: number;
  minimum_amount: number;
  term_days: number;
};

type StudentTermDepositRow = {
  id: string;
  interest_amount: number;
  interest_rate: string;
  matures_at: Date;
  maturity_amount: number;
  principal_amount: number;
  starts_at: Date;
  status: TermDepositStatus;
};

const defaultTermDepositSettings: TermDepositSettings = {
  interestRate: 5,
  isEnabled: false,
  maximumActiveDeposits: 1,
  maximumAmount: 0,
  minimumAmount: 50,
  termDays: 7,
};
const termDepositEntityType = "term_deposit";
const ledgerService = new LedgerService();
const auditService = new AuditService();

export class TermDepositService {
  async getSettings(): Promise<TermDepositSettings> {
    const result = await db.query<TermDepositSettingsRow>(`
      select
        is_enabled,
        minimum_amount,
        maximum_amount,
        term_days,
        interest_rate,
        maximum_active_deposits
      from term_deposit_settings
      where id = 1
      limit 1
    `);

    const settings = result.rows[0];

    return settings
      ? mapTermDepositSettingsRow(settings)
      : defaultTermDepositSettings;
  }

  async updateSettings(
    currentUser: SessionUser,
    input: UpdateTermDepositSettingsInput,
  ): Promise<ActionResult> {
    if (!isAdmin(currentUser)) {
      return {
        ok: false,
        message: "Only admins can update term deposit settings.",
      };
    }

    const settings = normaliseSettings(input);
    const validationMessage = validateSettings(settings);

    if (validationMessage) {
      return {
        ok: false,
        message: validationMessage,
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      await client.query(
        `
          insert into term_deposit_settings (
            id,
            is_enabled,
            minimum_amount,
            maximum_amount,
            term_days,
            interest_rate,
            maximum_active_deposits
          )
          values (1, $1, $2, $3, $4, $5, $6)
          on conflict (id) do update
          set is_enabled = excluded.is_enabled,
              minimum_amount = excluded.minimum_amount,
              maximum_amount = excluded.maximum_amount,
              term_days = excluded.term_days,
              interest_rate = excluded.interest_rate,
              maximum_active_deposits = excluded.maximum_active_deposits,
              updated_at = now()
        `,
        [
          settings.isEnabled,
          settings.minimumAmount,
          settings.maximumAmount,
          settings.termDays,
          settings.interestRate,
          settings.maximumActiveDeposits,
        ],
      );

      await auditService.logWithClient(client, {
        action: "term_deposit_settings.updated",
        actorUserId: currentUser.id,
        details: settings,
        entityId: null,
        entityType: "term_deposit_settings",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Update term deposit settings failed", error);

      return {
        ok: false,
        message: "Could not update term deposit settings.",
      };
    } finally {
      client.release();
    }
  }

  async listStudentDeposits(
    currentUser: SessionUser,
  ): Promise<StudentTermDeposit[]> {
    if (!isStudent(currentUser)) {
      return [];
    }

    await this.payMaturedDeposits(currentUser.id);

    const result = await db.query<StudentTermDepositRow>(
      `
        select
          id,
          principal_amount,
          interest_rate,
          interest_amount,
          maturity_amount,
          status,
          starts_at,
          matures_at
        from student_term_deposits
        where user_id = $1
        order by
          case when status = 'active' then 0 else 1 end,
          matures_at asc,
          starts_at desc
        limit 10
      `,
      [currentUser.id],
    );

    return result.rows.map(mapStudentTermDepositRow);
  }

  async createDeposit(
    currentUser: SessionUser,
    input: CreateTermDepositInput,
  ): Promise<ActionResult> {
    if (!isStudent(currentUser)) {
      return {
        ok: false,
        message: "Only students can create term deposits.",
      };
    }

    const amount = Math.floor(input.amount);

    if (!Number.isInteger(amount) || amount <= 0) {
      return {
        ok: false,
        message: "Enter a whole number amount greater than 0.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");
      await this.payMaturedDepositsWithClient(client, currentUser.id);

      const settings = await getSettingsWithClient(client);
      const validationMessage = validateDepositAmount(amount, settings);

      if (validationMessage) {
        await client.query("rollback");
        return {
          ok: false,
          message: validationMessage,
        };
      }

      const activeCount = await getActiveDepositCount(client, currentUser.id);

      if (activeCount >= settings.maximumActiveDeposits) {
        await client.query("rollback");
        return {
          ok: false,
          message: `You can only have ${settings.maximumActiveDeposits} active term deposit at a time.`,
        };
      }

      const balance = await ledgerService.getAvailableBalance(
        client,
        currentUser.id,
      );

      if (balance < amount) {
        await client.query("rollback");
        return {
          ok: false,
          message: "You do not have enough available balance.",
        };
      }

      const interestAmount = calculateInterestAmount(
        amount,
        settings.interestRate,
      );
      const maturityAmount = amount + interestAmount;

      const deposit = await client.query<{ id: string }>(
        `
          insert into student_term_deposits (
            user_id,
            principal_amount,
            interest_rate,
            interest_amount,
            maturity_amount,
            matures_at
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            now() + ($6::int * interval '1 day')
          )
          returning id
        `,
        [
          currentUser.id,
          amount,
          settings.interestRate,
          interestAmount,
          maturityAmount,
          settings.termDays,
        ],
      );
      const depositId = deposit.rows[0].id;

      const holdLedgerEntryId = await ledgerService.createEntry(client, {
        amount: -amount,
        description: `Term deposit for ${settings.termDays} days`,
        entryType: "term_deposit_hold",
        relatedEntityId: depositId,
        relatedEntityType: termDepositEntityType,
        status: "posted",
        userId: currentUser.id,
      });

      await client.query(
        `
          update student_term_deposits
          set hold_ledger_entry_id = $1
          where id = $2
        `,
        [holdLedgerEntryId, depositId],
      );

      await auditService.logWithClient(client, {
        action: "term_deposit.created",
        actorUserId: currentUser.id,
        details: {
          amount,
          interestAmount,
          interestRate: settings.interestRate,
          maturityAmount,
          termDays: settings.termDays,
        },
        entityId: depositId,
        entityType: termDepositEntityType,
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Create term deposit failed", error);

      return {
        ok: false,
        message: "Could not create term deposit.",
      };
    } finally {
      client.release();
    }
  }

  private async payMaturedDeposits(userId: string) {
    const client = await db.connect();

    try {
      await client.query("begin");
      await this.payMaturedDepositsWithClient(client, userId);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      console.error("Pay matured term deposits failed", error);
    } finally {
      client.release();
    }
  }

  private async payMaturedDepositsWithClient(
    client: PoolClient,
    userId: string,
  ) {
    const maturedDeposits = await client.query<{
      id: string;
      maturity_amount: number;
    }>(
      `
        select id, maturity_amount
        from student_term_deposits
        where user_id = $1
          and status = 'active'
          and matures_at <= now()
        for update
      `,
      [userId],
    );

    for (const deposit of maturedDeposits.rows) {
      const payoutLedgerEntryId = await ledgerService.createEntry(client, {
        amount: Number(deposit.maturity_amount),
        description: "Term deposit matured",
        entryType: "term_deposit_payout",
        relatedEntityId: deposit.id,
        relatedEntityType: termDepositEntityType,
        status: "posted",
        userId,
      });

      await client.query(
        `
          update student_term_deposits
          set status = 'paid_out',
              paid_out_at = now(),
              payout_ledger_entry_id = $1
          where id = $2
            and status = 'active'
        `,
        [payoutLedgerEntryId, deposit.id],
      );
    }
  }
}

async function getSettingsWithClient(client: Pick<typeof db, "query">) {
  const result = await client.query<TermDepositSettingsRow>(`
    select
      is_enabled,
      minimum_amount,
      maximum_amount,
      term_days,
      interest_rate,
      maximum_active_deposits
    from term_deposit_settings
    where id = 1
    limit 1
  `);

  return result.rows[0]
    ? mapTermDepositSettingsRow(result.rows[0])
    : defaultTermDepositSettings;
}

async function getActiveDepositCount(client: PoolClient, userId: string) {
  const result = await client.query<{ count: string }>(
    `
      select count(*) as count
      from student_term_deposits
      where user_id = $1
        and status = 'active'
    `,
    [userId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

function normaliseSettings(
  input: UpdateTermDepositSettingsInput,
): TermDepositSettings {
  return {
    interestRate: Number(input.interestRate),
    isEnabled: Boolean(input.isEnabled),
    maximumActiveDeposits: Math.floor(input.maximumActiveDeposits),
    maximumAmount: Math.max(0, Math.floor(input.maximumAmount)),
    minimumAmount: Math.floor(input.minimumAmount),
    termDays: Math.floor(input.termDays),
  };
}

function validateSettings(settings: TermDepositSettings) {
  if (settings.minimumAmount <= 0) {
    return "Minimum deposit must be greater than 0.";
  }

  if (
    settings.maximumAmount > 0 &&
    settings.maximumAmount < settings.minimumAmount
  ) {
    return "Maximum deposit must be higher than the minimum deposit.";
  }

  if (settings.termDays <= 0) {
    return "Term length must be at least 1 day.";
  }

  if (settings.interestRate < 0) {
    return "Interest rate cannot be negative.";
  }

  if (settings.maximumActiveDeposits <= 0) {
    return "Maximum active deposits must be at least 1.";
  }

  return null;
}

function validateDepositAmount(
  amount: number,
  settings: TermDepositSettings,
) {
  if (!settings.isEnabled) {
    return "Term deposits are not currently enabled.";
  }

  if (amount < settings.minimumAmount) {
    return `Minimum deposit is ${settings.minimumAmount}.`;
  }

  if (settings.maximumAmount > 0 && amount > settings.maximumAmount) {
    return `Maximum deposit is ${settings.maximumAmount}.`;
  }

  return null;
}

function calculateInterestAmount(amount: number, interestRate: number) {
  return Math.round(amount * (interestRate / 100));
}

function mapTermDepositSettingsRow(
  row: TermDepositSettingsRow,
): TermDepositSettings {
  return {
    interestRate: Number(row.interest_rate),
    isEnabled: row.is_enabled,
    maximumActiveDeposits: row.maximum_active_deposits,
    maximumAmount: row.maximum_amount,
    minimumAmount: row.minimum_amount,
    termDays: row.term_days,
  };
}

function mapStudentTermDepositRow(
  row: StudentTermDepositRow,
): StudentTermDeposit {
  return {
    id: row.id,
    interestAmount: row.interest_amount,
    interestRate: Number(row.interest_rate),
    maturesAt: row.matures_at.toISOString(),
    maturityAmount: row.maturity_amount,
    principalAmount: row.principal_amount,
    startsAt: row.starts_at.toISOString(),
    status: row.status,
  };
}
