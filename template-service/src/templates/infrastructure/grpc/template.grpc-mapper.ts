import { Template } from '../../domain/entities/template.aggregate.js';
import { TemplateOrmEntity } from '../persistence/entities/template.orm-entity.js';
import type { TemplateDTO, ChannelContent } from 'proto/generated/template_commands';
import { TemplateType } from 'proto/generated/template_commands';
import { TimestampHelper } from '@winaity/shared-kernel';

/**
 * Template gRPC Mapper
 *
 * Maps Template aggregate or ORM entity to proto DTO.
 */
export class TemplateGrpcMapper {
  private static mapType(type: string): TemplateType {
    const map: Record<string, TemplateType> = {
      email: TemplateType.EMAIL,
      facture: TemplateType.FACTURE,
      contrat: TemplateType.CONTRAT,
    };
    return map[type.toLowerCase()] ?? TemplateType.TEMPLATE_TYPE_UNSPECIFIED;
  }

  private static mapChannels(channels?: string[]): TemplateType[] {
    if (!channels || channels.length === 0) {
      return [];
    }
    return channels.map((channel) => this.mapType(channel));
  }

  private static mapChannelContents(
    contents?: Record<string, any> | null,
  ): ChannelContent[] {
    if (!contents) {
      return [];
    }
    return Object.values(contents).map((value) => ({
      channel: value.channel,
      subject: value.subject || '',
      body: value.body || '',
      mediaUrl: value.mediaUrl || '',
      format: value.format || '',
    }));
  }

  /**
   * Convert Template aggregate to proto DTO
   */
  static toDto(template: Template, usageCount: number = 0): TemplateDTO {
    const primitives = template.toPrimitives();

    return {
      id: primitives.id,
      name: primitives.name,
      description: primitives.description || '',
      type: this.mapType(primitives.type),
      subject: primitives.subject || '',
      content: primitives.content,
      variables: primitives.variables || [],
      channels: this.mapChannels(primitives.channels),
      channelContents: this.mapChannelContents(primitives.channelContents),
      variants: primitives.variants || {},
      createdAt: TimestampHelper.toUnixSeconds(primitives.createdAt) ?? 0,
      updatedAt: TimestampHelper.toUnixSeconds(primitives.updatedAt) ?? 0,
      deletedAt: TimestampHelper.toUnixSeconds(primitives.deletedAt) ?? 0,
      version: primitives.version,
      usageCount,
      is_favorite: primitives.isFavorite ?? false,
    } as unknown as TemplateDTO;
  }

  /**
   * Convert ORM entity directly to proto DTO (for queries that need usageCount)
   */
  static fromOrmEntity(entity: TemplateOrmEntity): TemplateDTO {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || '',
      type: this.mapType(entity.type),
      subject: entity.subject || '',
      content: entity.content,
      variables: entity.variables || [],
      channels: this.mapChannels(entity.channels || undefined),
      channelContents: this.mapChannelContents(entity.channelContents),
      variants: entity.variants || {},
      createdAt: TimestampHelper.toUnixSeconds(entity.createdAt) ?? 0,
      updatedAt: TimestampHelper.toUnixSeconds(entity.updatedAt) ?? 0,
      deletedAt: TimestampHelper.toUnixSeconds(entity.deletedAt) ?? 0,
      version: entity.version,
      usageCount: entity.usageCount || 0,
      is_favorite: entity.isFavorite ?? false,
    } as unknown as TemplateDTO;
  }
}
