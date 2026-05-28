import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('builder_sessions')
export class BuilderSessionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  @Index()
  token: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 16 })
  mode: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ name: 'return_url', type: 'text' })
  returnUrl: string;

  @Column({ name: 'user_ref', type: 'varchar', length: 255, nullable: true })
  userRef: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
