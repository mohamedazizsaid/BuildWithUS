import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  OnModuleInit,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

/**
 * AuthGuard — the BOUNCER of the API Gateway.
 *
 * Runs BEFORE any protected controller method.
 * Checks if the request has a valid JWT token (from cookie or Authorization header).
 * If valid → attaches user info (id, tenantId, email, role) to the request.
 * If invalid → returns 401 Unauthorized.
 *
 * Usage: @UseGuards(AuthGuard) on a controller or method
 */
@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private authService: any;

  // Inject the AUTH_SERVICE gRPC client (registered in app.module.ts)
  constructor(@Inject("AUTH_SERVICE") private readonly client: ClientGrpc) {}

  // Called once when the module starts — gets a reference to the AuthService gRPC methods
  onModuleInit() {
    this.authService = this.client.getService("AuthService");
  }

  /**
   * canActivate — called on every request to a guarded route.
   * Returns true to allow the request, or throws UnauthorizedException to block it.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try to get token from cookie first, then from Authorization header
    // Cookie: set by login/register (browser sends it automatically)
    // Header: used by Postman or mobile apps (Authorization: Bearer <token>)
    const token =
      request.cookies?.token ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      // Call auth-service to verify the token is valid and not expired
      const result: any = await firstValueFrom(
        this.authService.ValidateToken({ token }),
      );

      if (!result.valid) {
        throw new UnauthorizedException("Invalid token");
      }

      // Attach user info to the request — controllers can access it via req.user
      // This contains: { id, tenant_id, email, role }
      request.user = result.user;

      // Also attach the raw token — some endpoints need it (GetMe, UpdateProfile)
      request.token = token;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
