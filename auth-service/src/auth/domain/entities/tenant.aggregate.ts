import {v4 as uuid} from 'uuid';

export interface SubscriptionState {
   plan: string;
   billingCycle?: string | null;
   subscriptionStatus?: string | null;
   stripeCustomerId?: string | null;
   stripeSubscriptionId?: string | null;
}

export class Tenant {
   private constructor(
    private id: string,
    private name: string,
    private plan: string,
    private createdAt: Date,
    private updatedAt: Date,
    private billingCycle: string | null = null,
    private subscriptionStatus: string | null = null,
    private stripeCustomerId: string | null = null,
    private stripeSubscriptionId: string | null = null,
    // ── Plan-usage counters ──────────────────────────────────────────────
    // MONOTONIC — they only ever go up, and are NEVER decremented on delete.
    // This is what enforces the free plan's lifetime caps: creating then
    // deleting a template still leaves emailTemplatesCreated at 1, so a free
    // tenant can't delete-and-recreate to dodge the limit.
    private emailTemplatesCreated: number = 0,
    private aiInteractionsUsed: number = 0,
   ) {}

   public static create(name: string, plan: string = 'free'): Tenant {
      if (!name || name.trim().length === 0){
         throw new Error('Name is required');
      }
      if (name.length > 255){
         throw new Error('Tenant name must be 255 characters or less');
      }
      return new Tenant(uuid(), name.trim(), plan, new Date(),new Date());
   }

   public static reconstitute(
    id: string,
    name: string,
    plan: string,
    createdAt: Date,
    updatedAt: Date,
    billingCycle: string | null = null,
    subscriptionStatus: string | null = null,
    stripeCustomerId: string | null = null,
    stripeSubscriptionId: string | null = null,
    emailTemplatesCreated: number = 0,
    aiInteractionsUsed: number = 0,
   ): Tenant {
      return new Tenant(
         id, name, plan, createdAt, updatedAt,
         billingCycle, subscriptionStatus, stripeCustomerId, stripeSubscriptionId,
         emailTemplatesCreated, aiInteractionsUsed,
      );
   }

   public updatedName(name: string): void {
      if (!name || name.trim().length === 0){
         throw new Error('Tenant name is required');
      }
      this.name = name.trim();
      this.updatedAt = new Date();
   }

   public updatePlan(plan: string): void {
      this.plan = plan;
      this.updatedAt = new Date();
   }

   // Bump the lifetime counters. Called once per successful email-template
   // creation / AI interaction. Never decremented — see the field comment.
   public incrementEmailTemplatesCreated(): void {
      this.emailTemplatesCreated += 1;
      this.updatedAt = new Date();
   }

   public incrementAiInteractionsUsed(): void {
      this.aiInteractionsUsed += 1;
      this.updatedAt = new Date();
   }

   // Apply the full subscription state after a Stripe event (checkout completed,
   // subscription updated/canceled). Only overwrites fields that are provided.
   public updateSubscription(state: SubscriptionState): void {
      this.plan = state.plan;
      if (state.billingCycle !== undefined) this.billingCycle = state.billingCycle;
      if (state.subscriptionStatus !== undefined) this.subscriptionStatus = state.subscriptionStatus;
      if (state.stripeCustomerId !== undefined) this.stripeCustomerId = state.stripeCustomerId;
      if (state.stripeSubscriptionId !== undefined) this.stripeSubscriptionId = state.stripeSubscriptionId;
      this.updatedAt = new Date();
   }

   public toPrimitives() {
    return {
        id: this.id,
        name: this.name,
        plan: this.plan,
        billingCycle: this.billingCycle,
        subscriptionStatus: this.subscriptionStatus,
        stripeCustomerId: this.stripeCustomerId,
        stripeSubscriptionId: this.stripeSubscriptionId,
        emailTemplatesCreated: this.emailTemplatesCreated,
        aiInteractionsUsed: this.aiInteractionsUsed,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
   }

   public getId(): string { return this.id;}
   public getName(): string { return this.name;}
   public getPlan(): string { return this.plan;}
   public getBillingCycle(): string | null { return this.billingCycle; }
   public getSubscriptionStatus(): string | null { return this.subscriptionStatus; }
   public getStripeCustomerId(): string | null { return this.stripeCustomerId; }
   public getStripeSubscriptionId(): string | null { return this.stripeSubscriptionId; }
   public getEmailTemplatesCreated(): number { return this.emailTemplatesCreated; }
   public getAiInteractionsUsed(): number { return this.aiInteractionsUsed; }

}
