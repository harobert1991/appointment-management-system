import { DatabaseService } from '../../rootModules/database/database.services';
import { AppointmentType, IAppointmentType } from './appointmentType.schema';
import { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';

export class AppointmentTypeService extends DatabaseService<IAppointmentType> {
  constructor() {
    super(AppointmentType);
  }

  async createAppointmentType(data: Partial<IAppointmentType>): Promise<IAppointmentType> {
    // Ensure isActive is set if not provided
    if (typeof data.isActive !== 'boolean') {
      data.isActive = true;
    }

    return await this.create(data);
  }

  async getAppointmentTypeById(id: string): Promise<IAppointmentType | null> {
    return await this.findOne({ _id: id });
  }

  async getAllAppointmentTypes(filter: FilterQuery<IAppointmentType> = {}): Promise<IAppointmentType[]> {
    // Validate filter is an object
    if (typeof filter !== 'object' || filter === null) {
      throw new Error('Invalid filter format');
    }

    // Validate category if present
    if (filter.category && typeof filter.category !== 'string') {
      throw new Error('Invalid category filter');
    }

    // Validate tags if present
    if (filter.tags && !Array.isArray(filter.tags) && typeof filter.tags !== 'string') {
      throw new Error('Invalid tags filter');
    }

    return await this.find(filter);
  }

  async updateAppointmentType(
    id: string, 
    updateData: Partial<IAppointmentType>
  ): Promise<IAppointmentType | null> {
    // First check if appointment exists
    const existingAppointment = await this.findOne({ _id: id });
    if (!existingAppointment) {
      return null;
    }

    // Prevent updating timestamps manually
    delete updateData.createdAt;
    delete updateData.updatedAt;

    return await this.update({ _id: id }, updateData);
  }

  async deleteAppointmentType(id: string): Promise<IAppointmentType | null> {
    // Update all appointments that use this type
    const AppointmentEvent = mongoose.model('AppointmentEvent');
    const updateResult = await AppointmentEvent.updateMany(
      { appointmentType: id },
      { $set: { appointmentType: null } }
    );

    console.log(`${updateResult.modifiedCount} appointments affected by deletion`);

    // Then delete the appointment type
    return await this.delete({ _id: id });
  }

  // Additional utility methods
  async getActiveAppointmentTypes(): Promise<IAppointmentType[]> {
    return await this.find({ isActive: true });
  }

  async getAppointmentTypesByCategory(category: string): Promise<IAppointmentType[]> {
    return await this.find({ category, isActive: true });
  }

  async searchAppointmentTypes(searchTerm: string): Promise<IAppointmentType[]> {
    return await this.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: searchTerm }
      ],
      isActive: true
    });
  }
} 