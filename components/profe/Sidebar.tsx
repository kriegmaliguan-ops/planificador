'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  BookOpen,
  Layers,
  LogOut,
  ChevronRight,
  X,
  UserCircle,
} from 'lucide-react'
import { logout } from '@/app/(auth)/login/actions'
import type { Profile } from '@/lib/types/database'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/alumnos',    label: 'Alumnos',     icon: Users           },
  { href: '/ejercicios', label: 'Ejercicios',  icon: BookOpen        },
  { href: '/grupos',     label: 'Grupos',      icon: Layers          },
]

interface SidebarProps {
  profile: Profile
  onClose?: () => void
}

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => logout())
  }

  const initials = [profile.nombre, profile.apellido]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('')

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-slate-900 text-slate-100">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
          <Dumbbell className="h-5 w-5 text-white" />
        </div>
        <span className="flex-1 font-semibold text-white">Planificador Pro</span>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-4 w-4 text-blue-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Usuario + logout */}
      <div className="border-t border-slate-800 p-3 space-y-1">
        <Link
          href="/configuracion"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
            pathname === '/configuracion' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {profile.nombre} {profile.apellido ?? ''}
            </p>
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
          </div>
          <UserCircle className="h-4 w-4 shrink-0 text-slate-500" />
        </Link>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isPending ? 'Saliendo...' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
