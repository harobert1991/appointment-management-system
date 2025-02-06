import { AppointmentTypeService } from '../appointmentType.services';
import { IAppointmentType } from '../appointmentType.schema';
import mongoose from 'mongoose';
import { config } from '../../../config';

describe('AppointmentTypeService - Update', () => {
  let appointmentTypeService: AppointmentTypeService;
  let mockAppointmentType: Partial<IAppointmentType>;

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentTypeService = new AppointmentTypeService();

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

    // Mock update method
    jest.spyOn(appointmentTypeService as any, 'update')
      .mockImplementation((filter: unknown, updateData: unknown) => {
        const originalUpdatedAt = mockAppointmentType.updatedAt || new Date();
        const newUpdatedAt = new Date(originalUpdatedAt.getTime() + 1000); // Add 1 second
        
        return Promise.resolve({
          ...mockAppointmentType,
          ...(updateData as Partial<IAppointmentType>),
          updatedAt: newUpdatedAt
        });
      });
  });

  it('should successfully update appointment type with valid data', async () => {
    // Arrange
    const appointmentId = mockAppointmentType._id!.toString();
    const updateData = {
      name: 'Premium Consultation',
      duration: 45,
      description: 'Extended consultation with detailed assessment',
      price: 150,
      bufferTimeBefore: 10,
      bufferTimeAfter: 5,
      tags: ['premium', 'extended']
    };

    // Mock findOne to first return the existing appointment
    // and then return null for the name uniqueness check
    jest.spyOn(appointmentTypeService as any, 'findOne')
      .mockImplementationOnce(() => Promise.resolve(mockAppointmentType)) // For initial appointment check
      .mockImplementationOnce(() => Promise.resolve(null)); // For name uniqueness check

    // Act
    const updatedAppointmentType = await appointmentTypeService.updateAppointmentType(
      appointmentId,
      updateData
    );

    // Assert
    expect(updatedAppointmentType).toBeDefined();
    expect(updatedAppointmentType?.name).toBe(updateData.name);
    expect(updatedAppointmentType?.duration).toBe(updateData.duration);
    expect(updatedAppointmentType?.description).toBe(updateData.description);
    expect(updatedAppointmentType?.price).toBe(updateData.price);
    expect(updatedAppointmentType?.bufferTimeBefore).toBe(updateData.bufferTimeBefore);
    expect(updatedAppointmentType?.bufferTimeAfter).toBe(updateData.bufferTimeAfter);
    expect(updatedAppointmentType?.tags).toEqual(updateData.tags);
    
    // Verify timestamps
    expect(updatedAppointmentType?.createdAt).toEqual(mockAppointmentType.createdAt);
    expect(updatedAppointmentType?.updatedAt).not.toEqual(mockAppointmentType.updatedAt);

    // Verify service calls
    expect(appointmentTypeService['findOne'])
      .toHaveBeenCalledWith({ _id: appointmentId });
    expect(appointmentTypeService['findOne'])
      .toHaveBeenCalledWith({ 
        name: updateData.name,
        _id: { $ne: appointmentId }
      });
    expect(appointmentTypeService['update'])
      .toHaveBeenCalledWith(
        { _id: appointmentId },
        updateData
      );
  });

  describe('validation errors', () => {
    it('should reject update with negative duration', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const invalidData = {
        duration: -30
      };

      // Mock update to throw validation error
      jest.spyOn(appointmentTypeService as any, 'update')
        .mockRejectedValue(new Error('Duration must be at least 1 minute'));

      // Act & Assert
      await expect(appointmentTypeService.updateAppointmentType(
        appointmentId,
        invalidData
      )).rejects.toThrow('Duration must be at least 1 minute');
    });

    it('should reject update with negative price', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const invalidData = {
        price: -50
      };

      // Mock update to throw validation error
      jest.spyOn(appointmentTypeService as any, 'update')
        .mockRejectedValue(new Error('Price cannot be negative'));

      // Act & Assert
      await expect(appointmentTypeService.updateAppointmentType(
        appointmentId,
        invalidData
      )).rejects.toThrow('Price cannot be negative');
    });

    it('should reject update with invalid location data', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const invalidData = {
        locations: [{
          // Missing required name
          type: 'physical',
          coordinates: {
            latitude: 91,
            longitude: -73.123456
          }
        }]
      } as Partial<IAppointmentType>; // Type assertion to bypass TypeScript check

      // Mock update to throw validation error
      jest.spyOn(appointmentTypeService as any, 'update')
        .mockRejectedValue(new Error('Invalid location data: name is required and coordinates must be valid'));

      // Act & Assert
      await expect(appointmentTypeService.updateAppointmentType(
        appointmentId,
        invalidData
      )).rejects.toThrow('Invalid location data: name is required and coordinates must be valid');
    });
  });

  describe('isActive status toggle', () => {
    it('should successfully deactivate an active appointment type', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const updateData = {
        isActive: false
      };

      // Mock update to return deactivated appointment
      jest.spyOn(appointmentTypeService as any, 'update')
        .mockImplementation((filter: unknown, data: unknown) => Promise.resolve({
          ...mockAppointmentType,
          ...(data as Partial<IAppointmentType>),
          updatedAt: new Date(mockAppointmentType.updatedAt!.getTime() + 1000)
        }));

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.isActive).toBe(false);
      expect(updatedAppointment?.updatedAt).not.toEqual(mockAppointmentType.updatedAt);
    });

    it('should successfully reactivate an inactive appointment type', async () => {
      // Arrange
      mockAppointmentType.isActive = false; // Start with inactive
      const appointmentId = mockAppointmentType._id!.toString();
      const updateData = {
        isActive: true
      };

      // Mock update to return reactivated appointment
      jest.spyOn(appointmentTypeService as any, 'update')
        .mockImplementation((filter: unknown, data: unknown) => Promise.resolve({
          ...mockAppointmentType,
          ...(data as Partial<IAppointmentType>),
          updatedAt: new Date(mockAppointmentType.updatedAt!.getTime() + 1000)
        }));

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.isActive).toBe(true);
      expect(updatedAppointment?.updatedAt).not.toEqual(mockAppointmentType.updatedAt);
    });
  });

  describe('updating complex fields', () => {
    it('should successfully update appointment type with new locations', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const updateData = {
        locations: [
          {
            name: 'Main Office',
            type: 'physical' as const,
            address: '123 Medical Plaza',
            coordinates: {
              latitude: 45.123456,
              longitude: -73.123456
            }
          },
          {
            name: 'Telehealth',
            type: 'virtual' as const
          }
        ]
      };

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.locations).toBeDefined();
      expect(updatedAppointment?.locations).toHaveLength(2);
      expect(updatedAppointment?.locations![0]).toEqual(updateData.locations[0]);
      expect(updatedAppointment?.locations![1]).toEqual(updateData.locations[1]);
      
      // Verify specific location fields
      const locations = updatedAppointment?.locations!;
      expect(locations).toBeDefined();
      
      const [physicalLocation, virtualLocation] = locations;
      
      // Physical location checks
      expect(physicalLocation).toBeDefined();
      expect(physicalLocation.name).toBe('Main Office');
      expect(physicalLocation.type).toBe('physical');
      expect(physicalLocation.coordinates).toBeDefined();
      
      // Virtual location checks
      expect(virtualLocation).toBeDefined();
      expect(virtualLocation.name).toBe('Telehealth');
      expect(virtualLocation.type).toBe('virtual');
      expect(virtualLocation.coordinates).toBeUndefined();
    });

    it('should successfully update appointment type with new resources and tags', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const updateData = {
        resourcesRequired: [
          'Consultation Room',
          'Medical Equipment',
          'Video Conference System'
        ],
        tags: [
          'specialist',
          'telehealth',
          'premium',
          'equipment-needed'
        ]
      };

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      
      // Verify resources
      expect(updatedAppointment?.resourcesRequired).toHaveLength(3);
      expect(updatedAppointment?.resourcesRequired).toEqual(
        expect.arrayContaining(updateData.resourcesRequired)
      );
      
      // Verify tags
      expect(updatedAppointment?.tags).toHaveLength(4);
      expect(updatedAppointment?.tags).toEqual(
        expect.arrayContaining(updateData.tags)
      );

      // Verify original fields remain unchanged
      expect(updatedAppointment?.name).toBe(mockAppointmentType.name);
      expect(updatedAppointment?.duration).toBe(mockAppointmentType.duration);
      expect(updatedAppointment?.isActive).toBe(mockAppointmentType.isActive);
    });

    it('should allow adding new resources and tags while keeping existing ones', async () => {
      // Arrange
      mockAppointmentType.resourcesRequired = ['Existing Resource'];
      mockAppointmentType.tags = ['existing-tag'];
      
      const appointmentId = mockAppointmentType._id!.toString();
      const updateData = {
        resourcesRequired: [
          ...mockAppointmentType.resourcesRequired!,
          'New Resource'
        ],
        tags: [
          ...mockAppointmentType.tags!,
          'new-tag'
        ]
      };

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      
      // Verify both existing and new resources are present
      expect(updatedAppointment?.resourcesRequired).toContain('Existing Resource');
      expect(updatedAppointment?.resourcesRequired).toContain('New Resource');
      
      // Verify both existing and new tags are present
      expect(updatedAppointment?.tags).toContain('existing-tag');
      expect(updatedAppointment?.tags).toContain('new-tag');
    });

    it('should handle update with no changes gracefully', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const updateData = { ...mockAppointmentType };
      delete updateData._id; // Remove _id as it shouldn't be updated
      delete updateData.createdAt; // Remove timestamps as they shouldn't be updated
      delete updateData.updatedAt;

      // Mock findOne to verify existing data
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockResolvedValue(mockAppointmentType);

      // Mock update to return same data (no changes)
      jest.spyOn(appointmentTypeService as any, 'update')
        .mockImplementation((filter: unknown, data: unknown) => Promise.resolve({
          ...mockAppointmentType,
          updatedAt: mockAppointmentType.updatedAt // Keep same updatedAt to show no changes
        }));

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.updatedAt).toEqual(mockAppointmentType.updatedAt);
      expect(updatedAppointment).toEqual(mockAppointmentType);

      // Verify service calls
      expect(appointmentTypeService['update'])
        .toHaveBeenCalledWith({ _id: appointmentId }, updateData);
    });
  });

  describe('name uniqueness validation', () => {
    it('should reject update with duplicate name', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const existingName = 'Existing Consultation';
      
      // Mock findOne to first return the appointment being updated
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockImplementationOnce(() => Promise.resolve(mockAppointmentType))
        // Then return a different appointment with the target name
        .mockImplementationOnce(() => Promise.resolve({ 
          _id: new mongoose.Types.ObjectId(),
          name: existingName 
        }));

      const updateData = {
        name: existingName
      };

      // Act & Assert
      await expect(appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      )).rejects.toThrow(`Appointment type with name "${existingName}" already exists`);

      // Verify findOne was called correctly
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ _id: appointmentId });
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ 
          name: existingName,
          _id: { $ne: appointmentId }
        });
    });

    it('should allow update with same name as current', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const currentName = mockAppointmentType.name!;
      
      const updateData = {
        name: currentName,
        duration: 45 // Change something else
      };

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.name).toBe(currentName);
      expect(updatedAppointment?.duration).toBe(45);
    });

    it('should allow update with new unique name', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const newUniqueName = 'New Unique Name';
      
      // Mock findOne to first return the appointment being updated
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockImplementationOnce(() => Promise.resolve(mockAppointmentType))
        // Then return null when checking for name uniqueness
        .mockImplementationOnce(() => Promise.resolve(null));

      const updateData = {
        name: newUniqueName
      };

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        updateData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.name).toBe(newUniqueName);

      // Verify findOne was called correctly
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ _id: appointmentId });
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ 
          name: newUniqueName,
          _id: { $ne: appointmentId }
        });
    });
  });

  describe('duration validation', () => {
    it('should reject update with duration exceeding max limit', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const invalidData = {
        duration: config.appointment.maxDurationMinutes + 1
      };

      // Act & Assert
      await expect(appointmentTypeService.updateAppointmentType(
        appointmentId,
        invalidData
      )).rejects.toThrow(`Duration cannot exceed ${config.appointment.maxDurationMinutes} minutes`);
    });

    it('should allow update with duration equal to max limit', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      const validData = {
        duration: config.appointment.maxDurationMinutes
      };

      // Mock findOne to return existing appointment
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockResolvedValue(mockAppointmentType);

      // Act
      const updatedAppointment = await appointmentTypeService.updateAppointmentType(
        appointmentId,
        validData
      );

      // Assert
      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment?.duration).toBe(config.appointment.maxDurationMinutes);
    });
  });
}); 