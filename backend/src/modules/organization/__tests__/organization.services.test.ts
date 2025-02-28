import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { OrganizationService } from '../organization.services';
import { IOrganization } from '../organization.schema';

describe('Organization Service Tests', () => {
  let mongoServer: MongoMemoryServer;
  let organizationService: OrganizationService;
  let createdOrganizationId: string;

  beforeAll(async () => {
    // Create in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    organizationService = new OrganizationService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Test case for creating an organization
  it('should create a new organization', async () => {
    const organizationData: Partial<IOrganization> = {
      name: 'Test Clinic',
      description: 'A test healthcare clinic',
      contact: {
        email: 'contact@testclinic.com',
        phone: '+1234567890'
      }
    };

    const result = await organizationService.createOrganization(organizationData);
    
    expect(result).toBeDefined();
    expect(result._id).toBeDefined();
    expect(result.name).toBe(organizationData.name);
    expect(result.description).toBe(organizationData.description);
    expect(result.contact?.email).toBe(organizationData.contact?.email);
    
    // Save ID for later tests
    createdOrganizationId = result._id.toString();
  });

  // Test case for getting an organization by ID
  it('should get an organization by ID', async () => {
    const organization = await organizationService.getOrganizationById(createdOrganizationId);
    
    expect(organization).toBeDefined();
    expect(organization?._id.toString()).toBe(createdOrganizationId);
    expect(organization?.name).toBe('Test Clinic');
  });

  // Test case for getting all organizations
  it('should get all organizations', async () => {
    // Create another organization first
    await organizationService.createOrganization({
      name: 'Second Clinic',
      description: 'Another test clinic'
    });
    
    const organizations = await organizationService.getAllOrganizations();
    
    expect(organizations).toBeDefined();
    expect(Array.isArray(organizations)).toBe(true);
    expect(organizations.length).toBe(2);
  });

  // Test case for updating an organization
  it('should update an organization', async () => {
    const updateData: Partial<IOrganization> = {
      name: 'Updated Clinic Name',
      contact: {
        email: 'updated@testclinic.com',
        phone: '+9876543210'
      }
    };
    
    const updated = await organizationService.updateOrganization(createdOrganizationId, updateData);
    
    expect(updated).toBeDefined();
    expect(updated?.name).toBe(updateData.name);
    expect(updated?.contact?.email).toBe(updateData.contact?.email);
    expect(updated?.contact?.phone).toBe(updateData.contact?.phone);
  });

  // Test case for searching organizations
  it('should search organizations by term', async () => {
    const results = await organizationService.searchOrganizations('Updated');
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Updated Clinic Name');
  });

  // Test case for deleting an organization
  it('should delete an organization', async () => {
    const deleted = await organizationService.deleteOrganization(createdOrganizationId);
    
    expect(deleted).toBeDefined();
    expect(deleted?._id.toString()).toBe(createdOrganizationId);
    
    // Verify it's gone
    const found = await organizationService.getOrganizationById(createdOrganizationId);
    expect(found).toBeNull();
  });

  // Test case for development-only deleteAll function
  it('should delete all organizations in development mode', async () => {
    // Set environment to development
    process.env.NODE_ENV = 'development';
    
    // Create a few more organizations
    await organizationService.createOrganization({ name: 'Org 1' });
    await organizationService.createOrganization({ name: 'Org 2' });
    
    // Delete all
    await organizationService.deleteAll();
    
    // Verify all are gone
    const remaining = await organizationService.getAllOrganizations();
    expect(remaining.length).toBe(0);
  });
}); 