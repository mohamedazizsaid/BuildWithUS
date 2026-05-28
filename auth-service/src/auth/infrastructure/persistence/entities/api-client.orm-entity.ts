import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('api_clients')
export class ApiClientOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'client_id', type: 'uuid', unique: true })
  clientId: string;

  @Column({ name: 'client_secret_hash', type: 'varchar', length: 255 })
  clientSecretHash: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  scopes: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'allowed_return_urls', type: 'text', nullable: true })
  allowedReturnUrls: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
