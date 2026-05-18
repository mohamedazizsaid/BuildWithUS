import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hash()', () => {
    it('should return a hashed string different from the original', async () => {
      const password = 'MySecret123!';

      const hashed = await passwordService.hash(password);

      expect(typeof hashed).toBe('string');
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
    });

    it('should produce different hashes for the same password (salt is random)', async () => {
      const password = 'MySecret123!';

      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare()', () => {
    it('should return true when password matches the hash', async () => {
      const password = 'MySecret123!';
      const hashed = await passwordService.hash(password);

      const result = await passwordService.compare(password, hashed);

      expect(result).toBe(true);
    });

    it('should return false when password does not match', async () => {
      const password = 'MySecret123!';
      const wrongPassword = 'WrongPassword!';
      const hashed = await passwordService.hash(password);

      const result = await passwordService.compare(wrongPassword, hashed);

      expect(result).toBe(false);
    });

    it('should return false for an empty password against any hash', async () => {
      const hashed = await passwordService.hash('MySecret123!');

      const result = await passwordService.compare('', hashed);

      expect(result).toBe(false);
    });
  });
});