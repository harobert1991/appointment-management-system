import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Request, Response } from 'express';
import { ProviderController } from '../provider.controller';
import { Provider } from '../provider.schema';
import { User, UserRole } from '../../user/user.schema';
import { AppointmentType } from '../../appointmentType/appointmentType.schema';

// Define the TimeSlot interface to properly type the filter functions
interface TimeSlot {
  startTime: string;
  endTime: string;
  date: string;
  locationId?: string;
}

describe('Provider Controller Integration Tests', () => {
  let mongoServer: MongoMemoryReplSet;
  let controller: ProviderController;
  let providerId: string;
  let appointmentTypeId: string;

  // Mock response object
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeAll(async () => {
    // Set up MongoDB memory server
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.command({ ping: 1 });
    
    // Create controller
    controller = new ProviderController();
  });

  beforeEach(async () => {
    // Create test data
    // 1. Create an appointment type
    const appointmentType = await AppointmentType.create({
      name: 'Test Appointment',
      duration: 60,
      isActive: true
    });
    appointmentTypeId = appointmentType._id.toString();

    // 2. Create a user
    const user = await User.create({
      email: 'provider@test.com',
      firstName: 'Test',
      lastName: 'Provider',
      phone: '+12345678901',
      role: UserRole.PROVIDER
    });

    // 3. Create a provider with availability
    const provider = await Provider.create({
      userId: user._id,
      servicesOffered: [appointmentType._id],
      availability: [
        {
          dayOfWeek: 'Monday',
          timeSlots: [
            {
              startTime: '09:00',
              endTime: '17:00',
              requiresTravelTime: false,
              spansOvernight: false
            }
          ],
          isRecurring: true
        },
        {
          dayOfWeek: 'Tuesday',
          timeSlots: [
            {
              startTime: '09:00',
              endTime: '17:00',
              requiresTravelTime: false,
              spansOvernight: false
            }
          ],
          isRecurring: true
        }
      ]
    });
    providerId = provider._id.toString();
  });

  afterEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('getAvailableTimeSlots', () => {
    it('should return available slots for a single date', async () => {
      // Use a Monday date
      const date = '2024-04-01'; // This is a Monday
      
      // Create mock request
      const req = {
        params: { providerId },
        query: { 
          dates: date,
          appointmentTypeId
        }
      } as unknown as Request;
      
      const res = mockResponse();
      
      // Call controller method
      await controller.getAvailableTimeSlots(req, res);
      
      // Assert response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Extract the data from the response
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      
      // Should have slots for a full 9-5 workday (8 one-hour slots)
      expect(responseData.data.length).toBe(8);
      
      // Check the format of the slots
      const firstSlot = responseData.data[0];
      expect(firstSlot).toHaveProperty('startTime');
      expect(firstSlot).toHaveProperty('endTime');
      expect(firstSlot).toHaveProperty('date');
      expect(firstSlot.date).toBe(date);
    });
    
    it('should return available slots for multiple dates', async () => {
      // Use both Monday and Tuesday
      const dates = ['2024-04-01', '2024-04-02']; // Monday and Tuesday
      
      // Create mock request
      const req = {
        params: { providerId },
        query: { 
          dates,
          appointmentTypeId
        }
      } as unknown as Request;
      
      const res = mockResponse();
      
      // Call controller method
      await controller.getAvailableTimeSlots(req, res);
      
      // Assert response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Extract the data from the response
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      
      // Should have slots for two full 9-5 workdays (16 one-hour slots)
      expect(responseData.data.length).toBe(16);
      
      // Check that we have slots for both dates
      const mondaySlots = responseData.data.filter((slot: TimeSlot) => slot.date === dates[0]);
      const tuesdaySlots = responseData.data.filter((slot: TimeSlot) => slot.date === dates[1]);
      
      expect(mondaySlots.length).toBe(8);
      expect(tuesdaySlots.length).toBe(8);
    });
    
    it('should return 400 if appointmentTypeId is missing', async () => {
      const req = {
        params: { providerId },
        query: { 
          dates: '2024-04-01'
        }
      } as unknown as Request;
      
      const res = mockResponse();
      
      await controller.getAvailableTimeSlots(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Validation Error');
    });
    
    it('should return 404 if provider not found', async () => {
      const req = {
        params: { providerId: new mongoose.Types.ObjectId().toString() },
        query: { 
          dates: '2024-04-01',
          appointmentTypeId
        }
      } as unknown as Request;
      
      const res = mockResponse();
      
      await controller.getAvailableTimeSlots(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
    
    it('should return 404 if appointment type not found', async () => {
      const req = {
        params: { providerId },
        query: { 
          dates: '2024-04-01',
          appointmentTypeId: new mongoose.Types.ObjectId().toString()
        }
      } as unknown as Request;
      
      const res = mockResponse();
      
      await controller.getAvailableTimeSlots(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
    
    it('should return 400 if date format is invalid', async () => {
      const req = {
        params: { providerId },
        query: { 
          dates: '2024/04/01', // Wrong format
          appointmentTypeId
        }
      } as unknown as Request;
      
      const res = mockResponse();
      
      await controller.getAvailableTimeSlots(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });
}); 