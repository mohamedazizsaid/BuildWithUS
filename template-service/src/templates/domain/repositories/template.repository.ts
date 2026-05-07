import { Template } from '../entities/template.aggregate.js';

/**
 * Filter options for finding templates
 */
export interface TemplateFilterOptions {
  tenantId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  ascending?: boolean;
  favoritesOnly?: boolean;
  excludePredefinedOverrides?: boolean;
  predefinedOverridesOnly?: boolean;
}

/**
 * Template Repository Interface
 *
 * Abstract interface defining the contract for template persistence.
 * Implementation lives in infrastructure layer.
 */
export abstract class TemplateRepository {
  /**
   * Find a template by ID
   */
  abstract findById(id: string, tenantId?: string): Promise<Template | null>;

  /**
   * Find all templates with optional filters
   */
  abstract findAll(
    options?: TemplateFilterOptions,
  ): Promise<{ templates: Template[]; total: number }>;

  /**
   * Find templates by type (email, facture, contrat)
   */
  abstract findByType(type: string): Promise<Template[]>;

  /**
   * Save a template (create or update)
   */
  abstract save(template: Template): Promise<void>;

  /**
   * Delete a template (soft delete)
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Check if a template exists
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Count templates with optional filters
   */
  abstract count(options?: { type?: string }): Promise<number>;
}
