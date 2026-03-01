"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const plans_1 = require("../../common/helpers/plans");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
function csvEscape(val) {
    const str = String(val ?? '')
        .replace(/\r?\n/g, ' ')
        .trim();
    if (str.includes(',') ||
        str.includes('"') ||
        str.includes('\n') ||
        str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str || '""';
}
const LEADS_EXPORT_COLUMNS = [
    '№',
    'Lead ID',
    'Created At',
    'Updated At',
    'Status',
    'Client Name',
    'Client Phone',
    'Client Email',
    'Message',
    'Is Premium',
    'Spam Score',
    'Attachments Count',
    'Master Category',
    'Master City',
];
let ExportService = class ExportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateExportAccess(masterId, user) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: { user: true },
        });
        if (!master) {
            throw new common_1.BadRequestException('Master not found');
        }
        if (user.role !== 'ADMIN' && master.userId !== user.id) {
            throw new common_1.ForbiddenException('You can only export your own data');
        }
        const effectiveTariff = (0, plans_1.getEffectiveTariff)(master);
        if (effectiveTariff !== 'PREMIUM') {
            throw new common_1.ForbiddenException('Export is only available for PREMIUM tariff');
        }
    }
    async exportLeadsToCSV(masterId, user, res) {
        await this.validateExportAccess(masterId, user);
        const [leads, master] = await Promise.all([
            this.prisma.lead.findMany({
                where: { masterId },
                orderBy: { createdAt: 'desc' },
                include: {
                    files: true,
                    client: { select: { email: true } },
                },
            }),
            this.prisma.master.findUnique({
                where: { id: masterId },
                include: {
                    category: { select: { name: true } },
                    city: { select: { name: true } },
                },
            }),
        ]);
        const categoryName = master?.category?.name ?? '';
        const cityName = master?.city?.name ?? '';
        const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.write('\uFEFF');
        res.write(LEADS_EXPORT_COLUMNS.map(csvEscape).join(',') + '\r\n');
        leads.forEach((lead, idx) => {
            const row = [
                (idx + 1).toString(),
                lead.id,
                lead.createdAt.toISOString(),
                lead.updatedAt.toISOString(),
                lead.status,
                lead.clientName ?? '',
                lead.clientPhone,
                (lead.client && 'email' in lead.client
                    ? lead.client.email
                    : '') || '',
                lead.message,
                lead.isPremium ? 'Yes' : 'No',
                lead.spamScore.toString(),
                lead.files.length.toString(),
                categoryName,
                cityName,
            ];
            res.write(row.map(csvEscape).join(',') + '\r\n');
        });
        res.end();
    }
    async exportLeadsToExcel(masterId, user, res) {
        await this.validateExportAccess(masterId, user);
        const [leads, master] = await Promise.all([
            this.prisma.lead.findMany({
                where: { masterId },
                orderBy: { createdAt: 'desc' },
                include: {
                    files: true,
                    client: { select: { email: true } },
                },
            }),
            this.prisma.master.findUnique({
                where: { id: masterId },
                include: {
                    user: true,
                    category: { select: { name: true } },
                    city: { select: { name: true } },
                },
            }),
        ]);
        if (!master) {
            throw new common_1.BadRequestException('Master not found');
        }
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'MoldMasters';
        workbook.created = new Date();
        const infoSheet = workbook.addWorksheet('Report Info', {
            properties: { tabColor: { argb: 'FFB45309' } },
        });
        const masterName = `${master.user.firstName ?? ''} ${master.user.lastName ?? ''}`.trim() ||
            'Master';
        const exportDate = new Date().toISOString();
        infoSheet.columns = [
            { key: 'label', width: 22 },
            { key: 'value', width: 50 },
        ];
        infoSheet.addRow({ label: 'Report Type', value: 'Leads Export' });
        infoSheet.addRow({ label: 'Master', value: masterName });
        infoSheet.addRow({
            label: 'Category',
            value: master.category?.name ?? '-',
        });
        infoSheet.addRow({ label: 'City', value: master.city?.name ?? '-' });
        infoSheet.addRow({ label: 'Export Date', value: exportDate });
        infoSheet.addRow({ label: 'Total Leads', value: leads.length });
        infoSheet.addRow({ label: '', value: '' });
        infoSheet.addRow({ label: 'Column Legend', value: '' });
        LEADS_EXPORT_COLUMNS.forEach((col, i) => {
            infoSheet.addRow({ label: `  ${i + 1}. ${col}`, value: '' });
        });
        infoSheet.getRow(1).font = { bold: true, size: 12 };
        infoSheet.getColumn(1).eachCell({ includeEmpty: true }, (cell, row) => {
            if (row <= 6)
                cell.font = { bold: true };
        });
        const leadsSheet = workbook.addWorksheet('Leads', {
            properties: { tabColor: { argb: 'FF217346' } },
            views: [{ state: 'frozen', ySplit: 1 }],
        });
        const HEADER_ROW = 1;
        const colDefs = [
            { header: '№', key: 'rowNum', width: 6 },
            { header: 'Lead ID', key: 'id', width: 38 },
            { header: 'Created At', key: 'createdAt', width: 22 },
            { header: 'Updated At', key: 'updatedAt', width: 22 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Client Name', key: 'clientName', width: 20 },
            { header: 'Client Phone', key: 'clientPhone', width: 16 },
            { header: 'Client Email', key: 'clientEmail', width: 26 },
            { header: 'Message', key: 'message', width: 45 },
            { header: 'Is Premium', key: 'isPremium', width: 12 },
            { header: 'Spam Score', key: 'spamScore', width: 12 },
            { header: 'Attachments Count', key: 'filesCount', width: 18 },
            { header: 'Master Category', key: 'categoryName', width: 20 },
            { header: 'Master City', key: 'cityName', width: 18 },
        ];
        leadsSheet.columns = colDefs;
        leadsSheet.getRow(HEADER_ROW).font = { bold: true };
        leadsSheet.getRow(HEADER_ROW).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8E8E8' },
        };
        leadsSheet.getRow(HEADER_ROW).alignment = {
            wrapText: true,
            vertical: 'middle',
        };
        leadsSheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: colDefs.length },
        };
        const categoryName = master.category?.name ?? '';
        const cityName = master.city?.name ?? '';
        leads.forEach((lead, idx) => {
            const clientEmail = lead.client && 'email' in lead.client
                ? lead.client.email
                : '';
            leadsSheet.addRow({
                rowNum: idx + 1,
                id: lead.id,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
                status: lead.status,
                clientName: lead.clientName ?? '',
                clientPhone: lead.clientPhone,
                clientEmail,
                message: lead.message,
                isPremium: lead.isPremium ? 'Yes' : 'No',
                spamScore: lead.spamScore,
                filesCount: lead.files.length,
                categoryName,
                cityName,
            });
        });
        leadsSheet.getColumn(3).numFmt = 'yyyy-mm-dd hh:mm:ss';
        leadsSheet.getColumn(4).numFmt = 'yyyy-mm-dd hh:mm:ss';
        const filename = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    }
    async exportAnalyticsToPDF(masterId, user, res) {
        await this.validateExportAccess(masterId, user);
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: {
                user: true,
                category: true,
                city: true,
            },
        });
        if (!master) {
            throw new common_1.BadRequestException('Master not found');
        }
        const [leadsStats, reviewsStats, bookingsStats, analytics] = await Promise.all([
            this.prisma.lead.groupBy({
                by: ['status'],
                where: { masterId },
                _count: true,
            }),
            this.prisma.review.groupBy({
                by: ['status'],
                where: { masterId },
                _count: true,
            }),
            this.prisma.booking.groupBy({
                by: ['status'],
                where: { masterId },
                _count: true,
            }),
            this.prisma.masterAnalytics.findMany({
                where: { masterId },
                orderBy: { date: 'desc' },
                take: 30,
            }),
        ]);
        const filename = `analytics_${masterId}_${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = new pdfkit_1.default({ margin: 50 });
        doc.pipe(res);
        doc.fontSize(20).text('Analytics Report', { align: 'center' });
        doc.moveDown();
        doc
            .fontSize(12)
            .text(`Master: ${master.user.firstName ?? ''} ${master.user.lastName ?? ''}`.trim(), {
            align: 'center',
        });
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(16).text('Profile Information', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Category: ${master.category?.name || 'N/A'}`);
        doc.text(`City: ${master.city?.name || 'N/A'}`);
        doc.text(`Rating: ${master.rating?.toFixed(2) || 'N/A'}`);
        doc.text(`Total Reviews: ${master.totalReviews || 0}`);
        doc.text(`Total Leads: ${master.leadsCount || 0}`);
        doc.moveDown();
        doc.fontSize(16).text('Leads Statistics', { underline: true });
        doc.moveDown();
        leadsStats.forEach((stat) => {
            doc.text(`${stat.status}: ${stat._count}`);
        });
        doc.moveDown();
        doc.fontSize(16).text('Reviews Statistics', { underline: true });
        doc.moveDown();
        reviewsStats.forEach((stat) => {
            doc.text(`${stat.status}: ${stat._count}`);
        });
        doc.moveDown();
        doc.fontSize(16).text('Bookings Statistics', { underline: true });
        doc.moveDown();
        bookingsStats.forEach((stat) => {
            doc.text(`${stat.status}: ${stat._count}`);
        });
        doc.moveDown();
        if (analytics.length > 0) {
            doc
                .fontSize(16)
                .text('Recent Analytics (Last 30 Days)', { underline: true });
            doc.moveDown();
            doc.fontSize(10);
            analytics.forEach((day) => {
                doc.text(`${day.date.toLocaleDateString()}: ${day.leadsCount || 0} leads, ${day.viewsCount || 0} views`);
            });
        }
        doc.end();
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExportService);
//# sourceMappingURL=export.service.js.map