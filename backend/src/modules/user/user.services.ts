import { User, IUser, UserRole, IUserInput, validateEmail, validatePhone } from './user.schema';
import { DatabaseService } from '../../rootModules/database/database.services';
import { ClientSession } from 'mongodb';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UserService extends DatabaseService<IUser> {
  constructor() {
    super(User);  // Pass the User model to DatabaseService
  }

  async createUser(userData: Partial<IUserInput>, options?: { session?: ClientSession }): Promise<IUser> {
    try {
      // Validate input
      if (!userData.email || !validateEmail(userData.email)) {
        throw new ValidationError('Invalid email format');
      }
      if (userData.phone && !validatePhone(userData.phone)) {
        throw new ValidationError('Invalid phone number format');
      }
      if (!userData.firstName || !userData.lastName) {
        throw new ValidationError('First name and last name are required');
      }

      // Check for existing user with same phone/email BEFORE creating
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          ...(userData.phone ? [{ phone: userData.phone }] : [])
        ]
      }).session(options?.session || null);

      if (existingUser) {
        const field = existingUser.email === userData.email ? 'email' : 'phone';
        throw new ValidationError(`${field} already exists`);
      }

      // If no role specified, default to CLIENT
      if (!userData.role) {
        userData.role = UserRole.CLIENT;
      }
      
      // Validate role is valid
      if (!Object.values(UserRole).includes(userData.role)) {
        throw new ValidationError('Invalid user role');
      }

      return await this.create(userData, options);
    } catch (error: any) {
      // Transform MongoDB duplicate key errors into validation errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ValidationError(`${field} already exists`);
      }
      throw error;
    }
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  async updateUser(userId: string, updateData: Partial<IUserInput>): Promise<IUser | null> {
    // Validate update data
    if (updateData.email && !validateEmail(updateData.email)) {
      throw new Error('Invalid email format');
    }
    if (updateData.phone && !validatePhone(updateData.phone)) {
      throw new Error('Invalid phone number format');
    }

    return await User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async deleteUser(userId: string): Promise<IUser | null> {
    return await User.findByIdAndDelete(userId);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }
} 