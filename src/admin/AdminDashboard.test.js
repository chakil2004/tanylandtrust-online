import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { ApiError } from '../api/client.js'
import { resolveAdminRoute } from './adminRoutes.js'
import { getAdminPageModel } from './adminViewModel.js'
import {
  ADMIN_AUTH_ACCOUNT_CREATIONS_DEFINITION,
  ADMIN_DASHBOARD_DEFINITIONS,
  ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_DEFINITION,
  ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES,
  ADMIN_PARCEL_CREATIONS_DEFINITION,
  ADMIN_PARCEL_CREATIONS_SOURCES,
} from './adminDashboardData.js'
import { adminText } from './adminTranslations.js'

let vite
let AdminDashboardView
let AdminAccountCreationsChart
let AdminParcelCreationsChart
let AdminMarketplaceConversationCreationsChart

before(async () => {
  vite = await createServer({ configFile: './vite.config.js', appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  ;({ AdminDashboardView } = await vite.ssrLoadModule('/src/admin/AdminDashboard.jsx'))
  ;({ default: AdminAccountCreationsChart } = await vite.ssrLoadModule('/src/admin/AdminAccountCreationsChart.jsx'))
  ;({ default: AdminParcelCreationsChart } = await vite.ssrLoadModule('/src/admin/AdminParcelCreationsChart.jsx'))
  ;({ default: AdminMarketplaceConversationCreationsChart } = await vite.ssrLoadModule('/src/admin/AdminMarketplaceConversationCreationsChart.jsx'))
})

after(async () => { await vite?.close() })

const model = getAdminPageModel(resolveAdminRoute('/admin/dashboard'))
const metrics = {
  as_of: '2026-10-19T12:00:00+00:00',
  for_sale: { count: 12, period: { kind: 'current_snapshot' }, definition: ADMIN_DASHBOARD_DEFINITIONS.for_sale },
  contacted_parcels: {
    count: 0, total_count: 12,
    period: { start: '2026-09-19T12:00:00+00:00', end: '2026-10-19T12:00:00+00:00' },
    definition: ADMIN_DASHBOARD_DEFINITIONS.contacted_parcels,
  },
  awaiting_first_response: { count: 3, period: { kind: 'current_snapshot' }, definition: ADMIN_DASHBOARD_DEFINITIONS.awaiting_first_response },
  registrations: {
    count: 4,
    period: { start: '2026-10-01T00:00:00+00:00', end: '2026-11-01T00:00:00+00:00', month: '2026-10' },
    definition: ADMIN_DASHBOARD_DEFINITIONS.registrations,
  },
  recent_reports: {
    count: 2,
    period: { start: '2026-09-19T12:00:00+00:00', end: '2026-10-19T12:00:00+00:00' },
    definition: ADMIN_DASHBOARD_DEFINITIONS.recent_reports,
  },
}
const authCreations = {
  definition: ADMIN_AUTH_ACCOUNT_CREATIONS_DEFINITION,
  source: 'auth.users.created_at',
  timezone: 'UTC',
  as_of: '2026-10-19T12:00:00+00:00',
  first_month: '2026-08',
  current_month: '2026-10',
  current_month_incomplete: true,
  unusable_created_at_count: 0,
  monthly: [
    { month: '2026-08', count: 1 },
    { month: '2026-09', count: 0 },
    { month: '2026-10', count: 2 },
  ],
}
const parcelCreations = {
  definition: ADMIN_PARCEL_CREATIONS_DEFINITION,
  sources: ADMIN_PARCEL_CREATIONS_SOURCES,
  timezone: 'UTC',
  as_of: '2026-10-19T12:00:00+00:00',
  first_month: '2026-08',
  current_month: '2026-10',
  current_month_incomplete: true,
  monthly: [
    { month: '2026-08', count: 2 },
    { month: '2026-09', count: 0 },
    { month: '2026-10', count: 3 },
  ],
}
const conversationCreations = {
  definition: ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_DEFINITION,
  sources: ADMIN_MARKETPLACE_CONVERSATION_CREATIONS_SOURCES,
  timezone: 'UTC',
  as_of: '2026-10-19T12:00:00+00:00',
  first_month: '2026-08',
  current_month: '2026-10',
  current_month_incomplete: true,
  unusable_created_at_count: 0,
  monthly: [
    { month: '2026-08', count: 4 },
    { month: '2026-09', count: 0 },
    { month: '2026-10', count: 2 },
  ],
}
test('dashboard orders five verified operational metrics and opens the matching filtered lists', () => {
  const markup = renderToStaticMarkup(React.createElement(AdminDashboardView, {
    model,
    state: { kind: 'ready', data: metrics },
    chartState: { kind: 'ready', data: authCreations },
    parcelChartState: { kind: 'ready', data: parcelCreations },
    conversationChartState: { kind: 'ready', data: conversationCreations },
    onRetry() {}, onRetryChart() {}, lang: 'fr',
  }))
  assert.ok(markup.indexOf(adminText('fr', 'Listings for sale now')) < markup.indexOf(adminText('fr', 'Visible listings contacted in the last 30 days')))
  assert.ok(markup.indexOf(adminText('fr', 'Visible listings contacted in the last 30 days')) < markup.indexOf(adminText('fr', 'Conversations awaiting first reply')))
  assert.ok(markup.indexOf(adminText('fr', 'Conversations awaiting first reply')) < markup.indexOf(adminText('fr', 'Registrations this month')))
  assert.ok(markup.indexOf(adminText('fr', 'Registrations this month')) < markup.indexOf(adminText('fr', 'Recent internal findings')))
  assert.ok(markup.indexOf(adminText('fr', 'Recent internal findings')) < markup.indexOf(adminText('fr', 'Account creations by month')))
  assert.ok(markup.indexOf(adminText('fr', 'Account creations by month')) < markup.indexOf(adminText('fr', 'Parcels created by month')))
  assert.ok(markup.indexOf(adminText('fr', 'Parcels created by month')) < markup.indexOf(adminText('fr', 'Marketplace parcel discussions created by month')))
  assert.match(markup, />12<\/strong>/)
  assert.match(markup, />0 \/ 12<\/strong>/)
  assert.match(markup, />0%<\/span>/)
  assert.match(markup, />3<\/strong>/)
  assert.match(markup, />4<\/strong>/)
  assert.match(markup, />2<\/strong>/)
  assert.match(markup, /Aucune ligne correspondant à cette définition/)
  assert.match(markup, /30 derniers jours UTC/)
  assert.match(markup, /Mois calendaire UTC/)
  assert.match(markup, /Le mois calendaire UTC en cours est incomplet/)
  assert.match(markup, /Relev\u00e9 le/)
  assert.match(markup, /2026-10: 2 comptes/)
  assert.match(markup, /2026-09: 0 comptes/)
  assert.match(markup, /2026-09: 0 parcelles/)
  assert.match(markup, /Parcelles cr\u00e9\u00e9es par mois/)
  assert.match(markup, /Discussions sur les parcelles cr\u00e9\u00e9es par mois/)
  assert.match(markup, /2026-09: 0 discussions/)
  assert.match(markup, /physiquement supprim\u00e9es ne sont pas archiv\u00e9es ici et ne peuvent pas \u00eatre reconstitu\u00e9es/)
  assert.match(markup, /instantan\u00e9s conserv\u00e9s dans deleted_parcels/)
  assert.match(markup, /sans archive conserv\u00e9e ne sont pas repr\u00e9sent\u00e9es/)
  assert.match(markup, /ce chiffre n’indique pas leur traitement ou leur résolution/)
  assert.match(markup, /href="\/admin\/parcels\?sell_category=to_sell&amp;visibility=visible"/)
  assert.match(markup, /href="\/admin\/conversations\?awaiting_first_response=true"/)
  assert.match(markup, /href="\/admin\/users\?date_from=2026-10-01&amp;date_to=2026-10-31"/)
  assert.match(markup, /href="\/admin\/conversation-reports\?created_from=/)
  assert.match(markup, /href="\/admin\/parcels\?sell_category=to_sell&amp;visibility=visible&amp;contacted_from=/)
  assert.doesNotMatch(markup, /Monthly revenue|Avg\. daily active users|1,200,000|Daily active users/)
})

test('dashboard distinguishes loading, error, and a genuine zero without invented values', () => {
  const loading = renderToStaticMarkup(React.createElement(AdminDashboardView, { model, state: { kind: 'loading' }, onRetry() {} }))
  const error = renderToStaticMarkup(React.createElement(AdminDashboardView, {
    model, state: { kind: 'error', error: new ApiError('network', 'private diagnostic') }, onRetry() {}, lang: 'fr',
  }))
  const zeroData = { ...metrics, for_sale: { ...metrics.for_sale, count: 0 } }
  const zero = renderToStaticMarkup(React.createElement(AdminDashboardView, {
    model, state: { kind: 'ready', data: zeroData }, onRetry() {}, lang: 'fr',
  }))

  assert.equal((loading.match(/role="status"/g) || []).length, 8)
  assert.match(error, /role="alert"/)
  assert.match(error, /Données indisponibles/)
  assert.doesNotMatch(error, /private diagnostic/)
  assert.match(zero, /Annonces à vendre maintenant[\s\S]*?>0<\/strong>[\s\S]*?Aucune ligne correspondant/)
  assert.match(zero, /href="\/admin\/parcels\?sell_category=to_sell&amp;visibility=visible"/)
})

test('Auth account chart renders its unavailable, empty, and exact keyboard-readable states', () => {
  const loading = renderToStaticMarkup(React.createElement(AdminAccountCreationsChart, {
    state: { kind: 'loading' }, lang: 'fr',
  }))
  const error = renderToStaticMarkup(React.createElement(AdminAccountCreationsChart, {
    state: { kind: 'error', error: new ApiError('network', 'private response') }, onRetry() {}, lang: 'fr',
  }))
  const empty = renderToStaticMarkup(React.createElement(AdminAccountCreationsChart, {
    state: { kind: 'ready', data: { ...authCreations, first_month: null, monthly: [] } }, lang: 'fr',
  }))
  const ready = renderToStaticMarkup(React.createElement(AdminAccountCreationsChart, {
    state: { kind: 'ready', data: authCreations }, lang: 'fr',
  }))
  assert.match(loading, /role="status"/)
  assert.match(error, /role="alert"/)
  assert.doesNotMatch(error, /private response/)
  assert.ok(empty.includes('Aucun compte Supabase Auth n\u2019\u00e9tait pr\u00e9sent lors de ce relev\u00e9'))
  assert.match(ready, /tabindex="0" role="img" aria-label="2026-08: 1 compte"/)
  assert.match(ready, /aria-label="Faire d\u00e9filer horizontalement le graphique mensuel des comptes"/)
  assert.match(ready, /class="admin-auth-chart-tick"[\s\S]*?<text[^>]*>0<\/text>/)
})

test('parcel creation chart renders loading, error, empty, scope, and exact accessible counts', () => {
  const loading = renderToStaticMarkup(React.createElement(AdminParcelCreationsChart, {
    state: { kind: 'loading' }, lang: 'fr',
  }))
  const error = renderToStaticMarkup(React.createElement(AdminParcelCreationsChart, {
    state: { kind: 'error', error: new ApiError('network', 'private response') }, onRetry() {}, lang: 'fr',
  }))
  const empty = renderToStaticMarkup(React.createElement(AdminParcelCreationsChart, {
    state: { kind: 'ready', data: { ...parcelCreations, first_month: null, monthly: [] } }, lang: 'fr',
  }))
  const ready = renderToStaticMarkup(React.createElement(AdminParcelCreationsChart, {
    state: { kind: 'ready', data: parcelCreations }, lang: 'fr',
  }))
  assert.match(loading, /Chargement du graphique des cr\u00e9ations de parcelles/)
  assert.match(error, /role="alert"/)
  assert.doesNotMatch(error, /private response/)
  assert.ok(empty.includes('Aucune parcelle active ou archiv\u00e9e n\u2019\u00e9tait pr\u00e9sente lors de ce relev\u00e9'))
  assert.match(ready, /tabindex="0" role="img" aria-label="2026-09: 0 parcelles"/)
  assert.match(ready, /Le mois calendaire UTC en cours est incomplet/)
  assert.match(ready, /Faire d\u00e9filer horizontalement le graphique mensuel des parcelles/)
  assert.match(ready, /parcelles actives encore dans main_parcels/)
})

test('parcel creation chart displays the count of rows omitted for unusable dates', () => {
  const markup = renderToStaticMarkup(React.createElement(AdminParcelCreationsChart, {
    state: { kind: 'ready', data: { ...parcelCreations, unusable_created_at_count: 2 } },
    lang: 'fr',
  }))
  assert.match(markup, /Lignes exclues du regroupement mensuel faute de date created_at exploitable : 2/)

  const withoutUsableDates = renderToStaticMarkup(React.createElement(AdminParcelCreationsChart, {
    state: { kind: 'ready', data: {
      ...parcelCreations, first_month: null, monthly: [], unusable_created_at_count: 3,
    } },
    lang: 'fr',
  }))
  assert.match(withoutUsableDates, /aucune ne possède une date de création exploitable/)
  assert.match(withoutUsableDates, /Lignes exclues du regroupement mensuel faute de date created_at exploitable : 3/)
  assert.doesNotMatch(withoutUsableDates, /Aucune parcelle active ou archiv\u00e9e n\u2019\u00e9tait pr\u00e9sente/)
})

test('Marketplace parcel discussion chart renders loading, error, zero months, and scope', () => {
  const loading = renderToStaticMarkup(React.createElement(AdminMarketplaceConversationCreationsChart, {
    state: { kind: 'loading' }, lang: 'fr',
  }))
  const error = renderToStaticMarkup(React.createElement(AdminMarketplaceConversationCreationsChart, {
    state: { kind: 'error', error: new ApiError('network', 'private response') }, onRetry() {}, lang: 'fr',
  }))
  const empty = renderToStaticMarkup(React.createElement(AdminMarketplaceConversationCreationsChart, {
    state: { kind: 'ready', data: { ...conversationCreations, first_month: null, monthly: [] } }, lang: 'fr',
  }))
  const ready = renderToStaticMarkup(React.createElement(AdminMarketplaceConversationCreationsChart, {
    state: { kind: 'ready', data: conversationCreations }, lang: 'fr',
  }))

  assert.match(loading, /Chargement du graphique des discussions sur les parcelles/)
  assert.match(error, /role="alert"/)
  assert.doesNotMatch(error, /private response/)
  assert.match(empty, /Aucune conversation Marketplace li\u00e9e \u00e0 une parcelle n\u2019\u00e9tait pr\u00e9sente/)
  assert.match(ready, /tabindex="0" role="img" aria-label="2026-09: 0 discussions"/)
  assert.match(ready, /Le mois calendaire UTC en cours est incomplet/)
  assert.match(ready, /physiquement supprim\u00e9es ne sont pas archiv\u00e9es ici et ne peuvent pas \u00eatre reconstitu\u00e9es/)
})

test('contacted-listing indicator displays numerator, visible total and percentage or unavailable', () => {
  const render = (contacted) => renderToStaticMarkup(React.createElement(AdminDashboardView, {
    model,
    state: { kind: 'ready', data: { ...metrics, contacted_parcels: contacted } },
    chartState: { kind: 'ready', data: authCreations },
    parcelChartState: { kind: 'ready', data: parcelCreations },
    lang: 'fr',
  }))
  const noVisibleListings = render({
    ...metrics.contacted_parcels, count: 0, total_count: 0,
  })
  const ratio = render({
    ...metrics.contacted_parcels, count: 1, total_count: 3,
  })

  assert.match(noVisibleListings, />0 \/ 0<\/strong>[\s\S]*?>Indisponible<\/span>/)
  assert.match(ratio, />1 \/ 3<\/strong>[\s\S]*?>33,3%<\/span>/)
  assert.match(ratio, /Instantan\u00e9 actuel[\s\S]*?30 derniers jours UTC/)
  assert.match(ratio, /Annonces visibles contact\u00e9es sur les 30 derniers jours/)
})
