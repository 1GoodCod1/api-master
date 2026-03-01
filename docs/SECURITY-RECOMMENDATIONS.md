# Рекомендации по безопасности

## Реализовано

### 1. ID_ENCRYPTION_SECRET
- **Backend:** Приложение падает при старте, если `ID_ENCRYPTION_SECRET` не задан.
- **Frontend:** Ошибка при загрузке, если `VITE_ID_ENCRYPTION_SECRET` не задан.
- Секреты должны совпадать между backend и frontend.

### 2. Account Lockout
- После **5 неудачных попыток** входа — блокировка на **15 минут** (по email).
- По IP: блокировка после **10 неудачных попыток** (предотвращение brute-force с одного IP).
- При успешном входе счётчики сбрасываются.

### 3. Rate Limit на Auth
- `/auth/login`: 3 запроса/мин
- `/auth/register`: 3 запроса/мин
- `/auth/forgot-password`: 2 запроса/5 мин
- `/auth/reset-password`: 5 запросов/мин

### 4. Ротация Refresh Token
- При каждом refresh старый токен инвалидируется, выдаётся новый.
- Реализовано в `TokenService.refreshTokens()`.

### 5. Санитизация входных данных
- **Chat/WebSocket:** контент сообщений проходит `sanitizeStrict` (защита от XSS).
- **Masters, Leads, Reviews:** используется `sanitizeStrict` / `sanitizeBasic`.
- **WebSocket уведомления:** `sanitizeNotificationData`, `sanitizeLeadData` и др.

---

## CSRF для state-changing операций (рекомендация)

### Статус
CSRF-защита **пока не реализована**. Рекомендуется добавить для форм в админке и других state-changing операций.

### Варианты реализации

#### Вариант 1: Double-submit cookie (рекомендуется для SPA)
1. Backend: эндпоинт `GET /auth/csrf-token` возвращает токен и устанавливает httpOnly cookie `XSRF-TOKEN`.
2. Frontend: читает cookie и отправляет заголовок `X-XSRF-TOKEN` при POST/PUT/DELETE/PATCH.
3. Backend: guard проверяет совпадение cookie и заголовка.

#### Вариант 2: SameSite cookie
- Установить `SameSite=Strict` или `Lax` для session/refresh cookie (уже настроено для refresh cookie).
- Частично снижает риск CSRF, но не заменяет токены для чувствительных операций.

#### Вариант 3: Пакет `csurf` (устарел)
- Пакет `csurf` deprecated. Альтернатива: [@csurf/csurf](https://github.com/Psifi-Solutions/csurf) или ручная реализация.

### Пример каркаса (NestJS)

```typescript
// csrf.controller.ts
@Get('csrf-token')
getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const token = randomBytes(32).toString('hex');
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Frontend должен прочитать для заголовка
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000,
  });
  return { csrfToken: token };
}

// csrf.guard.ts
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const cookieToken = request.cookies?.['XSRF-TOKEN'];
    const headerToken = request.headers['x-xsrf-token'];
    return cookieToken && cookieToken === headerToken;
  }
}
```

### Где применять
- Админка: все POST/PUT/DELETE/PATCH.
- Смена пароля, email, критичные настройки.
- Опционально: публичные формы (лиды, регистрация) при высокой угрозе.
