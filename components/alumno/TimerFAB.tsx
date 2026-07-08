'use client'

import { useCallback, useEffect, useState } from 'react'
import { Timer, Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react'

const PRESETS = [30, 60, 90, 120, 180]
const STORAGE_KEY = 'descanso-timer'

interface TimerPersistido {
  endTs: number | null          // timestamp de fin (ms). null = pausado
  objetivo: number              // segundos objetivo (para reiniciar)
  pausedRemaining: number | null // segundos restantes al pausar
}

function formatTime(segs: number): string {
  const m = Math.floor(segs / 60)
  const s = segs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function leerPersistido(): TimerPersistido | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TimerPersistido
  } catch {
    return null
  }
}

function guardarPersistido(t: TimerPersistido | null) {
  try {
    if (t === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    }
  } catch {
    // localStorage lleno o bloqueado: el timer sigue funcionando in-memory
  }
}

export function TimerFAB() {
  const [expanded, setExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('90')
  const [segundosObjetivo, setSegundosObjetivo] = useState(90)
  const [endTs, setEndTs] = useState<number | null>(null)          // corriendo si != null
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null) // pausado si != null
  const [terminado, setTerminado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  const corriendo = endTs !== null
  const hayTimer = corriendo || pausedRemaining !== null

  const segundosRestantes = corriendo
    ? Math.max(0, Math.ceil((endTs - ahora) / 1000))
    : pausedRemaining

  // ── Restaurar desde localStorage al montar
  useEffect(() => {
    const saved = leerPersistido()
    if (!saved) return
    setSegundosObjetivo(saved.objetivo)
    setInputValue(String(saved.objetivo))
    if (saved.endTs !== null) {
      const restante = saved.endTs - Date.now()
      if (restante > 0) {
        setEndTs(saved.endTs)
      } else if (restante > -60_000) {
        // Terminó hace menos de 1 min: mostrar aviso
        setTerminado(true)
        setExpanded(true)
        guardarPersistido(null)
      } else {
        guardarPersistido(null)
      }
    } else if (saved.pausedRemaining !== null && saved.pausedRemaining > 0) {
      setPausedRemaining(saved.pausedRemaining)
    } else {
      guardarPersistido(null)
    }
  }, [])

  // ── Tick: recalcular desde el timestamp (sin drift en background)
  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => setAhora(Date.now()), 1000)
    setAhora(Date.now())
    return () => clearInterval(id)
  }, [corriendo])

  // ── Detectar fin
  useEffect(() => {
    if (corriendo && segundosRestantes === 0) {
      setEndTs(null)
      setPausedRemaining(null)
      setTerminado(true)
      setExpanded(true)
      guardarPersistido(null)
    }
  }, [corriendo, segundosRestantes])

  const iniciarCon = useCallback((segundos: number) => {
    const n = Math.max(1, Math.round(segundos))
    const nuevoEnd = Date.now() + n * 1000
    setSegundosObjetivo(n)
    setInputValue(String(n))
    setEndTs(nuevoEnd)
    setPausedRemaining(null)
    setTerminado(false)
    setAhora(Date.now())
    guardarPersistido({ endTs: nuevoEnd, objetivo: n, pausedRemaining: null })
  }, [])

  // ── Auto-inicio: escuchar evento disparado al registrar una serie
  useEffect(() => {
    function onIniciarDescanso(e: Event) {
      const segundos = (e as CustomEvent<{ segundos: number }>).detail?.segundos
      if (typeof segundos === 'number' && segundos > 0) {
        iniciarCon(segundos)
      }
    }
    window.addEventListener('iniciar-descanso', onIniciarDescanso)
    return () => window.removeEventListener('iniciar-descanso', onIniciarDescanso)
  }, [iniciarCon])

  function handleIniciar() {
    iniciarCon(Number(inputValue) || 90)
  }

  function handlePresetTap(p: number) {
    setInputValue(String(p))
    setSegundosObjetivo(p)
  }

  function handlePausarReanudar() {
    if (corriendo) {
      const restante = Math.max(0, Math.ceil((endTs! - Date.now()) / 1000))
      setEndTs(null)
      setPausedRemaining(restante)
      guardarPersistido({ endTs: null, objetivo: segundosObjetivo, pausedRemaining: restante })
    } else if (pausedRemaining !== null) {
      const nuevoEnd = Date.now() + pausedRemaining * 1000
      setEndTs(nuevoEnd)
      setPausedRemaining(null)
      setAhora(Date.now())
      guardarPersistido({ endTs: nuevoEnd, objetivo: segundosObjetivo, pausedRemaining: null })
    }
  }

  function handleAjustar(delta: number) {
    if (corriendo) {
      const nuevoEnd = Math.max(Date.now() + 1000, endTs! + delta * 1000)
      setEndTs(nuevoEnd)
      const nuevoObjetivo = delta > 0 ? segundosObjetivo + delta : segundosObjetivo
      if (delta > 0) setSegundosObjetivo(nuevoObjetivo)
      guardarPersistido({ endTs: nuevoEnd, objetivo: nuevoObjetivo, pausedRemaining: null })
    } else if (pausedRemaining !== null) {
      const nuevo = Math.max(1, pausedRemaining + delta)
      setPausedRemaining(nuevo)
      const nuevoObjetivo = delta > 0 ? segundosObjetivo + delta : segundosObjetivo
      if (delta > 0) setSegundosObjetivo(nuevoObjetivo)
      guardarPersistido({ endTs: null, objetivo: nuevoObjetivo, pausedRemaining: nuevo })
    }
  }

  function handleReiniciar() {
    iniciarCon(segundosObjetivo)
  }

  function handleCancelar() {
    setEndTs(null)
    setPausedRemaining(null)
    setTerminado(false)
    guardarPersistido(null)
  }

  function handleOkTerminado() {
    setTerminado(false)
    setExpanded(false)
    guardarPersistido(null)
  }

  // Estilo de fondo del panel: flash si terminado
  const panelBg = terminado
    ? 'bg-orange-100 ring-orange-400 animate-pulse'
    : 'bg-white ring-rose-200'

  // Mostrar mini-countdown en el botón colapsado si hay timer activo
  const fabContent = hayTimer && !terminado ? (
    <div className="flex flex-col items-center justify-center leading-none">
      <Timer className="h-4 w-4 mb-0.5" />
      <span className="text-[10px] font-bold tabular-nums">
        {formatTime(segundosRestantes ?? 0)}
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
                  {formatTime(segundosRestantes ?? 0)}
                </p>
                {/* Barra de progreso */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-rose-500 transition-all duration-1000"
                    style={{
                      width: `${segundosObjetivo > 0 ? ((segundosRestantes ?? 0) / segundosObjetivo) * 100 : 0}%`,
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
