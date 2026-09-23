// =============================================================================
// Phase 4M: Communication Preferences & Device Registry Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CommunicationChannel,
  DevicePlatform,
} from '@prisma/client';
import {
  IUpdatePreferenceDto,
  IRegisterDeviceDto,
} from '@school/shared-types';

@Injectable()
export class CommunicationPreferencesService {
  private readonly logger = new Logger(CommunicationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all communication preferences and quiet hours for a user.
   */
  async getUserPreferences(userId: string) {
    const preferences = await this.prisma.communicationPreference.findMany({
      where: { userId },
    });

    const quietHours = preferences.find(
      (p) => p.quietHoursStart && p.quietHoursEnd,
    );

    const channels: CommunicationChannel[] = [
      CommunicationChannel.IN_APP,
      CommunicationChannel.EMAIL,
      CommunicationChannel.SMS,
      CommunicationChannel.PUSH,
      CommunicationChannel.WHATSAPP,
    ];

    const preferencesMap = channels.map((channel) => {
      const found = preferences.find((p) => p.channel === channel);
      return {
        channel,
        category: found?.category || 'ALL',
        isEnabled: found ? found.isEnabled : true, // Default opt-in
      };
    });

    return {
      userId,
      preferences: preferencesMap,
      quietHoursStart: quietHours?.quietHoursStart || null,
      quietHoursEnd: quietHours?.quietHoursEnd || null,
    };
  }

  /**
   * Updates channel preferences and quiet hours for a user.
   */
  async updateUserPreferences(userId: string, dto: IUpdatePreferenceDto) {
    return this.prisma.$transaction(async (tx) => {
      for (const pref of dto.preferences) {
        const category = pref.category || 'ALL';
        await tx.communicationPreference.upsert({
          where: {
            userId_channel_category: {
              userId,
              channel: pref.channel as CommunicationChannel,
              category,
            },
          },
          update: {
            isEnabled: pref.isEnabled,
            quietHoursStart: dto.quietHoursStart,
            quietHoursEnd: dto.quietHoursEnd,
          },
          create: {
            userId,
            channel: pref.channel as CommunicationChannel,
            category,
            isEnabled: pref.isEnabled,
            quietHoursStart: dto.quietHoursStart,
            quietHoursEnd: dto.quietHoursEnd,
          },
        });
      }

      return this.getUserPreferences(userId);
    });
  }

  /**
   * Evaluates if a given channel is active/allowed for a recipient.
   */
  async isChannelAllowedForUser(
    userId: string,
    channel: CommunicationChannel,
    category: string = 'ALL',
  ): Promise<boolean> {
    const pref = await this.prisma.communicationPreference.findFirst({
      where: {
        userId,
        channel,
        category,
      },
    });

    if (pref && !pref.isEnabled) {
      return false;
    }

    return true;
  }

  /**
   * Evaluates if the current moment falls inside the recipient's quiet hours window.
   */
  async isQuietHourActive(userId: string, now: Date = new Date()): Promise<boolean> {
    const pref = await this.prisma.communicationPreference.findFirst({
      where: {
        userId,
        quietHoursStart: { not: null },
        quietHoursEnd: { not: null },
      },
    });

    if (!pref || !pref.quietHoursStart || !pref.quietHoursEnd) {
      return false;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
    const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes < endMinutes) {
      // e.g. 13:00 to 15:00
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // e.g. 22:00 to 07:00 (overnight)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  // ---------------------------------------------------------------------------
  // Device Push Token Registry
  // ---------------------------------------------------------------------------

  /**
   * Registers a device token for Web / Mobile push notifications.
   */
  async registerDevice(userId: string, dto: IRegisterDeviceDto) {
    return this.prisma.deviceRegistration.upsert({
      where: { deviceToken: dto.deviceToken },
      update: {
        userId,
        platform: (dto.platform as DevicePlatform) || DevicePlatform.WEB,
        deviceName: dto.deviceName,
        isActive: true,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        deviceToken: dto.deviceToken,
        platform: (dto.platform as DevicePlatform) || DevicePlatform.WEB,
        deviceName: dto.deviceName,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Unregisters/deactivates a device token.
   */
  async unregisterDevice(userId: string, deviceToken: string) {
    return this.prisma.deviceRegistration.updateMany({
      where: { userId, deviceToken },
      data: { isActive: false },
    });
  }

  /**
   * Lists all active device tokens for a user.
   */
  async getUserDevices(userId: string) {
    return this.prisma.deviceRegistration.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
    });
  }
}
