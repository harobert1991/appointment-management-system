import { Request, Response } from 'express';
import { OrganizationService } from './organization.services';

export class OrganizationController {
  private organizationService: OrganizationService;

  constructor() {
    this.organizationService = new OrganizationService();
  }

  /**
   * Creates a new organization
   * @route POST /organizations
   */
  createOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
      const organization = await this.organizationService.createOrganization(req.body);
      
      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          details: error.message
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Gets organization by ID
   * @route GET /organizations/:id
   */
  getOrganizationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organization = await this.organizationService.getOrganizationById(id);
      
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Gets all organizations with optional filtering
   * @route GET /organizations
   */
  getAllOrganizations = async (req: Request, res: Response): Promise<void> => {
    try {
      // Convert query params to filter
      const filter = req.query.isActive !== undefined 
        ? { isActive: req.query.isActive === 'true' } 
        : {};
        
      const organizations = await this.organizationService.getAllOrganizations(filter);
      
      res.status(200).json({
        success: true,
        count: organizations.length,
        data: organizations
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Updates an organization
   * @route PUT /organizations/:id
   */
  updateOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organization = await this.organizationService.updateOrganization(id, req.body);
      
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          details: error.message
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Deletes an organization
   * @route DELETE /organizations/:id
   */
  deleteOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organization = await this.organizationService.deleteOrganization(id);
      
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: { message: 'Organization deleted successfully' }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Searches organizations by term
   * @route GET /organizations/search
   */
  searchOrganizations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { term } = req.query;
      
      if (!term || typeof term !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          details: 'Search term is required'
        });
        return;
      }
      
      const organizations = await this.organizationService.searchOrganizations(term);
      
      res.status(200).json({
        success: true,
        count: organizations.length,
        data: organizations
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to search organizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Deletes all organizations (development only)
   * @route DELETE /organizations/delete-all
   */
  deleteAllOrganizations = async (req: Request, res: Response): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          details: 'This operation is not allowed in production environment'
        });
        return;
      }
      
      await this.organizationService.deleteAll();
      
      res.status(200).json({
        success: true,
        data: { message: 'All organizations deleted successfully' }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete organizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
