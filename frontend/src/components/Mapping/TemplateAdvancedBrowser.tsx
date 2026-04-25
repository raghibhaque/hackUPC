import { motion, AnimatePresence } from 'framer-motion'
import { Search, Copy, Download, Upload, Trash2, Star, Clock, TrendingUp, Save } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { MappingTemplate, WorkspaceSnapshot, exportTemplate, importTemplate } from '../../hooks/useTemplates'

interface Props {
  templates: MappingTemplate[]
  snapshots: WorkspaceSnapshot[]
  categories: string[]
  onLoadTemplate: (template: MappingTemplate) => void
  onDeleteTemplate: (id: string) => void
  onCloneTemplate: (id: string, name: string) => void
  onCreateSnapshot: (name: string) => void
  onRestoreSnapshot: (id: string) => void
  onDeleteSnapshot: (id: string) => void
}

type SortBy = 'name' | 'recent' | 'usage' | 'rating'
type ViewMode = 'templates' | 'snapshots'

export default function TemplateAdvancedBrowser({
  templates,
  snapshots,
  categories,
  onLoadTemplate,
  onDeleteTemplate,
  onCloneTemplate,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('templates')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [showSnapshotInput, setShowSnapshotInput] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')

  const filtered = useMemo(() => {
    let result = templates

    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower) ||
        t.tags?.some(tag => tag.toLowerCase().includes(lower))
      )
    }

    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory)
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'recent':
          return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
        case 'usage':
          return (b.metadata?.usageCount || 0) - (a.metadata?.usageCount || 0)
        case 'rating':
          return (b.metadata?.successRate || 0) - (a.metadata?.successRate || 0)
        default:
          return 0
      }
    })

    return sorted
  }, [templates, search, selectedCategory, sortBy])

  const handleExport = (template: MappingTemplate) => {
    const json = exportTemplate(template)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name}.json`
    a.click()
  }

  const handleSaveSnapshot = () => {
    if (snapshotName.trim()) {
      onCreateSnapshot(snapshotName)
      setSnapshotName('')
      setShowSnapshotInput(false)
    }
  }

  const getTemplateStats = (template: MappingTemplate) => {
    const stats = []
    if (template.metadata?.usageCount) {
      stats.push({ label: 'Used', value: template.metadata.usageCount, icon: TrendingUp })
    }
    if (template.metadata?.successRate !== undefined) {
      stats.push({ label: 'Success', value: `${Math.round(template.metadata.successRate * 100)}%`, icon: Star })
    }
    return stats
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Mode Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08]">
        {(['templates', 'snapshots'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors border-b-2 -mb-0.5',
              viewMode === mode
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-white/50 hover:text-white/70'
            )}
          >
            {mode === 'templates' ? 'Templates' : 'Snapshots'}
          </button>
        ))}
      </div>

      {/* Templates View */}
      {viewMode === 'templates' && (
        <div className="space-y-3">
          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/[0.15]"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="text-xs px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white/70 hover:text-white/90 focus:outline-none"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name A-Z</option>
                <option value="usage">Most Used</option>
                <option value="rating">Highest Rated</option>
              </select>

              {categories.length > 0 && (
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="text-xs px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white/70 hover:text-white/90 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Templates List */}
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-xs">
              No templates found
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 space-y-2 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-white/90 truncate">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{template.description}</p>
                      )}
                    </div>
                    {template.category && (
                      <span className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 shrink-0">
                        {template.category}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {template.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/60">
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 text-white/40">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-3 text-[10px] text-white/50">
                    {getTemplateStats(template).map(stat => (
                      <span key={stat.label} className="flex items-center gap-1">
                        <stat.icon className="h-3 w-3" />
                        {stat.label}: {stat.value}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onLoadTemplate(template)}
                      className="flex-1 text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors font-semibold"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => onCloneTemplate(template.id, `${template.name} (Copy)`)}
                      className="px-2 py-1 rounded bg-white/[0.05] text-white/60 hover:bg-white/[0.08] transition-colors"
                      title="Clone"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleExport(template)}
                      className="px-2 py-1 rounded bg-white/[0.05] text-white/60 hover:bg-white/[0.08] transition-colors"
                      title="Export"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(template.id)}
                      className="px-2 py-1 rounded bg-white/[0.05] text-white/60 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshots View */}
      {viewMode === 'snapshots' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowSnapshotInput(!showSnapshotInput)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
          >
            <Save className="h-4 w-4" />
            Create Snapshot
          </button>

          <AnimatePresence>
            {showSnapshotInput && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Snapshot name..."
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveSnapshot()
                    if (e.key === 'Escape') {
                      setShowSnapshotInput(false)
                      setSnapshotName('')
                    }
                  }}
                  autoFocus
                  className="flex-1 px-3 py-2 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-white/30 focus:outline-none"
                />
                <button
                  onClick={handleSaveSnapshot}
                  disabled={!snapshotName.trim()}
                  className="px-3 py-2 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Snapshots List */}
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-xs">
              No snapshots yet. Create one to save your current state.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {snapshots.map((snapshot, i) => (
                <motion.div
                  key={snapshot.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 space-y-2 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-white/90">{snapshot.name}</h4>
                      <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(snapshot.timestamp).toLocaleDateString()} {new Date(snapshot.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0">
                      {snapshot.templates.length} templates
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onRestoreSnapshot(snapshot.id)}
                      className="flex-1 text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors font-semibold"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => onDeleteSnapshot(snapshot.id)}
                      className="px-2 py-1 rounded bg-white/[0.05] text-white/60 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
