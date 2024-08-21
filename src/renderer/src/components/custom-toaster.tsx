'use client'
import { Toaster, ToastIcon, toast, resolveValue } from 'react-hot-toast'
import { IoIosClose } from 'react-icons/io'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button' // Caso precise de um botão específico do seu projeto
import { Label } from './ui/label'

export default function CustomToaster() {
  return (
    <Toaster position="top-center">
      {(t) => (
        <AnimatePresence>
          {t.visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.3, ease: 'easeOut', type: 'spring' }
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                transition: { duration: 0.2, ease: 'easeOut', type: 'spring' }
              }}
              className="bg-card px-4 py-1 flex gap-2 items-center rounded-xl border-[0.5px] shadow-lg"
            >
              <ToastIcon toast={t} />
              <Label className="px-2 font-normal">{resolveValue(t.message, t)}</Label>
              <Button
                onClick={() => {
                  toast.dismiss(t.id)
                }}
                variant="ghost"
                aria-label="Close"
              >
                <IoIosClose className="text-muted-foreground" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Toaster>
  )
}
