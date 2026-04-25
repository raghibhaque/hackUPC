import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle, Info, AlertCircle, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface GuideTopic {
  title: string
  icon: React.ReactNode
  description: string
  items: {
    label: string
    explanation: string
    example?: string
  }[]
}

const guideTopics: GuideTopic[] = [
  {
    title: 'Mapping Statistics',
    icon: <CheckCircle className="h-5 w-5" />,
    description: 'Understand column mapping and reconciliation metrics',
    items: [
      {
        label: 'Mapped Columns',
        explanation: 'Number of source columns successfully matched to target columns.',
        example: '45 out of 50 source columns matched',
      },
      {
        label: 'Unmapped Columns',
        explanation: 'Source or target columns without a corresponding match. These require manual review.',
        example: '5 unmapped columns need manual mapping',
      },
      {
        label: 'Type Conflicts',
        explanation: 'Columns where the data type differs between source and target tables.',
        example: 'VARCHAR → INTEGER requires conversion rules',
      },
      {
        label: 'Confidence Score',
        explanation: 'Algorithmic confidence (0-1) that the mapping is correct. Based on structural and semantic analysis.',
        example: '0.95 = 95% confidence the mapping is correct',
      },
    ],
  },
  {
    title: 'Quality Metrics',
    icon: <TrendingUp className="h-5 w-5" />,
    description: 'Assess overall schema reconciliation quality',
    items: [
      {
        label: 'Mapping Completeness',
        explanation: 'Percentage of columns that have been mapped. Higher is better.',
        example: '90% indicates most columns are mapped',
      },
      {
        label: 'Quality Score',
        explanation: 'Percentage of table mappings with high confidence (≥90%). Indicates overall reconciliation reliability.',
        example: '85% means 85% of tables have high-confidence mappings',
      },
      {
        label: 'Conflict Rate',
        explanation: 'Percentage of mapped columns with type conflicts. Lower is better.',
        example: '10% means 1 in 10 mapped columns has a type mismatch',
      },
      {
        label: 'Average Column Difference',
        explanation: 'Average difference in column count between source and target tables.',
        example: '3.2 means tables differ by ~3 columns on average',
      },
    ],
  },
  {
    title: 'Data Types',
    icon: <Info className="h-5 w-5" />,
    description: 'Learn about data type categories and conversions',
    items: [
      {
        label: 'Type Categories',
        explanation: 'SQL types are grouped into categories: Integer, Decimal, Text, DateTime, Boolean, JSON, Binary, Other.',
        example: 'INT, BIGINT, SMALLINT → Integer category',
      },
      {
        label: 'Type Distribution',
        explanation: 'Shows the count of each data type category in source and target tables.',
        example: 'Source: 10 integers, 5 text, 3 datetime',
      },
      {
        label: 'Compatible Types',
        explanation: 'Types that can be converted with minimal data loss (e.g., INT → BIGINT).',
        example: 'VARCHAR to TEXT is compatible',
      },
      {
        label: 'Incompatible Types',
        explanation: 'Types requiring complex transformation rules (e.g., VARCHAR → JSON).',
        example: 'INTEGER to BOOLEAN needs conversion logic',
      },
    ],
  },
  {
    title: 'Constraints & Indexes',
    icon: <AlertCircle className="h-5 w-5" />,
    description: 'Understand table constraints and performance indexes',
    items: [
      {
        label: 'Primary Keys',
        explanation: 'Unique identifier column(s) for each row. Used to uniquely identify records.',
        example: 'user_id is the primary key in users table',
      },
      {
        label: 'Unique Constraints',
        explanation: 'Columns that must have unique values (except NULL). Prevents duplicate entries.',
        example: 'email must be unique across all users',
      },
      {
        label: 'Indexes',
        explanation: 'Database structures that speed up queries. Multiple indexes can exist on one table.',
        example: '3 indexes on orders table for performance',
      },
      {
        label: 'Constraint Matching',
        explanation: 'Reconciliation checks if primary keys and constraints match between source and target.',
        example: 'Both tables should have same primary key definition',
      },
    ],
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

const TrendingUp = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

export default function StatisticsGuide({ isOpen, onClose }: Props) {
  const [selectedTopic, setSelectedTopic] = useState<number>(0)

  if (!isOpen) return null

  const currentTopic = guideTopics[selectedTopic]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/[0.1] shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-white/[0.05] bg-white/[0.02] backdrop-blur px-5 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-indigo-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Statistics Guide</h2>
                  <p className="text-xs text-white/50 mt-1">Understanding schema reconciliation metrics</p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
              >
                <X className="h-5 w-5 text-white/60 hover:text-white/80" />
              </motion.button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-white/[0.05] bg-white/[0.02] p-3 sm:p-4">
              {guideTopics.map((topic, i) => (
                <motion.button
                  key={i}
                  onClick={() => setSelectedTopic(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium',
                    selectedTopic === i
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      : 'border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05] text-white/60 hover:text-white/80'
                  )}
                >
                  <div className="text-sm">{topic.icon}</div>
                  <span>{topic.title}</span>
                </motion.button>
              ))}
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 space-y-4">
              <motion.div
                key={selectedTopic}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                    {currentTopic.icon}
                    {currentTopic.title}
                  </h3>
                  <p className="text-sm text-white/70">{currentTopic.description}</p>
                </div>

                <div className="space-y-3">
                  {currentTopic.items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-1 hover:border-white/[0.12] transition-all"
                    >
                      <p className="text-xs font-semibold text-indigo-300">{item.label}</p>
                      <p className="text-sm text-white/70">{item.explanation}</p>
                      {item.example && (
                        <div className="mt-2 pt-2 border-t border-white/[0.05]">
                          <p className="text-xs text-white/50">
                            <span className="font-semibold">Example:</span> {item.example}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Footer tips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-lg border border-white/[0.08] bg-emerald-500/10 p-3 text-xs text-white/70 space-y-1"
              >
                <p className="font-semibold text-emerald-300">💡 Pro Tips:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Hover over metric cards to see detailed tooltips</li>
                  <li>Use the detailed statistics modal for in-depth analysis</li>
                  <li>Export statistics to track changes over time</li>
                  <li>Review type conflicts first for data integrity</li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
