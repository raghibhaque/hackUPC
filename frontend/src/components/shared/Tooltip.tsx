import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ children, content, position = 'top' }: Props) {
  const [visible, setVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full mb-3 -translate-x-1/2 left-1/2',
    bottom: 'top-full mt-3 -translate-x-1/2 left-1/2',
    left: 'right-full mr-3 -translate-y-1/2 top-1/2',
    right: 'left-full ml-3 -translate-y-1/2 top-1/2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-indigo-950',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-indigo-950',
    left: 'left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-indigo-950',
    right: 'right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-indigo-950',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute ${positionClasses[position]}`}
          >
            <div className="relative rounded-lg bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-500/20 px-3 py-2.5 text-xs text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)] whitespace-nowrap font-medium backdrop-blur-sm">
              {content}
              <div className={`absolute ${arrowClasses[position]}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
