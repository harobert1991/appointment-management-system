import { DatabaseService } from '../../rootModules/database/database.services';
import { Organization, IOrganization } from './organization.schema';
import { FilterQuery } from 'mongoose';
import { logger } from '../../utils';

export class OrganizationService extends DatabaseService<IOrganization> {
  constructor() {
    super(Organization);
  }

  /**
   * Creates a new organization
   */
  async createOrganization(data: Partial<IOrganization>): Promise<IOrganization> {
    try {
      // Check if name already exists if provided
      if (data.name) {
        const existingOrg = await this.findOne({ name: data.name });
        if (existingOrg) {
          throw new Error(`Organization with name "${data.name}" already exists`);
        }
      }

      return await this.create(data);
    } catch (error: any) {
      logger.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Gets an organization by ID
   */
  async getOrganizationById(id: string): Promise<IOrganization | null> {
    try {
      return await this.findById(id);
    } catch (error: any) {
      logger.error(`Error fetching organization with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Gets all organizations with optional filtering
   */
  async getAllOrganizations(filter: FilterQuery<IOrganization> = {}): Promise<IOrganization[]> {
    try {
      return await this.find(filter);
    } catch (error: any) {
      logger.error('Error fetching organizations:', error);
      throw error;
    }
  }

  /**
   * Updates an organization
   */
  async updateOrganization(
    id: string, 
    updateData: Partial<IOrganization>
  ): Promise<IOrganization | null> {
    try {
      // Check if organization exists
      const existingOrg = await this.findById(id);
      if (!existingOrg) {
        return null;
      }

      // Check name uniqueness if being updated
      if (updateData.name && updateData.name !== existingOrg.name) {
        const nameExists = await this.findOne({ 
          name: updateData.name,
          _id: { $ne: id } // Exclude current document from check
        });
        if (nameExists) {
          throw new Error(`Organization with name "${updateData.name}" already exists`);
        }
      }

      // Prevent updating timestamps manually
      delete updateData.createdAt;
      delete updateData.updatedAt;

      return await this.update({ _id: id }, updateData);
    } catch (error: any) {
      logger.error(`Error updating organization with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes an organization
   */
  async deleteOrganization(id: string): Promise<IOrganization | null> {
    try {
      return await this.delete({ _id: id });
    } catch (error: any) {
      logger.error(`Error deleting organization with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Searches organizations by name or email
   */
  async searchOrganizations(searchTerm: string): Promise<IOrganization[]> {
    try {
      return await this.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { 'contact.email': { $regex: searchTerm, $options: 'i' } },
          { 'contact.phone': { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      });
    } catch (error: any) {
      logger.error(`Error searching organizations with term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Development only: Deletes all organizations
   */
  async deleteAll(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('This operation is not allowed in production');
      }
      
      await this.deleteMany({});
      logger.info('All organizations deleted successfully');
    } catch (error: any) {
      logger.error('Error deleting all organizations:', error);
      throw error;
    }
  }
}
