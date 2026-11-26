export const ADMIN_REGISTRATION_DEFAULT_MONTHS = 9
export const ADMIN_REGISTRATION_MAX_MONTHS = 24
export const ADMIN_REGISTRATION_DEFINITION =
  'Profiles still present, grouped by created_at in UTC calendar months; not a lifetime count of all accounts ever created.'
export const ADMIN_AUTH_ACCOUNT_CREATIONS_DEFINITION =
  'Supabase Auth users still present when read, grouped by auth.users.created_at in UTC calendar months; the current month is incomplete.'
export const ADMIN_PARCEL_CREATIONS_DEFINITION =
  'Active rows in main_parcels plus retained deleted_parcels snapshots, grouped by the original created_at in UTC calendar months, regardless of sale category or manual visibility. Rows without a usable created_at are excluded and reported separately. Physical deletions without a retained archive are not represented; the current month is incomplete.'
export const ADMIN_PARCEL_CREATIONS_SOURCES = Object.freeze([
  'main_parcels.created_at',
  'deleted_parcels.parcel_snapshot.created_at',
])
export const ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_DEFINITION =
  'Marketplace conversations still present with either parcel_id linked to an active parcel or deleted_parcel_id linked to an archived parcel, grouped by conversations.created_at in UTC calendar months. Each conversation is counted once regardless of its messages; conversations without either parcel link are excluded. Physically deleted conversations cannot be reconstructed from this schema; the current month is incomplete.'
export const ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES = Object.freeze([
  'conversations.created_at',
  'conversations.parcel_id',
  'conversations.deleted_parcel_id',
])
export const ADMIN_DASHBOARD_DEFINITIONS = Object.freeze({
  for_sale: "Marketplace-visible parcels whose sell_category is 'to_sell' at the current snapshot; manually hidden parcels are excluded.",
  contacted_parcels: 'Current visible Marketplace listings with at least one linked Marketplace conversation whose first linked message was created during the rolling 30-day UTC period, compared with all currently visible listings for sale. Hidden, deleted, non-sale, parcel-less conversations and unlinked historical messages are excluded.',
  awaiting_first_response: 'Current Marketplace conversations with exactly two participants and a linked first message whose recipient has not replied.',
  registrations: 'Profiles still present whose created_at falls in the current UTC calendar month; not a lifetime count of all accounts ever created.',
  recent_reports: 'Internal conversation finding rows created during the rolling 30-day UTC period; this is not a processing or unresolved count.',
})

function isValidUtcTimestamp(value) {
  return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
}

function isValidPeriod(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    isValidUtcTimestamp(value.start) && isValidUtcTimestamp(value.end) &&
    Date.parse(value.start) < Date.parse(value.end)
}

export function isValidAdminDashboardMetrics(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !isValidUtcTimestamp(value.as_of)) return false
  const snapshotKeys = ['for_sale', 'awaiting_first_response']
  for (const key of snapshotKeys) {
    const metric = value[key]
    if (!metric || typeof metric !== 'object' || Array.isArray(metric) ||
        !Number.isSafeInteger(metric.count) || metric.count < 0 ||
        metric.period?.kind !== 'current_snapshot' ||
        metric.definition !== ADMIN_DASHBOARD_DEFINITIONS[key]) return false
  }

  for (const key of ['contacted_parcels', 'registrations', 'recent_reports']) {
    const metric = value[key]
    if (!metric || typeof metric !== 'object' || Array.isArray(metric) ||
        !Number.isSafeInteger(metric.count) || metric.count < 0 ||
        !isValidPeriod(metric.period) || metric.definition !== ADMIN_DASHBOARD_DEFINITIONS[key]) return false
  }
  return value.contacted_parcels.total_count !== undefined &&
    Number.isSafeInteger(value.contacted_parcels.total_count) && value.contacted_parcels.total_count >= 0 &&
    value.contacted_parcels.count <= value.contacted_parcels.total_count &&
    value.registrations.period.month === value.registrations.period.start.slice(0, 7) &&
    value.registrations.period.end.slice(8, 10) === '01' &&
    value.contacted_parcels.period.end === value.as_of &&
    value.recent_reports.period.end === value.as_of
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

function nextMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const nextYear = monthNumber === 12 ? year + 1 : year
  const nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonthNumber).padStart(2, '0')}`
}

export function isValidAdminRegistrationDashboard(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.definition !== ADMIN_REGISTRATION_DEFINITION ||
      typeof value.current_month !== 'string' || !MONTH_KEY.test(value.current_month) ||
      !Number.isSafeInteger(value.current_month_count) || value.current_month_count < 0 ||
      !value.period || typeof value.period !== 'object' || Array.isArray(value.period) ||
      !Array.isArray(value.monthly) || value.monthly.length < 1 ||
      value.monthly.length > ADMIN_REGISTRATION_MAX_MONTHS) return false

  if (value.period.start_month !== value.monthly[0]?.month ||
      value.period.end_month !== value.current_month ||
      value.monthly.at(-1)?.month !== value.current_month) return false

  let expectedMonth = value.period.start_month
  for (const point of value.monthly) {
    if (!point || typeof point !== 'object' || Array.isArray(point) ||
        point.month !== expectedMonth || !MONTH_KEY.test(point.month) ||
        !Number.isSafeInteger(point.count) || point.count < 0) return false
    expectedMonth = nextMonth(expectedMonth)
  }

  return value.monthly.at(-1).count === value.current_month_count
}

export function isValidAdminAuthAccountCreations(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !isValidUtcTimestamp(value.as_of) ||
      !Array.isArray(value.monthly) || value.monthly.length > 2400) return false

  const asOf = new Date(value.as_of)
  const asOfMonth = `${asOf.getUTCFullYear()}-${String(asOf.getUTCMonth() + 1).padStart(2, '0')}`
  if ((value.definition !== undefined && value.definition !== ADMIN_AUTH_ACCOUNT_CREATIONS_DEFINITION) ||
      (value.source !== undefined && value.source !== 'auth.users.created_at') ||
      (value.timezone !== undefined && value.timezone !== 'UTC') ||
      (value.current_month !== undefined && value.current_month !== asOfMonth) ||
      (value.current_month_incomplete !== undefined && value.current_month_incomplete !== true)) return false

  if (value.monthly.length === 0) {
    return value.first_month === undefined || value.first_month === null
  }

  const firstMonth = value.monthly[0]?.month
  if (typeof firstMonth !== 'string' || !MONTH_KEY.test(firstMonth) ||
      (value.first_month !== undefined && value.first_month !== firstMonth) ||
      value.monthly.at(-1)?.month !== asOfMonth) return false

  let expectedMonth = firstMonth
  for (const point of value.monthly) {
    if (!point || typeof point !== 'object' || Array.isArray(point) ||
        point.month !== expectedMonth || !MONTH_KEY.test(point.month) ||
        !Number.isSafeInteger(point.count) || point.count < 0) return false
    expectedMonth = nextMonth(expectedMonth)
  }
  return true
}

export function isValidAdminParcelCreations(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.definition !== ADMIN_PARCEL_CREATIONS_DEFINITION ||
      value.timezone !== 'UTC' || value.current_month_incomplete !== true ||
      !Number.isSafeInteger(value.unusable_created_at_count) || value.unusable_created_at_count < 0 ||
      !isValidUtcTimestamp(value.as_of) || !Array.isArray(value.monthly) ||
      value.monthly.length > 2400 ||
      !Array.isArray(value.sources) ||
      value.sources.length !== ADMIN_PARCEL_CREATIONS_SOURCES.length ||
      value.sources.some((source, index) => source !== ADMIN_PARCEL_CREATIONS_SOURCES[index])) return false

  const asOf = new Date(value.as_of)
  const asOfMonth = `${asOf.getUTCFullYear()}-${String(asOf.getUTCMonth() + 1).padStart(2, '0')}`
  if (value.current_month !== asOfMonth) return false

  if (value.monthly.length === 0) {
    return value.first_month === null
  }

  const firstMonth = value.monthly[0]?.month
  if (typeof firstMonth !== 'string' || !MONTH_KEY.test(firstMonth) ||
      value.first_month !== firstMonth || value.monthly.at(-1)?.month !== asOfMonth) return false

  let expectedMonth = firstMonth
  for (const point of value.monthly) {
    if (!point || typeof point !== 'object' || Array.isArray(point) ||
        point.month !== expectedMonth || !MONTH_KEY.test(point.month) ||
        !Number.isSafeInteger(point.count) || point.count < 0) return false
    expectedMonth = nextMonth(expectedMonth)
  }
  return true
}

export function isValidAdminMarketplaceConversationCreations(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.definition !== ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_DEFINITION ||
      value.timezone !== 'UTC' || value.current_month_incomplete !== true ||
      !Number.isSafeInteger(value.unusable_created_at_count) || value.unusable_created_at_count < 0 ||
      !isValidUtcTimestamp(value.as_of) || !Array.isArray(value.monthly) ||
      value.monthly.length > 2400 ||
      !Array.isArray(value.sources) ||
      value.sources.length !== ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES.length ||
      value.sources.some((source, index) => source !== ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES[index])) return false

  const asOf = new Date(value.as_of)
  const asOfMonth = `${asOf.getUTCFullYear()}-${String(asOf.getUTCMonth() + 1).padStart(2, '0')}`
  if (value.current_month !== asOfMonth) return false

  if (value.monthly.length === 0) return value.first_month === null

  const firstMonth = value.monthly[0]?.month
  if (typeof firstMonth !== 'string' || !MONTH_KEY.test(firstMonth) ||
      value.first_month !== firstMonth || value.monthly.at(-1)?.month !== asOfMonth) return false

  let expectedMonth = firstMonth
  for (const point of value.monthly) {
    if (!point || typeof point !== 'object' || Array.isArray(point) ||
        point.month !== expectedMonth || !MONTH_KEY.test(point.month) ||
        !Number.isSafeInteger(point.count) || point.count < 0) return false
    expectedMonth = nextMonth(expectedMonth)
  }
  return true
}
