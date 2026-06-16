import { Injectable } from '@nestjs/common';
import { Template } from '../../domain/entities/template.aggregate.js';

type Channel = 'email' | 'facture' | 'contrat' | 'sms';

interface RenderResult {
  subject: string;
  htmlBody?: string;
  textBody: string;
  mediaUrl?: string;
  variablesUsed: string[];
}

@Injectable()
export class TemplateRendererService {
  render(
    template: Template,
    channel: Channel,
    variables: Record<string, string>,
    variantId?: string,
  ): RenderResult {
    const channelContents = template.getChannelContents();
    const channelContent = channelContents[channel];
    const subject = channelContent?.subject || template.getSubject()?.getValue() || '';
    const baseBody = this.resolveVariantBody(
      channelContent?.body || template.getContent().getValue(),
      template.getVariants(),
      variantId,
    );
    const format = channelContent?.format || (channel === 'email' ? 'html' : 'text');

    const variablesUsed: string[] = [];
    const resolvedSubject = this.replaceVariables(subject, variables, variablesUsed);
    const resolvedBody = this.replaceVariables(baseBody, variables, variablesUsed);

    if (channel === 'email') {
      return this.renderEmail(resolvedSubject, resolvedBody, format, variablesUsed);
    }

    if (channel === 'facture') {
      return this.renderFacture(resolvedBody, format, variablesUsed);
    }

    if (channel === 'sms') {
      return this.renderSms(resolvedBody, variablesUsed);
    }

    return this.renderContrat(resolvedBody, format, variablesUsed);
  }

  // SMS is text-only: no subject, no HTML. The body is returned verbatim with
  // its {{variables}} already substituted upstream.
  private renderSms(body: string, variablesUsed: string[]): RenderResult {
    return {
      subject: '',
      textBody: body,
      variablesUsed: [...new Set(variablesUsed)],
    };
  }

  private renderEmail(
    subject: string,
    body: string,
    format: string,
    variablesUsed: string[],
  ): RenderResult {
    let htmlBody = body;
    if (format === 'markdown') {
      htmlBody = this.markdownToHtml(body);
    } else if (format === 'text') {
      htmlBody = this.escapeHtml(body).replace(/\n/g, '<br />');
    }

    const textBody = format === 'text' ? body : this.stripHtml(htmlBody);

    return {
      subject,
      htmlBody,
      textBody,
      variablesUsed: [...new Set(variablesUsed)],
    };
  }

  private renderFacture(
    body: string,
    format: string,
    variablesUsed: string[],
  ): RenderResult {
    let htmlBody = body;
    if (format === 'markdown') {
      htmlBody = this.markdownToHtml(body);
    } else if (format === 'text') {
      htmlBody = this.escapeHtml(body).replace(/\n/g, '<br />');
    }

    const textBody = format === 'text' ? body : this.stripHtml(htmlBody);

    return {
      subject: '',
      htmlBody,
      textBody,
      variablesUsed: [...new Set(variablesUsed)],
    };
  }

  private renderContrat(
    body: string,
    format: string,
    variablesUsed: string[],
  ): RenderResult {
    let htmlBody = body;
    if (format === 'markdown') {
      htmlBody = this.markdownToHtml(body);
    } else if (format === 'text') {
      htmlBody = this.escapeHtml(body).replace(/\n/g, '<br />');
    }

    const textBody = format === 'text' ? body : this.stripHtml(htmlBody);

    return {
      subject: '',
      htmlBody,
      textBody,
      variablesUsed: [...new Set(variablesUsed)],
    };
  }

  private resolveVariantBody(
    defaultBody: string,
    variants: Record<string, string>,
    variantId?: string,
  ): string {
    if (variantId && variants[variantId]) {
      return variants[variantId];
    }
    return defaultBody;
  }

  private replaceVariables(
    text: string,
    variables: Record<string, string>,
    variablesUsed: string[],
  ): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      if (variables[trimmedKey] !== undefined) {
        variablesUsed.push(trimmedKey);
        return variables[trimmedKey];
      }
      return match;
    });
  }

  private markdownToHtml(text: string): string {
    const escaped = this.escapeHtml(text);
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}
