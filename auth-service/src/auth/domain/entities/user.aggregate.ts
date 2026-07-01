import { v4 as uuid } from 'uuid';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'marketing';

export class User {
  private constructor(
    private id: string,
    private tenantId: string,
    private email: string,
    private password: string,
    private firstName: string,
    private lastName: string,
    private role: UserRole,
    private firstLog: boolean,
    private createdAt: Date,
    private updatedAt: Date,
  ) {}

  public static create(
    tenantId: string,
    email: string,
    hashedPassword: string,
    firstName: string,
    lastName: string,
    role: UserRole = 'editor',
  ): User {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }

    return new User(
      uuid(),
      tenantId,
      email.toLowerCase().trim(),
      hashedPassword,
      firstName.trim(),
      lastName.trim(),
      role,
      false, // new users haven't seen the onboarding tour yet
      new Date(),
      new Date(),
    );
  }

  public static reconstitute(
    id: string,
    tenantId: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    firstLog: boolean,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(id, tenantId, email, password, firstName, lastName, role, firstLog, createdAt, updatedAt);
  }

  public updateProfile(firstName?: string, lastName?: string): void {
    if (firstName) this.firstName = firstName.trim();
    if (lastName) this.lastName = lastName.trim();
    this.updatedAt = new Date();
  }

  public changePassword(hashedPassword: string): void {
    if (!hashedPassword) {
      throw new Error('Password is required');
    }
    this.password = hashedPassword;
    this.updatedAt = new Date();
  }

  public updateRole(role: UserRole): void {
    this.role = role;
    this.updatedAt = new Date();
  }

  // Mark the first-run onboarding tour as seen. Idempotent — once true it stays true.
  public markFirstLog(): void {
    this.firstLog = true;
    this.updatedAt = new Date();
  }

  public toPrimitives() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      firstLog: this.firstLog,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  public getId(): string { return this.id; }
  public getTenantId(): string { return this.tenantId; }
  public getEmail(): string { return this.email; }
  public getPassword(): string { return this.password; }
  public getFirstName(): string { return this.firstName; }
  public getLastName(): string { return this.lastName; }
  public getRole(): UserRole { return this.role; }
  public getFirstLog(): boolean { return this.firstLog; }
}
