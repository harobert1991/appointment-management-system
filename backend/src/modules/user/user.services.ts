import { User, IUser, UserRole } from './user.schema';
import { DatabaseService } from '../../rootModules/database/database.services';

export class UserService extends DatabaseService<IUser> {
  constructor() {
    super(User);  // Pass the User model to DatabaseService
  }

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    // If no role specified, default to CLIENT
    if (!userData.role) {
      userData.role = UserRole.CLIENT;
    }
    
    // Validate role is valid
    if (!Object.values(UserRole).includes(userData.role)) {
      throw new Error('Invalid user role');
    }

    const user = new User(userData);
    return await user.save();
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async deleteUser(userId: string): Promise<IUser | null> {
    return await User.findByIdAndDelete(userId);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }
} 