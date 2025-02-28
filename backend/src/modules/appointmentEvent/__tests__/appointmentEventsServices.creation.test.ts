// Now we can do our imports
import { AppointmentEventService } from '../appointmentEvent.services';
import { AppointmentStatus, AppointmentType } from '../appointmentEvent.schema';
import mongoose from 'mongoose';
import { IAppointmentEvent } from '../appointmentEvent.schema';
import { CreateAppointmentDto } from '../appointmentEvent.types';

// Mock le modèle User
const mockUserModel = {
  exists: jest.fn().mockResolvedValue(true)
};

// Mock le model() de mongoose
jest.spyOn(mongoose, 'model').mockImplementation((modelName: string) => {
  if (modelName === 'User') {
    return mockUserModel as any;
  }
  return {} as any;
});

describe('AppointmentEventService - Creation', () => {
  let appointmentEventService: AppointmentEventService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    appointmentEventService = new AppointmentEventService();
    
    // Fix the create mock with correct typing
    jest.spyOn(appointmentEventService as any, 'create').mockImplementation(
      (data: unknown) => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        ...(data as Partial<IAppointmentEvent>),
        createdAt: new Date(),
        updatedAt: new Date()
      } as IAppointmentEvent)
    );

    // Keep the find mock
    jest.spyOn(appointmentEventService as any, 'find').mockResolvedValue([]);
  });

  it('should create an appointment with valid data and set initial status to SCHEDULED', async () => {
    // Arrange
    const validAppointmentData = {
      title: 'Test Appointment',
      startDateTime: new Date('2024-03-20T10:00:00Z'),
      endDateTime: new Date('2024-03-20T11:00:00Z'),
      appointmentType: AppointmentType.IN_PERSON,
      participants: [
        {
          userId: new mongoose.Types.ObjectId().toString(),
          role: 'provider' as const,
          name: 'Dr. Smith',
          email: 'dr.smith@example.com'
        },
        {
          userId: new mongoose.Types.ObjectId().toString(),
          role: 'client' as const,
          name: 'John Doe',
          email: 'john.doe@example.com'
        }
      ],
      location: 'Office 123'
    };

    // Act
    const createdAppointment = await appointmentEventService.createAppointment(validAppointmentData);

    // Assert
    expect(createdAppointment).toBeDefined();
    expect(createdAppointment.status).toBe(AppointmentStatus.SCHEDULED);
    expect(createdAppointment.startDateTime).toEqual(validAppointmentData.startDateTime);
    expect(createdAppointment.endDateTime).toEqual(validAppointmentData.endDateTime);
    expect(createdAppointment.participants).toHaveLength(2);
    expect(createdAppointment.appointmentType).toBe(AppointmentType.IN_PERSON);
    
    // Verify that create was called with the correct data
    expect(appointmentEventService['create']).toHaveBeenCalledWith({
      ...validAppointmentData,
      status: AppointmentStatus.SCHEDULED
    });
    
    // Verify that conflict check was performed
    expect(appointmentEventService['find']).toHaveBeenCalled();
  });

  describe('Required Fields Validation', () => {
    it('should throw error when required fields are missing', async () => {
      // Arrange
      const incompleteAppointmentData = {
        title: 'Test Appointment',
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(incompleteAppointmentData))
        .rejects
        .toThrow('Missing required fields: startDateTime, endDateTime, participants, appointmentType');
    });

    it('should throw error when only some required fields are provided', async () => {
      // Arrange
      const partialAppointmentData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T10:00:00Z'),
        endDateTime: new Date('2024-03-20T11:00:00Z'),
        location: 'Office 123'
        // Missing: participants and appointmentType
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(partialAppointmentData))
        .rejects
        .toThrow('Missing required fields: participants, appointmentType');
    });

    it('should throw error when participants array is empty', async () => {
      // Arrange
      const appointmentDataWithEmptyParticipants = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T10:00:00Z'),
        endDateTime: new Date('2024-03-20T11:00:00Z'),
        appointmentType: AppointmentType.IN_PERSON,
        participants: [],
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(appointmentDataWithEmptyParticipants))
        .rejects
        .toThrow('At least one participant is required');
    });
  });

  describe('Date Order Validation', () => {
    it('should throw error when endDateTime is before startDateTime', async () => {
      // Arrange
      const invalidDateOrderData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T11:00:00Z'),  // Later time
        endDateTime: new Date('2024-03-20T10:00:00Z'),    // Earlier time
        appointmentType: AppointmentType.IN_PERSON,
        participants: [
          {
            userId: new mongoose.Types.ObjectId().toString(),
            role: 'provider' as const,
            name: 'Dr. Smith',
            email: 'dr.smith@example.com'
          }
        ],
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(invalidDateOrderData))
        .rejects
        .toThrow('End date must be after start date');
    });

    it('should throw error when startDateTime equals endDateTime', async () => {
      // Arrange
      const sameTimeData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T10:00:00Z'),  // Same time
        endDateTime: new Date('2024-03-20T10:00:00Z'),    // Same time
        appointmentType: AppointmentType.IN_PERSON,
        participants: [
          {
            userId: new mongoose.Types.ObjectId().toString(),
            role: 'provider' as const,
            name: 'Dr. Smith',
            email: 'dr.smith@example.com'
          }
        ],
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(sameTimeData))
        .rejects
        .toThrow('End date must be after start date');
    });

    it('should throw error when appointment duration is less than 15 minutes', async () => {
      // Arrange
      const shortDurationData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T10:00:00Z'),
        endDateTime: new Date('2024-03-20T10:10:00Z'),  // Only 10 minutes difference
        appointmentType: AppointmentType.IN_PERSON,
        participants: [
          {
            userId: new mongoose.Types.ObjectId().toString(),
            role: 'provider' as const,
            name: 'Dr. Smith',
            email: 'dr.smith@example.com'
          }
        ],
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(shortDurationData))
        .rejects
        .toThrow('Appointment must be at least 15 minutes long');
    });
  });

  describe('Scheduling Conflict Detection', () => {
    beforeEach(() => {
          // Clear all mocks before each test
    jest.clearAllMocks();
    
    appointmentEventService = new AppointmentEventService();
    
    // Fix the create mock with correct typing
      jest.spyOn(appointmentEventService as any, 'create').mockImplementation(
        (data: unknown) => Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          ...(data as Partial<IAppointmentEvent>),
          createdAt: new Date(),
          updatedAt: new Date()
        } as IAppointmentEvent)
      );
    });

    it('should throw error when provider has a scheduling conflict', async () => {
      // Arrange
      const providerId = new mongoose.Types.ObjectId().toString();
      const existingAppointment = {
        startDateTime: new Date('2024-03-20T10:30:00Z'),
        endDateTime: new Date('2024-03-20T11:30:00Z'),
        providerId,
        status: AppointmentStatus.SCHEDULED
      };

      // Mock find to return conflicting appointment
      jest.spyOn(appointmentEventService as any, 'find')
        .mockResolvedValueOnce([existingAppointment]);

      const newAppointmentData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T11:00:00Z'),
        endDateTime: new Date('2024-03-20T12:00:00Z'),
        appointmentType: AppointmentType.IN_PERSON,
        providerId,
        participants: [
          {
            userId: new mongoose.Types.ObjectId().toString(),
            role: 'provider' as const,
            name: 'Dr. Smith',
            email: 'dr.smith@example.com'
          }
        ],
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(newAppointmentData))
        .rejects
        .toThrow('Provider has a scheduling conflict');
    });

    it('should throw error when participants have scheduling conflicts', async () => {
      // Arrange
      const participantId = new mongoose.Types.ObjectId().toString();
      const existingAppointment = {
        startDateTime: new Date('2024-03-20T10:30:00Z'),
        endDateTime: new Date('2024-03-20T11:30:00Z'),
        participants: [{
          userId: participantId,
          role: 'client',
          name: 'John Doe'
        }],
        status: AppointmentStatus.SCHEDULED
      };

      // Mock find pour retourner le conflit immédiatement
      jest.spyOn(appointmentEventService as any, 'find')
        .mockImplementation((query: any) => {
          // Si la requête concerne les participants, retourner le conflit
          if (query['participants.userId']) {
            return Promise.resolve([existingAppointment]);
          }
          // Sinon retourner un tableau vide (pas de conflit)
          return Promise.resolve([]);
        });

      const newAppointmentData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T11:00:00Z'),
        endDateTime: new Date('2024-03-20T12:00:00Z'),
        appointmentType: AppointmentType.IN_PERSON,
        participants: [
          {
            userId: participantId, // Same participant
            role: 'client' as const,
            name: 'John Doe',
            email: 'john.doe@example.com'
          }
        ],
        location: 'Office 123'
      };

      // Act & Assert
      await expect(appointmentEventService.createAppointment(newAppointmentData))
        .rejects
        .toThrow('One or more participants have scheduling conflicts');
    });

    it('should not detect conflicts for cancelled or completed appointments', async () => {
      // Arrange
      const providerId = new mongoose.Types.ObjectId().toString();
      const existingAppointments = [
        {
          startDateTime: new Date('2024-03-20T10:30:00Z'),
          endDateTime: new Date('2024-03-20T11:30:00Z'),
          providerId,
          status: AppointmentStatus.CANCELLED
        },
        {
          startDateTime: new Date('2024-03-20T10:30:00Z'),
          endDateTime: new Date('2024-03-20T11:30:00Z'),
          providerId,
          status: AppointmentStatus.COMPLETED
        }
      ];

      // Mock find pour filtrer les rendez-vous selon leur statut
      jest.spyOn(appointmentEventService as any, 'find')
        .mockImplementation((query: any) => {
          // Filtrer les rendez-vous selon le statut
          if (query.status && query.status.$nin) {
            const filteredAppointments = existingAppointments.filter(
              apt => !query.status.$nin.includes(apt.status)
            );
            return Promise.resolve(filteredAppointments);
          }
          return Promise.resolve([]);
        });

      const newAppointmentData = {
        title: 'Test Appointment',
        startDateTime: new Date('2024-03-20T11:00:00Z'),
        endDateTime: new Date('2024-03-20T12:00:00Z'),
        appointmentType: AppointmentType.IN_PERSON,
        providerId,
        participants: [
          {
            userId: new mongoose.Types.ObjectId().toString(),
            role: 'provider' as const,
            name: 'Dr. Smith',
            email: 'dr.smith@example.com'
          }
        ],
        location: 'Office 123'
      };

      // Act
      const result = await appointmentEventService.createAppointment(newAppointmentData);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
    });
  });

  it('should handle string dates from API requests', async () => {
    // Arrange - simulate data as it would come from API
    const apiRequestData: CreateAppointmentDto = {
      title: 'Test Appointment',
      startDateTime: '2024-03-20T10:00:00Z',
      endDateTime: '2024-03-20T11:00:00Z',
      appointmentType: 'in_person',
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

    // Transform DTO to service format
    const serviceData: Partial<IAppointmentEvent> = {
      ...apiRequestData,
      startDateTime: new Date(apiRequestData.startDateTime),
      endDateTime: new Date(apiRequestData.endDateTime),
      appointmentType: apiRequestData.appointmentType as AppointmentType
    };

    const createdAppointment = await appointmentEventService.createAppointment(serviceData);

    // Assert
    expect(createdAppointment).toBeDefined();
    expect(createdAppointment.startDateTime).toBeInstanceOf(Date);
    expect(createdAppointment.endDateTime).toBeInstanceOf(Date);
    expect(createdAppointment.appointmentType).toBe(AppointmentType.IN_PERSON);
  });
}); 