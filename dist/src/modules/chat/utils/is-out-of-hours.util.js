"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutOfHours = isOutOfHours;
function isOutOfHours(workStartHour, workEndHour, now = new Date()) {
    const hour = now.getHours();
    const start = Math.min(Math.max(workStartHour, 0), 23);
    const end = Math.min(Math.max(workEndHour, 1), 24);
    if (start < end) {
        return hour < start || hour >= end;
    }
    return hour < start && hour >= end;
}
//# sourceMappingURL=is-out-of-hours.util.js.map