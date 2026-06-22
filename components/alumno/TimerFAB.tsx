'use client'

import { useEffect, useState } from 'react'
import { Timer, Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react'

const PRESETS = [30, 60, 90, 120, 180]

function formatTime(segs: number): string {
  const m = Math.floor(segs / 60)
  const s = segs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerFAB() {
  const [expanded, setExpanded] = useState(false)
  const [segundosObjetivo, setSegundosObjetivo] = useState(90)
  const [inputValue, setInputValue] = useState('90')
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null)
  const [corriendo, setCorriendo] = useState(false)
  const [terminado, setTerminado] = useState(false)

  // Tick: bajar un segundo cada 1s mientras corre
  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => {
      setSegundosRestantes((s) => {
        if (s === null || s <= 1) {
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [corriendo])

  // Detectar fin del timer (cuando llega a 0)
  useEffect(() => {
    if (segundosRestantes === 0 && corriendo) {
      setCorriendo(false)
      setTerminado(true)
      setExpanded(true)
    }
  }, [segundosRestantes, corriendo])

  function handleIniciar() {
    const n = Math.max(1, Number(inputValue) || 90)
    setSegundosObjetivo(n)
    setSegundosRestantes(n)
    setCorriendo(true)
    setTerminado(false)
  }

  function handlePresetTap(p: number) {
    setInputValue(String(p))
    setSegundosObjetivo(p)
  }

  function handlePausarReanudar() {
    setCorriendo((c) => !c)
  }

  function handleAjustar(delta: number) {
    setSegundosRestantes((s) => {
      if (s === null) return s
      return Math.max(0, s + delta)
    })
    if (delta > 0) {
      setSegundosObjetivo((o) => o + delta)
    }
  }

  function handleReiniciar() {
    setSegundosRestantes(segundosObjetivo)
    setCorriendo(true)
    setTerminado(false)
  }

  function handleCancelar() {
    setCorriendo(false)
    setSegundosRestantes(null)
    setTerminado(false)
  }

  function handleOkTerminado() {
    setTerminado(false)
    setSegundosRestantes(null)
    setExpanded(false)
  }

  const hayTimer = segundosRestantes !== null

  // Estilo de fondo del panel: flash si terminado
  const panelBg = terminado
    ? 'bg-orange-100 ring-orange-400 animate-pulse'
    : 'bg-white ring-rose-200'

  // Mostrar mini-countdown en el botón colapsado si hay timer activo
  const fabContent = hayTimer && !terminado ? (
    <div className="flex flex-col items-center justify-center leading-none">
      <Timer className="h-4 w-4 mb-0.5" />
      <span className="text-[10px] font-bold tabular-nums">
        {formatTime(segundosRestantes!)}
      </span>
    </div>
  ) : terminado ? (
    <div className="flex flex-col items-center justify-center leading-none">
      <Timer className="h-5 w-5" />
    </div>
  ) : (
    <Timer className="h-6 w-6" />
  )

  return (
    <>
      {/* Panel expandido */}
      {expanded && (
        <div
          className={`fixed bottom-40 right-4 z-30 w-72 rounded-2xl shadow-xl ring-1 transition-colors ${panelBg}`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-rose-600" />
              <p className="text-sm font-semibold text-slate-800">Temporizador</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4">
            {/* Estado: terminó */}
            {terminado && (
              <div className="space-y-3 text-center">
                <p className="text-4xl">⏰</p>
                <p className="text-lg font-bold text-orange-700">¡Descanso terminado!</p>
                <button
                  type="button"
                  onClick={handleOkTerminado}
                  className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 transition-colors"
                >
                  OK
                </button>
              </div>
            )}

            {/* Estado: corriendo o pausado */}
            {!terminado && hayTimer && (
              <div className="space-y-3">
                <p className="text-center text-5xl font-bold tabular-nums text-slate-900">
                  {formatTime(segundosRestantes!)}
                </p>
                {/* Barra de progreso */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-rose-500 transition-all duration-1000"
                    style={{
                      width: `${segundosObjetivo > 0 ? (segundosRestantes! / segundosObjetivo) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAjustar(-15)}
                    className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-0.5"
                    title="Restar 15 segundos"
                  >
                    <Minus className="h-3 w-3" />15s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAjustar(15)}
                    className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-0.5"
                    title="Sumar 15 segundos"
                  >
                    <Plus className="h-3 w-3" />15s
                  </button>
                  <button
                    type="button"
                    onClick={handlePausarReanudar}
                    className="rounded-lg bg-rose-600 px-2 py-2 text-white hover:bg-rose-500 transition-colors flex items-center justify-center"
                    title={corriendo ? 'Pausar' : 'Reanudar'}
                  >
                    {corriendo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleReiniciar}
                    className="rounded-lg bg-slate-100 px-2 py-2 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center"
                    title="Reiniciar"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelar}
                    className="rounded-lg bg-red-50 px-2 py-2 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Estado: sin timer */}
            {!terminado && !hayTimer && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Segundos de descanso
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-2xl font-bold tabular-nums text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    placeholder="90"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetTap(p)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                        Number(inputValue) === p
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {p}s
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleIniciar}
                  className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Iniciar descanso
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-2 transition-all ${
          terminado
            ? 'bg-orange-500 text-white ring-orange-200 animate-pulse'
            : hayTimer
              ? 'bg-rose-600 text-white ring-rose-200'
              : 'bg-rose-500 text-white ring-rose-100 hover:bg-rose-400'
        }`}
        title="Temporizador de descanso"
      >
        {fabContent}
      </button>
    </>
  )
}
