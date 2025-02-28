import { AppointmentTypeService } from '../appointmentType.services';
import { IAppointmentType } from '../appointmentType.schema';
import mongoose from 'mongoose';

describe('AppointmentTypeService - Retrieval', () => {
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
  });

  describe('getAppointmentTypeById', () => {
    it('should successfully retrieve appointment type by ID', async () => {
      // Arrange
      const appointmentId = mockAppointmentType._id!.toString();
      
      // Mock findOne to return our mock appointment
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockResolvedValue(mockAppointmentType);

      // Act
      const retrievedAppointmentType = await appointmentTypeService.getAppointmentTypeById(appointmentId);

      // Assert
      expect(retrievedAppointmentType).toBeDefined();
      expect(retrievedAppointmentType?._id).toEqual(mockAppointmentType._id);
      expect(retrievedAppointmentType?.name).toBe(mockAppointmentType.name);
      expect(retrievedAppointmentType?.duration).toBe(mockAppointmentType.duration);
      
      // Verify service call
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ _id: appointmentId });
    });

    it('should return null for non-existent ID', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      // Mock findOne to return null
      jest.spyOn(appointmentTypeService as any, 'findOne')
        .mockResolvedValue(null);

      // Act
      const result = await appointmentTypeService.getAppointmentTypeById(nonExistentId);

      // Assert
      expect(result).toBeNull();
      
      // Verify service call
      expect(appointmentTypeService['findOne'])
        .toHaveBeenCalledWith({ _id: nonExistentId });
    });
  });

  describe('getActiveAppointmentTypes', () => {
    it('should return only active appointment types', async () => {
      // Arrange
      const mockActiveAppointments = [
        { ...mockAppointmentType },
        {
          ...mockAppointmentType,
          _id: new mongoose.Types.ObjectId(),
          name: 'Premium Consultation',
          duration: 60
        }
      ];

      // Mock find to return active appointments
      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue(mockActiveAppointments);

      // Act
      const activeAppointments = await appointmentTypeService.getActiveAppointmentTypes();

      // Assert
      expect(activeAppointments).toHaveLength(2);
      expect(activeAppointments[0].isActive).toBe(true);
      expect(activeAppointments[1].isActive).toBe(true);
      
      // Verify service call
      expect(appointmentTypeService['find'])
        .toHaveBeenCalledWith({ isActive: true });
    });

    it('should return empty array when no active appointment types exist', async () => {
      // Mock find to return empty array
      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue([]);

      // Act
      const activeAppointments = await appointmentTypeService.getActiveAppointmentTypes();

      // Assert
      expect(activeAppointments).toEqual([]);
      
      // Verify service call
      expect(appointmentTypeService['find'])
        .toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('getAppointmentTypesByCategory', () => {
    it('should return appointment types for a specific category', async () => {
      // Arrange
      const category = 'Specialist';
      const mockCategoryAppointments = [
        { ...mockAppointmentType, category },
        { 
          ...mockAppointmentType,
          _id: new mongoose.Types.ObjectId(),
          name: 'Specialist Follow-up',
          category 
        }
      ];

      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue(mockCategoryAppointments);

      // Act
      const result = await appointmentTypeService.getAppointmentTypesByCategory(category);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe(category);
      expect(result[1].category).toBe(category);
      
      // Verify service call includes active filter
      expect(appointmentTypeService['find'])
        .toHaveBeenCalledWith({ category, isActive: true });
    });

    it('should return empty array for non-existent category', async () => {
      // Arrange
      const nonExistentCategory = 'NonExistent';
      
      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue([]);

      // Act
      const result = await appointmentTypeService.getAppointmentTypesByCategory(nonExistentCategory);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('searchAppointmentTypes', () => {
    it('should return appointment types matching search tags', async () => {
      // Arrange
      const searchTerm = 'specialist';
      const mockSearchResults = [
        { ...mockAppointmentType, tags: ['specialist', 'consultation'] },
        {
          ...mockAppointmentType,
          _id: new mongoose.Types.ObjectId(),
          name: 'Specialist Follow-up',
          tags: ['specialist', 'follow-up']
        }
      ];

      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue(mockSearchResults);

      // Act
      const result = await appointmentTypeService.searchAppointmentTypes(searchTerm);

      // Assert
      expect(result).toHaveLength(2);
      result.forEach(apt => {
        expect(apt.tags).toContain(searchTerm);
      });

      // Verify correct query
      expect(appointmentTypeService['find'])
        .toHaveBeenCalledWith({
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { tags: searchTerm }
          ],
          isActive: true
        });
    });
  });

  describe('error handling for invalid filters', () => {
    it('should handle invalid category filter gracefully', async () => {
      // Arrange
      const invalidFilter = { category: {} }; // Invalid category type

      // Act & Assert
      await expect(
        appointmentTypeService.getAllAppointmentTypes(invalidFilter)
      ).rejects.toThrow('Invalid category filter');
    });

    it('should handle invalid tags filter gracefully', async () => {
      // Arrange
      const invalidFilter = { tags: {} }; // Invalid tags type

      // Act & Assert
      await expect(
        appointmentTypeService.getAllAppointmentTypes(invalidFilter)
      ).rejects.toThrow('Invalid tags filter');
    });

    it('should handle malformed filter object gracefully', async () => {
      // Arrange
      const malformedFilter = 'not an object' as any;

      // Act & Assert
      await expect(
        appointmentTypeService.getAllAppointmentTypes(malformedFilter)
      ).rejects.toThrow('Invalid filter format');
    });
  });

  describe('empty results handling', () => {
    it('should return empty array for non-existent category', async () => {
      // Arrange
      const nonExistentCategory = 'non-existent-category';
      
      // Mock find to return empty array
      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue([]);

      // Act
      const result = await appointmentTypeService.getAppointmentTypesByCategory(nonExistentCategory);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent tag search', async () => {
      // Arrange
      const nonExistentTag = 'non-existent-tag';
      
      // Mock find to return empty array
      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue([]);

      // Act
      const result = await appointmentTypeService.searchAppointmentTypes(nonExistentTag);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle complex filter with no matching results', async () => {
      // Arrange
      const complexFilter = {
        category: 'rare-category',
        tags: ['unique-tag'],
        isActive: true,
        price: { $gt: 1000 }
      };
      
      // Mock find to return empty array
      jest.spyOn(appointmentTypeService as any, 'find')
        .mockResolvedValue([]);

      // Act
      const result = await appointmentTypeService.getAllAppointmentTypes(complexFilter);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      
      // Verify correct filter was used
      expect(appointmentTypeService['find'])
        .toHaveBeenCalledWith(complexFilter);
    });
  });
}); 