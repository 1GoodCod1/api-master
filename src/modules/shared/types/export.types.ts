export type ExportJobType = 'csv' | 'excel' | 'pdf';

export interface ExportJobData {
  type: ExportJobType;
  masterId: string;
  userId: string;
  userRole: string;
  locale?: string;
}

export interface ExportJobResult {
  filePath: string;
  contentType: string;
  filename: string;
}
