import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface InviteTokenPayload {
  inviteId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface M2MTokenPayload {
  tenantId: string;
  userId?: string;
  organisationId?: string;
  scopes: string[];
}

export interface IntegrationSessionPayload {
  tenantId: string;
  clientId: string;
  mode: string;
  templateId: string | null;
  returnUrl: string;
  userRef: string | null;
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('JWT_SECRET', 'dev-secret-change-in-prod');
    this.expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '24h');
  }

    sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as string,
    } as jwt.SignOptions);
  }


  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as unknown as JwtPayload;
  }

  signInvite(payload: InviteTokenPayload): string {
    return jwt.sign({ ...payload, type: 'invite' }, this.secret, {
      expiresIn: '15m',
    } as jwt.SignOptions);
  }

  verifyInvite(token: string): InviteTokenPayload {
    const decoded = jwt.verify(token, this.secret) as any;
    if (decoded.type !== 'invite') {
      throw new Error('Invalid token type');
    }
    return decoded as InviteTokenPayload;
  }

  signM2M(payload: M2MTokenPayload): string {
    return jwt.sign(
      {
        sub: payload.tenantId,
        user_id: payload.userId,
        organisation_id: payload.organisationId,
        scopes: payload.scopes,
        type: 'm2m',
      },
      this.secret,
      { expiresIn: 3600 } as jwt.SignOptions,
    );
  }

  verifyM2M(token: string): M2MTokenPayload & { sub: string; type: string } {
    const decoded = jwt.verify(token, this.secret) as any;
    if (decoded.type !== 'm2m') {
      throw new Error('Invalid token type');
    }
    return decoded;
  }

  signIntegrationSession(payload: IntegrationSessionPayload, ttlSeconds: number): string {
    return jwt.sign(
      {
        sub: payload.tenantId,
        tenant_id: payload.tenantId,
        client_id: payload.clientId,
        mode: payload.mode,
        template_id: payload.templateId,
        return_url: payload.returnUrl,
        user_ref: payload.userRef,
        scopes: ['templates:read', 'templates:write'],
        type: 'integration_session',
      },
      this.secret,
      { expiresIn: ttlSeconds } as jwt.SignOptions,
    );
  }

  verifyIntegrationSession(token: string): any {
    const decoded = jwt.verify(token, this.secret) as any;
    if (decoded.type !== 'integration_session') {
      throw new Error('Invalid token type');
    }
    return decoded;
  }
}
