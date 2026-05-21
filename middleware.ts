import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login']
  if (publicRoutes.includes(pathname)) {
    if (user) {
      // Usuario ya autenticado: redirigir según rol
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const destination =
        profile?.role === 'profe' ? '/dashboard' : '/rutina'
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return supabaseResponse
  }

  // Rutas protegidas: redirigir a login si no hay sesión
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protección de rutas por rol (solo profe)
  const profeOnlyPaths = ['/dashboard', '/alumnos', '/ejercicios', '/rutinas', '/grupos', '/biblioteca']
  if (profeOnlyPaths.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'profe') {
      return NextResponse.redirect(new URL('/rutina', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
