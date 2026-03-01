declare const _default: () => {
    nodeEnv: string;
    port: number;
    apiUrl: string;
    frontendUrl: string;
    requestTimeoutMs: number;
    database: {
        url: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
    };
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiry: string;
    };
    auth: {
        useHttpOnlyCookie: boolean;
        refreshCookieName: string;
        refreshCookieMaxAgeDays: number;
    };
    idEncryption: {
        secret: string;
    };
    mia: {
        clientId: string;
        clientSecret: string;
        baseUrl: string;
        authPath: string;
        createQrPath: string;
        terminalId: string;
        sandbox: boolean;
        testPayPath: string;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
    };
    telegram: {
        botToken: string;
        chatId: string;
    };
    whatsapp: {
        enabled: boolean;
        senderId: string;
    };
    b2: {
        applicationKeyId: string;
        applicationKey: string;
        bucket: string;
        region: string;
        endpoint: string;
    };
    sms: {
        enabled: boolean;
        provider: string;
        httpProvider: {
            url: string | undefined;
            apiKey: string | undefined;
            apiId: string | undefined;
        };
    };
    notifications: {
        telegramEnabled: string;
        smsEnabled: string;
        quietHoursStart: number;
        quietHoursEnd: number;
    };
    email: {
        enabled: boolean;
        from: string;
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            user: string;
            pass: string;
        };
    };
    rateLimit: {
        ttl: number;
        limit: number;
    };
};
export default _default;
