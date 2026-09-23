// =============================================================================
// Phase 4S: Webhooks Ingestion Controller (Public External Provider Ingress)
// =============================================================================
import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  Body,
  HttpCode,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Public } from '../../../common/decorators/public.decorator';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookDispatcher: WebhookDispatcherService) {}

  /**
   * Universal public webhook ingestion endpoint for Stripe, Razorpay, Twilio, Meta WhatsApp, etc.
   */
  @Public()
  @Post(':provider')
  @HttpCode(200)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: FastifyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() parsedBody: any,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(parsedBody);

    return this.webhookDispatcher.processInboundWebhook({
      provider,
      rawBody,
      headers,
      parsedBody,
    });
  }
}
