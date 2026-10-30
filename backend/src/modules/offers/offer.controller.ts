import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Offer } from './offer.model';

export const getActiveOffers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      $or: [
        { startDate: { $exists: false }, endDate: { $exists: false } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
      ],
    }).sort({ priority: -1, createdAt: -1 });

    return sendResponse({
      res,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

export const listAllOffers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const offers = await Offer.find().sort({ priority: -1, createdAt: -1 });
    return sendResponse({
      res,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

export const createOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offer = await Offer.create(req.body);
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Offer created successfully',
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndUpdate(id, req.body, { new: true });
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    return sendResponse({
      res,
      message: 'Offer updated successfully',
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    return sendResponse({
      res,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
