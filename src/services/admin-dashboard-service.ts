import { db } from "@/lib/db";
import type { LedgerEntryStatus, LedgerEntryType } from "@/services/ledger-service";

export type AdminDashboardSummary = {
  activeUsers: number;
  circulationEntries: AdminDashboardEntry[];
  ledgerBalance: number;
  moneyIn: number;
  moneyOut: number;
  pendingHolds: number;
  pendingShopRequests: number;
  recentEntries: AdminDashboardEntry[];
  studentAccounts: number;
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

const recentLedgerLimit = 6;
const circulationHistoryDays = 180;

export class AdminDashboardService {
  async getSummary(): Promise<AdminDashboardSummary> {
    const [summaryResult, recentResult, circulationResult] = await Promise.all([
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
      recentEntries: recentResult.rows.map(mapDashboardEntry),
      studentAccounts: toNumber(summary.student_accounts),
      totalUsers: toNumber(summary.total_users),
    };
  }
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
