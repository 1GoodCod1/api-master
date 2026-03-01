"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigHelper = void 0;
class ConfigHelper {
    static getString(configService, key, defaultValue = '') {
        const value = configService.get(key);
        return value || defaultValue;
    }
    static getNumber(configService, key, defaultValue = 0) {
        const value = configService.get(key);
        return value || defaultValue;
    }
    static getBoolean(configService, key, defaultValue = false) {
        const value = configService.get(key);
        return value !== undefined ? value : defaultValue;
    }
}
exports.ConfigHelper = ConfigHelper;
//# sourceMappingURL=config.helper.js.map