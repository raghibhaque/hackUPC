import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, TrendingUp, Zap, Info, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuickStats, ComplexityLevel, RiskLevel, ReconciliationResult } from '@/types'
import { assessDataLossRisk } from '@/lib/statsUtils'

interface QuickStatsCardProps {
  stats: QuickStats | null
  result?: ReconciliationResult
  compact?: boolean
  showHelp?: boolean
}

const STAT_TOOLTIPS = {
  match_percentage: 'Percentage of source tables successfully matched to target tables',
  confidence: 'Average confidence score (0-100%) across all table matches',
  complexity: 'Migration complexity estimate based on conflicts and unmatched elements',
  risk_level: 'Overall data loss risk level (Low/Medium/High/Critical)',
  risk_score: 'Quantified risk score (0-100%) considering all risk factors',
  unmatched_source: 'Source tables that have no match in the target schema',
  unmatched_target: 'Target tables that have no match in the source schema',
  critical_conflicts: 'High-severity conflicts that require resolution before migration',
}

export function QuickStatsCard({ stats, result, compact = false, showHelp = false }: QuickStatsCardProps) {
  const [showRiskDetails, setShowRiskDetails] = useState(false)
  const [hoveredStat, setHoveredStat] = useState<string | null>(null)

  if (!stats) {
    return (
      <div className={cn(
        'rounded-lg border border-slate-700 bg-slate-900/40 p-4',
        compact ? 'py-3' : 'p-6'
      )}>
        <p className="text-sm text-slate-400">No reconciliation results yet</p>
      </div>
    )
  }

  const complexityColor = _getComplexityColor(stats.complexity_level)
  const riskColor = _getRiskColor(stats.risk_level)
  const dataLossRisk = result ? assessDataLossRisk(result) : null

  if (compact) {
    return (
      <div className="flex gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs">
        <Stat
          label="Match"
          value={`${stats.match_percentage}%`}
          color="text-blue-400"
        />
        <div className="border-r border-slate-600" />
        <Stat
          label="Complexity"
          value={stats.complexity_level}
          color={complexityColor}
        />
        <div className="border-r border-slate-600" />
        <Stat
          label="Risk"
          value={stats.risk_level}
          color={riskColor}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
      <h3 className="mb-4 font-semibold text-slate-100">Quick Stats</h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBlock
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Match %"
          value={`${stats.match_percentage}%`}
          subtext={`${stats.total_tables_matched}/${stats.total_tables_source} tables`}
          color="text-blue-400"
          tooltipKey="match_percentage"
          showTooltip={showHelp}
        />

        <StatBlock
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg Confidence"
          value={`${(stats.average_confidence * 100).toFixed(0)}%`}
          subtext={`${stats.total_columns_matched} cols matched`}
          color="text-emerald-400"
          tooltipKey="confidence"
          showTooltip={showHelp}
        />

        <StatBlock
          icon={<Zap className="h-4 w-4" />}
          label="Complexity"
          value={stats.complexity_level}
          subtext={`${stats.total_conflicts} conflicts`}
          color={complexityColor}
          tooltipKey="complexity"
          showTooltip={showHelp}
        />

        <StatBlock
          icon={<AlertCircle className="h-4 w-4" />}
          label="Risk Level"
          value={stats.risk_level}
          subtext={`Score: ${stats.risk_score}%`}
          color={riskColor}
          tooltipKey="risk_level"
          showTooltip={showHelp}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-700 pt-4 text-xs text-slate-400 md:grid-cols-4">
        <div>
          <span className="text-slate-500">Unmatched Source:</span>
          <span className="ml-1 text-slate-200">{stats.unmatched_source_count}</span>
        </div>
        <div>
          <span className="text-slate-500">Unmatched Target:</span>
          <span className="ml-1 text-slate-200">{stats.unmatched_target_count}</span>
        </div>
        <div>
          <span className="text-slate-500">Total Conflicts:</span>
          <span className="ml-1 text-slate-200">{stats.total_conflicts}</span>
        </div>
        <div>
          <span className="text-slate-500">Critical:</span>
          <span className="ml-1 text-red-400">{stats.critical_conflicts}</span>
        </div>
      </div>

      {stats.risk_level !== 'Low' && dataLossRisk && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <button
            onClick={() => setShowRiskDetails(!showRiskDetails)}
            className="flex items-center gap-2 text-sm font-medium text-yellow-400 hover:text-yellow-300"
          >
            <Info className="h-4 w-4" />
            Data Loss Risks ({dataLossRisk.riskFactors.length})
          </button>
          {showRiskDetails && (
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {dataLossRisk.riskFactors.map((factor, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 text-yellow-400">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

interface StatBlockProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  color?: string
  tooltipKey?: keyof typeof STAT_TOOLTIPS
  showTooltip?: boolean
}

function StatBlock({
  icon,
  label,
  value,
  subtext,
  color = 'text-slate-400',
  tooltipKey,
  showTooltip = false,
}: StatBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const tooltip = tooltipKey ? STAT_TOOLTIPS[tooltipKey] : null

  return (
    <div
      className="relative rounded border border-slate-700/50 bg-slate-800/20 p-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn('mb-1 flex items-center gap-1', color)}>
        {icon}
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {tooltip && showTooltip && (
          <HelpCircle className="h-3 w-3 opacity-50 hover:opacity-100" />
        )}
      </div>
      <div className={cn('text-lg font-bold', color)}>{value}</div>
      {subtext && (
        <div className="mt-1 text-xs text-slate-500">{subtext}</div>
      )}
      {isHovered && tooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-48 rounded bg-slate-950 p-2 text-xs text-slate-300 border border-slate-700 shadow-lg z-10">
          {tooltip}
        </div>
      )}
    </div>
  )
}

interface StatProps {
  label: string
  value: string | number
  color?: string
}

function Stat({ label, value, color = 'text-slate-200' }: StatProps) {
  return (
    <div>
      <span className="text-slate-500">{label}:</span>
      <span className={cn('ml-1 font-semibold', color)}>{value}</span>
    </div>
  )
}

function _getComplexityColor(level: ComplexityLevel): string {
  switch (level) {
    case 'Simple':
      return 'text-emerald-400'
    case 'Moderate':
      return 'text-yellow-400'
    case 'Complex':
      return 'text-red-400'
  }
}

function _getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return 'text-emerald-400'
    case 'Medium':
      return 'text-yellow-400'
    case 'High':
      return 'text-orange-400'
    case 'Critical':
      return 'text-red-400'
  }
}
