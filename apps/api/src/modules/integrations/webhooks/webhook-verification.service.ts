// =============================================================================
// Phase 4S: Webhook Verification Service
// =============================================================================
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookVerificationService {
  private readonly logger = new Logger(WebhookVerificationService.name);

  /**
   * Verifies incoming webhook signatures based on provider algorithm
   */
  verifySignature(
    provider: string,
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    webhookSecret: string,
  ): boolean {
    const p = provider.toUpperCase();
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // Case-insensitive header lookup helper
    const getHeader = (name: string): string | undefined => {
      const lower = name.toLowerCase();
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lower) {
          return Array.isArray(v) ? v[0] : v;
        }
      }
      return undefined;
    };

    try {
      if (p === 'STRIPE') {
        const sigHeader = getHeader('stripe-signature');
        if (!sigHeader) return false;

        // Stripe format: t=1612345678,v1=5257a869e7ecebeda32affa62cd490b135ec5cc41302cf2e4030b323a0d4493a
        const parts = sigHeader.split(',');
        let timestamp = '';
        let signature = '';

        for (const part of parts) {
          const [key, val] = part.trim().split('=');
          if (key === 't') timestamp = val;
          if (key === 'v1') signature = val;
        }

        if (!timestamp || !signature) return false;

        // Timestamp tolerance check (prevent replay attacks > 5 mins)
        const tsSec = parseInt(timestamp, 10);
        const nowSec = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSec - tsSec) > 300) {
          this.logger.warn(`Stripe webhook signature timestamp [${timestamp}] outside 5-minute tolerance`);
          return false;
        }

        const signedPayload = `${timestamp}.${bodyStr}`;
        const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
        return this.timingSafeCompare(signature, expected);
      }

      if (p === 'RAZORPAY') {
        const sigHeader = getHeader('x-razorpay-signature');
        if (!sigHeader) return false;

        const expected = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
        return this.timingSafeCompare(sigHeader, expected);
      }

      if (p === 'WHATSAPP' || p === 'META_WHATSAPP') {
        const sigHeader = getHeader('x-hub-signature-256');
        if (!sigHeader) return false;

        const signature = sigHeader.startsWith('sha256=') ? sigHeader.substring(7) : sigHeader;
        const expected = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
        return this.timingSafeCompare(signature, expected);
      }

      if (p === 'TWILIO') {
        const sigHeader = getHeader('x-twilio-signature');
        // If webhook secret configured, require signature
        if (webhookSecret && !sigHeader) return false;
        return true;
      }

      // Generic HMAC SHA-256 webhook header
      const genericSig = getHeader('x-webhook-signature') || getHeader('x-signature');
      if (genericSig) {
        const expected = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
        return this.timingSafeCompare(genericSig, expected);
      }

      // If no signature header is supplied and secret is configured, fail verification
      return !webhookSecret;
    } catch (err: any) {
      this.logger.error(`Webhook verification error: ${err.message}`);
      return false;
    }
  }

  /**
   * Constant-time string comparison preventing side-channel timing attacks
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
