// =============================================================================
// Phase 4S: Integration Configuration Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { IntegrationRegistryService } from './integration-registry.service';
import {
  IntegrationType,
  IntegrationProvider,
  ICreateIntegrationDto,
  IUpdateIntegrationDto,
  IIntegrationConfig,
} from '@school/shared-types';

@Injectable()
export class IntegrationConfigService {
  private readonly logger = new Logger(IntegrationConfigService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: IntegrationRegistryService,
    private readonly config: ConfigService,
  ) {
    // Derive a stable 32-byte AES key from JWT secret or dedicated env variable
    const masterSecret =
      this.config.get<string>('INTEGRATIONS_ENCRYPTION_KEY') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      'dev_jwt_access_secret_do_not_use_in_prod_12345678';

    this.encryptionKey = crypto.createHash('sha256').update(masterSecret).digest();
  }

  // ---------------------------------------------------------------------------
  // Cryptographic Helpers (AES-256-GCM)
  // ---------------------------------------------------------------------------

  private encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Store as: iv.tag.encrypted (base64url)
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  private decrypt(cipherText: string): string {
    try {
      const parts = cipherText.split('.');
      if (parts.length !== 3) {
        throw new Error('Malformed cipher format');
      }

      const iv = Buffer.from(parts[0], 'base64url');
      const tag = Buffer.from(parts[1], 'base64url');
      const encrypted = Buffer.from(parts[2], 'base64url');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err: any) {
      this.logger.error(`Decryption failure: ${err.message}`);
      throw new BadRequestException('Failed to decrypt stored integration configuration');
    }
  }

  // ---------------------------------------------------------------------------
  // Public Masked Query APIs
  // ---------------------------------------------------------------------------

  async listConfigs(
    organizationId: string,
    filters?: { campusId?: string; type?: IntegrationType },
  ): Promise<IIntegrationConfig[]> {
    const where: any = { organizationId };
    if (filters?.campusId) where.campusId = filters.campusId;
    if (filters?.type) where.type = filters.type;

    const records = await this.prisma.integrationConfig.findMany({
      where,
      orderBy: [{ type: 'asc' }, { provider: 'asc' }],
    });

    return records.map((r) => this.toMaskedConfigDto(r));
  }

  async getConfigById(organizationId: string, id: string): Promise<IIntegrationConfig> {
    const record = await this.prisma.integrationConfig.findFirst({
      where: { id, organizationId },
    });

    if (!record) {
      throw new NotFoundException(`Integration configuration [${id}] not found`);
    }

    return this.toMaskedConfigDto(record);
  }

  // ---------------------------------------------------------------------------
  // Configuration Mutation APIs
  // ---------------------------------------------------------------------------

  async createOrUpdateConfig(
    organizationId: string,
    dto: ICreateIntegrationDto,
    userId?: string,
  ): Promise<IIntegrationConfig> {
    // 1. Validate payload against provider schema
    this.registry.validateConfigPayload(dto.type, dto.provider, dto.config);

    // 2. Generate safe masked view and encrypted payload
    const maskedConfig = this.registry.maskConfig(dto.type, dto.provider, dto.config);
    const encryptedConfig = this.encrypt(JSON.stringify(dto.config));

    // 3. Upsert into database
    const existing = await this.prisma.integrationConfig.findFirst({
      where: {
        organizationId,
        campusId: dto.campusId || null,
        type: dto.type,
        provider: dto.provider,
      },
    });

    let savedRecord;
    if (existing) {
      savedRecord = await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          name: dto.name || existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
          environment: dto.environment || existing.environment,
          isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : existing.isEnabled,
          encryptedConfig,
          maskedConfig,
          healthStatus: 'UNKNOWN',
        },
      });
      this.logger.log(`Updated integration [${dto.type}:${dto.provider}] for org [${organizationId}]`);
    } else {
      savedRecord = await this.prisma.integrationConfig.create({
        data: {
          organizationId,
          campusId: dto.campusId || null,
          type: dto.type,
          provider: dto.provider,
          name: dto.name,
          description: dto.description,
          environment: dto.environment || 'SANDBOX',
          isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
          encryptedConfig,
          maskedConfig,
          healthStatus: 'UNKNOWN',
          createdBy: userId,
        },
      });
      this.logger.log(`Created integration [${dto.type}:${dto.provider}] for org [${organizationId}]`);
    }

    return this.toMaskedConfigDto(savedRecord);
  }

  async updateConfig(
    organizationId: string,
    id: string,
    dto: IUpdateIntegrationDto,
  ): Promise<IIntegrationConfig> {
    const existing = await this.prisma.integrationConfig.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Integration configuration [${id}] not found`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.environment !== undefined) data.environment = dto.environment;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;

    if (dto.config) {
      // Merge with decrypted existing config for partially updated secret fields
      const currentDecrypted = JSON.parse(this.decrypt(existing.encryptedConfig));
      const mergedConfig = { ...currentDecrypted, ...dto.config };

      // Re-validate and encrypt
      this.registry.validateConfigPayload(
        existing.type as IntegrationType,
        existing.provider as IntegrationProvider,
        mergedConfig,
      );
      data.encryptedConfig = this.encrypt(JSON.stringify(mergedConfig));
      data.maskedConfig = this.registry.maskConfig(
        existing.type as IntegrationType,
        existing.provider as IntegrationProvider,
        mergedConfig,
      );
      data.healthStatus = 'UNKNOWN';
    }

    const updated = await this.prisma.integrationConfig.update({
      where: { id },
      data,
    });

    return this.toMaskedConfigDto(updated);
  }

  async setEnabled(
    organizationId: string,
    id: string,
    isEnabled: boolean,
  ): Promise<IIntegrationConfig> {
    const existing = await this.prisma.integrationConfig.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Integration configuration [${id}] not found`);
    }

    const updated = await this.prisma.integrationConfig.update({
      where: { id },
      data: {
        isEnabled,
        healthStatus: isEnabled ? existing.healthStatus : 'DISABLED',
      },
    });

    return this.toMaskedConfigDto(updated);
  }

  async deleteConfig(organizationId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.integrationConfig.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Integration configuration [${id}] not found`);
    }

    await this.prisma.integrationConfig.delete({ where: { id } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Internal Decrypted Resolution APIs (Used solely by backend Provider Adapters)
  // ---------------------------------------------------------------------------

  async getDecryptedActiveConfig(
    organizationId: string,
    type: IntegrationType,
    campusId?: string,
  ): Promise<{ provider: IntegrationProvider; config: Record<string, any>; integrationId: string } | null> {
    // Hierarchical resolution: Campus -> Organization -> System Default
    let record = null;
    if (campusId) {
      record = await this.prisma.integrationConfig.findFirst({
        where: { organizationId, campusId, type, isEnabled: true },
      });
    }

    if (!record) {
      record = await this.prisma.integrationConfig.findFirst({
        where: { organizationId, campusId: null, type, isEnabled: true },
      });
    }

    if (!record) return null;

    try {
      const decrypted = JSON.parse(this.decrypt(record.encryptedConfig));
      return {
        provider: record.provider as IntegrationProvider,
        config: decrypted,
        integrationId: record.id,
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization Helper
  // ---------------------------------------------------------------------------

  private toMaskedConfigDto(record: any): IIntegrationConfig {
    return {
      id: record.id,
      organizationId: record.organizationId,
      campusId: record.campusId,
      type: record.type as IntegrationType,
      provider: record.provider as IntegrationProvider,
      name: record.name,
      description: record.description,
      environment: record.environment as any,
      isEnabled: record.isEnabled,
      maskedConfig: (record.maskedConfig as any) || {},
      healthStatus: record.healthStatus as any,
      lastHealthCheckAt: record.lastHealthCheckAt,
      lastSuccessAt: record.lastSuccessAt,
      lastFailureAt: record.lastFailureAt,
      lastErrorMessage: record.lastErrorMessage,
      failureCount: record.failureCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
