import { db } from "@/lib/db";

export type CreditAnalyticsSummary = {
  activeShopRequests: number;
  activeStudentCount: number;
  averageBalance: number;
  creditsIssued30Days: number;
  creditsRemoved30Days: number;
  medianBalance: number;
  pendingHolds: number;
  studentsWithRecentActivity: number;
  totalHeld: number;
  zeroBalanceCount: number;
};

export type CreditAnalyticsTrendPoint = {
  approvedPurchases: number;
  deniedPurchases: number;
  issued: number;
  net: number;
  pendingPurchases: number;
  removed: number;
  spent: number;
  timestamp: number;
  label: string;
};

export type CreditAnalyticsBalanceHistoryPoint = {
  averageBalance: number;
  label: string;
  timestamp: number;
  totalBalance: number;
};

export type CreditAnalyticsScopeKind = "cohort" | "group" | "student";

export type CreditAnalyticsScope = {
  id: string;
  kind: CreditAnalyticsScopeKind;
  label: string;
  meta: string;
};

export type CreditAnalyticsBucket = {
  count: number;
  label: string;
};

export type CreditAnalyticsStudentBalance = {
  balance: number;
  displayName: string;
  lastActivityAt: string | null;
  username: string;
};

export type CreditAnalyticsStudentMovement = {
  displayName: string;
  earned: number;
  netChange: number;
  removed: number;
  transactionCount: number;
  username: string;
};

export type CreditAnalyticsSummaryResult = {
  balanceBuckets: CreditAnalyticsBucket[];
  balanceHistory: CreditAnalyticsBalanceHistoryPoint[];
  movementLeaders: CreditAnalyticsStudentMovement[];
  summary: CreditAnalyticsSummary;
  topBalances: CreditAnalyticsStudentBalance[];
  trend: CreditAnalyticsTrendPoint[];
};

type SummaryRow = {
  active_shop_requests: string;
  active_student_count: string;
  average_balance: string;
  credits_issued_30_days: string;
  credits_removed_30_days: string;
  median_balance: string;
  pending_holds: string;
  students_with_recent_activity: string;
  total_held: string;
  zero_balance_count: string;
};

type BucketRow = {
  bucket_order: number;
  count: string;
  label: string;
};

type TrendRow = {
  approved_purchases: string;
  bucket_date: Date;
  denied_purchases: string;
  issued: string;
  pending_purchases: string;
  removed: string;
  spent: string;
};

type BalanceHistoryRow = {
  average_balance: string;
  bucket_date: Date;
  total_balance: string;
};

type ScopeSearchRow = {
  id: string;
  kind: CreditAnalyticsScopeKind;
  label: string;
  meta: string;
};

type StudentBalanceRow = {
  balance: string;
  display_name: string;
  last_activity_at: Date | null;
  username: string;
};

type StudentMovementRow = {
  display_name: string;
  earned: string;
  net_change: string;
  removed: string;
  transaction_count: string;
  username: string;
};

const defaultAnalyticsWindowDays = 30;
const balanceDistributionBucketCount = 5;
const maximumAnalyticsWindowDays = 365;
const minimumAnalyticsWindowDays = 1;
const topStudentLimit = 8;
const scopeSearchLimit = 8;

export class CreditAnalyticsService {
  async getSummary(
    scopeKey = "cohort",
    windowDays = defaultAnalyticsWindowDays,
  ): Promise<CreditAnalyticsSummaryResult> {
    const scope = parseScopeKey(scopeKey);
    const analyticsWindowDays = sanitizeAnalyticsWindowDays(windowDays);
    const [
      summaryResult,
      bucketResult,
      trendResult,
      balanceHistoryResult,
      topBalancesResult,
      movementLeadersResult,
    ] = await Promise.all([
      db.query<SummaryRow>(`
        with filtered_students as (${filteredStudentsQuery}),
        student_balances as (
          select
            users.id,
            users.username,
            trim(users.first_name || ' ' || users.last_name) as display_name,
            users.is_active,
            coalesce(sum(ledger_entries.amount), 0) as balance,
            max(ledger_entries.created_at) as last_activity_at
          from filtered_students
          join users on users.id = filtered_students.id
          left join accounts on accounts.user_id = users.id
          left join ledger_entries
            on ledger_entries.account_id = accounts.id
            and ledger_entries.status in ('pending', 'posted')
            and not (
              ledger_entries.status = 'pending'
              and ledger_entries.is_voided = true
            )
          group by users.id, users.username, users.first_name, users.last_name, users.is_active
        )
        select
          count(*) filter (where is_active = true) as active_student_count,
          coalesce(sum(balance), 0) as total_held,
          coalesce(round(avg(balance)), 0) as average_balance,
          coalesce(percentile_cont(0.5) within group (order by balance), 0) as median_balance,
          count(*) filter (where balance = 0 and is_active = true) as zero_balance_count,
          count(*) filter (
            where last_activity_at >= now() - ($1::int * interval '1 day')
              and is_active = true
          ) as students_with_recent_activity,
          coalesce((
            select sum(ledger_entries.amount)
            from ledger_entries
            join accounts on accounts.id = ledger_entries.account_id
            join filtered_students on filtered_students.id = accounts.user_id
            where ledger_entries.amount > 0
              and ledger_entries.status = 'posted'
              and ledger_entries.is_voided = false
              and ledger_entries.created_at >= now() - ($1::int * interval '1 day')
          ), 0) as credits_issued_30_days,
          coalesce((
            select abs(sum(ledger_entries.amount))
            from ledger_entries
            join accounts on accounts.id = ledger_entries.account_id
            join filtered_students on filtered_students.id = accounts.user_id
            where ledger_entries.amount < 0
              and ledger_entries.status = 'posted'
              and ledger_entries.is_voided = false
              and ledger_entries.entry_type not in ('shop_hold', 'shop_purchase')
              and ledger_entries.created_at >= now() - ($1::int * interval '1 day')
          ), 0) as credits_removed_30_days,
          coalesce((
            select abs(sum(ledger_entries.amount))
            from ledger_entries
            join accounts on accounts.id = ledger_entries.account_id
            join filtered_students on filtered_students.id = accounts.user_id
            where ledger_entries.amount < 0
              and ledger_entries.status = 'pending'
              and ledger_entries.is_voided = false
          ), 0) as pending_holds,
          coalesce((
            select count(*)
            from shop_purchases
            join filtered_students on filtered_students.id = shop_purchases.purchased_by_user_id
            where shop_purchases.status = 'pending'
              and shop_purchases.is_voided = false
          ), 0) as active_shop_requests
        from student_balances
      `, [analyticsWindowDays, scope.kind, scope.id]),
      db.query<BucketRow>(`
        with filtered_students as (${filteredStudentsQuery}),
        student_balances as (
          select
            users.id,
            users.is_active,
            coalesce(sum(ledger_entries.amount), 0) as balance
          from filtered_students
          join users on users.id = filtered_students.id
          left join accounts on accounts.user_id = users.id
          left join ledger_entries
            on ledger_entries.account_id = accounts.id
            and ledger_entries.status in ('pending', 'posted')
            and not (
              ledger_entries.status = 'pending'
              and ledger_entries.is_voided = true
            )
          group by users.id, users.is_active
        ),
        distribution_settings as (
          with raw_distribution as (
            select greatest(
              1,
              ceil(greatest(coalesce(max(balance), 0), 1)::numeric / $4::int)
            ) as raw_bucket_size
            from student_balances
            where is_active = true
          ),
          distribution_magnitude as (
            select
              raw_bucket_size,
              power(10, floor(log(raw_bucket_size))) as magnitude
            from raw_distribution
          )
          select
            greatest(
              1,
              (
                magnitude *
                case
                  when raw_bucket_size / magnitude <= 1 then 1
                  when raw_bucket_size / magnitude <= 2 then 2
                  when raw_bucket_size / magnitude <= 5 then 5
                  else 10
                end
              )::integer
            ) as bucket_size
          from distribution_magnitude
        ),
        bucket_series as (
          select generate_series(0, $4::int) as bucket_order
        )
        select
          bucket_series.bucket_order,
          case
            when bucket_series.bucket_order = 0 then '0'
            when bucket_series.bucket_order = $4 then
              ((bucket_series.bucket_order - 1) * distribution_settings.bucket_size + 1)::text
              || '+'
            else (
              ((bucket_series.bucket_order - 1) * distribution_settings.bucket_size + 1)::text
              || '-'
              || (bucket_series.bucket_order * distribution_settings.bucket_size)::text
            )
          end as label,
          count(student_balances.id) as count
        from bucket_series
        cross join distribution_settings
        left join student_balances
          on student_balances.is_active = true
          and (
            (bucket_series.bucket_order = 0 and student_balances.balance = 0)
            or (
              bucket_series.bucket_order > 0
              and student_balances.balance between
                ((bucket_series.bucket_order - 1) * distribution_settings.bucket_size + 1)
                and (bucket_series.bucket_order * distribution_settings.bucket_size)
            )
            or (
              bucket_series.bucket_order = $4
              and student_balances.balance >=
                ((bucket_series.bucket_order - 1) * distribution_settings.bucket_size + 1)
            )
          )
        where $1::int > 0
        group by bucket_series.bucket_order, distribution_settings.bucket_size
        order by bucket_series.bucket_order
      `, [
        analyticsWindowDays,
        scope.kind,
        scope.id,
        balanceDistributionBucketCount,
      ]),
      db.query<TrendRow>(`
        with filtered_students as (${filteredStudentsQuery}),
        days as (
          select generate_series(
            (current_date - (($1::int - 1) * interval '1 day'))::date,
            current_date,
            interval '1 day'
          )::date as bucket_date
        ),
        daily_ledger_entries as (
          select
            date_trunc('day', ledger_entries.created_at)::date as bucket_date,
            ledger_entries.amount,
            ledger_entries.entry_type
          from ledger_entries
          join accounts on accounts.id = ledger_entries.account_id
          join filtered_students on filtered_students.id = accounts.user_id
          where ledger_entries.status in ('pending', 'posted')
            and not (
              ledger_entries.status = 'pending'
              and ledger_entries.is_voided = true
            )
            and ledger_entries.created_at >= now() - ($1::int * interval '1 day')
        ),
        daily_shop_purchases as (
          select
            date_trunc('day', shop_purchases.purchased_at)::date as bucket_date,
            shop_purchases.status
          from shop_purchases
          join filtered_students on filtered_students.id = shop_purchases.purchased_by_user_id
          where shop_purchases.is_voided = false
            and shop_purchases.purchased_at >= now() - ($1::int * interval '1 day')
        )
        select
          days.bucket_date,
          coalesce(sum(daily_ledger_entries.amount) filter (where daily_ledger_entries.amount > 0), 0) as issued,
          coalesce(abs(sum(daily_ledger_entries.amount) filter (
            where daily_ledger_entries.amount < 0
              and daily_ledger_entries.entry_type not in ('shop_hold', 'shop_purchase')
          )), 0) as removed,
          coalesce(abs(sum(daily_ledger_entries.amount) filter (
            where daily_ledger_entries.amount < 0
              and daily_ledger_entries.entry_type in ('shop_hold', 'shop_purchase')
          )), 0) as spent,
          count(daily_shop_purchases.status) filter (where daily_shop_purchases.status = 'pending') as pending_purchases,
          count(daily_shop_purchases.status) filter (where daily_shop_purchases.status = 'approved') as approved_purchases,
          count(daily_shop_purchases.status) filter (where daily_shop_purchases.status = 'denied') as denied_purchases
        from days
        left join daily_ledger_entries on daily_ledger_entries.bucket_date = days.bucket_date
        left join daily_shop_purchases on daily_shop_purchases.bucket_date = days.bucket_date
        group by days.bucket_date
        order by days.bucket_date
      `, [analyticsWindowDays, scope.kind, scope.id]),
      db.query<BalanceHistoryRow>(`
        with filtered_students as (${filteredStudentsQuery}),
        days as (
          select generate_series(
            (current_date - (($1::int - 1) * interval '1 day'))::date,
            current_date,
            interval '1 day'
          )::date as bucket_date
        )
        select
          days.bucket_date,
          coalesce(round((
            select sum(ledger_entries.amount)
            from ledger_entries
            join accounts on accounts.id = ledger_entries.account_id
            join filtered_students on filtered_students.id = accounts.user_id
            where ledger_entries.status in ('pending', 'posted')
              and not (
                ledger_entries.status = 'pending'
                and ledger_entries.is_voided = true
              )
              and ledger_entries.created_at < days.bucket_date + interval '1 day'
          ) / nullif((select count(*) from filtered_students), 0)), 0) as average_balance,
          coalesce((
            select sum(ledger_entries.amount)
            from ledger_entries
            join accounts on accounts.id = ledger_entries.account_id
            join filtered_students on filtered_students.id = accounts.user_id
            where ledger_entries.status in ('pending', 'posted')
              and not (
                ledger_entries.status = 'pending'
                and ledger_entries.is_voided = true
              )
              and ledger_entries.created_at < days.bucket_date + interval '1 day'
          ), 0) as total_balance
        from days
        order by days.bucket_date
      `, [analyticsWindowDays, scope.kind, scope.id]),
      db.query<StudentBalanceRow>(`
        with student_balances as (${studentBalancesQuery})
        select
          balance,
          display_name,
          last_activity_at,
          username
        from student_balances
        where is_active = true
        order by balance desc, display_name asc
        limit $1
      `, [topStudentLimit]),
      db.query<StudentMovementRow>(`
        select
          trim(users.first_name || ' ' || users.last_name) as display_name,
          users.username,
          coalesce(sum(ledger_entries.amount) filter (where ledger_entries.amount > 0), 0) as earned,
          coalesce(abs(sum(ledger_entries.amount) filter (where ledger_entries.amount < 0)), 0) as removed,
          coalesce(sum(ledger_entries.amount), 0) as net_change,
          count(*) as transaction_count
        from ledger_entries
        join accounts on accounts.id = ledger_entries.account_id
        join users on users.id = accounts.user_id
        join roles on roles.id = users.role_id
        where roles.role_key = 'student'
          and users.is_active = true
          and ledger_entries.status = 'posted'
          and ledger_entries.is_voided = false
          and ledger_entries.created_at >= now() - ($1::int * interval '1 day')
        group by users.id, users.first_name, users.last_name, users.username
        order by abs(coalesce(sum(ledger_entries.amount), 0)) desc,
          transaction_count desc,
          display_name asc
        limit $2
      `, [analyticsWindowDays, topStudentLimit]),
    ]);

    return {
      balanceBuckets: bucketResult.rows.map(mapBucketRow),
      balanceHistory: balanceHistoryResult.rows.map(mapBalanceHistoryRow),
      movementLeaders: movementLeadersResult.rows.map(mapStudentMovementRow),
      summary: mapSummaryRow(summaryResult.rows[0]),
      topBalances: topBalancesResult.rows.map(mapStudentBalanceRow),
      trend: trendResult.rows.map(mapTrendRow),
    };
  }

  async searchScopes(searchTerm: string): Promise<CreditAnalyticsScope[]> {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (normalizedSearchTerm.length < 2) {
      return [];
    }

    const result = await db.query<ScopeSearchRow>(
      `
        select
          users.id::text as id,
          'student'::text as kind,
          trim(users.first_name || ' ' || users.last_name) as label,
          users.username as meta
        from users
        join roles on roles.id = users.role_id
        where roles.role_key = 'student'
          and users.is_active = true
          and (
            lower(trim(users.first_name || ' ' || users.last_name)) like '%' || $1 || '%'
            or lower(users.username) like '%' || $1 || '%'
          )

        union all

        select
          student_groups.id::text as id,
          'group'::text as kind,
          student_groups.name as label,
          count(student_group_memberships.id)::text || ' students' as meta
        from student_groups
        left join student_group_memberships
          on student_group_memberships.group_id = student_groups.id
        where student_groups.is_active = true
          and lower(student_groups.name) like '%' || $1 || '%'
        group by student_groups.id, student_groups.name

        order by kind desc, label asc
        limit $2
      `,
      [normalizedSearchTerm, scopeSearchLimit],
    );

    return result.rows.map(mapScopeSearchRow);
  }
}

const studentBalancesQuery = `
  select
    users.id,
    users.username,
    trim(users.first_name || ' ' || users.last_name) as display_name,
    users.is_active,
    coalesce(sum(ledger_entries.amount), 0) as balance,
    max(ledger_entries.created_at) as last_activity_at
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
  where roles.role_key = 'student'
  group by users.id, users.username, users.first_name, users.last_name, users.is_active
`;

const filteredStudentsQuery = `
  select distinct users.id
  from users
  join roles on roles.id = users.role_id
  left join student_group_memberships
    on student_group_memberships.user_id = users.id
  left join student_groups
    on student_groups.id = student_group_memberships.group_id
    and student_groups.is_active = true
  where roles.role_key = 'student'
    and users.is_active = true
    and (
      $2 = 'cohort'
      or ($2 = 'student' and users.id = nullif($3, '')::uuid)
      or ($2 = 'group' and student_groups.id = nullif($3, '')::uuid)
    )
`;

function mapSummaryRow(row: SummaryRow | undefined): CreditAnalyticsSummary {
  return {
    activeShopRequests: toNumber(row?.active_shop_requests),
    activeStudentCount: toNumber(row?.active_student_count),
    averageBalance: toNumber(row?.average_balance),
    creditsIssued30Days: toNumber(row?.credits_issued_30_days),
    creditsRemoved30Days: toNumber(row?.credits_removed_30_days),
    medianBalance: toNumber(row?.median_balance),
    pendingHolds: toNumber(row?.pending_holds),
    studentsWithRecentActivity: toNumber(row?.students_with_recent_activity),
    totalHeld: toNumber(row?.total_held),
    zeroBalanceCount: toNumber(row?.zero_balance_count),
  };
}

function mapBucketRow(row: BucketRow): CreditAnalyticsBucket {
  return {
    count: toNumber(row.count),
    label: row.label,
  };
}

function mapBalanceHistoryRow(
  row: BalanceHistoryRow,
): CreditAnalyticsBalanceHistoryPoint {
  const date = new Date(row.bucket_date);

  return {
    averageBalance: toNumber(row.average_balance),
    label: formatShortDate(date),
    timestamp: date.getTime(),
    totalBalance: toNumber(row.total_balance),
  };
}

function mapScopeSearchRow(row: ScopeSearchRow): CreditAnalyticsScope {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    meta: row.meta,
  };
}

function mapTrendRow(row: TrendRow): CreditAnalyticsTrendPoint {
  const issued = toNumber(row.issued);
  const removed = toNumber(row.removed);
  const spent = toNumber(row.spent);
  const timestamp = new Date(row.bucket_date).getTime();

  return {
    approvedPurchases: toNumber(row.approved_purchases),
    deniedPurchases: toNumber(row.denied_purchases),
    issued,
    label: formatShortDate(new Date(row.bucket_date)),
    net: issued - removed - spent,
    pendingPurchases: toNumber(row.pending_purchases),
    removed,
    spent,
    timestamp,
  };
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function mapStudentBalanceRow(
  row: StudentBalanceRow,
): CreditAnalyticsStudentBalance {
  return {
    balance: toNumber(row.balance),
    displayName: row.display_name,
    lastActivityAt: row.last_activity_at?.toISOString() ?? null,
    username: row.username,
  };
}

function mapStudentMovementRow(
  row: StudentMovementRow,
): CreditAnalyticsStudentMovement {
  return {
    displayName: row.display_name,
    earned: toNumber(row.earned),
    netChange: toNumber(row.net_change),
    removed: toNumber(row.removed),
    transactionCount: toNumber(row.transaction_count),
    username: row.username,
  };
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function parseScopeKey(scopeKey: string) {
  const [kind, id = ""] = scopeKey.split(":");

  if (kind === "student" || kind === "group") {
    return {
      id,
      kind,
    };
  }

  return {
    id: "",
    kind: "cohort",
  };
}

function sanitizeAnalyticsWindowDays(windowDays: number) {
  if (!Number.isInteger(windowDays)) {
    return defaultAnalyticsWindowDays;
  }

  return Math.min(
    maximumAnalyticsWindowDays,
    Math.max(minimumAnalyticsWindowDays, windowDays),
  );
}
