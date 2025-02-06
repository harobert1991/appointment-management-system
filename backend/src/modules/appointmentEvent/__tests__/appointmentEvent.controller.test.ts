import { AppointmentEventController } from '../appointmentEvent.controller';
import { Request, Response } from 'express';
import { AppointmentEventService } from '../appointmentEvent.services';
import { AppointmentStatus, AppointmentType } from '../appointmentEvent.schema';
import mongoose from 'mongoose';

// Mock the services
jest.mock('../appointmentEvent.services');

describe('AppointmentEventController', () => {
  let controller: AppointmentEventController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock response
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockRes = {
      json: mockJson,
      status: mockStatus,
    };

    // Create mock request with valid appointment data
    mockReq = {
      body: {
        title: 'Test Appointment',
        description: 'Test Description',
        appointmentType: 'CONSULTATION',
        startDateTime: '2024-03-25T10:00:00Z',
        endDateTime: '2024-03-25T11:00:00Z',
        location: 'Test Location',
        participants: [
          {
            userId: '123',
            role: 'provider',
            name: 'Dr. Test',
            email: 'doctor@test.com'
          },
          {
            userId: '456',
            role: 'client',
            name: 'Patient Test',
            email: 'patient@test.com'
          }
        ],
        providerId: '123',
        reminderSettings: [
          {
            type: 'email',
            timeBeforeEvent: 60,
            isEnabled: true
          }
        ]
      }
    };

    // Mock successful service responses
    (AppointmentEventService.prototype.createAppointment as jest.Mock).mockResolvedValue({
      id: 'test-appointment-id',
      ...mockReq.body
    });

    // Initialize controller
    controller = new AppointmentEventController();
  });

  describe('createAppointment', () => {
    it('should successfully create an appointment and return 201 status', async () => {
      // Call the controller method
      await controller.createAppointment(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'test-appointment-id',
          title: 'Test Appointment',
          description: 'Test Description',
          appointmentType: 'CONSULTATION'
        })
      });

      // Verify service calls
      expect(AppointmentEventService.prototype.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining(mockReq.body)
      );
    });

    it('should handle errors and return 400 status', async () => {
      const error = new Error('Validation error');
      (AppointmentEventService.prototype.createAppointment as jest.Mock).mockRejectedValue(error);

      await controller.createAppointment(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create appointment',
        details: 'Validation error'
      });
    });
  });
});

describe('AppointmentEventController - Update', () => {
  let controller: AppointmentEventController;
  let mockService: jest.Mocked<AppointmentEventService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup service mock
    mockService = new AppointmentEventService() as jest.Mocked<AppointmentEventService>;
    controller = new AppointmentEventController();
    (controller as any).appointmentEventService = mockService;

    // Setup response mock
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  it('should successfully update an appointment', async () => {
    // Arrange
    const appointmentId = new mongoose.Types.ObjectId().toString();
    const updateData = {
      title: 'Updated Appointment',
      location: 'New Office',
      additionalNotes: 'Some new notes'
    };

    const updatedAppointment = {
      id: appointmentId,
      ...updateData,
      startDateTime: new Date('2024-03-20T10:00:00Z'),
      endDateTime: new Date('2024-03-20T11:00:00Z'),
      status: AppointmentStatus.SCHEDULED,
      appointmentType: AppointmentType.IN_PERSON,
      participants: [
        {
          userId: new mongoose.Types.ObjectId().toString(),
          role: 'provider',
          name: 'Dr. Smith',
          email: 'dr.smith@example.com'
        }
      ]
    };

    mockRequest = {
      params: { id: appointmentId },
      body: updateData
    };

    (AppointmentEventService.prototype.updateAppointment as jest.Mock).mockResolvedValue(updatedAppointment);

    // Act
    await controller.updateAppointment(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(AppointmentEventService.prototype.updateAppointment).toHaveBeenCalledWith(
      appointmentId,
      updateData
    );
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      data: updatedAppointment
    });
  });

  it('should handle not found appointment', async () => {
    // Arrange
    const appointmentId = new mongoose.Types.ObjectId().toString();
    mockRequest = {
      params: { id: appointmentId },
      body: { title: 'Updated Appointment' }
    };

    (AppointmentEventService.prototype.updateAppointment as jest.Mock).mockResolvedValue(null);

    // Act
    await controller.updateAppointment(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Appointment not found'
    });
  });

  it('should handle update errors', async () => {
    // Arrange
    const error = new Error('Update failed');
    mockRequest = {
      params: { id: 'invalid-id' },
      body: { title: 'Updated Appointment' }
    };

    (AppointmentEventService.prototype.updateAppointment as jest.Mock).mockRejectedValue(error);

    // Act
    await controller.updateAppointment(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to update appointment',
      details: 'Update failed'
    });
  });
}); 