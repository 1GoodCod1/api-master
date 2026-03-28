/**
 * Единый реестр текстов ошибок API (клиентские сообщения).
 *
 * **Использование:** `throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND)` и т.п.
 * Для подстановок — {@link AppErrorTemplates}.
 *
 * **Имена ключей (UPPER_SNAKE):**
 * - Префикс по домену: `AUTH_`, `BOOKING_`, `PAYMENT_`, `LEAD_`, `REVIEW_`, `EXPORT_`, `GUARD_`, …
 * - Уточнение смысла: `*_NOT_FOUND`, `*_OWN_ONLY`, `*_REQUIRED`, `*_INVALID`, …
 * - Одна и та же фраза в коде → один ключ (не дублировать строки).
 *
 * **Стабильность:** тексты — часть контракта с клиентом и иногда audit/login history.
 * Не меняйте формулировки без осознанного решения (ломаются тесты, подсказки в UI, логи).
 *
 * **Новая ошибка:** добавьте `static readonly` в соответствующую секцию комментариями (`// --- Bookings ---`).
 * Если текст собирается из переменных — ключ не нужен, используйте функцию в `AppErrorTemplates`.
 */
export class AppErrorMessages {
  private constructor() {}

  // --- Auth / login (совместимо с audit / login history) ---
  static readonly AUTH_LOGIN_INVALID_CREDENTIALS = 'Invalid credentials';
  static readonly AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD = 'Invalid password';
  static readonly AUTH_LOGIN_ACCOUNT_BANNED = 'Account is banned';
  static readonly AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED = 'Account banned';
  static readonly AUTH_LOGIN_IP_ACCESS_DENIED =
    'Access denied from this IP address';

  static readonly AUTH_ACCOUNT_BLOCKED = 'Your account is blocked';
  static readonly AUTH_INVALID_OR_EXPIRED_TOKEN = 'Invalid or expired token';
  static readonly AUTH_REFRESH_TOKEN_REQUIRED =
    'Refresh token required (cookie or body)';
  static readonly AUTH_INVALID_REFRESH_TOKEN = 'Invalid refresh token';
  static readonly AUTH_REFRESH_TOKEN_EXPIRED = 'Refresh token expired';
  static readonly AUTH_USER_NOT_FOUND_OR_BANNED = 'User not found or banned';

  // --- Audit cleanup ---
  static readonly AUDIT_CLEANUP_MODE_GROUPS_EMPTY =
    'mode=groups requires at least one group';
  static readonly AUDIT_CLEANUP_NO_ACTIONS_RESOLVED =
    'No actions resolved for selected groups';
  static readonly AUDIT_CLEANUP_MODE_ACTIONS_EMPTY =
    'mode=actions requires a non-empty actions array';
  static readonly AUDIT_CLEANUP_INVALID_MODE = 'Invalid cleanup mode';
  static readonly AUDIT_CLEANUP_SAFETY_CONFIRM =
    'Either pass olderThan (recommended), set dryRun=true, or confirmDeleteWithoutDate=true to delete without a date cutoff.';

  // --- Analytics ---
  static readonly ANALYTICS_OWN_ONLY = 'You can only view your own analytics';

  // --- Users / profiles ---
  static readonly USER_NOT_FOUND = 'User not found';
  static readonly MASTER_NOT_FOUND = 'Master not found';
  static readonly MASTER_PROFILE_NOT_FOUND = 'Master profile not found';
  static readonly CLIENT_PROFILE_NOT_FOUND = 'Client profile not found';
  static readonly MASTER_AVAILABILITY_DATA_NOT_FOUND =
    'Master availability data not found';

  // --- Bookings ---
  static readonly BOOKING_NOT_FOUND = 'Booking not found';
  static readonly BOOKING_CONFIRM_OWN_ONLY =
    'You can only confirm your own bookings';
  static readonly BOOKING_REJECT_OWN_ONLY =
    'You can only reject your own bookings';
  static readonly BOOKING_UPDATE_OWN_ONLY =
    'You can only update your own bookings';
  static readonly BOOKING_REBOOK_OWN_ONLY =
    'You can only rebook your own appointments';
  static readonly BOOKING_ACCESS_OWN_DATA = 'You can only access your own data';
  static readonly BOOKING_ENDPOINT_CLIENTS_ONLY =
    'This endpoint is only for clients';
  static readonly BOOKING_CLIENT_PHONE_REQUIRED = 'Client phone is required';

  // --- Leads ---
  static readonly LEAD_NOT_FOUND = 'Lead not found';
  static readonly LEAD_UPDATE_OWN_ONLY = 'You can only update your own leads';
  static readonly LEAD_CANNOT_SEND_TO_SELF =
    'You cannot send a lead to yourself';
  static readonly LEAD_ACTIVE_DUPLICATE_TO_MASTER =
    'You already have an active lead to this master. Wait until it is completed before sending another.';
  static readonly LEAD_CLIENT_PHONE_MISSING =
    'Client phone number is missing. Please add it in your profile.';
  static readonly ACCESS_DENIED = 'Access denied';
  static readonly ACCESS_DENIED_CONVERSATION =
    'Access denied to this conversation';
  static readonly ACCESS_DENIED_LEAD = 'Access denied to this lead';
  static readonly INVALID_ROLE = 'Invalid role';

  // --- Reviews ---
  static readonly REVIEW_NOT_FOUND = 'Review not found';
  static readonly REPLY_NOT_FOUND = 'Reply not found';
  static readonly VOTE_NOT_FOUND = 'Vote not found';
  static readonly REVIEW_CANNOT_REPLY = 'You cannot reply to this review';
  static readonly REVIEW_ALREADY_VOTED =
    'You have already voted on this review';
  static readonly REVIEW_ALREADY_MASTER =
    'You have already reviewed this master';
  static readonly REVIEW_LEAD_NOT_FOUND = 'Lead not found.';
  static readonly REVIEW_LEAD_OTHER_CLIENT =
    'This lead belongs to another client.';
  static readonly REVIEW_LEAD_OTHER_MASTER = 'Lead belongs to another master.';
  static readonly REVIEW_LEAD_CLOSED_ONLY =
    'You can leave a review only after the order is completed (status CLOSED).';
  static readonly REVIEW_LEAD_DUPLICATE =
    'A review for this lead already exists.';
  static readonly REVIEW_PHONE_REQUIRED =
    'Phone verification is required to write reviews.';
  static readonly REVIEW_USER_PHONE_MISSING =
    'User or phone not found. Please complete your profile.';

  // --- Payments / MIA ---
  static readonly PAYMENT_NOT_FOUND = 'Payment not found';
  static readonly PAYMENT_ACCESS_DENIED = 'Access to payment data denied';
  static readonly PAYMENT_NOT_PENDING = 'Payment is not pending';
  static readonly PAYMENT_NOT_BELONG_TO_USER =
    'This payment does not belong to you';
  static readonly WEBHOOK_NOT_CONFIGURED = 'Webhook endpoint is not configured';
  static readonly WEBHOOK_INVALID_TOKEN = 'Invalid webhook token';
  static readonly ORDER_ID_REQUIRED = 'orderId required';
  static readonly PAYMENT_ID_REQUIRED = 'paymentId required';

  static readonly MIA_NOT_CONFIGURED = 'MIA payment is not configured';
  static readonly MIA_AUTH_FAILED = 'MIA auth failed';
  static readonly MIA_VERIFICATION_REQUIRED =
    'Account verification required to purchase tariffs.';
  static readonly MIA_PENDING_UPGRADE = 'Already have a pending upgrade.';
  static readonly MIA_SANDBOX_DISABLED = 'MIA sandbox simulation is disabled';
  static readonly MIA_QR_ID_MISSING = 'qrId missing in payment metadata.';
  static readonly MIA_NOT_MIA_PAYMENT =
    'Not a MIA payment. Call create-mia-checkout first.';

  static readonly UPGRADE_NONE_PENDING = 'No pending upgrade found';
  static readonly UPGRADE_EXPIRED =
    'Pending upgrade has expired. Please try again.';
  static readonly UPGRADE_NOT_VIP =
    'Current tariff is not VIP. Cannot upgrade to PREMIUM.';
  static readonly UPGRADE_NO_PAID_TO_CANCEL =
    'No active paid tariff to cancel.';
  static readonly UPGRADE_TARIFF_EXPIRED = 'Tariff already expired.';
  static readonly UPGRADE_VIP_PREMIUM_WINDOW =
    'Upgrade to PREMIUM available only when VIP expires soon.';

  // --- Verification ---
  static readonly VERIFICATION_REQUEST_NOT_FOUND =
    'Verification request not found';
  static readonly VERIFICATION_ONLY_MASTERS =
    'Only masters can submit a verification request';
  static readonly VERIFICATION_PHONE_MISMATCH =
    'Phone number must match the number in your profile';
  static readonly VERIFICATION_ALREADY_PENDING =
    'A verification request is already pending review';
  static readonly VERIFICATION_CONSENT_REQUIRED =
    'You must consent to personal data processing before submitting a request';
  static readonly VERIFICATION_ALREADY_PROCESSED =
    'Verification request has already been processed';

  // --- Export ---
  static readonly EXPORT_OWN_DATA_ONLY = 'You can only export your own data';
  static readonly EXPORT_PREMIUM_ONLY =
    'Export is only available for PREMIUM tariff';
  static readonly JOB_NOT_FOUND_OR_EXPIRED = 'Job not found or expired';
  static readonly JOB_NOT_FOUND = 'Job not found';

  // --- Notifications ---
  static readonly NOTIFICATION_NOT_FOUND = 'Notification not found';

  // --- Admin / system ---
  static readonly BACKUP_INVALID_FILENAME = 'Invalid backup filename';
  static readonly BACKUP_INVALID_PATH = 'Invalid backup path';
  static readonly BACKUP_FILE_NOT_FOUND = 'Backup file not found';

  // --- Registration / GDPR ---
  static readonly REG_ROLE_MASTER_OR_CLIENT =
    'Only MASTER or CLIENT registration is allowed';
  static readonly REG_MASTER_FIELDS_REQUIRED =
    'For MASTER registration: city, category, firstName, and lastName are required';
  static readonly REG_AGE_CONFIRM =
    'You must confirm that you are at least 18 years old';
  static readonly REG_LEGAL_ACCEPT =
    'You must accept the Privacy Policy and Terms of Service';
  static readonly REG_USER_EXISTS =
    'User with this email or phone already exists';
  static readonly GDPR_ADMIN_NO_SELF_DELETE =
    'Admin accounts cannot be self-deleted. Contact another admin.';

  // --- Password reset ---
  static readonly RESET_ACCOUNT_BANNED = 'Account is banned';
  static readonly RESET_UNAVAILABLE =
    'Password reset is temporarily unavailable. Please try again later.';
  static readonly RESET_TOKEN_INVALID = 'Invalid or expired reset token';
  static readonly RESET_TOKEN_USED = 'This reset token has already been used';
  static readonly RESET_TOKEN_EXPIRED =
    'Reset token has expired. Please request a new one.';

  // --- Security ---
  static readonly PASSWORD_NO_SET = 'No password set for this account';
  static readonly PASSWORD_CURRENT_WRONG = 'Current password is incorrect';
  static readonly PASSWORD_SAME_AS_OLD =
    'New password must differ from the current password';

  // --- Tariffs ---
  static readonly TARIFF_NOT_FOUND = 'Tariff not found';
  static readonly TARIFF_CLAIM_ONLY_MASTER =
    'Only masters can claim a free plan';
  static readonly TARIFF_CLAIM_VERIFICATION =
    'Verification required. Complete verification to claim a free plan.';

  // --- Favorites / referrals / reports ---
  static readonly FAVORITE_NOT_FOUND = 'Favorite entry not found';
  static readonly FAVORITE_ALREADY = 'Master is already in favorites';

  static readonly REFERRAL_DISABLED = 'Referral program is disabled';
  static readonly REFERRAL_CODE_NOT_FOUND = 'Referral code not found';
  static readonly REFERRAL_CODE_INACTIVE = 'Referral code is inactive';
  static readonly REFERRAL_OWN_CODE = 'Cannot use your own referral code';
  static readonly REFERRAL_CODE_GENERATION_FAILED =
    'Failed to generate unique referral code';

  static readonly REPORT_NOT_FOUND = 'Report not found';
  static readonly REPORT_NEED_LEAD =
    'You can only report a master if you have sent a lead to them';
  static readonly REPORT_ALREADY_PENDING =
    'You have already reported this master. Please wait for review.';

  // --- Promotions (RU strings as in коде) ---
  static readonly PROMOTION_NOT_FOUND = 'Promotion not found';
  static readonly PROMOTION_PREMIUM_ONLY =
    'Service promotions are available for PREMIUM plan only.';
  static readonly PROMOTION_CONFLICT_SERVICE =
    'На эту услугу уже действует акция. Создайте акцию на другую услугу или дождитесь окончания текущей.';
  static readonly PROMOTION_FIXED_PRICE_ONLY =
    'Акцию можно применять только к услугам с фиксированной ценой. Этой услуги нет в списке или у неё договорная цена.';
  static readonly PROMOTION_CONFLICT_ALL =
    'Нельзя применить акцию ко всем услугам: на все услуги с фиксированной ценой уже действуют акции. Создайте акцию на одну конкретную услугу или дождитесь окончания текущих.';

  // --- Portfolio / photos / files ---
  static readonly PORTFOLIO_NOT_FOUND = 'Portfolio item not found';
  static readonly PORTFOLIO_EDIT_OWN_ONLY =
    'You can only edit your own portfolio';
  static readonly PORTFOLIO_DELETE_OWN_ONLY =
    'You can only delete your own portfolio items';

  static readonly FILE_NOT_FOUND = 'File not found';
  static readonly BEFORE_FILE_NOT_FOUND = 'Before file not found';
  static readonly AFTER_FILE_NOT_FOUND = 'After file not found';
  static readonly AVATAR_MUST_BE_IMAGE = 'Avatar must be an image';
  static readonly GALLERY_LIMIT_15 = 'Gallery limit reached (15)';
  static readonly FILE_OWN_AVATAR_ONLY =
    'You can only use your own files as avatar';

  static readonly LEAD_ATTACHMENTS_IMAGES_ONLY =
    'Lead attachments must be images only (JPG, PNG, GIF, WebP)';
  static readonly LEAD_PHOTO_EXTENSIONS =
    'Use file extensions .jpg, .png, .gif, or .webp for lead photos';
  static readonly FILES_MAX_10 = 'Maximum 10 files allowed';
  static readonly FILES_SOME_NOT_FOUND = 'Some files were not found';
  static readonly FILES_NONE_UPLOADED = 'No file uploaded';
  static readonly FILES_INVALID_CONTENT = 'Invalid file content';

  // --- Chat ---
  static readonly CONVERSATION_NOT_FOUND = 'Conversation not found';
  static readonly CONVERSATION_CLOSED = 'Conversation is closed';
  static readonly CONVERSATION_CLOSE_MASTER_OR_ADMIN =
    'Only master or admin can close conversation';
  static readonly CHAT_FILES_NOT_OWNED =
    'Invalid file IDs provided - some files do not belong to you';

  // --- Schedule / profile ---
  static readonly PROFILE_EDIT_VERIFICATION_REQUIRED =
    'Account verification required to add or update services. Please complete verification first.';
  static readonly WORK_HOURS_ORDER =
    'Work start hour must be less than work end hour';
  static readonly AVAILABILITY_PREMIUM_ONLY =
    'Availability status (Available/Busy) and max leads limit are PREMIUM features.';

  // --- Phone verification ---
  static readonly PHONE_CODE_INVALID = 'Invalid verification code';
  static readonly PHONE_SMS_FAILED = 'Failed to send SMS';
  static readonly PHONE_ALREADY_VERIFIED = 'Phone already verified';
  static readonly PHONE_WAIT_NEW_CODE =
    'Please wait before requesting a new code';
  static readonly PHONE_CODE_REQUIRED = 'Code is required';
  static readonly PHONE_CODE_EXPIRED = 'Verification code expired or not found';
  static readonly PHONE_TOO_MANY_ATTEMPTS =
    'Too many attempts. Please request a new code';

  // --- Telegram ---
  static readonly TELEGRAM_PREMIUM_ONLY =
    'Telegram connect is available for VIP and PREMIUM plans only';
  static readonly TELEGRAM_BOT_NOT_CONFIGURED =
    'Telegram bot is not configured';

  // --- Web push ---
  static readonly WEB_PUSH_VAPID_NOT_CONFIGURED =
    'VAPID is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (e.g. in .env.docker) and restart the API.';

  // --- reCAPTCHA ---
  static readonly RECAPTCHA_TOKEN_REQUIRED = 'reCAPTCHA token is required';
  static readonly RECAPTCHA_VERIFICATION_FAILED =
    'reCAPTCHA verification failed';
  static readonly RECAPTCHA_SUSPICIOUS = 'Suspicious activity detected';
  static readonly RECAPTCHA_INVALID_ACTION = 'Invalid reCAPTCHA action';
  static readonly RECAPTCHA_VERIFY_FAILED = 'Failed to verify reCAPTCHA';

  // --- Pipes / validation ---
  static readonly PARSE_INT_EXPECTED =
    'Validation failed (numeric string is expected)';
  static readonly PARSE_BOOL_EXPECTED =
    'Validation failed (boolean string is expected)';
  static readonly PARAM_INVALID_SLUG = 'Invalid slug format';
  static readonly PARAM_INVALID_ID = 'Invalid ID format';
  static readonly PARAM_INVALID = 'Invalid parameter format';

  // --- Guards ---
  static readonly GUARD_USER_NOT_AUTHENTICATED = 'User not authenticated';
  static readonly GUARD_VERIFICATION_REQUIRED = 'Account verification required';
  static readonly GUARD_INVALID_ORIGIN =
    'Invalid origin for cookie-authenticated request';
  static readonly GUARD_TELEGRAM_WEBHOOK_SECRET = 'Invalid webhook secret';
  static readonly GUARD_AUTH_UPLOAD_REQUIRED =
    'Authentication required to upload files';

  // --- WebSocket ---
  static readonly WS_UNAUTHORIZED = 'Unauthorized';
  static readonly WS_INVALID_MASTER_ID = 'Invalid masterId';

  // --- Compliance ---
  static readonly PDF_GENERATION_FAILED = 'PDF generation failed';

  // --- Spam / leads ---
  static readonly SPAM_LEAD_RECENT =
    'You have already sent a lead to this master recently. Please wait 5 minutes.';
  static readonly SPAM_LEAD_PHONE_HOURLY =
    'Too many leads from this phone number. Maximum 5 leads per hour.';
  static readonly SPAM_LEAD_IP =
    'Too many leads from this IP address. Please try again later.';

  // --- Leads validation (длинные тексты) ---
  static readonly LEAD_MASTER_NOT_VERIFIED =
    'This master has not verified their profile yet. Leads are not accepted until verification.';
  static readonly LEAD_ONLY_CLIENTS =
    'Only authorized clients can create leads. Please register or log in.';
  static readonly LEAD_PHONE_VERIFY_CREATE =
    'Phone verification required to create leads. Please verify your phone number first.';
  static readonly LEAD_MASTER_UNAVAILABLE =
    'Master is currently unavailable and cannot accept new leads. Please try again later or subscribe to notifications.';
  static readonly LEAD_FILES_NOT_OWNED =
    'Some files do not belong to you and cannot be attached to the lead';

  // --- Bookings validation ---
  static readonly BOOKING_AUTH_REQUIRED =
    'Only authorized users can create bookings. Please log in.';
  static readonly BOOKING_ONLY_CLIENT_OR_MASTER =
    'Only clients or masters can create bookings.';
  static readonly BOOKING_MASTER_NEEDS_LEAD =
    'Master can only create bookings from a lead (leadId required).';
  static readonly BOOKING_OWN_PROFILE_ONLY =
    'You can only create bookings for your own profile.';
  static readonly BOOKING_LEAD_WRONG_MASTER =
    'Lead not found or does not belong to this master.';
  static readonly BOOKING_PHONE_VERIFY =
    'Phone verification required to create bookings. Please verify your phone number first.';
  static readonly BOOKING_OWN_LEAD_ONLY =
    'You can only create a booking for your own lead.';
  static readonly BOOKING_SLOT_START_BEFORE_END =
    'Start time must be before end time';
  static readonly BOOKING_SLOT_PAST = 'Start time cannot be in the past';
  static readonly BOOKING_SLOT_TAKEN = 'This time slot is already booked';
}
