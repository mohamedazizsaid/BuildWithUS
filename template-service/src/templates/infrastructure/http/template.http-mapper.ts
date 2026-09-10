import { Template } from '../../domain/entities/template.aggregate.js';
import { TemplateOrmEntity } from '../persistence/entities/template.orm-entity.js';
import { TimestampHelper } from '@winaity/shared-kernel';

export interface TemplateHttpDto {
  id: string;
  name: string;
  description: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  channels: string[];
  channelContents: Array<{
    channel: string;
    subject: string;
    body: string;
    mediaUrl: string;
    format: string;
  }>;
  variants: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  created_at?: string;
  updated_at?: string;
  deletedAt: number;
  version: number;
  usageCount: number;
  usage_count?: number;
  is_favorite: boolean;
  isFavorite?: boolean;
  is_predefined_override: boolean;
  predefined_template_id: string;
  external_org_ref: string;
}

export class TemplateHttpMapper {
  private static mapChannels(channels?: string[]): string[] {
    if (!channels || channels.length === 0) return [];
    return channels.map((c) => c.toLowerCase());
  }

  private static mapChannelContents(contents?: Record<string, any> | null) {
    if (!contents) return [];
    return Object.values(contents).map((v) => ({
      channel: v.channel || '',
      subject: v.subject || '',
      body: v.body || '',
      mediaUrl: v.mediaUrl || '',
      format: v.format || '',
    }));
  }

  static toDto(template: Template, usageCount: number = 0): TemplateHttpDto {
    const primitives = template.toPrimitives();

    return {
      id: primitives.id,
      name: primitives.name,
      description: primitives.description || '',
      type: (primitives.type || 'email').toLowerCase(),
      subject: primitives.subject || '',
      content: primitives.content,
      variables: primitives.variables || [],
      channels: this.mapChannels(primitives.channels),
      channelContents: this.mapChannelContents(primitives.channelContents),
      variants: primitives.variants || {},
      createdAt: TimestampHelper.toUnixSeconds(primitives.createdAt) ?? 0,
      updatedAt: TimestampHelper.toUnixSeconds(primitives.updatedAt) ?? 0,
      created_at: primitives.createdAt ? new Date(primitives.createdAt).toISOString() : '',
      updated_at: primitives.updatedAt ? new Date(primitives.updatedAt).toISOString() : '',
      deletedAt: TimestampHelper.toUnixSeconds(primitives.deletedAt) ?? 0,
      version: primitives.version,
      usageCount,
      usage_count: usageCount,
      is_favorite: primitives.isFavorite ?? false,
      isFavorite: primitives.isFavorite ?? false,
      is_predefined_override: primitives.isPredefinedOverride ?? false,
      predefined_template_id: primitives.predefinedTemplateId ?? '',
      external_org_ref: primitives.externalOrgRef ?? '',
    };
  }

  static fromOrmEntity(entity: TemplateOrmEntity): TemplateHttpDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || '',
      type: (entity.type || 'email').toLowerCase(),
      subject: entity.subject || '',
      content: entity.content,
      variables: entity.variables || [],
      channels: this.mapChannels(entity.channels || undefined),
      channelContents: this.mapChannelContents(entity.channelContents),
      variants: entity.variants || {},
      createdAt: TimestampHelper.toUnixSeconds(entity.createdAt) ?? 0,
      updatedAt: TimestampHelper.toUnixSeconds(entity.updatedAt) ?? 0,
      created_at: entity.createdAt ? new Date(entity.createdAt).toISOString() : '',
      updated_at: entity.updatedAt ? new Date(entity.updatedAt).toISOString() : '',
      deletedAt: TimestampHelper.toUnixSeconds(entity.deletedAt) ?? 0,
      version: entity.version,
      usageCount: entity.usageCount || 0,
      usage_count: entity.usageCount || 0,
      is_favorite: entity.isFavorite ?? false,
      isFavorite: entity.isFavorite ?? false,
      is_predefined_override: entity.isPredefinedOverride ?? false,
      predefined_template_id: entity.predefinedTemplateId ?? '',
      external_org_ref: entity.externalOrgRef ?? '',
    };
  }
}
