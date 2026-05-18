import { ConfigService } from '@nestjs/config';
import { JwtService, JwtPayload , InviteTokenPayload , M2MTokenPayload} from './jwt.service';

describe('JwtService', () => {
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(() => {
    // Fake ConfigService that returns predictable values
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '1h';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    jwtService = new JwtService(configService);
  });

  describe('sign()', () => {
    it('should return a string token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = jwtService.sign(payload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWTs have 3 parts: header.payload.signature
    });
  });
  describe('verify()', () => {
    it('should return the original payload when verifying a valid token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = jwtService.sign(payload);
      const decoded = jwtService.verify(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.tenantId).toBe('tenant-456');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
    });

    it('should throw when verifying an invalid token', () => {
      expect(() => jwtService.verify('not-a-real-token')).toThrow();
    });

    it('should throw when verifying a token signed with a different secret', () => {
      const fakeToken = require('jsonwebtoken').sign(
        { userId: 'hacker' },
        'wrong-secret',
      );

      expect(() => jwtService.verify(fakeToken)).toThrow();
    });
  });
  describe('signInvite() and verifyInvite()', () => {
    const invitePayload: InviteTokenPayload = {
      inviteId: 'invite-789',
      tenantId: 'tenant-456',
      email: 'newuser@example.com',
      role: 'member',
    };

    it('should sign and verify an invite token', () => {
      const token = jwtService.signInvite(invitePayload);
      const decoded = jwtService.verifyInvite(token);

      expect(decoded.inviteId).toBe('invite-789');
      expect(decoded.tenantId).toBe('tenant-456');
      expect(decoded.email).toBe('newuser@example.com');
      expect(decoded.role).toBe('member');
    });

    it('should reject a regular JWT when verifying as invite', () => {
      const regularToken = jwtService.sign({
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        role: 'admin',
      });

      expect(() => jwtService.verifyInvite(regularToken)).toThrow('Invalid token type');
    });
  });
  describe('signM2M() and verifyM2M()', () => {
    const m2mPayload: M2MTokenPayload = {
      tenantId: 'tenant-456',
      userId: 'user-123',
      organisationId: 'org-789',
      scopes: ['templates:read', 'templates:write'],
    };

    it('should sign and verify an M2M token', () => {
      const token = jwtService.signM2M(m2mPayload);
      const decoded = jwtService.verifyM2M(token) as any;

      expect(decoded.sub).toBe('tenant-456');
      expect(decoded.user_id).toBe('user-123');
      expect(decoded.organisation_id).toBe('org-789');
      expect(decoded.scopes).toEqual(['templates:read', 'templates:write']);
      expect(decoded.type).toBe('m2m');
    });

    it('should reject a regular JWT when verifying as M2M', () => {
      const regularToken = jwtService.sign({
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        role: 'admin',
      });

      expect(() => jwtService.verifyM2M(regularToken)).toThrow('Invalid token type');
    });

    it('should reject an invite token when verifying as M2M', () => {
      const inviteToken = jwtService.signInvite({
        inviteId: 'invite-789',
        tenantId: 'tenant-456',
        email: 'newuser@example.com',
        role: 'member',
      });

      expect(() => jwtService.verifyM2M(inviteToken)).toThrow('Invalid token type');
    });
  });
});