'use client'

import { useState, useTransition, useCallback } from 'react'
import { KeyRound, Eye, EyeOff, Copy, CheckCheck, AlertCircle, RefreshCw } from 'lucide-react'
import { resetearContrasenaAlumno } from '@/app/(profe)/alumnos/actions'

interface Props {
  alumnoId: string
}

export function ResetPasswordBtn({ alumnoId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  function handleReset() {
    if (!confirm) {
      // Primer click: pedir confirmación
      setConfirm(true)
      setTimeout(() => setConfirm(false), 3000)
      return
    }
    setConfirm(false)
    setError(null)
    setPassword(null)
    setVisible(false)
    startTransition(async () => {
      const result = await resetearContrasenaAlumno(alumnoId)
      if (result.error) {
        setError(result.error)
      } else {
        setPassword(result.password ?? null)
      }
    })
  }

  // Press-and-hold para revelar contraseña
  const handleEyeDown = useCallback(() => setVisible(true), [])
  const handleEyeUp = useCallback(() => setVisible(false), [])

  function handleCopy() {
    if (!password) return
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Estado: contraseña generada
  if (password) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
          <p className="mb-1 text-xs text-slate-500">Nueva contraseña temporal</p>
          <div className="flex items-center gap-2">
            {/* Contraseña — oculta por defecto, se muestra al mantener el dedo */}
            <p className="flex-1 font-mono text-lg font-bold tracking-widest text-slate-900 select-none">
              {visible ? password : '•'.repeat(password.length)}
            </p>

            {/* Botón ojo — press and hold */}
            <button
              onMouseDown={handleEyeDown}
              onMouseUp={handleEyeUp}
              onMouseLeave={handleEyeUp}
              onTouchStart={handleEyeDown}
              onTouchEnd={handleEyeUp}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors active:bg-slate-300 select-none"
              title="Mantené presionado para ver"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {/* Copiar */}
            <button
              onClick={handleCopy}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              title="Copiar contraseña"
            >
              {copied
                ? <CheckCheck className="h-4 w-4 text-emerald-500" />
                : <Copy className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 leading-snug">
            Mantené el 👁 para verla · El alumno deberá cambiarla al ingresar
          </p>
        </div>

        {/* Botón para generar otra */}
        <button
          onClick={() => { setPassword(null); setConfirm(false) }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Generar otra
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={handleReset}
        disabled={isPending}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          confirm
            ? 'bg-amber-500 text-white hover:bg-amber-400'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <KeyRound className="h-4 w-4 shrink-0" />
        {isPending
          ? 'Generando...'
          : confirm
          ? '¿Confirmar? (resetea la clave)'
          : 'Resetear contraseña'
        }
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
