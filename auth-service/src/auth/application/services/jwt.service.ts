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
    return jwt.verify(token, this.secret) as JwtPayload;
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
}
