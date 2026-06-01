'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const STORAGE_KEY = 'pwa-install-dismissed'

export function InstallPwaBtn() {
  const [prompt, setPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // No mostrar si ya fue descartado
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return

    // En iOS no existe beforeinstallprompt; el proceso es manual
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  function handleInstall() {
    if (!prompt) return
    prompt.prompt()
    prompt.userChoice.then(() => {
      setVisible(false)
      setPrompt(null)
    })
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 shadow-lg text-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Instalá la app</p>
          <p className="text-xs text-slate-400 leading-tight">Accedé sin el navegador</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-500 transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
