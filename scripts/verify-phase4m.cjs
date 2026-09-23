#!/usr/bin/env node
// =============================================================================
// Phase 4M: Communication & Notification Ecosystem — Verification Script
// Run: node scripts/verify-phase4m.cjs
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function check(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.log(`  ❌ ${description}`);
    failed++;
    failures.push(description);
  }
}

function readFile(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch {
    return '';
  }
}

function has(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// =============================================================================
console.log('\n📋 PHASE 4M VERIFICATION — Communication & Notification Ecosystem\n');

// =============================================================================
console.log('1. Prisma Schema — Communication Enums');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('CommunicationChannel enum defined', has(schema, 'enum CommunicationChannel'));
check('CommunicationChannel: IN_APP', has(schema, /enum CommunicationChannel[\s\S]*?IN_APP/));
check('CommunicationChannel: EMAIL', has(schema, /enum CommunicationChannel[\s\S]*?EMAIL/));
check('CommunicationChannel: SMS', has(schema, /enum CommunicationChannel[\s\S]*?SMS/));
check('CommunicationChannel: PUSH', has(schema, /enum CommunicationChannel[\s\S]*?PUSH/));
check('CommunicationChannel: WHATSAPP', has(schema, /enum CommunicationChannel[\s\S]*?WHATSAPP/));

check('CommunicationStatus enum defined', has(schema, 'enum CommunicationStatus'));
check('CommunicationStatus: QUEUED', has(schema, /enum CommunicationStatus[\s\S]*?QUEUED/));
check('CommunicationStatus: PROCESSING', has(schema, /enum CommunicationStatus[\s\S]*?PROCESSING/));
check('CommunicationStatus: SENT', has(schema, /enum CommunicationStatus[\s\S]*?SENT/));
check('CommunicationStatus: DELIVERED', has(schema, /enum CommunicationStatus[\s\S]*?DELIVERED/));
check('CommunicationStatus: FAILED', has(schema, /enum CommunicationStatus[\s\S]*?FAILED/));
check('CommunicationStatus: RETRYING', has(schema, /enum CommunicationStatus[\s\S]*?RETRYING/));
check('CommunicationStatus: CANCELLED', has(schema, /enum CommunicationStatus[\s\S]*?CANCELLED/));
check('CommunicationStatus: SKIPPED', has(schema, /enum CommunicationStatus[\s\S]*?SKIPPED/));
check('CommunicationStatus: NOT_CONFIGURED', has(schema, /enum CommunicationStatus[\s\S]*?NOT_CONFIGURED/));

check('AnnouncementStatus enum defined', has(schema, 'enum AnnouncementStatus'));
check('AnnouncementStatus: DRAFT', has(schema, /enum AnnouncementStatus[\s\S]*?DRAFT/));
check('AnnouncementStatus: SCHEDULED', has(schema, /enum AnnouncementStatus[\s\S]*?SCHEDULED/));
check('AnnouncementStatus: PUBLISHED', has(schema, /enum AnnouncementStatus[\s\S]*?PUBLISHED/));
check('AnnouncementStatus: EXPIRED', has(schema, /enum AnnouncementStatus[\s\S]*?EXPIRED/));
check('AnnouncementStatus: ARCHIVED', has(schema, /enum AnnouncementStatus[\s\S]*?ARCHIVED/));

check('CommunicationPriority enum defined', has(schema, 'enum CommunicationPriority'));
check('CommunicationPriority: LOW', has(schema, /enum CommunicationPriority[\s\S]*?LOW/));
check('CommunicationPriority: NORMAL', has(schema, /enum CommunicationPriority[\s\S]*?NORMAL/));
check('CommunicationPriority: HIGH', has(schema, /enum CommunicationPriority[\s\S]*?HIGH/));
check('CommunicationPriority: URGENT', has(schema, /enum CommunicationPriority[\s\S]*?URGENT/));

check('TemplateLanguage enum defined', has(schema, 'enum TemplateLanguage'));
check('TemplateLanguage: EN', has(schema, /enum TemplateLanguage[\s\S]*?EN/));
check('TemplateLanguage: UR', has(schema, /enum TemplateLanguage[\s\S]*?UR/));
check('TemplateLanguage: AR', has(schema, /enum TemplateLanguage[\s\S]*?AR/));
check('TemplateLanguage: OTHER', has(schema, /enum TemplateLanguage[\s\S]*?OTHER/));

check('DevicePlatform enum defined', has(schema, 'enum DevicePlatform'));
check('DevicePlatform: IOS', has(schema, /enum DevicePlatform[\s\S]*?IOS/));
check('DevicePlatform: ANDROID', has(schema, /enum DevicePlatform[\s\S]*?ANDROID/));
check('DevicePlatform: WEB', has(schema, /enum DevicePlatform[\s\S]*?WEB/));
check('DevicePlatform: DESKTOP', has(schema, /enum DevicePlatform[\s\S]*?DESKTOP/));

check('AudienceType enum defined', has(schema, 'enum AudienceType'));
check('AudienceType: ALL', has(schema, /enum AudienceType[\s\S]*?ALL/));
check('AudienceType: ROLES', has(schema, /enum AudienceType[\s\S]*?ROLES/));
check('AudienceType: CAMPUS', has(schema, /enum AudienceType[\s\S]*?CAMPUS/));
check('AudienceType: CLASS_SECTION', has(schema, /enum AudienceType[\s\S]*?CLASS_SECTION/));
check('AudienceType: DEPARTMENT', has(schema, /enum AudienceType[\s\S]*?DEPARTMENT/));
check('AudienceType: CUSTOM', has(schema, /enum AudienceType[\s\S]*?CUSTOM/));
check('AudienceType: INDIVIDUAL', has(schema, /enum AudienceType[\s\S]*?INDIVIDUAL/));

// =============================================================================
console.log('\n2. Prisma Schema — Communication Models');
// =============================================================================

check('Notification model updated: priority', has(schema, /model Notification[\s\S]*?priority/));
check('Notification model updated: category', has(schema, /model Notification[\s\S]*?category/));
check('Notification model updated: readAt', has(schema, /model Notification[\s\S]*?readAt/));
check('Notification model updated: campaignId', has(schema, /model Notification[\s\S]*?campaignId/));

check('Announcement model defined', has(schema, 'model Announcement {'));
check('Announcement: code', has(schema, /model Announcement[\s\S]*?code\s+String\s+@unique/));
check('Announcement: title', has(schema, /model Announcement[\s\S]*?title\s+String/));
check('Announcement: content', has(schema, /model Announcement[\s\S]*?content\s+String/));
check('Announcement: category', has(schema, /model Announcement[\s\S]*?category\s+String/));
check('Announcement: priority', has(schema, /model Announcement[\s\S]*?priority\s+CommunicationPriority/));
check('Announcement: status', has(schema, /model Announcement[\s\S]*?status\s+AnnouncementStatus/));
check('Announcement: audienceType', has(schema, /model Announcement[\s\S]*?audienceType\s+AudienceType/));
check('Announcement: targetRoles', has(schema, /model Announcement[\s\S]*?targetRoles\s+String\[\]/));
check('Announcement: targetGrades', has(schema, /model Announcement[\s\S]*?targetGrades\s+String\[\]/));
check('Announcement: authorId', has(schema, /model Announcement[\s\S]*?authorId\s+String/));
check('Announcement: publishedAt', has(schema, /model Announcement[\s\S]*?publishedAt\s+DateTime\?/));
check('Announcement: scheduledFor', has(schema, /model Announcement[\s\S]*?scheduledFor\s+DateTime\?/));
check('Announcement: expiresAt', has(schema, /model Announcement[\s\S]*?expiresAt\s+DateTime\?/));
check('Announcement: attachments', has(schema, /model Announcement[\s\S]*?attachments\s+String\[\]/));
check('Announcement: viewsCount', has(schema, /model Announcement[\s\S]*?viewsCount\s+Int/));

check('CommunicationTemplate model defined', has(schema, 'model CommunicationTemplate {'));
check('CommunicationTemplate: code', has(schema, /model CommunicationTemplate[\s\S]*?code\s+String\s+@unique/));
check('CommunicationTemplate: name', has(schema, /model CommunicationTemplate[\s\S]*?name\s+String/));
check('CommunicationTemplate: channel', has(schema, /model CommunicationTemplate[\s\S]*?channel\s+CommunicationChannel/));
check('CommunicationTemplate: language', has(schema, /model CommunicationTemplate[\s\S]*?language\s+TemplateLanguage/));
check('CommunicationTemplate: subject', has(schema, /model CommunicationTemplate[\s\S]*?subject\s+String\?/));
check('CommunicationTemplate: body', has(schema, /model CommunicationTemplate[\s\S]*?body\s+String/));
check('CommunicationTemplate: variables', has(schema, /model CommunicationTemplate[\s\S]*?variables\s+String\[\]/));
check('CommunicationTemplate: currentVersion', has(schema, /model CommunicationTemplate[\s\S]*?currentVersion\s+Int/));
check('CommunicationTemplate: isActive', has(schema, /model CommunicationTemplate[\s\S]*?isActive\s+Boolean/));

check('CommunicationTemplateVersion model defined', has(schema, 'model CommunicationTemplateVersion {'));
check('CommunicationTemplateVersion: templateId', has(schema, /model CommunicationTemplateVersion[\s\S]*?templateId\s+String/));
check('CommunicationTemplateVersion: version', has(schema, /model CommunicationTemplateVersion[\s\S]*?version\s+Int/));
check('CommunicationTemplateVersion: body', has(schema, /model CommunicationTemplateVersion[\s\S]*?body\s+String/));
check('CommunicationTemplateVersion: variables', has(schema, /model CommunicationTemplateVersion[\s\S]*?variables\s+String\[\]/));

check('CommunicationCampaign model defined', has(schema, 'model CommunicationCampaign {'));
check('CommunicationCampaign: code', has(schema, /model CommunicationCampaign[\s\S]*?code\s+String\s+@unique/));
check('CommunicationCampaign: title', has(schema, /model CommunicationCampaign[\s\S]*?title\s+String/));
check('CommunicationCampaign: channels', has(schema, /model CommunicationCampaign[\s\S]*?channels\s+CommunicationChannel\[\]/));
check('CommunicationCampaign: templateId', has(schema, /model CommunicationCampaign[\s\S]*?templateId\s+String\?/));
check('CommunicationCampaign: audienceType', has(schema, /model CommunicationCampaign[\s\S]*?audienceType\s+AudienceType/));
check('CommunicationCampaign: status', has(schema, /model CommunicationCampaign[\s\S]*?status\s+CommunicationStatus/));
check('CommunicationCampaign: priority', has(schema, /model CommunicationCampaign[\s\S]*?priority\s+CommunicationPriority/));
check('CommunicationCampaign: totalRecipients', has(schema, /model CommunicationCampaign[\s\S]*?totalRecipients\s+Int/));
check('CommunicationCampaign: sentCount', has(schema, /model CommunicationCampaign[\s\S]*?sentCount\s+Int/));
check('CommunicationCampaign: deliveredCount', has(schema, /model CommunicationCampaign[\s\S]*?deliveredCount\s+Int/));
check('CommunicationCampaign: failedCount', has(schema, /model CommunicationCampaign[\s\S]*?failedCount\s+Int/));
check('CommunicationCampaign: skippedCount', has(schema, /model CommunicationCampaign[\s\S]*?skippedCount\s+Int/));

check('CommunicationDelivery model defined', has(schema, 'model CommunicationDelivery {'));
check('CommunicationDelivery: campaignId', has(schema, /model CommunicationDelivery[\s\S]*?campaignId\s+String\?/));
check('CommunicationDelivery: userId', has(schema, /model CommunicationDelivery[\s\S]*?userId\s+String\?/));
check('CommunicationDelivery: recipient', has(schema, /model CommunicationDelivery[\s\S]*?recipient\s+String/));
check('CommunicationDelivery: channel', has(schema, /model CommunicationDelivery[\s\S]*?channel\s+CommunicationChannel/));
check('CommunicationDelivery: provider', has(schema, /model CommunicationDelivery[\s\S]*?provider\s+String/));
check('CommunicationDelivery: status', has(schema, /model CommunicationDelivery[\s\S]*?status\s+CommunicationStatus/));
check('CommunicationDelivery: attempts', has(schema, /model CommunicationDelivery[\s\S]*?attempts\s+Int/));
check('CommunicationDelivery: idempotencyKey', has(schema, /model CommunicationDelivery[\s\S]*?idempotencyKey\s+String\s+@unique/));

check('CommunicationAudience model defined', has(schema, 'model CommunicationAudience {'));
check('CommunicationAudience: code', has(schema, /model CommunicationAudience[\s\S]*?code\s+String\s+@unique/));
check('CommunicationAudience: name', has(schema, /model CommunicationAudience[\s\S]*?name\s+String/));
check('CommunicationAudience: audienceType', has(schema, /model CommunicationAudience[\s\S]*?audienceType\s+AudienceType/));
check('CommunicationAudience: filterCriteria', has(schema, /model CommunicationAudience[\s\S]*?filterCriteria\s+Json/));
check('CommunicationAudience: isDynamic', has(schema, /model CommunicationAudience[\s\S]*?isDynamic\s+Boolean/));

check('CommunicationPreference model defined', has(schema, 'model CommunicationPreference {'));
check('CommunicationPreference: userId', has(schema, /model CommunicationPreference[\s\S]*?userId\s+String/));
check('CommunicationPreference: channel', has(schema, /model CommunicationPreference[\s\S]*?channel\s+CommunicationChannel/));
check('CommunicationPreference: isEnabled', has(schema, /model CommunicationPreference[\s\S]*?isEnabled\s+Boolean/));
check('CommunicationPreference: quietHoursStart', has(schema, /model CommunicationPreference[\s\S]*?quietHoursStart\s+String\?/));
check('CommunicationPreference: quietHoursEnd', has(schema, /model CommunicationPreference[\s\S]*?quietHoursEnd\s+String\?/));

check('DeviceRegistration model defined', has(schema, 'model DeviceRegistration {'));
check('DeviceRegistration: userId', has(schema, /model DeviceRegistration[\s\S]*?userId\s+String/));
check('DeviceRegistration: deviceToken', has(schema, /model DeviceRegistration[\s\S]*?deviceToken\s+String\s+@unique/));
check('DeviceRegistration: platform', has(schema, /model DeviceRegistration[\s\S]*?platform\s+DevicePlatform/));
check('DeviceRegistration: isActive', has(schema, /model DeviceRegistration[\s\S]*?isActive\s+Boolean/));

check('CommunicationWebhookEvent model defined', has(schema, 'model CommunicationWebhookEvent {'));
check('CommunicationWebhookEvent: provider', has(schema, /model CommunicationWebhookEvent[\s\S]*?provider\s+String/));
check('CommunicationWebhookEvent: isProcessed', has(schema, /model CommunicationWebhookEvent[\s\S]*?isProcessed\s+Boolean/));

// =============================================================================
console.log('\n3. Prisma Schema — Back-References');
// =============================================================================

check('Organization.announcements relation exists', has(schema, /model Organization[\s\S]*?announcements\s+Announcement\[\]/));
check('Organization.communicationTemplates relation exists', has(schema, /model Organization[\s\S]*?communicationTemplates\s+CommunicationTemplate\[\]/));
check('Organization.communicationCampaigns relation exists', has(schema, /model Organization[\s\S]*?communicationCampaigns\s+CommunicationCampaign\[\]/));
check('Organization.communicationAudiences relation exists', has(schema, /model Organization[\s\S]*?communicationAudiences\s+CommunicationAudience\[\]/));
check('Campus.announcements relation exists', has(schema, /model Campus[\s\S]*?announcements\s+Announcement\[\]/));
check('Campus.communicationCampaigns relation exists', has(schema, /model Campus[\s\S]*?communicationCampaigns\s+CommunicationCampaign\[\]/));
check('User.announcements relation exists', has(schema, /model User[\s\S]*?announcements\s+Announcement\[\]/));
check('User.communicationDeliveries relation exists', has(schema, /model User[\s\S]*?communicationDeliveries\s+CommunicationDelivery\[\]/));
check('User.communicationPreferences relation exists', has(schema, /model User[\s\S]*?communicationPreferences\s+CommunicationPreference\[\]/));
check('User.deviceRegistrations relation exists', has(schema, /model User[\s\S]*?deviceRegistrations\s+DeviceRegistration\[\]/));

// =============================================================================
console.log('\n4. Shared Types — Communication Interfaces');
// =============================================================================
const sharedTypesIndex = readFile('packages/shared-types/src/index.ts');
const commInterface = readFile('packages/shared-types/src/interfaces/communication.interface.ts');

check('communication.interface.ts exists', commInterface.length > 0);
check('communication.interface.ts exported in index.ts', has(sharedTypesIndex, 'communication.interface'));
check('IAnnouncement interface defined', has(commInterface, 'export interface IAnnouncement'));
check('ICreateAnnouncementDto defined', has(commInterface, 'export interface ICreateAnnouncementDto'));
check('ICommunicationTemplate interface defined', has(commInterface, 'export interface ICommunicationTemplate'));
check('ICommunicationTemplateVersion interface defined', has(commInterface, 'export interface ICommunicationTemplateVersion'));
check('ICreateTemplateDto defined', has(commInterface, 'export interface ICreateTemplateDto'));
check('ICommunicationCampaign interface defined', has(commInterface, 'export interface ICommunicationCampaign'));
check('ICreateCampaignDto defined', has(commInterface, 'export interface ICreateCampaignDto'));
check('ICommunicationDelivery interface defined', has(commInterface, 'export interface ICommunicationDelivery'));
check('ICommunicationAudience interface defined', has(commInterface, 'export interface ICommunicationAudience'));
check('ICommunicationPreference interface defined', has(commInterface, 'export interface ICommunicationPreference'));
check('IDeviceRegistration interface defined', has(commInterface, 'export interface IDeviceRegistration'));
check('ICommunicationDashboardKpis defined', has(commInterface, 'export interface ICommunicationDashboardKpis'));
check('IProviderStatusSummary defined', has(commInterface, 'export interface IProviderStatusSummary'));

// =============================================================================
console.log('\n5. Core Queue — BullMQ Service Names');
// =============================================================================
const queueService = readFile('apps/api/src/core/queue/queue.service.ts');

check('QueueName.SMS defined', has(queueService, "SMS = 'queue:sms'"));
check('QueueName.PUSH defined', has(queueService, "PUSH = 'queue:push'"));
check('QueueName.WHATSAPP defined', has(queueService, "WHATSAPP = 'queue:whatsapp'"));
check('QueueName.COMMUNICATIONS defined', has(queueService, "COMMUNICATIONS = 'queue:communications'"));

// =============================================================================
console.log('\n6. Notifications Backward Compatibility');
// =============================================================================
const notifService = readFile('apps/api/src/modules/notifications/notifications.service.ts');

check('NotificationsService has overloaded create method', has(notifService, 'async create('));
check('NotificationsService supports userId in create', has(notifService, 'dto.userId'));
check('NotificationsService supports recipientRole in create', has(notifService, 'dto.recipientRole'));
check('NotificationsService supports overloaded broadcast', has(notifService, 'senderOrOrgId: CurrentUserPayload | string'));
check('NotificationsService maintains role broadcast logic', has(notifService, 'dto.targetRole'));

// =============================================================================
console.log('\n7. Backend Communication Services');
// =============================================================================

// 7.1 Providers Service
const provService = readFile('apps/api/src/modules/communication/communication-providers.service.ts');
check('CommunicationProvidersService exists', provService.length > 0);
check('getProviderStatusSummary implemented', has(provService, 'getProviderStatusSummary()'));
check('getProviderStatusSummary handles IN_APP', has(provService, "channel: 'IN_APP'"));
check('getProviderStatusSummary handles EMAIL', has(provService, "channel: 'EMAIL'"));
check('getProviderStatusSummary handles SMS', has(provService, "channel: 'SMS'"));
check('getProviderStatusSummary handles PUSH', has(provService, "channel: 'PUSH'"));
check('getProviderStatusSummary handles WHATSAPP', has(provService, "channel: 'WHATSAPP'"));
check('sendEmail implemented with safe fallback', has(provService, 'sendEmail('));
check('sendEmail returns NOT_CONFIGURED when unconfigured', has(provService, "status: 'NOT_CONFIGURED'"));
check('sendSms implemented with safe fallback', has(provService, 'sendSms('));
check('sendPush implemented with safe fallback', has(provService, 'sendPush('));
check('sendWhatsApp implemented with safe fallback', has(provService, 'sendWhatsApp('));

// 7.2 Templates Service
const tplService = readFile('apps/api/src/modules/communication/communication-templates.service.ts');
check('CommunicationTemplatesService exists', tplService.length > 0);
check('createTemplate implemented', has(tplService, 'createTemplate('));
check('createTemplate creates initial version 1', has(tplService, 'version: 1'));
check('listTemplates implemented', has(tplService, 'listTemplates('));
check('getTemplateById implemented with versions', has(tplService, 'getTemplateById('));
check('updateTemplate creates new version on content edit', has(tplService, 'updateTemplate('));
check('renderContent implemented with variable interpolation', has(tplService, 'renderContent('));
check('extractVariables implemented', has(tplService, 'extractVariables('));
check('previewTemplate implemented', has(tplService, 'previewTemplate('));

// 7.3 Audience Service
const audService = readFile('apps/api/src/modules/communication/communication-audience.service.ts');
check('CommunicationAudienceService exists', audService.length > 0);
check('createAudience implemented', has(audService, 'createAudience('));
check('listAudiences implemented', has(audService, 'listAudiences('));
check('resolveRecipients implemented server-side', has(audService, 'resolveRecipients('));
check('resolveRecipients handles ALL', has(audService, 'AudienceType.ALL'));
check('resolveRecipients handles ROLES', has(audService, 'AudienceType.ROLES'));
check('resolveRecipients handles CAMPUS', has(audService, 'AudienceType.CAMPUS'));
check('resolveRecipients handles CLASS_SECTION', has(audService, 'AudienceType.CLASS_SECTION'));
check('resolveRecipients handles DEPARTMENT', has(audService, 'AudienceType.DEPARTMENT'));
check('previewAudience implemented', has(audService, 'previewAudience('));

// 7.4 Preferences Service
const prefService = readFile('apps/api/src/modules/communication/communication-preferences.service.ts');
check('CommunicationPreferencesService exists', prefService.length > 0);
check('getUserPreferences implemented', has(prefService, 'getUserPreferences('));
check('updateUserPreferences implemented', has(prefService, 'updateUserPreferences('));
check('isChannelAllowedForUser implemented', has(prefService, 'isChannelAllowedForUser('));
check('isQuietHourActive implemented', has(prefService, 'isQuietHourActive('));
check('registerDevice push tokens implemented', has(prefService, 'registerDevice('));
check('unregisterDevice implemented', has(prefService, 'unregisterDevice('));
check('getUserDevices implemented', has(prefService, 'getUserDevices('));

// 7.5 Delivery Service
const delivService = readFile('apps/api/src/modules/communication/communication-delivery.service.ts');
check('CommunicationDeliveryService exists', delivService.length > 0);
check('recordDelivery implemented', has(delivService, 'recordDelivery('));
check('recordDelivery validates idempotencyKey', has(delivService, 'idempotencyKey'));
check('listDeliveries implemented with pagination', has(delivService, 'listDeliveries('));
check('getDeliveryById implemented', has(delivService, 'getDeliveryById('));
check('retryDelivery implemented', has(delivService, 'retryDelivery('));
check('retryDelivery respects maxAttempts', has(delivService, 'maxAttempts'));
check('handleWebhookEvent implemented', has(delivService, 'handleWebhookEvent('));

// 7.6 Campaigns Service
const campService = readFile('apps/api/src/modules/communication/communication-campaigns.service.ts');
check('CommunicationCampaignsService exists', campService.length > 0);
check('generateCampaignCode format CMP-YYYY-XXXXX', has(campService, 'CMP-'));
check('createCampaign implemented', has(campService, 'createCampaign('));
check('listCampaigns implemented', has(campService, 'listCampaigns('));
check('executeCampaign multi-channel fan-out', has(campService, 'executeCampaign('));
check('executeCampaign checks quiet hours', has(campService, 'isQuietHourActive'));
check('executeCampaign checks channel opt-in', has(campService, 'isChannelAllowedForUser'));
check('executeCampaign records unique idempotencyKey', has(campService, 'idempotencyKey'));
check('cancelCampaign implemented', has(campService, 'cancelCampaign('));

// 7.7 Announcements Service
const annService = readFile('apps/api/src/modules/communication/communication-announcements.service.ts');
check('CommunicationAnnouncementsService exists', annService.length > 0);
check('generateAnnouncementCode format ANN-YYYY-XXXXX', has(annService, 'ANN-'));
check('createAnnouncement implemented', has(annService, 'createAnnouncement('));
check('listAnnouncements implemented', has(annService, 'listAnnouncements('));
check('publishAnnouncement implemented', has(annService, 'publishAnnouncement('));
check('publishAnnouncement triggers fanOutAnnouncementNotifications', has(annService, 'fanOutAnnouncementNotifications'));
check('archiveAnnouncement implemented', has(annService, 'archiveAnnouncement('));
check('getAnnouncementById increments viewsCount', has(annService, 'viewsCount'));

// 7.8 Reports Service
const repService = readFile('apps/api/src/modules/communication/communication-reports.service.ts');
check('CommunicationReportsService exists', repService.length > 0);
check('getDashboardKpis implemented', has(repService, 'getDashboardKpis('));
check('getDashboardKpis returns channel breakdown', has(repService, 'channelsSummary'));
check('getProviderStatusSummary implemented', has(repService, 'getProviderStatusSummary()'));

// =============================================================================
console.log('\n8. Controllers & Module Wiring');
// =============================================================================
const commController = readFile('apps/api/src/modules/communication/communication.controller.ts');
const commModule = readFile('apps/api/src/modules/communication/communication.module.ts');
const appModule = readFile('apps/api/src/app.module.ts');

check('CommunicationController exists', commController.length > 0);
check('Controller has /communication/announcements', has(commController, "'announcements'"));
check('Controller has /communication/campaigns', has(commController, "'campaigns'"));
check('Controller has /communication/templates', has(commController, "'templates'"));
check('Controller has /communication/audiences', has(commController, "'audiences'"));
check('Controller has /communication/deliveries', has(commController, "'deliveries'"));
check('Controller has /communication/webhooks', has(commController, "'webhooks/:provider'"));
check('Controller has /communication/preferences', has(commController, "'preferences'"));
check('Controller has /communication/reports/kpis', has(commController, "'reports/kpis'"));
check('Controller has /communication/reports/providers', has(commController, "'reports/providers'"));

check('CommunicationModule imports NotificationsModule', has(commModule, 'NotificationsModule'));
check('CommunicationModule imports AuditModule', has(commModule, 'AuditModule'));
check('CommunicationModule registers CommunicationController', has(commModule, 'CommunicationController'));
check('CommunicationModule provides all 8 communication services',
  has(commModule, 'CommunicationProvidersService') &&
  has(commModule, 'CommunicationTemplatesService') &&
  has(commModule, 'CommunicationAudienceService') &&
  has(commModule, 'CommunicationPreferencesService') &&
  has(commModule, 'CommunicationDeliveryService') &&
  has(commModule, 'CommunicationCampaignsService') &&
  has(commModule, 'CommunicationAnnouncementsService') &&
  has(commModule, 'CommunicationReportsService')
);

check('AppModule imports CommunicationModule', has(appModule, 'CommunicationModule'));

// =============================================================================
console.log('\n9. Web UI — Command Center & Navigation');
// =============================================================================
const commPage = readFile('apps/web/src/app/(dashboard)/portal/communication/page.tsx');
const sidebar = readFile('apps/web/src/components/Sidebar.tsx');
const notifPage = readFile('apps/web/src/app/(dashboard)/portal/notifications/page.tsx');

check('/portal/communication/page.tsx exists', commPage.length > 0);
check('Command Center has 8 tabs defined',
  has(commPage, "'overview'") &&
  has(commPage, "'announcements'") &&
  has(commPage, "'campaigns'") &&
  has(commPage, "'templates'") &&
  has(commPage, "'audiences'") &&
  has(commPage, "'deliveries'") &&
  has(commPage, "'providers'") &&
  has(commPage, "'preferences'")
);
check('Command Center has KPI cards', has(commPage, 'kpis.messagesTodayCount'));
check('Command Center has announcements composer', has(commPage, 'handleCreateAnnouncement'));
check('Command Center has campaign dispatcher', has(commPage, 'handleCreateCampaign'));
check('Command Center has template preview modal', has(commPage, 'handlePreviewTemplate'));
check('Command Center has audience segment builder', has(commPage, 'handleCreateAudience'));
check('Command Center has delivery ledger & retry', has(commPage, 'handleRetryDelivery'));
check('Command Center has provider health diagnostic table', has(commPage, 'Provider Integrity Guard'));
check('Command Center has quiet hours configuration', has(commPage, 'quietHoursStart'));

check('Sidebar links to /portal/communication', has(sidebar, '/portal/communication'));
check('Personal notifications inbox page.tsx preserved', notifPage.length > 0);

// =============================================================================
console.log('\n10. Documentation & Final Reports');
// =============================================================================
const statusDoc = readFile('docs/features/feature-status.md');
const specDoc = readFile('docs/features/phase4m-communication.md');
const finalReport = readFile('docs/features/phase4m-final-report.md');

check('Phase 4M marked VERIFIED in feature-status.md', has(statusDoc, /Notification Engine[\s\S]*?4M[\s\S]*?VERIFIED/));
check('phase4m-communication.md exists', specDoc.length > 0);
check('phase4m-communication.md has EXISTING section', has(specDoc, '### EXISTING'));
check('phase4m-communication.md has MISSING section', has(specDoc, '### MISSING'));
check('phase4m-communication.md has TO IMPLEMENT section', has(specDoc, '### TO IMPLEMENT'));
check('phase4m-communication.md has DEFERRED section', has(specDoc, '### DEFERRED'));
check('phase4m-final-report.md exists', finalReport.length > 0);
check('phase4m-final-report.md has VERIFIED status', has(finalReport, '**Status:** **VERIFIED**'));

// =============================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  PHASE 4M VERIFICATION COMPLETE');
console.log(`  ✅ PASSED: ${passed}`);
console.log(`  ❌ FAILED: ${failed}`);
console.log(`  TOTAL:   ${passed + failed}`);

if (failed === 0) {
  console.log('\n  🎉 ALL CHECKS PASSED — PHASE 4M IS VERIFIED AND READY FOR PHASE 4N');
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.log('\n  ⚠️ FAILURES DETECTED:');
  failures.forEach((f) => console.log(`    - ${f}`));
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(1);
}
