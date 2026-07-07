import { db } from "@/lib/db";
import type { ApiClient } from "@/lib/api/api-types";
import { AuditService } from "@/services/audit-service";
import { LedgerService, type LedgerEntryType } from "@/services/ledger-service";
import type { PoolClient } from "pg";

type ApiLedgerInput = {
  amount: unknown;
  description: unknown;
  studentUserId: unknown;
};

type ApiHoldActionInput = {
  description?: unknown;
};

type StudentBalanceData = {
  balance: number;
  firstName: string;
  lastName: string;
  studentUserId: string;
  username: string;
};

type StudentRow = {
  first_name: string;
  id: string;
  last_name: string;
  username: string;
};

type BalanceRow = StudentRow & {
  balance: number;
};

type LedgerEntryRow = {
  amount: number;
  description: string;
  entry_type: LedgerEntryType;
  id: string;
  is_voided: boolean;
  status: string;
  student_user_id: string;
};

const auditService = new AuditService();
const ledgerService = new LedgerService();
const maxApiAmount = 1_000_000;
const apiControlledEntryTypes = new Set<LedgerEntryType>(["credit", "debit", "hold"]);
const apiRelatedEntityType = "api_client";

export class ApiFinanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export class ApiFinanceService {
  async getStudentBalance(studentUserId: string) {
    const client = await db.connect();

    try {
      return this.getStudentBalanceData(client, studentUserId);
    } finally {
      client.release();
    }
  }

  async createCredit(apiClient: ApiClient, input: ApiLedgerInput) {
    return this.createLedgerMovement(apiClient, input, {
      amountDirection: 1,
      auditAction: "finance_api.credit_created",
      entryType: "credit",
    });
  }

  async createDebit(apiClient: ApiClient, input: ApiLedgerInput) {
    return this.createLedgerMovement(apiClient, input, {
      amountDirection: -1,
      auditAction: "finance_api.debit_created",
      entryType: "debit",
    });
  }

  async createHold(apiClient: ApiClient, input: ApiLedgerInput) {
    const ledgerInput = parseLedgerInput(input);
    const client = await db.connect();

    try {
      await client.query("begin");
      const student = await this.getActiveStudentForUpdate(
        client,
        ledgerInput.studentUserId,
      );
      const currentBalance = await ledgerService.getAvailableBalance(
        client,
        student.id,
      );

      if (currentBalance < ledgerInput.amount) {
        throw new ApiFinanceError(
          "insufficient_balance",
          "Student does not have enough available balance.",
          409,
        );
      }

      const ledgerEntryId = await ledgerService.createEntry(client, {
        amount: -ledgerInput.amount,
        description: ledgerInput.description,
        entryType: "hold",
        relatedEntityId: apiClient.id,
        relatedEntityType: apiRelatedEntityType,
        status: "pending",
        userId: student.id,
      });
      const balance = await ledgerService.getAvailableBalance(client, student.id);

      await this.logApiLedgerAction(client, apiClient, {
        action: "finance_api.hold_created",
        amount: -ledgerInput.amount,
        description: ledgerInput.description,
        ledgerEntryId,
        studentUserId: student.id,
      });

      await client.query("commit");

      return buildLedgerResponse({
        amount: -ledgerInput.amount,
        balance,
        description: ledgerInput.description,
        ledgerEntryId,
        student,
      });
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async captureHold(
    apiClient: ApiClient,
    holdId: string,
    input: ApiHoldActionInput,
  ) {
    const description = getOptionalDescription(input.description);
    const client = await db.connect();

    try {
      await client.query("begin");
      const hold = await this.getApiHoldForUpdate(client, apiClient.id, holdId);
      const finalDescription = description || hold.description;

      await client.query(
        `
          update ledger_entries
          set status = 'posted',
              entry_type = 'debit',
              description = $2
          where id = $1
        `,
        [hold.id, finalDescription],
      );

      const student = await this.getActiveStudentForUpdate(
        client,
        hold.student_user_id,
      );
      const balance = await ledgerService.getAvailableBalance(client, student.id);

      await this.logApiLedgerAction(client, apiClient, {
        action: "finance_api.hold_captured",
        amount: hold.amount,
        description: finalDescription,
        ledgerEntryId: hold.id,
        studentUserId: student.id,
      });

      await client.query("commit");

      return buildLedgerResponse({
        amount: hold.amount,
        balance,
        description: finalDescription,
        ledgerEntryId: hold.id,
        student,
      });
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseHold(
    apiClient: ApiClient,
    holdId: string,
    input: ApiHoldActionInput,
  ) {
    const description = getOptionalDescription(input.description) || "Hold released";
    const client = await db.connect();

    try {
      await client.query("begin");
      const hold = await this.getApiHoldForUpdate(client, apiClient.id, holdId);
      const voidedEntry = await ledgerService.voidEntry(
        client,
        hold.id,
        null,
        description,
      );

      if (!voidedEntry) {
        throw new ApiFinanceError(
          "hold_not_found",
          "Hold could not be released.",
          404,
        );
      }

      const student = await this.getActiveStudentForUpdate(
        client,
        hold.student_user_id,
      );
      const balance = await ledgerService.getAvailableBalance(client, student.id);

      await this.logApiLedgerAction(client, apiClient, {
        action: "finance_api.hold_released",
        amount: -hold.amount,
        description,
        ledgerEntryId: hold.id,
        studentUserId: student.id,
      });

      await client.query("commit");

      return buildLedgerResponse({
        amount: -hold.amount,
        balance,
        description,
        ledgerEntryId: hold.id,
        student,
      });
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async voidApiEntry(
    apiClient: ApiClient,
    ledgerEntryId: string,
    input: ApiHoldActionInput,
  ) {
    const description = getOptionalDescription(input.description) || "API entry voided";
    const client = await db.connect();

    try {
      await client.query("begin");
      const entry = await this.getApiEntryForUpdate(
        client,
        apiClient.id,
        ledgerEntryId,
      );
      const voidedEntry = await ledgerService.voidEntry(
        client,
        entry.id,
        null,
        description,
      );

      if (!voidedEntry) {
        throw new ApiFinanceError(
          "entry_not_found",
          "Ledger entry could not be voided.",
          404,
        );
      }

      const student = await this.getActiveStudentForUpdate(
        client,
        entry.student_user_id,
      );
      const balance = await ledgerService.getAvailableBalance(client, student.id);

      await this.logApiLedgerAction(client, apiClient, {
        action: "finance_api.entry_voided",
        amount: -entry.amount,
        description,
        ledgerEntryId: entry.id,
        studentUserId: student.id,
      });

      await client.query("commit");

      return buildLedgerResponse({
        amount: -entry.amount,
        balance,
        description,
        ledgerEntryId: entry.id,
        student,
      });
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async createLedgerMovement(
    apiClient: ApiClient,
    input: ApiLedgerInput,
    options: {
      amountDirection: 1 | -1;
      auditAction: string;
      entryType: Extract<LedgerEntryType, "credit" | "debit">;
    },
  ) {
    const ledgerInput = parseLedgerInput(input);
    const signedAmount = ledgerInput.amount * options.amountDirection;
    const client = await db.connect();

    try {
      await client.query("begin");
      const student = await this.getActiveStudentForUpdate(
        client,
        ledgerInput.studentUserId,
      );

      if (signedAmount < 0) {
        const currentBalance = await ledgerService.getAvailableBalance(
          client,
          student.id,
        );

        if (currentBalance + signedAmount < 0) {
          throw new ApiFinanceError(
            "insufficient_balance",
            "Student does not have enough available balance.",
            409,
          );
        }
      }

      const ledgerEntryId = await ledgerService.createEntry(client, {
        amount: signedAmount,
        description: ledgerInput.description,
        entryType: options.entryType,
        relatedEntityId: apiClient.id,
        relatedEntityType: apiRelatedEntityType,
        status: "posted",
        userId: student.id,
      });
      const balance = await ledgerService.getAvailableBalance(client, student.id);

      await this.logApiLedgerAction(client, apiClient, {
        action: options.auditAction,
        amount: signedAmount,
        description: ledgerInput.description,
        ledgerEntryId,
        studentUserId: student.id,
      });

      await client.query("commit");

      return buildLedgerResponse({
        amount: signedAmount,
        balance,
        description: ledgerInput.description,
        ledgerEntryId,
        student,
      });
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async getStudentBalanceData(
    client: PoolClient,
    studentUserId: string,
  ): Promise<StudentBalanceData> {
    assertUuid(studentUserId, "studentUserId");

    const result = await client.query<BalanceRow>(
      `
        select
          users.id,
          users.first_name,
          users.last_name,
          users.username,
          coalesce(sum(ledger_entries.amount), 0) as balance
        from users
        join roles on roles.id = users.role_id
        left join accounts on accounts.user_id = users.id
        left join ledger_entries
          on ledger_entries.account_id = accounts.id
          and ledger_entries.status in ('pending', 'posted')
          and not (
            ledger_entries.status = 'pending'
            and ledger_entries.is_voided = true
          )
        where users.id = $1
          and users.is_active = true
          and roles.role_key = 'student'
          and roles.is_active = true
        group by users.id, users.first_name, users.last_name, users.username
      `,
      [studentUserId],
    );
    const student = result.rows[0];

    if (!student) {
      throw new ApiFinanceError(
        "student_not_found",
        "Active student was not found.",
        404,
      );
    }

    return {
      balance: Number(student.balance),
      firstName: student.first_name,
      lastName: student.last_name,
      studentUserId: student.id,
      username: student.username,
    };
  }

  private async getActiveStudentForUpdate(
    client: PoolClient,
    studentUserId: string,
  ) {
    assertUuid(studentUserId, "studentUserId");

    const result = await client.query<StudentRow>(
      `
        select users.id, users.first_name, users.last_name, users.username
        from users
        join roles on roles.id = users.role_id
        where users.id = $1
          and users.is_active = true
          and roles.role_key = 'student'
          and roles.is_active = true
        for update of users
      `,
      [studentUserId],
    );
    const student = result.rows[0];

    if (!student) {
      throw new ApiFinanceError(
        "student_not_found",
        "Active student was not found.",
        404,
      );
    }

    return student;
  }

  private async getApiHoldForUpdate(
    client: PoolClient,
    apiClientId: string,
    holdId: string,
  ) {
    const entry = await this.getApiEntryForUpdate(client, apiClientId, holdId);

    if (entry.entry_type !== "hold" || entry.status !== "pending") {
      throw new ApiFinanceError(
        "hold_not_found",
        "Active API hold was not found.",
        404,
      );
    }

    return entry;
  }

  private async getApiEntryForUpdate(
    client: PoolClient,
    apiClientId: string,
    ledgerEntryId: string,
  ) {
    assertUuid(ledgerEntryId, "ledgerEntryId");

    const result = await client.query<LedgerEntryRow>(
      `
        select
          ledger_entries.id,
          ledger_entries.amount,
          ledger_entries.description,
          ledger_entries.entry_type,
          ledger_entries.status,
          ledger_entries.is_voided,
          accounts.user_id as student_user_id
        from ledger_entries
        join accounts on accounts.id = ledger_entries.account_id
        where ledger_entries.id = $1
          and ledger_entries.related_entity_type = $2
          and ledger_entries.related_entity_id = $3
        for update of ledger_entries
      `,
      [ledgerEntryId, apiRelatedEntityType, apiClientId],
    );
    const entry = result.rows[0];

    if (
      !entry ||
      entry.is_voided ||
      entry.status === "voided" ||
      !apiControlledEntryTypes.has(entry.entry_type)
    ) {
      throw new ApiFinanceError(
        "entry_not_found",
        "Active API ledger entry was not found.",
        404,
      );
    }

    return entry;
  }

  private async logApiLedgerAction(
    client: PoolClient,
    apiClient: ApiClient,
    input: {
      action: string;
      amount: number;
      description: string;
      ledgerEntryId: string;
      studentUserId: string;
    },
  ) {
    await auditService.logWithClient(client, {
      action: input.action,
      actorUserId: null,
      details: {
        amount: input.amount,
        apiClientId: apiClient.id,
        apiClientName: apiClient.name,
        description: input.description,
        studentUserId: input.studentUserId,
      },
      entityId: input.ledgerEntryId,
      entityType: "ledger_entry",
    });
  }
}

function parseLedgerInput(input: ApiLedgerInput) {
  const amount = parsePositiveInteger(input.amount, "amount");
  const description = parseRequiredString(input.description, "description");
  const studentUserId = parseRequiredString(input.studentUserId, "studentUserId");

  assertUuid(studentUserId, "studentUserId");

  return {
    amount,
    description,
    studentUserId,
  };
}

function buildLedgerResponse(input: {
  amount: number;
  balance: number;
  description: string;
  ledgerEntryId: string;
  student: StudentRow;
}) {
  return {
    amount: input.amount,
    balance: input.balance,
    description: input.description,
    ledgerEntryId: input.ledgerEntryId,
    student: {
      firstName: input.student.first_name,
      lastName: input.student.last_name,
      studentUserId: input.student.id,
      username: input.student.username,
    },
  };
}

function parsePositiveInteger(value: unknown, fieldName: string) {
  const amount = typeof value === "number" ? value : Number(value);

  if (
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > maxApiAmount
  ) {
    throw new ApiFinanceError(
      "invalid_amount",
      `${fieldName} must be a positive whole number no greater than ${maxApiAmount}.`,
      400,
    );
  }

  return amount;
}

function parseRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiFinanceError(
      "invalid_field",
      `${fieldName} is required.`,
      400,
    );
  }

  return value.trim();
}

function getOptionalDescription(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  return parseRequiredString(value, "description");
}

function assertUuid(value: string, fieldName: string) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    throw new ApiFinanceError(
      "invalid_uuid",
      `${fieldName} must be a valid UUID.`,
      400,
    );
  }
}

async function rollback(client: PoolClient) {
  try {
    await client.query("rollback");
  } catch (error) {
    console.error("API finance rollback failed", error);
  }
}
