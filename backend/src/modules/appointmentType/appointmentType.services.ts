import { DatabaseService } from '../../rootModules/database/database.services';
import { AppointmentType, IAppointmentType } from './appointmentType.schema';
import { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';
import { logger } from '../../utils';
import { config } from '../../config';

export class AppointmentTypeService extends DatabaseService<IAppointmentType> {
  constructor() {
    super(AppointmentType);
  }

  private validateDuration(duration: number): void {
    if (duration > config.appointment.maxDurationMinutes) {
      throw new Error(`Duration cannot exceed ${config.appointment.maxDurationMinutes} minutes`);
    }
  }

  async createAppointmentType(data: Partial<IAppointmentType>): Promise<IAppointmentType> {
    if (data.duration) {
      this.validateDuration(data.duration);
    }
    // Check if name already exists
    const existingType = await this.findOne({ name: data.name });
    if (existingType) {
      throw new Error(`Appointment type with name "${data.name}" already exists`);
    }

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
    if (updateData.duration) {
      this.validateDuration(updateData.duration);
    }
    // First check if appointment exists
    const existingAppointment = await this.findOne({ _id: id });
    if (!existingAppointment) {
      return null;
    }

    // If name is being updated, check for uniqueness
    if (updateData.name && updateData.name !== existingAppointment.name) {
      const nameExists = await this.findOne({ 
        name: updateData.name,
        _id: { $ne: id } // Exclude current document from check
      });
      if (nameExists) {
        throw new Error(`Appointment type with name "${updateData.name}" already exists`);
      }
    }

    // Prevent updating timestamps manually
    delete updateData.createdAt;
    delete updateData.updatedAt;

    return await this.update({ _id: id }, updateData);
  }

  async deleteAppointmentType(id: string): Promise<IAppointmentType | null> {
    try {
      // Update related appointments first
      const AppointmentEvent = mongoose.model('AppointmentEvent');
      const updateResult = await AppointmentEvent.updateMany(
        { appointmentType: id },
        { $set: { appointmentType: null } }
      );

      // Log the number of affected appointments
      logger.info(`${updateResult.modifiedCount} appointments affected by deletion of appointment type ${id}`);

      // Then delete the appointment type
      return await this.delete({ _id: id });
    } catch (error) {
      logger.error('Error deleting appointment type:', error);
      throw error;
    }
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

  async deleteAll(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Cleanup is not available in production environment');
      }

      // First update all related appointments
      const AppointmentEvent = mongoose.model('AppointmentEvent');
      await AppointmentEvent.updateMany(
        { appointmentType: { $ne: null } }, // Only update appointments that have an appointmentType
        { $set: { appointmentType: null } }
      );

      // Then delete all appointment types
      await this.deleteMany({});
      
      logger.info('All appointment types deleted successfully');
    } catch (error) {
      logger.error('Error deleting all appointment types:', error);
      throw error;
    }
  }
} 