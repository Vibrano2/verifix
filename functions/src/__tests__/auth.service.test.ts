import { AuthService } from '../services/auth.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';

// Mock dependencies
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
  })),
  auth: jest.fn(),
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
    authService = new AuthService();
    
    // Mock repos
    (authService as any).userRepo = {
      emailExists: jest.fn(),
      createUser: jest.fn(),
      findByEmail: jest.fn(),
      updatePassword: jest.fn(),
      updateResetToken: jest.fn(),
    };
    (authService as any).artisanRepo = {
      create: jest.fn(),
    };
  });

  describe('Register', () => {
    it('should register a client successfully', async () => {
      const mockData = {
        email: 'test@example.com',
        password: 'Password123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'client' as any,
      };

      (authService as any).userRepo.emailExists.mockResolvedValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (authService as any).userRepo.createUser.mockResolvedValue({
        uid: 'user123',
        ...mockData,
        password_hash: 'hashed_password',
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');

      const result = await authService.register(mockData);

      expect(result.token).toBe('mock_token');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 12);
    });

    it('should reject duplicate email', async () => {
      const mockData = {
        email: 'test@example.com',
        password: 'Password123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'client' as any,
      };

      (authService as any).userRepo.emailExists.mockResolvedValue(true);

      await expect(authService.register(mockData)).rejects.toThrow('Email is already registered');
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'client',
      };

      (authService as any).userRepo.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');

      const result = await authService.login({ email: 'test@example.com', password: 'Password123' });

      expect(result.token).toBe('mock_token');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should reject invalid credentials', async () => {
      (authService as any).userRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow('Invalid email or password');
    });
  });

  describe('Password Reset', () => {
    it('should securely generate a reset token', async () => {
      (authService as any).userRepo.findByEmail.mockResolvedValue({ uid: 'user123', email: 'test@example.com' });
      (jwt.sign as jest.Mock).mockReturnValue('reset_jwt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');
      
      const result = await authService.requestPasswordReset('test@example.com');
      
      expect(result.message).toBe('If this email exists, a reset link has been sent.');
      expect((authService as any).userRepo.updateResetToken).toHaveBeenCalled();
    });
  });
});
