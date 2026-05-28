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

    // Authorization header takes priority over cookie
    // Header: machines/APIs always send Bearer token explicitly
    // Cookie: browser users — fallback when no header present
    const token =
      request.headers.authorization?.replace("Bearer ", "") ||
      request.cookies?.token;

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const result: any = await firstValueFrom(
        this.authService.ValidateToken({ token }),
      );

      if (!result.valid) {
        throw new UnauthorizedException("Invalid token");
      }

      if (result.token_type === "m2m") {
        request.user = {
          id: result.user?.id || "",
          tenant_id: result.user?.tenant_id || "",
          organisation_id: result.organisation_id || "",
          scopes: result.scopes || [],
          role: "m2m",
        };
      } else if (result.token_type === "integration_session") {
        request.user = {
          id: result.user?.id || "integration-session",
          tenant_id: result.user?.tenant_id || "",
          organisation_id: "",
          email: "",
          scopes: result.scopes || [],
          role: result.user?.role || "editor",
        };
      } else {
        request.user = result.user;
      }

      request.token = token;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
