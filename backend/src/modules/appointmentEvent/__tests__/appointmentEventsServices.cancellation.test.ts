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

describe('AppointmentEventService - Cancellation', () => {
  let appointmentEventService: AppointmentEventService;
  let mockAppointment: Partial<IAppointmentEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    appointmentEventService = new AppointmentEventService();
    
    // Mock existing appointment
    mockAppointment = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Appointment',
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
      ]
    };

    // Mock findOne and update
    jest.spyOn(appointmentEventService as any, 'findOne')
      .mockResolvedValue(mockAppointment);
    
    jest.spyOn(appointmentEventService as any, 'update')
      .mockImplementation((filter: unknown, updateData: unknown) => Promise.resolve({
        ...mockAppointment,
        ...(updateData as Partial<IAppointmentEvent>)
      }));
  });

  it('should successfully cancel a scheduled appointment', async () => {
    // Arrange
    const appointmentId = mockAppointment._id!.toString();
    const cancelledBy = new mongoose.Types.ObjectId().toString();
    const reason = 'Patient requested cancellation';

    // Act
    const cancelledAppointment = await appointmentEventService.cancelAppointment(
      appointmentId,
      cancelledBy,
      reason
    );

    // Assert
    expect(cancelledAppointment!).toBeDefined();
    expect(cancelledAppointment!.status).toBe(AppointmentStatus.CANCELLED);
    expect(cancelledAppointment!.cancellationReason).toEqual({
      reason,
      cancelledBy,
      cancelledAt: expect.any(Date)
    });

    // Verify service calls
    expect(appointmentEventService['findOne'])
      .toHaveBeenCalledWith({ _id: appointmentId });
    
    expect(appointmentEventService['update'])
      .toHaveBeenCalledWith(
        { _id: appointmentId },
        {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: {
            reason,
            cancelledBy,
            cancelledAt: expect.any(Date)
          }
        }
      );
  });

  it('should throw error when trying to cancel a completed appointment', async () => {
    // Arrange
    const appointmentId = mockAppointment._id!.toString();
    const cancelledBy = new mongoose.Types.ObjectId().toString();
    const reason = 'Trying to cancel completed appointment';

    // Mock a completed appointment
    mockAppointment.status = AppointmentStatus.COMPLETED;
    jest.spyOn(appointmentEventService as any, 'findOne')
      .mockResolvedValue(mockAppointment);

    // Act & Assert
    await expect(appointmentEventService.cancelAppointment(
      appointmentId,
      cancelledBy,
      reason
    )).rejects.toThrow('Cannot cancel a completed appointment');

    // Verify findOne was called
    expect(appointmentEventService['findOne'])
      .toHaveBeenCalledWith({ _id: appointmentId });
    
    // Verify update was not called
    expect(appointmentEventService['update'])
      .not.toHaveBeenCalled();
  });

  it('should throw error when trying to cancel non-existent appointment', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const cancelledBy = new mongoose.Types.ObjectId().toString();
    const reason = 'Trying to cancel non-existent appointment';

    // Mock findOne to return null (appointment not found)
    jest.spyOn(appointmentEventService as any, 'findOne')
      .mockResolvedValue(null);

    // Act & Assert
    await expect(appointmentEventService.cancelAppointment(
      nonExistentId,
      cancelledBy,
      reason
    )).rejects.toThrow('Appointment not found');

    // Verify findOne was called
    expect(appointmentEventService['findOne'])
      .toHaveBeenCalledWith({ _id: nonExistentId });
    
    // Verify update was not called
    expect(appointmentEventService['update'])
      .not.toHaveBeenCalled();
  });
}); 