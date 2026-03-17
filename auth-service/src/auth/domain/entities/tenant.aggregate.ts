import {v4 as uuid} from 'uuid';

export class Tenant {
   private constructor(
    private id: string,
    private name: string,
    private plan: string,
    private createdAt: Date,
    private updatedAt: Date,
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
   ): Tenant {
      return new Tenant(id, name, plan, createdAt, updatedAt);
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

   public toPrimitives() {
    return {
        id: this.id,
        name: this.name,
        plan: this.plan,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
   }

   public getId(): string { return this.id;}
   public getName(): string { return this.name;}
   public getPlan(): string { return this.plan;}
   
}