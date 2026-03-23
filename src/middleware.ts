import { defineMiddleware } from 'astro:middleware';
import { createHmac } from 'node:crypto';
import { supabaseAdmin } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (accessToken && supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

      if (error || !user) {
        if (refreshToken) {
          const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (refreshError || !refreshData.session) {
            context.cookies.delete('sb-access-token', { path: '/' });
            context.cookies.delete('sb-refresh-token', { path: '/' });
            if (isAdminRoute) {
              return context.redirect('/admin/login');
            }
          } else {
            const isSecure = import.meta.env.PROD;
            context.cookies.set('sb-access-token', refreshData.session.access_token, {
              path: '/',
              httpOnly: true,
              secure: isSecure,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24,
            });
            context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
              path: '/',
              httpOnly: true,
              secure: isSecure,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7,
            });
            context.locals.user = refreshData.user;
          }
        } else if (isAdminRoute) {
          return context.redirect('/admin/login');
        }
      } else {
        context.locals.user = user;
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      if (isAdminRoute) {
        return context.redirect('/admin/login');
      }
    }
  } else if (isAdminRoute) {
    return context.redirect('/admin/login');
  }

  // Door auth: guard /door/[slug]/checkin and /door/[slug]/summary
  const doorMatch = pathname.match(/^\/door\/([^/]+)\/(checkin|summary)/);
  if (doorMatch) {
    const doorSlug = doorMatch[1];
    const cookieSecret = import.meta.env.COOKIE_SECRET;
    const sig = context.cookies.get(`door_session_${doorSlug}`)?.value;

    if (!cookieSecret || !sig) {
      return context.redirect(`/door/${doorSlug}/pin`);
    }

    const expected = createHmac('sha256', cookieSecret).update(doorSlug).digest('hex');
    if (sig !== expected) {
      return context.redirect(`/door/${doorSlug}/pin`);
    }

    context.locals.doorSlug = doorSlug;
  }

  return next();
});
