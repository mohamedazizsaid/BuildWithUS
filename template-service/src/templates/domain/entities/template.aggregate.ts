import {
  AggregateRoot,
  BusinessRuleException,
  CampaignType,
  TemplateId,
  TemplateName,
  TemplateDescription,
  TemplateSubject,
  TemplateContent,
} from '@winaity/shared-kernel';
import {
  TemplateCreatedEvent,
  TemplateUpdatedEvent,
  TemplateDeletedEvent,
} from '../events/index.js';

type Channel = 'email' | 'facture' | 'contrat';
type ChannelContentMap = Partial<Record<Channel, ChannelContent>>;

export interface ChannelContent {
  channel: Channel;
  subject?: string;
  body: string;
  mediaUrl?: string;
  format?: 'html' | 'text' | 'markdown';
}

/**
 * Template Aggregate Root
 *
 * Main business entity for template management.
 * Templates are used to render documents for email, facture (invoice), and contrat (contract).
 */

export class Template extends AggregateRoot {
  private id: TemplateId;
  private tenantId: string;
  private name: TemplateName;
  private description: TemplateDescription | null;
  private type: CampaignType;
  private channels: Channel[];
  private channelContents: ChannelContentMap;
  private subject: TemplateSubject | null;
  private content: TemplateContent;
  private variables: string[];
  private variants: Record<string, string>;
  private createdAt: Date;
  private updatedAt: Date;
  private deletedAt?: Date;
  private _version: number;
  private isFavorite: boolean;
  private isPredefinedOverride: boolean;
  private predefinedTemplateId: string | null;
  private externalOrgRef: string | null;

  /**
   * Private constructor - use factory methods
   */
  private constructor(
    id: TemplateId,
    tenantId: string,
    name: TemplateName,
    description: TemplateDescription | null,
    type: CampaignType,
    channels: Channel[],
    channelContents: ChannelContentMap,
    subject: TemplateSubject | null,
    content: TemplateContent,
    variables: string[],
    variants: Record<string, string> = {},
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date,
    version: number = 0,
    isFavorite: boolean = false,
    isPredefinedOverride: boolean = false,
    predefinedTemplateId: string | null = null,
    externalOrgRef: string | null = null,
  ) {
    super();
    this.id = id;
    this.tenantId = tenantId;
    this.name = name;
    this.description = description;
    this.type = type;
    this.channels = channels;
    this.channelContents = channelContents;
    this.subject = subject;
    this.content = content;
    this.variables = variables;
    this.variants = variants;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.deletedAt = deletedAt;
    this._version = version;
    this.isFavorite = isFavorite;
    this.isPredefinedOverride = isPredefinedOverride;
    this.predefinedTemplateId = predefinedTemplateId;
    this.externalOrgRef = externalOrgRef;
  }

  /**
   * Factory method for creating a new template
   */

  public static create(
    tenantId: string,
    name: TemplateName,
    description: TemplateDescription | null,
    type: CampaignType,
    subject: TemplateSubject | null,
    content: TemplateContent,
    channels?: Channel[],
    channelContents?: ChannelContentMap,
    variants?: Record<string, string>,
    isPredefinedOverride: boolean = false,
    predefinedTemplateId: string | null = null,
    externalOrgRef: string | null = null,
  ): Template {
    // Business rule: subject is required for EMAIL, forbidden for others
    const includesEmail = (channels && channels.includes('email')) || type.isEmail();
    const emailSubject = channelContents?.email?.subject;

    if (includesEmail && !subject && !emailSubject) {
      throw new BusinessRuleException(
        'Template',
        'Subject is required for email templates',
      );
    }
    if (!includesEmail && subject) {
      throw new BusinessRuleException(
        'Template',
        'Subject is only allowed for email templates',
      );
    }

    const id = TemplateId.create();
    const primaryChannel = type.getValue() as Channel;
    const resolvedChannels = channels && channels.length > 0 ? channels : [primaryChannel];
    const resolvedContents: ChannelContentMap = channelContents && Object.keys(channelContents).length > 0
      ? channelContents
      : {
        [primaryChannel]: {
          channel: primaryChannel,
          subject: subject?.getValue() || undefined,
          body: content.getValue(),
          mediaUrl: undefined,
          format: type.isEmail() ? 'html' : 'text',
        },
      };
    const variables = Template.extractVariablesFromContents(resolvedContents);

    const template = new Template(
      id,
      tenantId,
      name,
      description,
      type,
      resolvedChannels,
      resolvedContents,
      subject,
      content,
      variables,
      variants || {},
      undefined,
      undefined,
      undefined,
      0,
      false,
      isPredefinedOverride,
      predefinedTemplateId,
      externalOrgRef,
    );

    // Raise domain event
    const event = TemplateCreatedEvent.create(id.getValue(), {
      name: name.getValue(),
      description: description?.getValue() || null,
      type: type.getValue(),
      subject: subject?.getValue() || null,
      content: content.getValue(),
      variables,
    });

    template.apply(event);

    return template;
  }

  /**
   * Factory method for reconstituting from persistence
   */
  public static reconstitute(
    id: string,
    tenantId: string,
    name: string,
    description: string | null,
    type: string,
    subject: string | null,
    content: string,
    variables: string[],
    channels: string[] | null,
    channelContents: Record<string, ChannelContent> | null,
    variants: Record<string, string> | null,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | undefined,
    version: number,
    isFavorite: boolean = false,
    isPredefinedOverride: boolean = false,
    predefinedTemplateId: string | null = null,
    externalOrgRef: string | null = null,
  ): Template {
    const resolvedChannels = (channels && channels.length > 0
      ? channels
      : [type]) as Channel[];
    const primaryChannel = resolvedChannels[0];
    const resolvedContents: ChannelContentMap = channelContents && Object.keys(channelContents).length > 0
      ? (channelContents as ChannelContentMap)
      : {
        [primaryChannel]: {
          channel: primaryChannel,
          subject: subject || undefined,
          body: content,
          mediaUrl: undefined,
          format: type === 'email' ? 'html' : 'text',
        },
      };

    return new Template(
      TemplateId.fromString(id),
      tenantId,
      TemplateName.fromString(name),
      description ? TemplateDescription.fromString(description) : null,
      CampaignType.fromString(type),
      resolvedChannels,
      resolvedContents,
      subject ? TemplateSubject.fromString(subject) : null,
      TemplateContent.fromString(content),
      variables,
      variants || {},
      createdAt,
      updatedAt,
      deletedAt,
      version,
      isFavorite,
      isPredefinedOverride,
      predefinedTemplateId,
      externalOrgRef,
    );
  }

  /**
   * Update template details
   */
  public update(
    name?: TemplateName,
    description?: TemplateDescription | null,
    subject?: TemplateSubject | null,
    content?: TemplateContent,
    channels?: Channel[],
    channelContents?: ChannelContentMap,
    variants?: Record<string, string>,
  ): void {
    this.ensureNotDeleted();

    // Validate subject rule if changing subject or content
    if (subject !== undefined) {
      const emailChannel = channels && channels.length > 0
        ? channels.includes('email')
        : this.channels.includes('email');
      const fallbackSubject = channelContents?.email?.subject;

      if (emailChannel && subject === null && !fallbackSubject) {
        throw new BusinessRuleException(
          'Template',
          'Subject is required for email templates',
        );
      }
      if (!emailChannel && subject !== null) {
        throw new BusinessRuleException(
          'Template',
          'Subject is only allowed for email templates',
        );
      }
    }

    // Apply changes
    if (name) this.name = name;
    if (description !== undefined) this.description = description;
    if (subject !== undefined) this.subject = subject;
    if (content) {
      this.content = content;
      this.variables = content.extractVariables();
    }
    if (channels) {
      this.channels = channels;
      this.type = CampaignType.fromString(channels[0]);
    }
    if (channelContents) {
      this.channelContents = channelContents;
    } else if (content || subject) {
      const primaryChannel = (channels || this.channels)[0];
      const existing = this.channelContents[primaryChannel] || {
        channel: primaryChannel,
        body: content ? content.getValue() : this.content.getValue(),
        format: this.type.isEmail() ? 'html' : 'text',
      };
      this.channelContents = {
        ...this.channelContents,
        [primaryChannel]: {
          ...existing,
          subject: subject?.getValue() ?? existing.subject,
          body: content ? content.getValue() : existing.body,
        },
      };
    }
    if (content || subject || channelContents) {
      this.variables = Template.extractVariablesFromContents(this.channelContents);
    }
    if (variants) {
      this.variants = variants;
    }

    this.updatedAt = new Date();
    this.incrementVersion();

    this.apply(
      TemplateUpdatedEvent.create(this.id.getValue(), {
        name: this.name.getValue(),
        description: this.description?.getValue() || null,
        type: this.type.getValue(),
        subject: this.subject?.getValue() || null,
        content: this.content.getValue(),
        variables: this.variables,
      }),
    );
  }

  /**
   * Toggle favorite status
   */
  public setFavorite(isFavorite: boolean): void {
    this.ensureNotDeleted();
    if (this.isFavorite === isFavorite) return;
    this.isFavorite = isFavorite;
    this.updatedAt = new Date();
    this.incrementVersion();
  }

  /**
   * Soft delete the template
   */
  public delete(): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('Template', 'Template is already deleted');
    }

    this.deletedAt = new Date();
    this.updatedAt = new Date();
    this.incrementVersion();

    this.apply(TemplateDeletedEvent.create(this.id.getValue()));
  }

  /**
   * Business rule: ensure template is not deleted
   */
  private ensureNotDeleted(): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('Template', 'Cannot modify a deleted template');
    }
  }

  private static extractVariablesFromContents(
    contents: ChannelContentMap,
  ): string[] {
    const variables = new Set<string>();
    for (const content of Object.values(contents)) {
      this.extractVariablesFromText(content.body).forEach((variable) => variables.add(variable));
      if (content.subject) {
        this.extractVariablesFromText(content.subject).forEach((variable) => variables.add(variable));
      }
    }
    return [...variables];
  }

  private static extractVariablesFromText(text: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = text.matchAll(regex);
    return [...matches].map((match) => match[1].trim());
  }

  /**
   * Check if template is deleted
   */
  public isDeleted(): boolean {
    return this.deletedAt !== undefined;
  }

  /**
   * Increment version for optimistic locking
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Convert to primitives for persistence
   */
  public toPrimitives(): Record<string, any> {
    return {
      id: this.id.getValue(),
      tenantId: this.tenantId,
      name: this.name.getValue(),
      description: this.description?.getValue() || null,
      type: this.type.getValue(),
      channels: this.channels,
      channelContents: this.channelContents,
      subject: this.subject?.getValue() || null,
      content: this.content.getValue(),
      variables: this.variables,
      variants: this.variants,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this._version,
      isFavorite: this.isFavorite,
      isPredefinedOverride: this.isPredefinedOverride,
      predefinedTemplateId: this.predefinedTemplateId,
      externalOrgRef: this.externalOrgRef,
    };
  }

  /**
   * Getters
   */
  public getId(): TemplateId {
    return this.id;
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  public getName(): TemplateName {
    return this.name;
  }

  public getDescription(): TemplateDescription | null {
    return this.description;
  }

  public getType(): CampaignType {
    return this.type;
  }

  public getChannels(): Channel[] {
    return [...this.channels];
  }

  public getChannelContents(): ChannelContentMap {
    return { ...this.channelContents };
  }

  public getVariants(): Record<string, string> {
    return { ...this.variants };
  }

  public getSubject(): TemplateSubject | null {
    return this.subject;
  }

  public getContent(): TemplateContent {
    return this.content;
  }

  public getVariables(): string[] {
    return [...this.variables];
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public getDeletedAt(): Date | undefined {
    return this.deletedAt;
  }

  public getVersion(): number {
    return this._version;
  }

  public getIsFavorite(): boolean {
    return this.isFavorite;
  }

  public getIsPredefinedOverride(): boolean {
    return this.isPredefinedOverride;
  }

  public getPredefinedTemplateId(): string | null {
    return this.predefinedTemplateId;
  }

  public getExternalOrgRef(): string | null {
    return this.externalOrgRef;
  }
}
