import * as winston from 'winston';
import 'winston-daily-rotate-file';
export declare const winstonConfig: {
    transports: (winston.transports.ConsoleTransportInstance | import("winston-daily-rotate-file"))[];
};
