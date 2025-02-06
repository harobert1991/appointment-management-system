import mongoose from 'mongoose';
import { ProviderService } from '../provider.services';
import { UserRole } from '../../user/user.schema';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { DayOfWeek } from '../provider.schema';
import { AppointmentType } from '../../appointmentType/appointmentType.schema';

describe('Provider Integration Tests', () => {
  let mongoServer: MongoMemoryReplSet;
  let providerService: ProviderService;
  let serviceId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Create replica set
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' }
    });

    const mongoUri = mongoServer.getUri();
    
    // Wait for replica set to be ready
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.command({ ping: 1 });

    // Wait a bit more to ensure replica set is fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    providerService = new ProviderService();

    // Create a test service
    const service = await AppointmentType.create({
      name: 'Test Service',
      duration: 60,
      description: 'Test service description'
    });
    serviceId = service._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Provider Creation', () => {
    it('should not allow two providers with the same phone number', async () => {
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          // First provider data
          const firstProviderData = {
            servicesOffered: [],
            availability: [{
              dayOfWeek: 'Monday' as DayOfWeek,
              timeSlots: [{
                startTime: '09:00',
                endTime: '17:00',
                requiresTravelTime: false,
                spansOvernight: false
              }],
              isRecurring: true
            }]
          };

          const firstUserData = {
            email: 'provider1@test.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+12345678901',
            password: 'password123',
            role: UserRole.PROVIDER
          };

          // Second provider data with same phone number
          const secondProviderData = {
            servicesOffered: [],
            availability: [{
              dayOfWeek: 'Tuesday' as DayOfWeek,
              timeSlots: [{
                startTime: '09:00',
                endTime: '17:00',
                requiresTravelTime: false,
                spansOvernight: false
              }],
              isRecurring: true
            }]
          };

          const secondUserData = {
            email: 'provider2@test.com',
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+12345678901',
            password: 'password456',
            role: UserRole.PROVIDER
          };

          // Create first provider
          await providerService.createProviderWithUser(firstProviderData, firstUserData);

          // Attempt to create second provider with same phone
          await expect(
            providerService.createProviderWithUser(secondProviderData, secondUserData)
          ).rejects.toThrow(/(?:phone already exists|E11000.*phone.*dup key)/i);  // Match either error message
          
          // Verify only one provider exists with this phone
          const User = mongoose.model('User');
          const usersWithPhone = await User.find({ phone: '+12345678901' });
          expect(usersWithPhone).toHaveLength(1);
          
          break;
        } catch (error: any) {
          if (error.message.includes('WriteConflict') && retryCount < maxRetries - 1) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }
    });

    // Add a positive test case
    it('should allow providers with different phone numbers', async () => {
      const firstProviderData = {
        servicesOffered: [],
        availability: [{
          dayOfWeek: 'Monday' as DayOfWeek,
          timeSlots: [{
            startTime: '09:00',
            endTime: '17:00',
            requiresTravelTime: false,
            spansOvernight: false
          }],
          isRecurring: true
        }]
      };

      const firstUserData = {
        email: 'provider1@test.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+12345678901',
        password: 'password123',
        role: UserRole.PROVIDER
      };

      const secondProviderData = {
        servicesOffered: [],
        availability: [{
          dayOfWeek: 'Tuesday' as DayOfWeek,
          timeSlots: [{
            startTime: '09:00',
            endTime: '17:00',
            requiresTravelTime: false,
            spansOvernight: false
          }],
          isRecurring: true
        }]
      };

      const secondUserData = {
        email: 'provider2@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+12345678902',
        password: 'password456',
        role: UserRole.PROVIDER
      };

      // Both creations should succeed
      await providerService.createProviderWithUser(firstProviderData, firstUserData);
      const secondProvider = await providerService.createProviderWithUser(secondProviderData, secondUserData);
      
      expect(secondProvider).toBeDefined();
    });

    it('should not allow duplicate phone numbers even within a transaction', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const firstProviderData = {
          servicesOffered: [],
          availability: [{
            dayOfWeek: 'Monday' as DayOfWeek,
            timeSlots: [{
              startTime: '09:00',
              endTime: '17:00',
              requiresTravelTime: false,
              spansOvernight: false
            }],
            isRecurring: true
          }]
        };

        const firstUserData = {
          email: 'provider1@test.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+12345678901',
          password: 'password123',
          role: UserRole.PROVIDER
        };

        // Create first provider within transaction
        await providerService.createProviderWithUser(
          firstProviderData, 
          firstUserData,
          { session }
        );

        // Attempt to create second provider with same phone in same transaction
        const secondProviderData = { ...firstProviderData };
        const secondUserData = {
          ...firstUserData,
          email: 'provider2@test.com'
        };

        await expect(
          providerService.createProviderWithUser(
            secondProviderData,
            secondUserData,
            { session }
          )
        ).rejects.toThrow(/phone already exists/i);

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      // Verify only one user exists with this phone
      const User = mongoose.model('User');
      const usersWithPhone = await User.find({ phone: '+12345678901' });
      expect(usersWithPhone).toHaveLength(1);
    });
  });
}); 