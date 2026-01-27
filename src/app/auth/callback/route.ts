import { NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createServerSupabaseClientWithCookies()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Supabase auth exchange error:', error)
        }
    }

    // return the user to an error page with instructions
    // or redirect to home with error query param
    return NextResponse.redirect(`${origin}/?error=auth_code_error`)
}
