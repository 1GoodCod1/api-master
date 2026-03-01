"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileMagic = validateFileMagic;
exports.unlinkIfExists = unlinkIfExists;
const promises_1 = require("fs/promises");
const MAGIC = [
    { buf: [0xff, 0xd8, 0xff], exts: ['jpg', 'jpeg'] },
    { buf: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], exts: ['png'] },
    { buf: [0x47, 0x49, 0x46, 0x38], exts: ['gif'] },
    { buf: [0x47, 0x49, 0x46, 0x39], exts: ['gif'] },
    { buf: [0x25, 0x50, 0x44, 0x46], exts: ['pdf'] },
    { buf: [0xd0, 0xcf, 0x11, 0xe0], exts: ['doc'] },
    { buf: [0x50, 0x4b, 0x03, 0x04], exts: ['docx'] },
];
const ALLOWED_EXTS = new Set([
    'jpeg',
    'jpg',
    'png',
    'gif',
    'pdf',
    'doc',
    'docx',
]);
function getExt(originalname) {
    const i = originalname.lastIndexOf('.');
    return i >= 0 ? originalname.slice(i + 1).toLowerCase() : '';
}
async function validateFileMagic(filePath, originalname) {
    const ext = getExt(originalname);
    if (!ALLOWED_EXTS.has(ext)) {
        throw new Error('Invalid file extension');
    }
    const head = await (0, promises_1.readFile)(filePath, { encoding: null });
    const head12 = head.subarray(0, 12);
    for (const { buf, exts } of MAGIC) {
        const magicBuf = Buffer.from(buf);
        if (head12.length >= magicBuf.length &&
            head12.subarray(0, magicBuf.length).equals(magicBuf)) {
            if (exts.includes(ext))
                return;
            throw new Error(`File content (${exts[0]}) does not match extension .${ext}`);
        }
    }
    throw new Error('File content could not be recognised as an allowed type');
}
async function unlinkIfExists(path) {
    await (0, promises_1.unlink)(path).catch(() => { });
}
//# sourceMappingURL=file-magic.js.map