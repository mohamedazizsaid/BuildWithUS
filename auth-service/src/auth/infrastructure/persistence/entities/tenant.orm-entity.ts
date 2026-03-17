import { Column,CreateDateColumn,Entity,PrimaryColumn,UpdateDateColumn } from "typeorm";

@Entity('tenants')
export class TenantOrmEntity {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true})
    name: string;

    @Column( {type: 'varchar', length: 50, default: 'free'})
    plan: string;

    @CreateDateColumn({ name: 'created_at' , type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
