import { useId } from 'react'
import { apiErrorMessage } from '../api/apiErrorMessages.js'
import { adminText } from './adminTranslations.js'

function monthLabel(month, language) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1, 1))
  return new Intl.DateTimeFormat(language, {
    month: 'short', year: '2-digit', timeZone: 'UTC',
  }).format(date)
}

function formatAsOf(value, language) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC',
  }).format(date) + ' UTC'
}

function MonthlyCreationsPlot({ data, language, t, titleKey, descriptionKey, singularKey, pluralKey, scrollKey }) {
  const titleId = useId()
  const descriptionId = useId()
  const months = data.monthly
  const margin = { top: 22, right: 18, bottom: 48, left: 48 }
  const slotWidth = 58
  const plotHeight = 220
  const width = Math.max(600, margin.left + margin.right + months.length * slotWidth)
  const height = margin.top + plotHeight + margin.bottom
  const maxValue = Math.max(0, ...months.map((item) => item.count))
  const tickStep = Math.max(1, Math.ceil(maxValue / 4))
  const maxTick = Math.max(1, Math.ceil(maxValue / tickStep) * tickStep)
  const ticks = []
  for (let tick = 0; tick <= maxTick; tick += tickStep) ticks.push(tick)
  if (ticks.at(-1) !== maxTick) ticks.push(maxTick)
  const baseline = margin.top + plotHeight

  return (
    <div className="admin-auth-chart-scroll" tabIndex="0" aria-label={t(scrollKey)}>
      <svg
        className="admin-auth-chart-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <title id={titleId}>{t(titleKey)}</title>
        <desc id={descriptionId}>{t(descriptionKey)}</desc>
        {ticks.map((tick) => {
          const y = baseline - (tick / maxTick) * plotHeight
          return (
            <g key={tick} className="admin-auth-chart-tick">
              <line x1={margin.left} y1={y} x2={width - margin.right} y2={y}/>
              <text x={margin.left - 8} y={y + 4} textAnchor="end">{tick.toLocaleString(language)}</text>
            </g>
          )
        })}
        <line className="admin-auth-chart-axis" x1={margin.left} y1={margin.top} x2={margin.left} y2={baseline}/>
        <line className="admin-auth-chart-axis" x1={margin.left} y1={baseline} x2={width - margin.right} y2={baseline}/>
        {months.map((point, index) => {
          const x = margin.left + index * slotWidth + 8
          const barWidth = slotWidth - 16
          const barHeight = (point.count / maxTick) * plotHeight
          const y = baseline - barHeight
          const label = monthLabel(point.month, language)
          const unit = point.count === 1 ? t(singularKey) : t(pluralKey)
          const exact = `${point.month}: ${point.count.toLocaleString(language)} ${unit}`
          return (
            <g key={point.month} className="admin-auth-chart-month">
              <rect
                className="admin-auth-chart-hit-area"
                x={x}
                y={margin.top}
                width={barWidth}
                height={plotHeight}
                tabIndex="0"
                role="img"
                aria-label={exact}
              >
                <title>{exact}</title>
              </rect>
              <rect className="admin-auth-chart-bar" x={x} y={y} width={barWidth} height={barHeight} aria-hidden="true"/>
              <text className="admin-auth-chart-month-label" x={x + barWidth / 2} y={baseline + 20} textAnchor="middle">{label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const CHART_CONFIG = {
  accounts: {
    titleKey: 'Account creations by month',
    descriptionKey: 'Counts Auth accounts still present, using auth.users.created_at and UTC calendar months.',
    plotDescriptionKey: 'Integer account count on the vertical axis, starting at zero; UTC months on the horizontal axis.',
    loadingKey: 'Loading account creation chart...',
    errorKey: 'Account creation chart could not be loaded.',
    emptyKey: 'No Supabase Auth accounts were present at this reading.',
    scopeKey: 'This chart counts Auth accounts still present when the report was read; profile creation dates are not used.',
    scrollKey: 'Scroll monthly account chart horizontally',
    singularKey: 'account',
    pluralKey: 'accounts',
  },
  parcels: {
    titleKey: 'Parcels created by month',
    descriptionKey: 'Counts active main_parcels rows and retained deleted_parcels snapshots by their original created_at, grouped in UTC calendar months.',
    plotDescriptionKey: 'Integer parcel count on the vertical axis, starting at zero; UTC months on the horizontal axis.',
    loadingKey: 'Loading parcel creation chart...',
    errorKey: 'Parcel creation chart could not be loaded.',
    emptyKey: 'No active or archived parcels were present at this reading.',
    unusableOnlyKey: 'Parcels were found, but none had a usable creation date for monthly grouping.',
    scopeKey: 'This chart counts active parcels still in main_parcels and retained deleted_parcels snapshots, regardless of sale category or manual visibility. Physical deletions without a retained archive are not represented.',
    scrollKey: 'Scroll monthly parcel chart horizontally',
    singularKey: 'parcel',
    pluralKey: 'parcels',
  },
  marketplaceConversations: {
    titleKey: 'Marketplace parcel discussions created by month',
    descriptionKey: 'Counts retained Marketplace conversations linked to an active or archived parcel by conversations.created_at in UTC calendar months. Each conversation is counted once, regardless of its messages; unlinked conversations are excluded.',
    plotDescriptionKey: 'Integer conversation count on the vertical axis, starting at zero; UTC months on the horizontal axis.',
    loadingKey: 'Loading Marketplace parcel discussion chart...',
    errorKey: 'Marketplace parcel discussion chart could not be loaded.',
    emptyKey: 'No linked Marketplace conversations were present at this reading.',
    unusableOnlyKey: 'Linked Marketplace conversations were found, but none had a usable creation date for monthly grouping.',
    scopeKey: 'This chart counts conversations still present in the conversations table, linked by parcel_id to an active parcel or deleted_parcel_id to an archived parcel. A conversation is counted once, not once per message. Unlinked conversations are excluded. Physically deleted conversations have no archive here and cannot be reconstructed.',
    scrollKey: 'Scroll monthly Marketplace parcel discussion chart horizontally',
    singularKey: 'discussion',
    pluralKey: 'discussions',
  },
}

export function AdminMonthlyCreationsChart({ state, onRetry, lang = 'en', sourceKind = 'accounts' }) {
  const chartState = state ?? { kind: 'loading' }
  const language = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const t = (value) => adminText(lang, value)
  const config = CHART_CONFIG[sourceKind] ?? CHART_CONFIG.accounts
  const headingId = useId()

  return (
    <section className="admin-auth-chart-card" aria-labelledby={headingId}>
      <div className="admin-auth-chart-heading">
        <div>
          <h2 id={headingId}>{t(config.titleKey)}</h2>
          <p>{t(config.descriptionKey)}</p>
        </div>
        {chartState.kind === 'ready' && (
          <span className="admin-auth-chart-as-of">{t('As of')} {formatAsOf(chartState.data.as_of, language)}</span>
        )}
      </div>

      {chartState.kind === 'loading' && <p className="admin-auth-chart-status" role="status">{t(config.loadingKey)}</p>}
      {chartState.kind === 'error' && (
        <div className="admin-auth-chart-error" role="alert">
          <p>{apiErrorMessage(chartState.error, lang) || t(config.errorKey)}</p>
          <button type="button" className="admin-retry-button" onClick={onRetry}>{t('Retry')}</button>
        </div>
      )}
      {chartState.kind === 'ready' && chartState.data.monthly.length === 0 && (
        <p className="admin-auth-chart-empty" role="status">
          {chartState.data.unusable_created_at_count > 0 && config.unusableOnlyKey
            ? t(config.unusableOnlyKey)
            : t(config.emptyKey)}
        </p>
      )}
      {chartState.kind === 'ready' && chartState.data.monthly.length > 0 && (
        <MonthlyCreationsPlot
          data={chartState.data}
          language={language}
          t={t}
          titleKey={config.titleKey}
          descriptionKey={config.plotDescriptionKey}
          singularKey={config.singularKey}
          pluralKey={config.pluralKey}
          scrollKey={config.scrollKey}
        />
      )}
      {chartState.kind === 'ready' && (
        <p className="admin-auth-chart-note">
          {t('The current UTC calendar month is incomplete.')}
          {' '}{t(config.scopeKey)}
        </p>
      )}
      {chartState.kind === 'ready' && chartState.data.unusable_created_at_count > 0 && (
        <p className="admin-auth-chart-note" role="status">
          {t('Rows excluded from monthly grouping because created_at is missing or unusable:')}
          {' '}{chartState.data.unusable_created_at_count.toLocaleString(language)}
        </p>
      )}
    </section>
  )
}

export default function AdminAccountCreationsChart(props) {
  return <AdminMonthlyCreationsChart {...props} sourceKind="accounts"/>
}
