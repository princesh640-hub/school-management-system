// =============================================================================
// Phase 4S: Push Notification Provider Adapter (Firebase Cloud Messaging, Mock)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import {
  IPushDispatchPayload,
  IDispatchResult,
  IntegrationProvider,
} from '@school/shared-types';

export interface IPushAdapter {
  sendPush(config: Record<string, any>, payload: IPushDispatchPayload): Promise<IDispatchResult>;
  testConnection(config: Record<string, any>): Promise<{ isSuccess: boolean; latencyMs: number; message: string }>;
}

@Injectable()
export class PushAdapter implements IPushAdapter {
  private readonly logger = new Logger(PushAdapter.name);

  async sendPush(config: Record<string, any>, payload: IPushDispatchPayload): Promise<IDispatchResult> {
    const provider = (config.provider || 'FCM') as IntegrationProvider;

    if (!config || Object.keys(config).length === 0) {
      return {
        isSuccess: false,
        provider,
        status: 'NOT_CONFIGURED',
        errorMessage: 'Push notification provider not configured',
      };
    }

    try {
      this.logger.log(`[PUSH DISPATCH - ${provider}] Token: ${payload.deviceToken.substring(0, 10)}... | Title: ${payload.title}`);
      const messageId = `FCM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      return {
        isSuccess: true,
        provider,
        messageId,
        status: 'SENT',
      };
    } catch (err: any) {
      this.logger.error(`Push dispatch error: ${err.message}`);
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

    if (!config.projectId && !config.serverKey && !config.serviceAccountJson) {
      return {
        isSuccess: false,
        latencyMs: Date.now() - start,
        message: 'Missing Firebase Project ID or Service Account in configuration.',
      };
    }

    const latencyMs = Math.max(15, Math.floor(Math.random() * 40) + 15);
    return {
      isSuccess: true,
      latencyMs,
      message: `Firebase Cloud Messaging token service successfully authenticated for project: ${config.projectId || 'beacon-horizon'}.`,
    };
  }
}
