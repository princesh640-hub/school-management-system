// =============================================================================
// Phase 4R: Reports, Analytics & Dashboards Shared Interfaces
// =============================================================================

export type ReportCategory =
  | 'STUDENTS'
  | 'ACADEMICS'
  | 'ATTENDANCE'
  | 'EXAMINATIONS'
  | 'FINANCE'
  | 'HR'
  | 'LIBRARY'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'INVENTORY'
  | 'COMMUNICATION'
  | 'DOCUMENTS';

export type ReportExportFormat = 'JSON' | 'CSV' | 'XLSX' | 'PDF';
export type ReportDeliveryChannel = 'EMAIL' | 'IN_APP' | 'NOTIFICATION';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERMLY';

export interface IReportColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'percentage' | 'badge';
  align?: 'left' | 'center' | 'right';
}

export interface IReportParameterDefinition {
  key: string;
  label: string;
  type: 'string' | 'select' | 'date' | 'daterange' | 'boolean';
  required: boolean;
  defaultValue?: any;
  optionsSource?: string;
}

export interface IReportDefinition {
  key: string;
  name: string;
  category: ReportCategory;
  description: string;
  requiredPermission: string;
  supportedFormats: ReportExportFormat[];
  parameters: IReportParameterDefinition[];
  defaultColumns: IReportColumnDefinition[];
}

export interface IReportCatalogCategory {
  category: ReportCategory;
  label: string;
  icon: string;
  description: string;
  reports: IReportDefinition[];
}

export interface IReportExecuteDto {
  reportKey: string;
  campusId?: string;
  academicYearId?: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  columns?: string[];
}

export interface IReportMetadata {
  reportKey: string;
  name: string;
  category: ReportCategory;
  generatedAt: string;
  generatedBy?: string;
  filtersApplied: Record<string, any>;
  totalRecords: number;
  executionTimeMs: number;
}

export interface IReportResult {
  metadata: IReportMetadata;
  summary?: Record<string, any>;
  columns: IReportColumnDefinition[];
  data: Record<string, any>[];
  totals?: Record<string, any>;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface ISavedReport {
  id: string;
  organizationId: string;
  campusId?: string | null;
  userId: string;
  reportKey: string;
  name: string;
  description?: string | null;
  category: string;
  filters: Record<string, any>;
  displayColumns?: string[] | null;
  sortConfig?: Record<string, any> | null;
  isPublic: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISavedReportCreateDto {
  reportKey: string;
  name: string;
  description?: string;
  category: string;
  filters?: Record<string, any>;
  displayColumns?: string[];
  isPublic?: boolean;
  isFavorite?: boolean;
}

export interface IScheduledReport {
  id: string;
  organizationId: string;
  campusId?: string | null;
  userId: string;
  savedReportId?: string | null;
  reportKey: string;
  name: string;
  cronExpression: string;
  frequency: string;
  format: ReportExportFormat;
  filters: Record<string, any>;
  recipients: string[];
  channel: string;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastRunStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IScheduledReportCreateDto {
  savedReportId?: string;
  reportKey: string;
  name: string;
  cronExpression?: string;
  frequency?: string;
  format?: ReportExportFormat;
  filters?: Record<string, any>;
  recipients: string[];
  channel?: string;
}

export interface ITimeSeriesDataPoint {
  period: string;
  value: number;
  secondaryValue?: number;
  label?: string;
}

export interface IAnalyticsTrends {
  studentAdmissionsTrend: ITimeSeriesDataPoint[];
  feeCollectionsTrend: ITimeSeriesDataPoint[];
  attendanceTrend: ITimeSeriesDataPoint[];
}

export interface IDashboardOverviewKpis {
  totalStudents: number;
  activeStudents: number;
  totalEmployees: number;
  activeTeachers: number;
  dailyAttendanceRate: number;
  monthlyFeeInvoiced: number;
  monthlyFeeCollected: number;
  outstandingFeesBalance: number;
  feeCollectionRate: number;
  hostelOccupancyRate: number;
  transportCapacityUtilization: number;
  openIncidentsCount: number;
  lowStockAlertsCount: number;
  expiringDocumentsCount: number;
  attentionItems: Array<{
    id: string;
    category: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    message: string;
    actionUrl?: string;
  }>;
}

export interface IDashboardPreferenceDto {
  roleKey: string;
  layoutConfig: Record<string, any>;
  defaultFilters?: Record<string, any>;
}

export interface IDrillDownQueryDto {
  metricKey: string;
  campusId?: string;
  academicYearId?: string;
  page?: number;
  limit?: number;
}
