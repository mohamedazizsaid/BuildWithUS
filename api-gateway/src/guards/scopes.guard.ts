import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'scopes';
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Regular users are not scope-checked — their access is controlled by RolesGuard
    if (!user || user.role !== 'm2m') {
      return true;
    }

    // M2M tokens must have all required scopes
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const tokenScopes: string[] = user.scopes || [];
    const hasAllScopes = requiredScopes.every((s) => tokenScopes.includes(s));

    if (!hasAllScopes) {
      throw new ForbiddenException(
        `Insufficient scopes. Required: ${requiredScopes.join(', ')}`,
      );
    }

    return true;
  }
}
