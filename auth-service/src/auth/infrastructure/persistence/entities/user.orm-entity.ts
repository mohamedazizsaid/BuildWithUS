import { Column,CreateDateColumn,Entity,Index,PrimaryColumn,UpdateDateColumn } from "typeorm";

@Entity('users')
export class UserOrmEntity{
    @PrimaryColumn('uuid')
    id: string

    @Column({name: 'tenant_id', type: 'uuid'})
    @Index()
    tenantId: string

    @Column({ type: 'varchar', length: 255, unique: true})
    email: string

    @Column({ type: 'varchar', length: 255 })
    password: string

    @Column({ name: 'first_name', type: 'varchar', length: 100 })
    firstName: string

    @Column({ name: 'last_name', type: 'varchar', length: 100 })
    lastName: string

    @Column({ type: 'varchar', length: 20 ,default: 'editor'})
    role: string

    @CreateDateColumn({ name: 'created_at' , type: 'timestamp' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date
}

