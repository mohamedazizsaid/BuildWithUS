import { Column,CreateDateColumn,Entity,PrimaryColumn,UpdateDateColumn } from "typeorm";

@Entity('tenants')
export class TenantOrmEntity {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true})
    name: string;

    @Column( {type: 'varchar', length: 50, default: 'free'})
    plan: string;

    // ── Company contact / billing details ────────────────────────────────────
    // Collected at signup (required for new tenants) and forwarded to the CRM.
    // Nullable so existing tenants created before this feature stay valid.
    @Column({ type: 'varchar', length: 40, nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'address_line' })
    addressLine: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true, name: 'postal_code' })
    postalCode: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    city: string | null;

    @Column({ type: 'varchar', length: 80, nullable: true })
    country: string | null;

    // ── Stripe subscription state ────────────────────────────────────────────
    // Nullable — only set once a tenant subscribes to a paid plan. billingCycle
    // is 'monthly' | 'annual' (annual = one yearly lump charge, 12-month commitment).
    @Column({ type: 'varchar', length: 20, nullable: true, name: 'billing_cycle' })
    billingCycle: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'subscription_status' })
    subscriptionStatus: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'stripe_customer_id' })
    stripeCustomerId: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'stripe_subscription_id' })
    stripeSubscriptionId: string | null;

    // ── Plan-usage counters (monotonic) ─────────────────────────────────────
    // Lifetime totals, never decremented. Enforce the free plan's caps (1 email
    // template, 1 AI interaction) in a way that survives delete-and-recreate.
    @Column({ type: 'int', default: 0, name: 'email_templates_created' })
    emailTemplatesCreated: number;

    @Column({ type: 'int', default: 0, name: 'ai_interactions_used' })
    aiInteractionsUsed: number;

    @CreateDateColumn({ name: 'created_at' , type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
