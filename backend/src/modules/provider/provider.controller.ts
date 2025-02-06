import { Request, Response } from 'express';
import { ProviderService } from './provider.services';
import { ICreateProviderRequest } from './provider.schema';

export class ProviderController {
  private providerService: ProviderService;
  
  constructor(){
    this.providerService = new ProviderService()
  }

  /**
   * Creates a new provider and associated user
   * @route POST /providers
   */
  createProvider = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user: userData, ...providerData } = req.body as ICreateProviderRequest;
      
      const result = await this.providerService.createProviderWithUser(providerData, userData);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      // Handle validation errors
      if (error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('exists')) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.message
        });
        return;
      }

      // Handle duplicate email or phone error from MongoDB
      if (error.code === 11000) {
        const duplicateField = error.keyPattern?.email ? 'email' : 
                             error.keyPattern?.phone ? 'phone' : null;
        if (duplicateField) {
          res.status(409).json({
            success: false,
            error: 'Duplicate Error',
            details: `${duplicateField} already exists`
          });
          return;
        }
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        error: 'Failed to create provider',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
