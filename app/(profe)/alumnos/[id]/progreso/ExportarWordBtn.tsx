'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

interface Props {
  alumnoId: string
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

function hace30(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export function ExportarWordBtn({ alumnoId }: Props) {
  const [desde, setDesde] = useState(hace30)
  const [hasta, setHasta] = useState(hoy)
  const [loading, setLoading] = useState(false)

  function handleExportar(e: React.FormEvent) {
    e.preventDefault()
    if (!desde || !hasta) return
    setLoading(true)
    const url = `/alumnos/${alumnoId}/progreso/exportar?desde=${desde}&hasta=${hasta}`
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // Reset loading after a short delay (the download starts immediately)
    setTimeout(() => setLoading(false), 2000)
  }

  const inputClass =
    'rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <FileDown className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Exportar progreso en Word</h2>
      </div>

      <form onSubmit={handleExportar} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            max={hasta}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            min={desde}
            max={hoy()}
            required
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !desde || !hasta}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {loading ? 'Generando...' : 'Descargar Word'}
        </button>
      </form>
    </div>
  )
}
