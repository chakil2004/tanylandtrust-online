import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADMIN_DASHBOARD_DEFINITIONS,
  ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_DEFINITION,
  ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES,
  ADMIN_PARCEL_CREATIONS_DEFINITION,
  ADMIN_PARCEL_CREATIONS_SOURCES,
  ADMIN_REGISTRATION_DEFINITION,
  isValidAdminAuthAccountCreations,
  isValidAdminDashboardMetrics,
  isValidAdminMarketplaceConversationCreations,
  isValidAdminParcelCreations,
  isValidAdminRegistrationDashboard,
} from './adminDashboardData.js'

function marketplaceConversationPayload(monthly) {
  return {
    definition: ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_DEFINITION,
    sources: ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES,
    timezone: 'UTC',
    as_of: '2026-03-05T12:00:00+00:00',
    first_month: monthly[0]?.month ?? null,
    current_month: '2026-03',
    current_month_incomplete: true,
    unusable_created_at_count: 0,
    monthly,
  }
}

test('Marketplace conversation chart validates UTC month gaps and empty source sets', () => {
  const valid = marketplaceConversationPayload([
    { month: '2026-01', count: 2 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 1 },
  ])
  assert.equal(isValidAdminMarketplaceConversationCreations(valid), true)
  assert.equal(isValidAdminMarketplaceConversationCreations(marketplaceConversationPayload([])), true)
  assert.equal(isValidAdminMarketplaceConversationCreations({
    ...valid,
    monthly: [valid.monthly[0], valid.monthly[2]],
  }), false)
  assert.equal(isValidAdminMarketplaceConversationCreations({
    ...valid,
    sources: ['conversations.created_at'],
  }), false)
  assert.equal(isValidAdminMarketplaceConversationCreations({
    ...valid,
    current_month_incomplete: false,
  }), false)
  assert.equal(isValidAdminMarketplaceConversationCreations({
    ...valid,
    monthly: [{ month: '2026-01', count: -1 }, ...valid.monthly.slice(1)],
  }), false)
})

function payload(monthly) {
  const current = monthly.at(-1)
  return {
    definition: ADMIN_REGISTRATION_DEFINITION,
    period: { start_month: monthly[0].month, end_month: current.month },
    current_month: current.month,
    current_month_count: current.count,
    monthly,
  }
}

test('registration dashboard accepts explicit zero months and a matching current card', () => {
  assert.equal(isValidAdminRegistrationDashboard(payload([
    { month: '2026-01', count: 0 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 7 },
  ])), true)
})

test('registration dashboard rejects missing months, a mismatched card, or an unbounded series', () => {
  const valid = payload([
    { month: '2026-01', count: 1 },
    { month: '2026-02', count: 2 },
  ])
  assert.equal(isValidAdminRegistrationDashboard({ ...valid, monthly: [valid.monthly[0], { ...valid.monthly[1], month: '2026-04' }] }), false)
  assert.equal(isValidAdminRegistrationDashboard({ ...valid, current_month_count: 3 }), false)
  assert.equal(isValidAdminRegistrationDashboard(payload(
    Array.from({ length: 25 }, (_, index) => ({ month: `2025-${String(index + 1).padStart(2, '0')}`, count: 0 })),
  )), false)
})

function authCreationPayload(monthly) {
  return {
    as_of: '2026-03-10T12:30:00+00:00',
    monthly,
  }
}

test('Auth account creation chart accepts contiguous UTC months and explicit zero values', () => {
  assert.equal(isValidAdminAuthAccountCreations(authCreationPayload([
    { month: '2026-01', count: 3 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 1 },
  ])), true)
  assert.equal(isValidAdminAuthAccountCreations(authCreationPayload([])), true)
})

test('Auth account creation chart rejects gaps, wrong end month, and invalid counts', () => {
  const valid = authCreationPayload([
    { month: '2026-01', count: 1 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 2 },
  ])
  assert.equal(isValidAdminAuthAccountCreations({ ...valid, monthly: [valid.monthly[0], valid.monthly[2]] }), false)
  assert.equal(isValidAdminAuthAccountCreations({ ...valid, monthly: [{ ...valid.monthly[0], count: -1 }, ...valid.monthly.slice(1)] }), false)
  assert.equal(isValidAdminAuthAccountCreations({ ...valid, monthly: [{ month: '2026-01', count: 1 }] }), false)
  assert.equal(isValidAdminAuthAccountCreations({ ...valid, source: 'profiles.created_at' }), false)
  assert.equal(isValidAdminAuthAccountCreations({ ...valid, current_month_incomplete: false }), false)
})

function parcelCreationPayload(monthly) {
  return {
    definition: ADMIN_PARCEL_CREATIONS_DEFINITION,
    sources: ADMIN_PARCEL_CREATIONS_SOURCES,
    timezone: 'UTC',
    as_of: '2026-03-10T12:30:00+00:00',
    first_month: monthly[0]?.month ?? null,
    current_month: '2026-03',
    current_month_incomplete: true,
    unusable_created_at_count: 0,
    monthly,
  }
}

test('parcel creation chart accepts both sources, UTC month series, and zero months', () => {
  assert.equal(isValidAdminParcelCreations(parcelCreationPayload([
    { month: '2026-01', count: 3 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 2 },
  ])), true)
  assert.equal(isValidAdminParcelCreations(parcelCreationPayload([])), true)
})

test('parcel creation chart rejects a missing month, wrong source, or complete current month', () => {
  const valid = parcelCreationPayload([
    { month: '2026-01', count: 1 },
    { month: '2026-02', count: 0 },
    { month: '2026-03', count: 2 },
  ])
  assert.equal(isValidAdminParcelCreations({ ...valid, monthly: [valid.monthly[0], valid.monthly[2]] }), false)
  assert.equal(isValidAdminParcelCreations({ ...valid, sources: ['main_parcels.created_at'] }), false)
  assert.equal(isValidAdminParcelCreations({ ...valid, definition: 'Active parcels only' }), false)
  assert.equal(isValidAdminParcelCreations({ ...valid, current_month_incomplete: false }), false)
  assert.equal(isValidAdminParcelCreations({ ...valid, unusable_created_at_count: -1 }), false)
  const missingCount = { ...valid }
  delete missingCount.unusable_created_at_count
  assert.equal(isValidAdminParcelCreations(missingCount), false)
  assert.equal(isValidAdminParcelCreations({ ...valid, monthly: [{ ...valid.monthly[0], count: -1 }, ...valid.monthly.slice(1)] }), false)
})

test('new dashboard metrics require all bounded periods, exact definitions, and nonnegative integer counts', () => {
  const valid = {
    as_of: '2026-10-19T12:00:00+00:00',
    for_sale: { count: 0, period: { kind: 'current_snapshot' }, definition: ADMIN_DASHBOARD_DEFINITIONS.for_sale },
    contacted_parcels: {
      count: 2, total_count: 9, period: { start: '2026-09-19T12:00:00+00:00', end: '2026-10-19T12:00:00+00:00' },
      definition: ADMIN_DASHBOARD_DEFINITIONS.contacted_parcels,
    },
    awaiting_first_response: { count: 1, period: { kind: 'current_snapshot' }, definition: ADMIN_DASHBOARD_DEFINITIONS.awaiting_first_response },
    registrations: {
      count: 3, period: { start: '2026-10-01T00:00:00+00:00', end: '2026-11-01T00:00:00+00:00', month: '2026-10' },
      definition: ADMIN_DASHBOARD_DEFINITIONS.registrations,
    },
    recent_reports: {
      count: 4, period: { start: '2026-09-19T12:00:00+00:00', end: '2026-10-19T12:00:00+00:00' },
      definition: ADMIN_DASHBOARD_DEFINITIONS.recent_reports,
    },
  }
  assert.equal(isValidAdminDashboardMetrics(valid), true)
  assert.equal(isValidAdminDashboardMetrics({ ...valid, awaiting_first_response: undefined }), false)
  assert.equal(isValidAdminDashboardMetrics({ ...valid, recent_reports: { ...valid.recent_reports, definition: 'unprocessed reports' } }), false)
  assert.equal(isValidAdminDashboardMetrics({ ...valid, contacted_parcels: { ...valid.contacted_parcels, period: { start: '2026-10-01', end: '2026-10-02' } } }), false)
})

test('contacted listing metric requires a consistent visible denominator, including a true zero total', () => {
  const valid = {
    as_of: '2026-10-19T12:00:00+00:00',
    for_sale: { count: 0, period: { kind: 'current_snapshot' }, definition: ADMIN_DASHBOARD_DEFINITIONS.for_sale },
    contacted_parcels: {
      count: 0, total_count: 0,
      period: { start: '2026-09-19T12:00:00+00:00', end: '2026-10-19T12:00:00+00:00' },
      definition: ADMIN_DASHBOARD_DEFINITIONS.contacted_parcels,
    },
    awaiting_first_response: { count: 0, period: { kind: 'current_snapshot' }, definition: ADMIN_DASHBOARD_DEFINITIONS.awaiting_first_response },
    registrations: {
      count: 0, period: { start: '2026-10-01T00:00:00+00:00', end: '2026-11-01T00:00:00+00:00', month: '2026-10' },
      definition: ADMIN_DASHBOARD_DEFINITIONS.registrations,
    },
    recent_reports: {
      count: 0, period: { start: '2026-09-19T12:00:00+00:00', end: '2026-10-19T12:00:00+00:00' },
      definition: ADMIN_DASHBOARD_DEFINITIONS.recent_reports,
    },
  }
  assert.equal(isValidAdminDashboardMetrics(valid), true)
  assert.equal(isValidAdminDashboardMetrics({
    ...valid, contacted_parcels: { ...valid.contacted_parcels, count: 1 },
  }), false)
  assert.equal(isValidAdminDashboardMetrics({
    ...valid, contacted_parcels: { ...valid.contacted_parcels, total_count: -1 },
  }), false)
  const missingTotal = { ...valid.contacted_parcels }
  delete missingTotal.total_count
  assert.equal(isValidAdminDashboardMetrics({
    ...valid, contacted_parcels: missingTotal,
  }), false)
})
