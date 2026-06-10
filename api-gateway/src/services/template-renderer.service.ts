import { Injectable, Logger } from '@nestjs/common';

// mjml 5.x is async and ships as CommonJS (module.exports = fn, with no
// `.default`), so import-equals is the reliable interop under our commonjs config.
import mjml2html = require('mjml');

export interface Block {
  id?: string;
  type: string;
  content: string;
}

@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);

  // ─── Fill {{variable}} placeholders in any text (public) ───────────────────
  fillVariables(text: string, variables: Record<string, string> = {}): string {
    return this.injectVars(text, variables);
  }

  // ─── Compile an email template to ready-to-use HTML ────────────────────────
  // Email templates are stored as a full <mjml> document. We optionally fill
  // {{placeholders}}, then compile to email-client-safe HTML via the official
  // MJML engine. If the content is already plain HTML (no <mjml> root), we just
  // return it after variable substitution.
  async renderEmailHtml(content: string, variables: Record<string, string> = {}): Promise<string> {
    const filled = this.normalizeMjmlForCompile(this.injectVars(content ?? '', variables));
    if (!/<mjml[\s>]/i.test(filled)) {
      return filled;
    }
    try {
      const { html, errors } = await mjml2html(filled, { validationLevel: 'soft' });
      if (errors?.length) {
        this.logger.warn(`MJML compiled with ${errors.length} soft warning(s)`);
      }
      return html;
    } catch (err) {
      this.logger.error(`MJML compilation failed: ${String(err)}`);
      // Fall back to the raw (variable-filled) MJML rather than throwing —
      // the caller still gets usable content.
      return filled;
    }
  }

  // The builder emits <mj-image width="100%">, but MJML treats mj-image width as
  // PIXELS — it strips the "%" and renders a literal 100px-wide image. Drop
  // percentage widths on mj-image so MJML computes the correct column-based pixel
  // width instead (the builder's own preview tolerates "100%" as CSS, which is
  // why it looked right there but not in the compiled HTML).
  private normalizeMjmlForCompile(mjml: string): string {
    return mjml.replace(/(<mj-image\b[^>]*?)\swidth="\d+(?:\.\d+)?%"/gi, '$1');
  }

  // ─── Extract all {{variable}} names from a template ────────────────────────
  extractVariables(content: string): string[] {
    const set = new Set<string>();
    try {
      const parsed = JSON.parse(content);
      const text = parsed.blocks
        ? parsed.blocks.map((b: Block) => b.content).join('\n')
        : content;
      const matches = text.matchAll(/\{\{(\w+)\}\}/g);
      for (const m of matches) set.add(m[1]);
    } catch {
      const matches = content.matchAll(/\{\{(\w+)\}\}/g);
      for (const m of matches) set.add(m[1]);
    }
    return [...set].sort();
  }

  // ─── Inject real variable values into a text string ────────────────────────
  private injectVars(text: string, variables: Record<string, string>): string {
    return text.replaceAll(/\{\{(\w+)\}\}/g, (_m, key) => variables[key] ?? `{{${key}}}`);
  }

  // ─── Render a single block to HTML ────────────────────────────────────────
  private renderBlock(block: Block, variables: Record<string, string>): string {
    const v = (t: string) => this.escapeHtml(this.injectVars(t, variables));
    const lines = (t: string) => v(t).split('\n').map(l => l || '<br/>').join('<br/>');

    switch (block.type) {
      case 'contract_header': {
        const f = this.parseKV(block.content);
        const logo = f['logo'] || '';
        const logoHtml = logo
          ? `<img src="${logo}" alt="Logo" style="max-height:60px;max-width:180px;object-fit:contain;"/>`
          : '';
        return `<div style="margin:0 0 24px;border-bottom:3px solid #0f172a;padding-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="display:flex;align-items:center;gap:14px;">
              ${logoHtml}
              <div>
                <div style="font-size:14pt;font-weight:900;color:#0f172a;">${v(f['entreprise'] || '')}</div>
                <div style="font-size:9pt;color:#475569;">${v(f['adresse'] || '')}</div>
                <div style="font-size:8.5pt;color:#94a3b8;">SIRET ${v(f['siret'] || '')} | TVA ${v(f['tva'] || '')}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:8.5pt;font-weight:700;background:#f1f5f9;padding:4px 10px;border-radius:4px;">N° ${v(f['numero'] || '')}</div>
              <div style="font-size:8pt;color:#94a3b8;">${v(f['version'] || '')}</div>
            </div>
          </div>
          <div style="text-align:center;margin-top:14px;font-size:14pt;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">
            ${v(f['titre'] || '')}
          </div>
        </div>`;
      }

      case 'definitions': {
        const rows = block.content.split('\n').filter(l => l.includes(':')).map(l => {
          const idx = l.indexOf(':');
          return { term: l.substring(0, idx).trim(), def: this.injectVars(l.substring(idx + 1).trim(), variables) };
        });
        return `<div style="margin:14px 0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
          <div style="background:#0f172a;color:white;padding:8px 14px;font-size:9pt;font-weight:700;text-transform:uppercase;">Définitions</div>
          <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
            ${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};">
              <td style="padding:8px 14px;font-weight:700;color:#0f172a;width:28%;border-right:2px solid #e2e8f0;border-bottom:1px solid #f1f5f9;vertical-align:top;">« ${this.escapeHtml(r.term)} »</td>
              <td style="padding:8px 14px;color:#475569;border-bottom:1px solid #f1f5f9;line-height:1.6;">${this.escapeHtml(r.def)}</td>
            </tr>`).join('')}
          </table>
        </div>`;
      }

      case 'heading':
        return `<div style="font-size:14pt;font-weight:800;text-align:center;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 18px;">${lines(block.content)}</div>`;

      case 'article':
        return `<div style="font-size:11pt;font-weight:700;margin:16px 0 6px;color:#0f172a;">${lines(block.content)}</div>`;

      case 'legal_article': {
        const ls = block.content.split('\n');
        const title = v(ls[0] || '');
        const rest = ls.slice(1).map(l => l ? v(l) : '<br/>').join('<br/>');
        return `<div style="margin:14px 0 10px;">
          <div style="font-size:11pt;font-weight:700;color:#0f172a;margin-bottom:6px;">${title}</div>
          <div style="font-size:10pt;line-height:1.75;color:#1e293b;text-align:justify;">${rest}</div>
        </div>`;
      }

      case 'clause':
        return `<div style="font-size:10pt;line-height:1.75;margin:0 0 10px;text-align:justify;">${lines(block.content)}</div>`;

      case 'parties':
        return `<div style="font-size:10pt;line-height:1.75;margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #0f172a;">${lines(block.content)}</div>`;

      case 'pricing_ttc': {
        const f = this.parseKV(block.content);
        return `<div style="margin:14px 0;border:1px solid #d1fae5;border-radius:6px;overflow:hidden;">
          <div style="background:#059669;color:white;padding:7px 14px;font-size:9pt;font-weight:700;">RÉCAPITULATIF FINANCIER</div>
          <div style="padding:12px 14px;background:#f0fdf4;">
            ${f['description'] ? `<div style="font-size:9.5pt;color:#065f46;margin-bottom:10px;font-weight:500;">Prestation : ${v(f['description'])}</div>` : ''}
            <table style="width:100%;border-collapse:collapse;font-size:10pt;">
              <tr style="border-bottom:1px solid #d1fae5;">
                <td style="padding:5px 0;color:#475569;">Montant HT</td>
                <td style="padding:5px 0;text-align:right;font-weight:500;">${v(f['montant_ht'] || '')} €</td>
              </tr>
              <tr style="border-bottom:1px solid #d1fae5;">
                <td style="padding:5px 0;color:#475569;">TVA (${f['tva_rate'] || '20'}%)</td>
                <td style="padding:5px 0;text-align:right;font-weight:500;">${v(f['montant_tva'] || '')} €</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:11pt;font-weight:800;">Total TTC</td>
                <td style="padding:8px 0;text-align:right;font-size:11pt;font-weight:800;color:#059669;">${v(f['montant_ttc'] || '')} €</td>
              </tr>
            </table>
          </div>
        </div>`;
      }

      case 'form_fields': {
        const ls = block.content.split('\n');
        const title = ls[0] || '';
        const fields = ls.slice(1).filter(Boolean);
        return `<div style="margin:12px 0;padding:14px;border:1px solid #cbd5e1;border-radius:6px;">
          ${title ? `<div style="font-size:9pt;font-weight:700;color:#0f172a;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${this.escapeHtml(this.injectVars(title, variables))}</div>` : ''}
          ${fields.map(f => `<div style="font-size:10pt;line-height:2.2;border-bottom:1px solid #e2e8f0;margin-bottom:4px;">${this.escapeHtml(this.injectVars(f, variables)).replaceAll('___', '<span style="display:inline-block;min-width:120px;border-bottom:1px solid #94a3b8;"> </span>')}</div>`).join('')}
        </div>`;
      }

      case 'checkbox_group': {
        const ls = block.content.split('\n');
        const title = ls[0] || '';
        const items = ls.slice(1).filter(Boolean);
        return `<div style="margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:6px;">
          ${title ? `<div style="font-size:9pt;font-weight:700;color:#0f172a;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${this.escapeHtml(this.injectVars(title, variables))}</div>` : ''}
          ${items.map(item => `<div style="font-size:10pt;line-height:1.9;">${this.escapeHtml(this.injectVars(item, variables)).replaceAll('☐', '<span style="display:inline-block;width:12px;height:12px;border:1px solid #475569;vertical-align:middle;margin-right:4px;"></span>')}</div>`).join('')}
        </div>`;
      }

      case 'pricing_table': {
        const ls = block.content.split('\n').filter(Boolean);
        if (ls.length < 2) return '';
        const headers = ls[0].split('|');
        const rows = ls.slice(1).map(l => l.split('|'));
        return `<div style="margin:12px 0;overflow:hidden;border-radius:6px;border:1px solid #e2e8f0;">
          <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
            <thead><tr style="background:#0f172a;color:white;">
              ${headers.map(h => `<th style="padding:7px 10px;text-align:left;font-weight:600;">${this.escapeHtml(h.trim())}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${rows.map((row, i) => `<tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};">
                ${row.map(cell => `<td style="padding:7px 10px;border-top:1px solid #e2e8f0;">${this.escapeHtml(this.injectVars(cell.trim(), variables))}</td>`).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      }

      case 'signature_block':
        return `<div style="margin-top:28px;">
          <div style="font-size:10pt;color:#475569;margin-bottom:20px;">${lines(block.content)}</div>
          <div style="display:flex;justify-content:space-between;gap:20px;margin-top:16px;">
            ${['Prestataire', 'Client', 'Conseiller'].map(s => `
              <div style="flex:1;text-align:center;">
                <div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
                <div style="font-size:8.5pt;color:#475569;">Signature du ${s}</div>
              </div>`).join('')}
          </div>
        </div>`;

      case 'sepa_mandate': {
        const f = this.parseKV(block.content);
        return `<div style="margin:14px 0;border:2px solid #0f172a;border-radius:4px;overflow:hidden;">
          <div style="background:#0f172a;color:white;text-align:center;padding:8px;font-size:11pt;font-weight:700;">MANDAT DE PRÉLÈVEMENT SEPA</div>
          <div style="padding:12px;font-size:9.5pt;">
            <div><strong>Créancier :</strong> ${v(f['Nom créancier'] || '')}</div>
            <div><strong>ICS :</strong> ${v(f['ICS (Identifiant Créancier SEPA)'] || '')}</div>
            <div><strong>Adresse :</strong> ${v(f['Adresse créancier'] || '')}</div>
            <div style="display:flex;gap:16px;margin-top:10px;">
              <div style="flex:1;border:1px solid #cbd5e1;padding:8px;border-radius:4px;"><strong style="font-size:8.5pt;">IBAN</strong><div style="color:#94a3b8;letter-spacing:2px;margin-top:4px;">__ __ __ __ __ __ __</div></div>
              <div style="flex:1;border:1px solid #cbd5e1;padding:8px;border-radius:4px;"><strong style="font-size:8.5pt;">BIC</strong><div style="color:#94a3b8;letter-spacing:2px;margin-top:4px;">__ __ __ __ __</div></div>
            </div>
          </div>
        </div>`;
      }

      case 'retraction_form':
        return `<div style="margin:14px 0;border:1px solid #e2e8f0;border-radius:4px;padding:14px;background:#fafafa;">
          <div style="font-size:9pt;font-weight:700;text-align:center;margin-bottom:8px;">FORMULAIRE DE RÉTRACTATION</div>
          <div style="font-size:9pt;line-height:1.7;color:#475569;margin-bottom:10px;">${lines(block.content)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:9pt;">
            <div>Nom : <span style="display:inline-block;min-width:100px;border-bottom:1px solid #475569;"> </span></div>
            <div>Prénom : <span style="display:inline-block;min-width:100px;border-bottom:1px solid #475569;"> </span></div>
            <div>Code contrat : <span style="display:inline-block;min-width:80px;border-bottom:1px solid #475569;"> </span></div>
            <div style="text-align:right;border-top:1px solid #1e293b;padding-top:4px;margin-top:12px;">Signature du client</div>
          </div>
        </div>`;

      case 'info_box':
        return `<div style="margin:12px 0;padding:12px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;font-size:9.5pt;line-height:1.65;">${lines(block.content)}</div>`;

      case 'divider':
        return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0;"/>`;

      default:
        return block.content ? `<div style="font-size:10pt;line-height:1.6;margin-bottom:8px;">${lines(block.content)}</div>` : '';
    }
  }

  // ─── Render all blocks to full A4 HTML document ───────────────────────────
  renderContractToHtml(content: string, variables: Record<string, string>): string {
    const parsed = JSON.parse(content);
    
    const blocks: Block[] = parsed.blocks || [];

    const body = blocks
      .map(block => `<div style="page-break-inside:avoid;">${this.renderBlock(block, variables)}</div>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 0; padding: 0; line-height: 1.6; }
    table { border-collapse: collapse; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  </style>
</head>
<body>${body}</body>
</html>`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private parseKV(content: string): Record<string, string> {
    const f: Record<string, string> = {};
    content.split('\n').forEach(l => {
      const idx = l.indexOf(':');
      if (idx > 0) f[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
    });
    return f;
  }

  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
