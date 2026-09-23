// =============================================================================
// Phase 4S: WhatsApp Provider Adapter (Meta Cloud API, Mock)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import {
  IWhatsAppDispatchPayload,
  IDispatchResult,
  IntegrationProvider,
} from '@school/shared-types';

export interface IWhatsAppAdapter {
  sendWhatsApp(config: Record<string, any>, payload: IWhatsAppDispatchPayload): Promise<IDispatchResult>;
  testConnection(config: Record<string, any>): Promise<{ isSuccess: boolean; latencyMs: number; message: string }>;
}

@Injectable()
export class WhatsAppAdapter implements IWhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);

  async sendWhatsApp(config: Record<string, any>, payload: IWhatsAppDispatchPayload): Promise<IDispatchResult> {
    const provider = (config.provider || 'META_WHATSAPP') as IntegrationProvider;

    if (!config || Object.keys(config).length === 0) {
      return {
        isSuccess: false,
        provider,
        status: 'NOT_CONFIGURED',
        errorMessage: 'WhatsApp provider not configured',
      };
    }

    try {
      this.logger.log(`[WHATSAPP DISPATCH - ${provider}] To: ${payload.to} | Template: ${payload.templateCode}`);
      const messageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

      return {
        isSuccess: true,
        provider,
        messageId,
        status: 'SENT',
      };
    } catch (err: any) {
      this.logger.error(`WhatsApp dispatch error: ${err.message}`);
      return {
        isSuccess: false,
        provider,
        status: 'FAILED',
        errorMessage: err.message,
      };
    }
  }

  async testConnection(config: Record<string, any>): Promise<{ isSuccess: boolean; latencyMs: number; message: string }> {
    const start = Date.now();

    if (!config.phoneNumberId || !config.apiToken) {
      return {
        isSuccess: false,
        latencyMs: Date.now() - start,
        message: 'Missing WhatsApp Phone Number ID or Access Token in configuration.',
      };
    }

    const latencyMs = Math.max(25, Math.floor(Math.random() * 60) + 25);
    return {
      isSuccess: true,
      latencyMs,
      message: `Meta WhatsApp Cloud API token verified for Phone ID: ${config.phoneNumberId}. Quality Rating: GREEN.`,
    };
  }
}
