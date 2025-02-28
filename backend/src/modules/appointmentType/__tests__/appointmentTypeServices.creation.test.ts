import { AppointmentTypeService } from '../appointmentType.services';
import { IAppointmentType } from '../appointmentType.schema';
import mongoose from 'mongoose';
import { config } from '../../../config';

describe('AppointmentTypeService - Creation', () => {
  let appointmentTypeService: AppointmentTypeService;

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentTypeService = new AppointmentTypeService();

    // Mock both findOne and create methods
    jest.spyOn(appointmentTypeService as any, 'findOne')
      .mockResolvedValue(null); // Default to no existing appointment type

    jest.spyOn(appointmentTypeService as any, 'create')
      .mockImplementation((...args: unknown[]) => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        ...(args[0] as Partial<IAppointmentType>),
        createdAt: new Date(),
        updatedAt: new Date()
      } as IAppointmentType));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an appointment type with all required fields', async () => {
    // Arrange
    const appointmentTypeData = {
      name: 'Regular Consultation',
      duration: 30, // 30 minutes
      isActive: true,
      organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
    };

    // Act
    const createdAppointmentType = await appointmentTypeService.createAppointmentType(appointmentTypeData);

    // Assert
    expect(createdAppointmentType).toBeDefined();
    expect(createdAppointmentType.name).toBe(appointmentTypeData.name);
    expect(createdAppointmentType.duration).toBe(appointmentTypeData.duration);
    expect(createdAppointmentType.isActive).toBe(appointmentTypeData.isActive);
    expect(createdAppointmentType._id).toBeDefined();
    expect(createdAppointmentType.createdAt).toBeInstanceOf(Date);
    expect(createdAppointmentType.updatedAt).toBeInstanceOf(Date);

    // Verify service call
    expect(appointmentTypeService['create']).toHaveBeenCalledWith(appointmentTypeData);
  });

  it('should create an appointment type with all optional fields', async () => {
    // Arrange
    const appointmentTypeData = {
      // Required fields
      name: 'Premium Consultation',
      duration: 60,
      isActive: true,
      
      // Optional fields
      description: 'Comprehensive medical consultation with detailed health assessment',
      bufferTimeBefore: 10,
      bufferTimeAfter: 15,
      price: 150.00,
      category: 'Specialist Consultation',
      locations: [
        {
          name: 'Main Clinic',
          address: '123 Healthcare Ave',
          type: 'physical' as const,
          coordinates: {
            latitude: 45.123456,
            longitude: -73.123456
          }
        },
        {
          name: 'Virtual Office',
          type: 'virtual' as const
        }
      ],
      resourcesRequired: [
        'Examination Room',
        'Blood Pressure Monitor',
        'ECG Machine'
      ],
      tags: [
        'specialist',
        'comprehensive',
        'premium'
      ],
      organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
    };

    // Act
    const createdAppointmentType = await appointmentTypeService.createAppointmentType(appointmentTypeData);

    // Assert
    expect(createdAppointmentType).toBeDefined();
    
    // Required fields
    expect(createdAppointmentType.name).toBe(appointmentTypeData.name);
    expect(createdAppointmentType.duration).toBe(appointmentTypeData.duration);
    expect(createdAppointmentType.isActive).toBe(appointmentTypeData.isActive);
    
    // Optional fields
    expect(createdAppointmentType.description).toBe(appointmentTypeData.description);
    expect(createdAppointmentType.bufferTimeBefore).toBe(appointmentTypeData.bufferTimeBefore);
    expect(createdAppointmentType.bufferTimeAfter).toBe(appointmentTypeData.bufferTimeAfter);
    expect(createdAppointmentType.price).toBe(appointmentTypeData.price);
    expect(createdAppointmentType.category).toBe(appointmentTypeData.category);
    
    // Complex optional fields
    expect(createdAppointmentType.locations).toHaveLength(2);
    expect(createdAppointmentType.locations![0]).toEqual(appointmentTypeData.locations[0]);
    expect(createdAppointmentType.locations![1]).toEqual(appointmentTypeData.locations[1]);
    
    expect(createdAppointmentType.resourcesRequired).toEqual(appointmentTypeData.resourcesRequired);
    expect(createdAppointmentType.tags).toEqual(appointmentTypeData.tags);

    // System fields
    expect(createdAppointmentType._id).toBeDefined();
    expect(createdAppointmentType.createdAt).toBeInstanceOf(Date);
    expect(createdAppointmentType.updatedAt).toBeInstanceOf(Date);

    // Verify service call
    expect(appointmentTypeService['create']).toHaveBeenCalledWith(appointmentTypeData);
  });

  describe('validation errors', () => {
    it('should reject appointment type with missing required fields', async () => {
      // Arrange
      const invalidData = {
        // Missing name and duration
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Name is required, Duration is required'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow('Name is required, Duration is required');
    });

    it('should reject appointment type with negative duration', async () => {
      // Arrange
      const invalidData = {
        name: 'Test Appointment',
        duration: -30,
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Duration must be at least 1 minute'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow('Duration must be at least 1 minute');
    });

    it('should reject appointment type with negative buffer times', async () => {
      // Arrange
      const invalidData = {
        name: 'Test Appointment',
        duration: 30,
        bufferTimeBefore: -10,
        bufferTimeAfter: -5,
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Buffer time cannot be negative'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow('Buffer time cannot be negative');
    });

    it('should reject appointment type with negative price', async () => {
      // Arrange
      const invalidData = {
        name: 'Test Appointment',
        duration: 30,
        price: -50,
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Price cannot be negative'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow('Price cannot be negative');
    });

    it('should reject appointment type with duplicate name', async () => {
      // Arrange
      const existingName = 'Regular Consultation';
      const duplicateData = {
        name: existingName,
        duration: 30,
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw duplicate key error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Appointment type with this name already exists'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(duplicateData))
        .rejects
        .toThrow('Appointment type with this name already exists');
    });

    describe('location validation', () => {
      it('should reject appointment type with missing location name', async () => {
        // Arrange
        const invalidData = {
          name: 'Test Appointment',
          duration: 30,
          isActive: true,
          locations: [
            {
              name: '', // Empty string instead of missing property
              type: 'physical' as const,
              address: '123 Test St'
            }
          ],
          organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
        };

        // Mock create to throw validation error
        jest.spyOn(appointmentTypeService as any, 'create')
          .mockRejectedValue(new Error('Location name is required'));

        // Act & Assert
        await expect(appointmentTypeService.createAppointmentType(invalidData))
          .rejects
          .toThrow('Location name is required');
      });

      it('should reject appointment type with missing location type', async () => {
        // Arrange
        const invalidData = {
          name: 'Test Appointment',
          duration: 30,
          isActive: true,
          locations: [
            {
              name: 'Test Location',
              address: '123 Test St'
            }
          ],
          organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
        } as Partial<IAppointmentType>; // Type assertion to bypass TypeScript check

        // Mock create to throw validation error
        jest.spyOn(appointmentTypeService as any, 'create')
          .mockRejectedValue(new Error('Location type is required'));

        // Act & Assert
        await expect(appointmentTypeService.createAppointmentType(invalidData))
          .rejects
          .toThrow('Location type is required');
      });

      it('should reject appointment type with invalid location type', async () => {
        // Arrange
        const invalidData = {
          name: 'Test Appointment',
          duration: 30,
          isActive: true,
          locations: [
            {
              name: 'Test Location',
              type: 'hybrid' as any, // invalid type
              address: '123 Test St'
            }
          ],
          organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
        };

        // Mock create to throw validation error
        jest.spyOn(appointmentTypeService as any, 'create')
          .mockRejectedValue(new Error('Invalid location type. Must be either "virtual" or "physical"'));

        // Act & Assert
        await expect(appointmentTypeService.createAppointmentType(invalidData))
          .rejects
          .toThrow('Invalid location type. Must be either "virtual" or "physical"');
      });

      it('should reject appointment type with invalid coordinates', async () => {
        // Arrange
        const invalidData = {
          name: 'Test Appointment',
          duration: 30,
          isActive: true,
          locations: [
            {
              name: 'Test Location',
              type: 'physical' as const,
              coordinates: {
                latitude: 91, // invalid latitude (must be between -90 and 90)
                longitude: -73.123456
              }
            }
          ],
          organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
        };

        // Mock create to throw validation error
        jest.spyOn(appointmentTypeService as any, 'create')
          .mockRejectedValue(new Error('Invalid coordinates. Latitude must be between -90 and 90'));

        // Act & Assert
        await expect(appointmentTypeService.createAppointmentType(invalidData))
          .rejects
          .toThrow('Invalid coordinates. Latitude must be between -90 and 90');
      });
    });
  });

  describe('field length validation', () => {
    it('should reject appointment type with fields exceeding maximum length', async () => {
      // Arrange
      const invalidData = {
        name: 'A'.repeat(101), // Exceeds 100 char limit
        duration: 30,
        description: 'B'.repeat(501), // Exceeds 500 char limit
        category: 'C'.repeat(51), // Exceeds 50 char limit
        tags: [
          'D'.repeat(31), // Exceeds 30 char limit
          'valid-tag'
        ],
        resourcesRequired: [
          'E'.repeat(51), // Exceeds 50 char limit
          'valid-resource'
        ],
        locations: [
          {
            name: 'F'.repeat(101), // Exceeds 100 char limit
            type: 'physical' as const,
            address: 'G'.repeat(201) // Exceeds 200 char limit
          }
        ],
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error(
          'Validation failed: ' +
          'name cannot exceed 100 characters, ' +
          'description cannot exceed 500 characters, ' +
          'category cannot exceed 50 characters, ' +
          'tags cannot exceed 30 characters each, ' +
          'resourcesRequired cannot exceed 50 characters each, ' +
          'location name cannot exceed 100 characters, ' +
          'location address cannot exceed 200 characters'
        ));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow(/Validation failed/);
    });

    it('should accept appointment type with maximum allowed field lengths', async () => {
      // Arrange
      const validData = {
        name: 'A'.repeat(100), // Exactly 100 chars
        duration: 30,
        description: 'B'.repeat(500), // Exactly 500 chars
        category: 'C'.repeat(50), // Exactly 50 chars
        tags: [
          'D'.repeat(30), // Exactly 30 chars
          'valid-tag'
        ],
        resourcesRequired: [
          'E'.repeat(50), // Exactly 50 chars
          'valid-resource'
        ],
        locations: [
          {
            name: 'F'.repeat(100), // Exactly 100 chars
            type: 'physical' as const,
            address: 'G'.repeat(200) // Exactly 200 chars
          }
        ],
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to return valid appointment type
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          ...validData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      // Act
      const createdAppointmentType = await appointmentTypeService.createAppointmentType(validData);

      // Assert
      expect(createdAppointmentType).toBeDefined();
      expect(createdAppointmentType.name.length).toBe(100);
      expect(createdAppointmentType.description?.length).toBe(500);
      expect(createdAppointmentType.category?.length).toBe(50);
      expect(createdAppointmentType.tags?.[0].length).toBe(30);
      expect(createdAppointmentType.resourcesRequired?.[0].length).toBe(50);
      expect(createdAppointmentType.locations?.[0].name.length).toBe(100);
      expect(createdAppointmentType.locations?.[0].address?.length).toBe(200);
    });
  });

  describe('enum validation', () => {
    it('should reject appointment type with invalid enum values', async () => {
      // Arrange
      const invalidData = {
        name: 'Test Appointment',
        duration: 30,
        isActive: true,
        locations: [
          {
            name: 'Test Location',
            type: 'hybrid' as any, // Invalid enum value
            address: '123 Test St'
          }
        ],
        category: 'invalid-category' as any, // Assuming category has predefined values
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error(
          'Validation failed: ' +
          'location type must be either "virtual" or "physical", ' +
          'category must be one of [consultation, procedure, test, therapy]'
        ));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow(/Validation failed/);
    });

    it('should accept appointment type with valid enum values', async () => {
      // Arrange
      const validData = {
        name: 'Test Appointment',
        duration: 30,
        isActive: true,
        locations: [
          {
            name: 'Physical Office',
            type: 'physical' as const,
            address: '123 Test St'
          },
          {
            name: 'Online Meeting',
            type: 'virtual' as const
          }
        ],
        category: 'consultation',
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to return valid appointment type
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          ...validData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      // Act
      const createdAppointmentType = await appointmentTypeService.createAppointmentType(validData);

      // Assert
      expect(createdAppointmentType).toBeDefined();
      expect(createdAppointmentType.locations![0].type).toBe('physical');
      expect(createdAppointmentType.locations![1].type).toBe('virtual');
      expect(createdAppointmentType.category).toBe('consultation');
    });
  });

  describe('location coordinates validation', () => {
    it('should reject physical location without coordinates', async () => {
      // Arrange
      const invalidData = {
        name: 'Test Appointment',
        duration: 30,
        isActive: true,
        locations: [
          {
            name: 'Physical Office',
            type: 'physical' as const,
            address: '123 Test St'
            // Missing coordinates for physical location
          }
        ],
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Physical locations must include valid coordinates'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow('Physical locations must include valid coordinates');
    });

    it('should reject physical location with partial coordinates', async () => {
      // Arrange
      const invalidData = {
        name: 'Test Appointment',
        duration: 30,
        isActive: true,
        locations: [
          {
            name: 'Physical Office',
            type: 'physical' as const,
            address: '123 Test St',
            coordinates: {
              latitude: 45.123456
              // Missing longitude
            }
          }
        ],
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      } as any; // Type assertion needed due to partial coordinates

      // Mock create to throw validation error
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockRejectedValue(new Error('Physical locations must include both latitude and longitude'));

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow('Physical locations must include both latitude and longitude');
    });

    it('should accept virtual location without coordinates', async () => {
      // Arrange
      const validData = {
        name: 'Test Appointment',
        duration: 30,
        isActive: true,
        locations: [
          {
            name: 'Virtual Office',
            type: 'virtual' as const
            // No coordinates needed for virtual location
          }
        ],
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Mock create to return valid appointment type
      jest.spyOn(appointmentTypeService as any, 'create')
        .mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          ...validData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      // Act
      const createdAppointmentType = await appointmentTypeService.createAppointmentType(validData);

      // Assert
      expect(createdAppointmentType).toBeDefined();
      expect(createdAppointmentType.locations![0].type).toBe('virtual');
      expect(createdAppointmentType.locations![0].coordinates).toBeUndefined();
    });
  });

  describe('name uniqueness validation', () => {
    it('should reject creation with duplicate name within same organization', async () => {
      // Arrange
      const existingName = 'Regular Consultation';
      const orgId = new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId;
      
      // Override the default findOne mock for this specific test
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockReset()
        .mockResolvedValue({ name: existingName, organizationId: orgId });

      const duplicateData = {
        name: existingName,
        duration: 30,
        isActive: true,
        organizationId: orgId
      };

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(duplicateData))
        .rejects
        .toThrow(`Appointment type with name "${existingName}" already exists in this organization`);

      // Verify findOne was called with correct parameters - checking within same organization
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ 
          name: existingName,
          organizationId: orgId
        });
    });

    it('should allow creation with duplicate name in different organization', async () => {
      // Arrange
      const existingName = 'Regular Consultation';
      const orgId1 = new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId;
      const orgId2 = new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId;
      
      // First findOne call checks for the specific org and returns null
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockResolvedValue(null);

      const appointmentTypeData = {
        name: existingName,
        duration: 30,
        isActive: true,
        organizationId: orgId2
      };

      // Act
      const createdAppointmentType = await appointmentTypeService.createAppointmentType(appointmentTypeData);

      // Assert
      expect(createdAppointmentType).toBeDefined();
      expect(createdAppointmentType.name).toBe(existingName);

      // Verify findOne was called with correct parameters - checking within specific organization
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ 
          name: existingName,
          organizationId: orgId2 
        });
    });

    it('should allow creation with unique name within same organization', async () => {
      // Arrange
      const uniqueName = 'Unique Consultation';
      const orgId = new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId;
      
      // Mock findOne to simulate no existing appointment type
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockResolvedValue(null);

      const validData = {
        name: uniqueName,
        duration: 30,
        isActive: true,
        organizationId: orgId
      };

      // Act
      const createdAppointmentType = await appointmentTypeService.createAppointmentType(validData);

      // Assert
      expect(createdAppointmentType).toBeDefined();
      expect(createdAppointmentType.name).toBe(uniqueName);

      // Verify findOne was called with correct parameters
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ 
          name: uniqueName,
          organizationId: orgId 
        });
    });
  });

  describe('duration validation', () => {
    it('should reject creation with duration exceeding max limit', async () => {
      // Arrange
      const invalidData = {
        name: 'Long Appointment',
        duration: config.appointment.maxDurationMinutes + 1,
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Act & Assert
      await expect(appointmentTypeService.createAppointmentType(invalidData))
        .rejects
        .toThrow(`Duration cannot exceed ${config.appointment.maxDurationMinutes} minutes`);
    });

    it('should allow creation with duration equal to max limit', async () => {
      // Arrange
      const validData = {
        name: 'Maximum Duration Appointment',
        duration: config.appointment.maxDurationMinutes,
        isActive: true,
        organizationId: new mongoose.Types.ObjectId() as any as mongoose.Schema.Types.ObjectId
      };

      // Act
      const createdAppointmentType = await appointmentTypeService.createAppointmentType(validData);

      // Assert
      expect(createdAppointmentType).toBeDefined();
      expect(createdAppointmentType.duration).toBe(config.appointment.maxDurationMinutes);
    });
  });
}); 