import { validatePasswordStrength, validatePhoneNumber } from '../src/utils/validators';

describe('Validation Helpers', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePasswordStrength('Ab1.').isValid).toBe(false);
    });

    it('should reject passwords missing uppercase letters', () => {
      expect(validatePasswordStrength('admin123.').isValid).toBe(false);
    });

    it('should reject passwords missing lowercase letters', () => {
      expect(validatePasswordStrength('ADMIN123.').isValid).toBe(false);
    });

    it('should reject passwords missing numbers', () => {
      expect(validatePasswordStrength('AdminPass.').isValid).toBe(false);
    });

    it('should reject passwords missing special characters', () => {
      expect(validatePasswordStrength('AdminPass123').isValid).toBe(false);
    });

    it('should accept strong passwords with dot (.) as special character', () => {
      expect(validatePasswordStrength('Admin123.').isValid).toBe(true);
    });

    it('should accept strong passwords with other special characters (@, !, #)', () => {
      expect(validatePasswordStrength('Admin123!').isValid).toBe(true);
      expect(validatePasswordStrength('Admin123@').isValid).toBe(true);
      expect(validatePasswordStrength('Admin123#').isValid).toBe(true);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should reject phone numbers containing letters', () => {
      expect(validatePhoneNumber('123abc456').isValid).toBe(false);
    });

    it('should accept valid phone numbers with +, -, spaces, and dots', () => {
      expect(validatePhoneNumber('+1 800-555-0100').isValid).toBe(true);
      expect(validatePhoneNumber('123.456.7890').isValid).toBe(true);
    });

    it('should allow null or empty optional phone numbers', () => {
      expect(validatePhoneNumber(null).isValid).toBe(true);
      expect(validatePhoneNumber('').isValid).toBe(true);
    });
  });
});
