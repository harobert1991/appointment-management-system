import { AppointmentEventService } from '../appointmentEvent.services';
import { AppointmentStatus, AppointmentType, IAppointmentEvent } from '../appointmentEvent.schema';
import mongoose from 'mongoose';

// Mock User model
const mockUserModel = {
  exists: jest.fn().mockResolvedValue(true)
};

jest.spyOn(mongoose, 'model').mockImplementation((modelName: string) => {
  if (modelName === 'User') {
    return mockUserModel as any;
  }
  return {} as any;
});

describe('AppointmentEventService - Update', () => {
  let appointmentEventService: AppointmentEventService;
  let mockAppointment: Partial<IAppointmentEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    appointmentEventService = new AppointmentEventService();
    
    // Mock existing appointment
    mockAppointment = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Initial Appointment',
      startDateTime: new Date('2024-03-20T10:00:00Z'),
      endDateTime: new Date('2024-03-20T11:00:00Z'),
      appointmentType: AppointmentType.IN_PERSON,
      status: AppointmentStatus.SCHEDULED,
      participants: [
        {
          userId: new mongoose.Types.ObjectId().toString(),
          role: 'provider',
          name: 'Dr. Smith',
          email: 'dr.smith@example.com'
        }
      ],
      location: 'Office 123'
    };

    // Mock findOne to return our mock appointment
    jest.spyOn(appointmentEventService as any, 'findOne')
      .mockResolvedValue(mockAppointment);

    // Mock update to return updated appointment
    jest.spyOn(appointmentEventService as any, 'update').mockImplementation(
      (filter: unknown, updateData: unknown) => Promise.resolve({
        ...mockAppointment,
        ...(updateData as Partial<IAppointmentEvent>),
        _id: mockAppointment._id,
        createdAt: new Date(),
        updatedAt: new Date()
      } as IAppointmentEvent)
    );
  });

  it('should successfully update non-date fields of an existing appointment', async () => {
    // Arrange
    const appointmentId = mockAppointment._id!.toString();
    const updateData = {
      title: 'Updated Title',
      additionalNotes: 'Added some notes',
      location: 'Office 456'
    };

    // Act
    const updatedAppointment = await appointmentEventService.updateAppointment(
      appointmentId,
      updateData
    );

    // Assert
    expect(updatedAppointment).toBeDefined();
    expect(updatedAppointment?.title).toBe(updateData.title);
    expect(updatedAppointment?.additionalNotes).toBe(updateData.additionalNotes);
    expect(updatedAppointment?.location).toBe(updateData.location);
    
    // Verify original fields remain unchanged
    expect(updatedAppointment?.startDateTime).toEqual(mockAppointment.startDateTime);
    expect(updatedAppointment?.endDateTime).toEqual(mockAppointment.endDateTime);
    expect(updatedAppointment?.status).toBe(mockAppointment.status);
    expect(updatedAppointment?.appointmentType).toBe(mockAppointment.appointmentType);
    
    // Verify service calls
    expect(appointmentEventService['findOne']).toHaveBeenCalledWith({ _id: appointmentId });
    expect(appointmentEventService['update']).toHaveBeenCalledWith(
      { _id: appointmentId },
      updateData
    );
  });

  it('should throw error when updating non-existent appointment', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const updateData = {
      title: 'Updated Title'
    };

    // Mock findOne to return null (appointment not found)
    jest.spyOn(appointmentEventService as any, 'findOne')
      .mockResolvedValue(null);

    // Act & Assert
    await expect(appointmentEventService.updateAppointment(
      nonExistentId,
      updateData
    )).rejects.toThrow('Appointment not found');

    // Verify findOne was called with correct ID
    expect(appointmentEventService['findOne'])
      .toHaveBeenCalledWith({ _id: nonExistentId });
    
    // Verify update was not called
    expect(appointmentEventService['update'])
      .not.toHaveBeenCalled();
  });

  it('should successfully update appointment dates when no conflicts exist', async () => {
    // Arrange
    const appointmentId = mockAppointment._id!.toString();
    const updateData = {
      startDateTime: new Date('2024-03-20T14:00:00Z'), // New time slot
      endDateTime: new Date('2024-03-20T15:00:00Z')
    };

    // Mock find to return empty array (no conflicts)
    jest.spyOn(appointmentEventService as any, 'find')
      .mockResolvedValue([]);

    // Act
    const updatedAppointment = await appointmentEventService.updateAppointment(
      appointmentId,
      updateData
    );

    // Assert
    expect(updatedAppointment).toBeDefined();
    expect(updatedAppointment?.startDateTime).toEqual(updateData.startDateTime);
    expect(updatedAppointment?.endDateTime).toEqual(updateData.endDateTime);
    
    // Verify conflict check was performed
    expect(appointmentEventService['find']).toHaveBeenCalled();
    
    // Verify update was called with correct data
    expect(appointmentEventService['update']).toHaveBeenCalledWith(
      { _id: appointmentId },
      updateData
    );
  });

  it('should throw error when updating dates creates scheduling conflict', async () => {
    // Arrange
    const appointmentId = mockAppointment._id!.toString();
    const providerId = new mongoose.Types.ObjectId().toString();
    
    // Existing conflicting appointment
    const conflictingAppointment = {
      _id: new mongoose.Types.ObjectId(),
      startDateTime: new Date('2024-03-20T14:30:00Z'),
      endDateTime: new Date('2024-03-20T15:30:00Z'),
      providerId,
      status: AppointmentStatus.SCHEDULED
    };

    const updateData = {
      startDateTime: new Date('2024-03-20T14:00:00Z'),
      endDateTime: new Date('2024-03-20T15:00:00Z'),
      providerId
    };

    // Mock find to return conflicting appointment
    jest.spyOn(appointmentEventService as any, 'find')
      .mockResolvedValue([conflictingAppointment]);

    // Act & Assert
    await expect(appointmentEventService.updateAppointment(
      appointmentId,
      updateData
    )).rejects.toThrow('Provider has a scheduling conflict');

    // Verify conflict check was performed
    expect(appointmentEventService['find']).toHaveBeenCalledWith({
      $or: [{ 
        startDateTime: { $lt: updateData.endDateTime }, 
        endDateTime: { $gt: updateData.startDateTime } 
      }],
      _id: { $ne: appointmentId },
      status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED] },
      providerId
    });
    
    // Verify update was not called
    expect(appointmentEventService['update']).not.toHaveBeenCalled();
  });

  it('should throw error for invalid status transitions', async () => {
    // Arrange
    const appointmentId = mockAppointment._id!.toString();
    
    // Try to update from SCHEDULED directly to COMPLETED
    const updateData = {
      status: AppointmentStatus.COMPLETED
    };

    // Mock existing appointment with SCHEDULED status
    mockAppointment.status = AppointmentStatus.SCHEDULED;
    jest.spyOn(appointmentEventService as any, 'findOne')
      .mockResolvedValue(mockAppointment);

    // Act & Assert
    await expect(appointmentEventService.updateAppointment(
      appointmentId,
      updateData
    )).rejects.toThrow(`Invalid status transition from ${AppointmentStatus.SCHEDULED} to ${AppointmentStatus.COMPLETED}`);

    // Verify findOne was called
    expect(appointmentEventService['findOne'])
      .toHaveBeenCalledWith({ _id: appointmentId });
    
    // Verify update was not called
    expect(appointmentEventService['update'])
      .not.toHaveBeenCalled();
  });
}); 