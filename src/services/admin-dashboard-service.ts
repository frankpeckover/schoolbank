import { db } from "@/lib/db";
import type { AuditLogItem } from "@/services/audit-service";
import type { LedgerEntryStatus, LedgerEntryType } from "@/services/ledger-service";

export type AdminDashboardSummary = {
  activeUsers: number;
  circulationEntries: AdminDashboardEntry[];
  ledgerBalance: number;
  moneyIn: number;
  moneyOut: number;
  pendingHolds: number;
  pendingShopRequests: number;
  recentAuditEntries: AuditLogItem[];
  recentEntries: AdminDashboardEntry[];
  studentAccounts: number;
  topCreditIssuers: TeacherIssuerSummary[];
  topDemeritIssuers: TeacherIssuerSummary[];
  totalUsers: number;
};

export type AdminDashboardEntry = {
  amount: number;
  createdAt: string;
  description: string;
  entryStatus: LedgerEntryStatus;
  studentName: string;
  type: LedgerEntryType;
};

export type TeacherIssuerSummary = {
  amount: number;
  entryCount: number;
  teacherName: string;
  username: string;
};

type SummaryRow = {
  active_users: string;
  ledger_balance: string;
  money_in: string;
  money_out: string;
  pending_holds: string;
  pending_shop_requests: string;
  student_accounts: string;
  total_users: string;
};

type RecentEntryRow = {
  amount: number;
  created_at: Date;
  description: string;
  entry_status: LedgerEntryStatus;
  student_name: string;
  type: LedgerEntryType;
};

type TeacherIssuerRow = {
  amount: string;
  entry_count: string;
  teacher_name: string;
  username: string;
};

type AuditLogRow = {
  action: string;
  actor_name: string | null;
  actor_username: string | null;
  created_at: Date;
  details: Record<string, unknown>;
  entity_id: string | null;
  entity_type: string;
  id: string;
};

const recentLedgerLimit = 6;
const recentAuditLimit = 5;
const circulationHistoryDays = 180;
const adminAuditActionPrefixes = [
  "school_info.",
  "shop_item.",
  "student_group.",
  "term_deposit_settings.",
  "user.",
];

export class AdminDashboardService {
  async getSummary(): Promise<AdminDashboardSummary> {
    await ensureAdminAuditLogTable();

    const [
      summaryResult,
      recentResult,
      circulationResult,
      topCreditIssuers,
      topDemeritIssuers,
      recentAuditResult,
    ] = await Promise.all([
      db.query<SummaryRow>(`
        select
          (select count(*) from users) as total_users,
          (select count(*) from users where is_active = true) as active_users,
          (select count(*) from accounts) as student_accounts,
          (
            select count(*)
            from shop_purchases
            where status = 'pending'
              and is_voided = false
          ) as pending_shop_requests,
          coalesce((
            select sum(amount)
            from ledger_entries
            where status in ('pending', 'posted')
              and not (status = 'pending' and is_voided = true)
          ), 0) as ledger_balance,
          coalesce((
            select sum(amount)
            from ledger_entries
            where amount > 0
              and status = 'posted'
          ), 0) as money_in,
          coalesce((
            select abs(sum(amount))
            from ledger_entries
            where amount < 0
              and status = 'posted'
          ), 0) as money_out,
          coalesce((
            select abs(sum(amount))
            from ledger_entries
            where amount < 0
              and status = 'pending'
              and is_voided = false
          ), 0) as pending_holds
      `),
      db.query<RecentEntryRow>(`
        select
          ledger_entries.amount,
          ledger_entries.created_at,
          ledger_entries.description,
          ledger_entries.status as entry_status,
          trim(users.first_name || ' ' || users.last_name) as student_name,
          ledger_entries.entry_type as type
        from ledger_entries
        join accounts on accounts.id = ledger_entries.account_id
        join users on users.id = accounts.user_id
        order by ledger_entries.created_at desc
        limit $1
      `, [recentLedgerLimit]),
      db.query<RecentEntryRow>(`
        select
          ledger_entries.amount,
          ledger_entries.created_at,
          ledger_entries.description,
          ledger_entries.status as entry_status,
          trim(users.first_name || ' ' || users.last_name) as student_name,
          ledger_entries.entry_type as type
        from ledger_entries
        join accounts on accounts.id = ledger_entries.account_id
        join users on users.id = accounts.user_id
        where ledger_entries.status in ('pending', 'posted')
          and not (
            ledger_entries.status = 'pending'
            and ledger_entries.is_voided = true
          )
          and ledger_entries.created_at >= now() - ($1::int * interval '1 day')
        order by ledger_entries.created_at asc
      `, [circulationHistoryDays]),
      this.listTopIssuers("credit"),
      this.listTopIssuers("demerit"),
      db.query<AuditLogRow>(
        `
          select
            audit_log.id,
            audit_log.action,
            audit_log.entity_type,
            audit_log.entity_id,
            audit_log.details,
            audit_log.created_at,
            trim(users.first_name || ' ' || users.last_name) as actor_name,
            users.username as actor_username
          from audit_log
          left join users on users.id = audit_log.actor_user_id
          where ${buildAdminAuditActionFilter()}
          order by audit_log.created_at desc
          limit $${adminAuditActionPrefixes.length + 1}
        `,
        [...adminAuditActionPrefixes, recentAuditLimit],
      ),
    ]);

    const summary = summaryResult.rows[0];

    return {
      activeUsers: toNumber(summary.active_users),
      circulationEntries: circulationResult.rows.map(mapDashboardEntry),
      ledgerBalance: toNumber(summary.ledger_balance),
      moneyIn: toNumber(summary.money_in),
      moneyOut: toNumber(summary.money_out),
      pendingHolds: toNumber(summary.pending_holds),
      pendingShopRequests: toNumber(summary.pending_shop_requests),
      recentAuditEntries: recentAuditResult.rows.map(mapAuditLogRow),
      recentEntries: recentResult.rows.map(mapDashboardEntry),
      studentAccounts: toNumber(summary.student_accounts),
      topCreditIssuers,
      topDemeritIssuers,
      totalUsers: toNumber(summary.total_users),
    };
  }

  private async listTopIssuers(direction: "credit" | "demerit") {
    const isCredit = direction === "credit";
    const result = await db.query<TeacherIssuerRow>(
      `
        select
          trim(created_by.first_name || ' ' || created_by.last_name) as teacher_name,
          created_by.username,
          count(*) as entry_count,
          sum(${isCredit ? "ledger_entries.amount" : "abs(ledger_entries.amount)"}) as amount
        from ledger_entries
        join users created_by on created_by.id = ledger_entries.created_by_user_id
        where ledger_entries.status = 'posted'
          and ledger_entries.is_voided = false
          and ledger_entries.entry_type = $1
          and ledger_entries.amount ${isCredit ? ">" : "<"} 0
        group by created_by.id, created_by.first_name, created_by.last_name, created_by.username
        order by amount desc, entry_count desc, teacher_name asc
        limit 3
      `,
      [isCredit ? "reward" : "penalty"],
    );

    return result.rows.map(mapTeacherIssuer);
  }
}

function buildAdminAuditActionFilter() {
  return adminAuditActionPrefixes
    .map((_, index) => `audit_log.action like $${index + 1} || '%'`)
    .join(" or ");
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function mapDashboardEntry(entry: RecentEntryRow): AdminDashboardEntry {
  return {
    amount: entry.amount,
    createdAt: entry.created_at.toISOString(),
    description: entry.description,
    entryStatus: entry.entry_status,
    studentName: entry.student_name,
    type: entry.type,
  };
}

function mapTeacherIssuer(row: TeacherIssuerRow): TeacherIssuerSummary {
  return {
    amount: toNumber(row.amount),
    entryCount: toNumber(row.entry_count),
    teacherName: row.teacher_name,
    username: row.username,
  };
}

function mapAuditLogRow(row: AuditLogRow): AuditLogItem {
  return {
    action: row.action,
    actorName: row.actor_name,
    actorUsername: row.actor_username,
    createdAt: row.created_at.toISOString(),
    details: row.details ?? {},
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
  };
}

async function ensureAdminAuditLogTable() {
  await db.query(`
    create table if not exists audit_log (
      id uuid primary key default gen_random_uuid(),
      actor_user_id uuid references users(id) on delete set null,
      action text not null,
      entity_type text not null,
      entity_id uuid,
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);

  await db.query(
    "create index if not exists audit_log_created_at_idx on audit_log(created_at)",
  );
  await db.query(
    "create index if not exists audit_log_actor_idx on audit_log(actor_user_id)",
  );
  await db.query(
    "create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id)",
  );
}
