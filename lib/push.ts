import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = 'mailto:noreply@planificador-pro.app'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
}

/**
 * Envía push notifications a todas las suscripciones activas de un usuario.
 * Best-effort: si una suscripción falla (410/404), se elimina automáticamente.
 */
export async function enviarPushAUsuario(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('VAPID keys no configuradas, saltando push')
    return
  }

  const admin = createAdminClient()

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId) as { data: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> | null }

  if (!subs || subs.length === 0) return

  const body = JSON.stringify(payload)
  const muertas: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        )
      } catch (err: any) {
        // 410 Gone / 404 Not Found = la suscripción ya no es válida
        if (err.statusCode === 410 || err.statusCode === 404) {
          muertas.push(sub.id)
        } else {
          console.error('Error enviando push:', err?.message ?? err)
        }
      }
    })
  )

  // Limpiar suscripciones muertas
  if (muertas.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', muertas)
  }
}
