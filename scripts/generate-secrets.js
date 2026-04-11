#!/usr/bin/env node

/**
 * Генератор секретов для production
 * Использование: node scripts/generate-secrets.js
 */

const crypto = require('crypto');
const webpush = require('web-push');

console.log('🔐 Generating production secrets...\n');
console.log('Copy these to your .env.production file:\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const vapidKeys = webpush.generateVAPIDKeys();

const secrets = {
  JWT_ACCESS_SECRET: crypto.randomBytes(32).toString('hex'),
  JWT_OAUTH_PENDING_SECRET: crypto.randomBytes(32).toString('hex'),
  JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  ID_ENCRYPTION_SECRET: crypto.randomBytes(32).toString('hex'),
  WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
  VAPID_PUBLIC_KEY: vapidKeys.publicKey,
  VAPID_PRIVATE_KEY: vapidKeys.privateKey,
  VAPID_EMAIL: 'admin@faber.md',
};

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Secrets generated successfully!');
console.log('\n⚠️  ВАЖНО:');
console.log('   1. Скопируйте эти значения в .env.production');
console.log('   2. НЕ коммитьте .env.production в Git!');
console.log('   3. Сохраните эти секреты в безопасном месте\n');
