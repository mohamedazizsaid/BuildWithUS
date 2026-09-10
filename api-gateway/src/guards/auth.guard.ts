import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthClientService } from "../services/auth-client.service";

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
export class AuthGuard implements CanActivate {
  constructor(private readonly authClient: AuthClientService) {}

  /**
   * canActivate — called on every request to a guarded route.
   * Returns true to allow the request, or throws UnauthorizedException to block it.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Authorization header takes priority over cookie
    // Header: machines/APIs always send Bearer token explicitly
    const authHeader = request.headers.authorization;
    const token =
      (authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : authHeader?.trim()) ||
      request.cookies?.token;

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const result: any = await this.authClient.validateToken(token);

      if (!result.valid) {
        throw new UnauthorizedException("Invalid token");
      }

      if (result.token_type === "m2m") {
        request.user = {
          id: result.user?.id || "",
          tenant_id: result.user?.tenant_id || "",
          organisation_id: result.organisation_id || "",
          // For M2M the org scope is carried in organisation_id.
          external_org_ref: result.organisation_id || undefined,
          scopes: result.scopes || [],
          role: "m2m",
        };
      } else if (result.token_type === "integration_session") {
        request.user = {
          id: result.user?.id || "integration-session",
          tenant_id: result.user?.tenant_id || "",
          organisation_id: "",
          // For integration sessions the org scope is carried in user_ref.
          external_org_ref: result.user_ref || undefined,
          email: "",
          scopes: result.scopes || [],
          role: result.user?.role || "editor",
        };
      } else {
        // Human dashboard users carry no org ref → no org filter (see all
        // templates in their tenant, unchanged behavior).
        request.user = result.user;
      }

      request.token = token;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
