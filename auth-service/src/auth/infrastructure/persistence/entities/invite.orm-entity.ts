import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('invites')
@Index(['tenantId'])
@Index(['email'])
export class InviteOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', default: 'editor' })
  role: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
