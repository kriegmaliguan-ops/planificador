'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, TrendingUp, BookOpen, BarChart2, Dumbbell } from 'lucide-react'

const TABS = [
  { href: '/rutina',    label: 'Hoy',       icon: CalendarDays },
  { href: '/mi-rutina', label: 'Rutina',    icon: BookOpen     },
  { href: '/progreso',  label: 'Progreso',  icon: TrendingUp   },
  { href: '/historial', label: 'Historial', icon: BarChart2    },
  { href: '/biblioteca',label: 'Ejercicios',icon: Dumbbell     },
]

export function NavBottom() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : ''}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
