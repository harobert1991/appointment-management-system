import { AppointmentTypeService } from '../appointmentType.services';
import { IAppointmentType } from '../appointmentType.schema';
import mongoose from 'mongoose';
import { logger } from '../../../utils';

// At the top with other jest.mock calls
jest.mock('../../../utils', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('AppointmentTypeService - Deletion', () => {
  let appointmentTypeService: AppointmentTypeService;
  let mockAppointmentType: Partial<IAppointmentType>;
  let mockUpdateMany: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentTypeService = new AppointmentTypeService();

    // Setup mock for AppointmentEvent.updateMany
    mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    jest.spyOn(mongoose, 'model').mockReturnValue({
      updateMany: mockUpdateMany
    } as any);

    // Create mock appointment type
    mockAppointmentType = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Regular Consultation',
      duration: 30,
      isActive: true,
      description: 'Standard consultation session',
      price: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock findOne to return our mock appointment
    jest.spyOn(appointmentTypeService as any, 'findOne')
      .mockResolvedValue(mockAppointmentType);

    // Mock delete method
    jest.spyOn(appointmentTypeService as any, 'delete')
      .mockResolvedValue(mockAppointmentType);
  });

  it('should successfully delete an existing appointment type', async () => {
    // Arrange
    const appointmentId = mockAppointmentType._id!.toString();

    // Act
    const deletedAppointment = await appointmentTypeService.deleteAppointmentType(appointmentId);

    // Assert
    expect(deletedAppointment).toBeDefined();
    expect(deletedAppointment?._id).toEqual(mockAppointmentType._id);
    
    // Verify service call
    expect(appointmentTypeService['delete'])
      .toHaveBeenCalledWith({ _id: appointmentId });
  });

  it('should return null when trying to delete non-existent appointment type', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    
    // Mock delete to return null for non-existent appointment
    jest.spyOn(appointmentTypeService as any, 'delete')
      .mockResolvedValue(null);

    // Act
    const result = await appointmentTypeService.deleteAppointmentType(nonExistentId);

    // Assert
    expect(result).toBeNull();
    
    // Verify service call
    expect(appointmentTypeService['delete'])
      .toHaveBeenCalledWith({ _id: nonExistentId });
  });

  it('should handle deletion of already deleted appointment type', async () => {
    // Arrange
    const appointmentId = mockAppointmentType._id!.toString();
    
    // Mock delete to return null (already deleted)
    jest.spyOn(appointmentTypeService as any, 'delete')
      .mockResolvedValue(null);

    // Act
    const result = await appointmentTypeService.deleteAppointmentType(appointmentId);

    // Assert
    expect(result).toBeNull();
    
    // Verify service call
    expect(appointmentTypeService['delete'])
      .toHaveBeenCalledWith({ _id: appointmentId });
  });

  describe('deletion edge cases and cascading effects', () => {
    it('should handle invalid ID format gracefully', async () => {
      // Arrange
      const invalidId = 'invalid-id-format';

      // Mock delete to throw for invalid ID
      jest.spyOn(appointmentTypeService as any, 'delete')
        .mockRejectedValue(new Error('Invalid appointment type ID format'));

      // Act & Assert
      await expect(appointmentTypeService.deleteAppointmentType(invalidId))
        .rejects
        .toThrow('Invalid appointment type ID format');
    });

    it('should verify no orphaned appointments after type deletion', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      
      // Mock AppointmentEvent model's updateMany method
      const mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
      jest.spyOn(mongoose, 'model').mockImplementation((modelName: string) => {
        if (modelName === 'AppointmentEvent') {
          return {
            updateMany: mockUpdateMany
          } as any;
        }
        return {} as any;
      });

      // Act
      await appointmentTypeService.deleteAppointmentType(appointmentId);

      // Assert
      // Verify appointments are updated before type deletion
      expect(mockUpdateMany).toHaveBeenCalledWith(
        { appointmentType: appointmentId },
        { $set: { appointmentType: null } }
      );
      
      // Verify type deletion happens after updating appointments
      expect(appointmentTypeService['delete'])
        .toHaveBeenCalledWith({ _id: appointmentId });
    });

    it('should handle errors during cascading updates', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      
      // Mock AppointmentEvent model's updateMany to fail
      const mockUpdateMany = jest.fn().mockRejectedValue(
        new Error('Database error during cascade update')
      );
      jest.spyOn(mongoose, 'model').mockImplementation((modelName: string) => {
        if (modelName === 'AppointmentEvent') {
          return {
            updateMany: mockUpdateMany
          } as any;
        }
        return {} as any;
      });

      // Act & Assert
      await expect(appointmentTypeService.deleteAppointmentType(appointmentId))
        .rejects
        .toThrow('Database error during cascade update');
      
      // Verify type was not deleted due to cascade failure
      expect(appointmentTypeService['delete'])
        .not.toHaveBeenCalled();
    });

    it('should log affected appointments during deletion', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      
      // Mock AppointmentEvent model's updateMany to return affected count
      const mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 5 });
      jest.spyOn(mongoose, 'model').mockImplementation((modelName: string) => {
        if (modelName === 'AppointmentEvent') {
          return {
            updateMany: mockUpdateMany
          } as any;
        }
        return {} as any;
      });

      // Act
      await appointmentTypeService.deleteAppointmentType(appointmentId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('5 appointments affected by deletion')
      );
    });
  });
}); 