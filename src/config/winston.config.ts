import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { requestContext } from '../common/request-context';

const PII_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, replacement: '***@***.***' },
  {
    regex: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,6}\b/g,
    replacement: '+***',
  },
  {
    regex:
      /"(email|phone|clientPhone|clientName|firstName|lastName|documentNumber|twoFactorSecret)"\s*:\s*"[^"]*"/g,
    replacement: '"$1":"[REDACTED]"',
  },
];

const piiRedactor = winston.format((info) => {
  let msg = typeof info.message === 'string' ? info.message : '';
  for (const { regex, replacement } of PII_PATTERNS) {
    msg = msg.replace(regex, replacement);
  }
  info.message = msg;
  return info;
});

const attachRequestIdJson = winston.format((info) => {
  const requestId = requestContext.getStore()?.requestId;
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

const prefixRequestIdConsole = winston.format((info) => {
  const requestId = requestContext.getStore()?.requestId;
  if (requestId && typeof info.message === 'string') {
    info.message = `[${requestId}] ${info.message}`;
  }
  return info;
});

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  attachRequestIdJson(),
  piiRedactor(),
  winston.format.json(),
);

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        prefixRequestIdConsole(),
        nestWinstonModuleUtilities.format.nestLike('faber.md', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: fileFormat,
    }),
  ],
};
