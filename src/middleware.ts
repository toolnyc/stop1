import { defineMiddleware } from 'astro:middleware';
import { createHmac } from 'node:crypto';
import { supabaseAdmin } from './lib/supabase';
import { log } from './lib/logger';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin');

  // Skip auth entirely for public routes that never need user context
  const needsAuth = isAdminRoute || isAdminApi;

  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (needsAuth && accessToken && supabaseAdmin) {
    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(accessToken);

      if (error || !user) {
        if (refreshToken) {
          const { data: refreshData, error: refreshError } =
            await supabaseAdmin.auth.refreshSession({
              refresh_token: refreshToken,
            });

          if (refreshError || !refreshData.session) {
            log.warn('auth.refresh_failed', { path: pathname, error: refreshError?.message });
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
      log.error('auth.middleware_error', {
        path: pathname,
        error: err instanceof Error ? err.message : String(err),
      });
      if (isAdminRoute) {
        return context.redirect('/admin/login');
      }
    }
  } else if (isAdminRoute) {
    return context.redirect('/admin/login');
  }

  // Collaborator auth: guard /collaborate/*/expenses
  const collabMatch = pathname.match(/^\/collaborate\/([^/]+)\/expenses/);
  if (collabMatch) {
    const cookieSecret = import.meta.env.COOKIE_SECRET;
    const collabCookie = context.cookies.get('collab_session')?.value;

    if (!cookieSecret || !collabCookie) {
      const token = collabMatch[1];
      return context.redirect(`/collaborate/${token}`);
    }

    const [payload, sig] = collabCookie.split('.');
    if (!payload || !sig) {
      const token = collabMatch[1];
      return context.redirect(`/collaborate/${token}`);
    }

    const expectedSig = createHmac('sha256', cookieSecret).update(payload).digest('hex');
    if (sig !== expectedSig) {
      log.warn('collab.invalid_signature', { path: pathname });
      return context.redirect(`/collaborate/${collabMatch[1]}`);
    }

    try {
      const data = JSON.parse(Buffer.from(payload, 'base64').toString());
      context.locals.collaborator = { id: data.id, eventId: data.eventId };
    } catch {
      log.warn('collab.payload_parse_failed', { path: pathname });
      const token = collabMatch[1];
      return context.redirect(`/collaborate/${token}`);
    }
  }

  return next();
});
