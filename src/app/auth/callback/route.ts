import { NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { notifyNewMember } from '@/lib/email/admin-notify'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createServerSupabaseClientWithCookies()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // 신규 회원 여부 확인 및 알림 (60초 이내 생성된 계정)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.created_at) {
                    const createdAt = new Date(user.created_at).getTime()
                    const isNewUser = Date.now() - createdAt < 60000 // 60초 이내
                    if (isNewUser) {
                        notifyNewMember({
                            memberName: user.user_metadata?.name || user.user_metadata?.full_name || 'Google User',
                            provider: 'google',
                            email: user.email || null,
                        })
                    }
                }
            } catch (e) {
                console.error('New member notification error:', e)
            }

            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Supabase auth exchange error:', error)
        }
    }

    // return the user to an error page with instructions
    // or redirect to home with error query param
    return NextResponse.redirect(`${origin}/?error=auth_code_error`)
}
