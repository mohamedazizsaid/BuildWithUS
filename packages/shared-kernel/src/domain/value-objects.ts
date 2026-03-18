import { v4 as uuid } from 'uuid';
import { BusinessRuleException } from './exceptions';

export class TemplateId {
  private constructor(private readonly value: string) {}

  static create(): TemplateId {
    return new TemplateId(uuid());
  }

  static fromString(value: string): TemplateId {
    if (!value || value.trim().length === 0) {
      throw new BusinessRuleException('TemplateId', 'Template ID cannot be empty');
    }
    return new TemplateId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TemplateId): boolean {
    return this.value === other.value;
  }
}

export class TemplateName {
  private constructor(private readonly value: string) {}

  static create(value: string): TemplateName {
    if (!value || value.trim().length === 0) {
      throw new BusinessRuleException('TemplateName', 'Template name is required');
    }
    if (value.length > 255) {
      throw new BusinessRuleException('TemplateName', 'Template name must be 255 characters or less');
    }
    return new TemplateName(value.trim());
  }

  static fromString(value: string): TemplateName {
    return new TemplateName(value);
  }

  getValue(): string {
    return this.value;
  }
}

export class TemplateDescription {
  private constructor(private readonly value: string) {}

  static create(value: string): TemplateDescription {
    return new TemplateDescription(value?.trim() ?? '');
  }

  static fromString(value: string): TemplateDescription {
    return new TemplateDescription(value ?? '');
  }

  getValue(): string {
    return this.value;
  }
}

export class TemplateSubject {
  private constructor(private readonly value: string) {}

  static create(value: string): TemplateSubject {
    return new TemplateSubject(value?.trim() ?? '');
  }

  static fromString(value: string): TemplateSubject {
    return new TemplateSubject(value ?? '');
  }

  getValue(): string {
    return this.value;
  }
}

export class TemplateContent {
  private constructor(private readonly value: string) {}

  static create(value: string): TemplateContent {
    if (!value || value.trim().length === 0) {
      throw new BusinessRuleException('TemplateContent', 'Template content is required');
    }
    return new TemplateContent(value);
  }

  static fromString(value: string): TemplateContent {
    return new TemplateContent(value ?? '');
  }

  getValue(): string {
    return this.value;
  }

  extractVariables(): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(this.value)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }
}

export class CampaignType {
  private static readonly VALID_TYPES = ['email', 'facture', 'contrat'];

  private constructor(private readonly value: string) {}

  static create(value: string): CampaignType {
    const normalized = value?.toLowerCase();
    if (!normalized || !CampaignType.VALID_TYPES.includes(normalized)) {
      throw new BusinessRuleException(
        'CampaignType',
        `Invalid campaign type: '${value}'. Must be one of: ${CampaignType.VALID_TYPES.join(', ')}`,
      );
    }
    return new CampaignType(normalized);
  }

  static fromString(value: string): CampaignType {
    return new CampaignType(value?.toLowerCase() ?? 'email');
  }

  getValue(): string {
    return this.value;
  }

  isEmail(): boolean {
    return this.value === 'email';
  }

  equals(other: CampaignType): boolean {
    return this.value === other.value;
  }
}
