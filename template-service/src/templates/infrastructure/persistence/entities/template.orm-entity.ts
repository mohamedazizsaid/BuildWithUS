import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Template ORM Entity
 *
 * TypeORM entity for templates table.
 * Uses snake_case column names for DB mapping.
 */
@Entity('templates')
@Index(['type'])
@Index(['deletedAt'])
export class TemplateOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50 })
  type: string; // email, facture, contrat

  @Column({ type: 'jsonb', nullable: true })
  channels: string[] | null;

  @Column({ name: 'channel_contents', type: 'jsonb', nullable: true })
  channelContents: Record<string, any> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column('text', { array: true, default: '{}' })
  variables: string[];

  @Column({ type: 'integer', default: 0 })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  variants: Record<string, string>;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  @Index()
  isFavorite: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
