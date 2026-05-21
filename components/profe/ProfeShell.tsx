'use client'

import { useState } from 'react'
import { Menu, Dumbbell } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { Profile } from '@/lib/types/database'

interface ProfeShellProps {
  profile: Profile
  children: React.ReactNode
}

export function ProfeShell({ profile, children }: ProfeShellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-100">

      {/* Overlay oscuro en mobile cuando sidebar está abierto */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar: fijo en desktop, slide-in en mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:relative md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar profile={profile} onClose={() => setOpen(false)} />
      </div>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar solo en mobile */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500">
              <Dumbbell className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Planificador Pro</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
