import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader, Trash2, X, ChevronDown } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { MappingTemplate } from '../../hooks/useTemplates'

interface Props {
  templates: MappingTemplate[]
  onSave: (name: string) => void
  onLoad: (template: MappingTemplate) => void
  onDelete: (templateId: string) => void
  isDark?: boolean
}

export default function TemplateManager({
  templates,
  onSave,
  onLoad,
  onDelete,
  isDark = true,
}: Props) {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return

    try {
      onSave(templateName)
      setTemplateName('')
      setShowNameInput(false)
    } catch (e) {
      alert(`Failed to save template: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const handleLoadTemplate = (template: MappingTemplate) => {
    onLoad(template)
    setIsOpen(false)
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Delete this template?')) {
      onDelete(templateId)
    }
  }

  const finalTheme = theme || (isDark ? 'dark' : 'light')
  const isDarkMode = finalTheme === 'dark'

  return (
    <div className="flex items-center gap-2">
      {/* Save Template Button */}
      <motion.button
        onClick={() => setShowNameInput(!showNameInput)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`group relative overflow-hidden rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
          isDarkMode
            ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/15'
            : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100'
        }`}
        title="Save current state as template"
      >
        <span className="relative flex items-center gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Save
        </span>
      </motion.button>

      {/* Load/Manage Templates Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`group relative overflow-hidden rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
          isDarkMode
            ? 'border-white/[0.1] bg-white/[0.05] text-white/60 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white/80'
            : 'border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400 hover:bg-slate-200 hover:text-slate-800'
        }`}
        title="Load or manage templates"
      >
        <span className="relative flex items-center gap-1.5">
          <Loader className="h-3.5 w-3.5" />
          Templates
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="ml-1"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.div>
        </span>
      </motion.button>

      {/* Save Template Input */}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Template name…"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTemplate()
                if (e.key === 'Escape') {
                  setShowNameInput(false)
                  setTemplateName('')
                }
              }}
              autoFocus
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                isDarkMode
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-white placeholder-white/40 focus:border-indigo-500/50 focus:bg-indigo-500/15 focus:outline-none'
                  : 'border-indigo-300 bg-indigo-50 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:bg-indigo-100 focus:outline-none'
              }`}
            />
            <motion.button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                isDarkMode
                  ? 'border-green-500/20 bg-green-500/10 text-green-300 hover:border-green-500/30 hover:bg-green-500/15'
                  : 'border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100'
              }`}
            >
              Save
            </motion.button>
            <motion.button
              onClick={() => {
                setShowNameInput(false)
                setTemplateName('')
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-lg border px-2 py-1.5 ${
                isDarkMode
                  ? 'border-white/[0.1] bg-white/[0.05] text-white/40 hover:bg-white/[0.08]'
                  : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border shadow-lg ${
              isDarkMode
                ? 'border-white/[0.07] bg-[#0f0f1e]'
                : 'border-slate-300 bg-white'
            }`}
          >
            {templates.length === 0 ? (
              <div className={`p-4 text-center text-xs ${
                isDarkMode ? 'text-white/50' : 'text-slate-500'
              }`}>
                No templates saved yet. Create one using the Save button!
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto p-2">
                {templates.map((template) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`group flex items-center justify-between rounded-lg border p-2 transition-all ${
                      isDarkMode
                        ? 'border-white/[0.05] hover:bg-white/[0.04]'
                        : 'border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className={`flex-1 text-left ${
                        isDarkMode ? 'text-white/80' : 'text-slate-900'
                      }`}
                    >
                      <p className="text-xs font-medium truncate">{template.name}</p>
                      <p className={`text-[10px] ${
                        isDarkMode ? 'text-white/40' : 'text-slate-500'
                      }`}>
                        {template.reviewedIndices.length} reviewed, {template.expandedIndices.length} expanded
                      </p>
                    </button>
                    <motion.button
                      onClick={() => handleDeleteTemplate(template.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`ml-2 p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isDarkMode
                          ? 'text-white/40 hover:text-red-400'
                          : 'text-slate-500 hover:text-red-600'
                      }`}
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
