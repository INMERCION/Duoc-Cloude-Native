import { HttpInterceptorFn } from '@angular/common/http';
import { fetchAuthSession } from 'aws-amplify/auth';
import { from, switchMap } from 'rxjs';
import { API_CONFIG } from './api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const path = req.url.split('?')[0];
  // Never attach a Cognito token to an unrelated server.
  if (path !== API_CONFIG.pedidosUrl && !path.startsWith(API_CONFIG.pedidosUrl + '/')) {
    return next(req);
  }
  return from(fetchAuthSession()).pipe(
    switchMap(session => {
      const token = session.tokens?.accessToken?.toString();
      return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
    }),
  );
};
