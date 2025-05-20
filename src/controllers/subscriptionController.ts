import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import { AuthRequest } from '../middleware/authMiddleware';

class SubscriptionController {


  async create(req: AuthRequest, res: Response) {
    try {
      const subscription = new Subscription({
        name: req.body.name,
        price: req.body.price,
        examAttemptsLimit: req.body.examAttemptsLimit,
        validityDays: req.body.validityDays
      });

      const savedSubscription = await subscription.save();
      res.status(201).json(savedSubscription);
    } catch (error) {
      res.status(400).json({ message: 'Error creating subscription', error });
    }
  }

  // Get all subscriptions
  async getAll(req: AuthRequest, res: Response) {
    try {
      const subscriptions = await Subscription.find()
        .sort({ price: 1 });
      res.status(200).json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching subscriptions', error });
    }
  }

  // Get subscription by ID
  async getById(req: AuthRequest, res: Response):Promise<void> {
    try {
      const subscription = await Subscription.findById(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: 'Subscription not found' });
        return;
      }
      res.status(200).json(subscription);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching subscription', error });
    }
  }

  // Update subscription
  async update(req: AuthRequest, res: Response):Promise<void> {
    try {
      const subscription = await Subscription.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          price: req.body.price,
          examAttemptsLimit: req.body.examAttemptsLimit,
          validityDays: req.body.validityDays
        },
        { new: true, runValidators: true }
      );

      if (!subscription) {
         res.status(404).json({ message: 'Subscription not found' });
         return;
      }

      res.status(200).json(subscription);
    } catch (error) {
      res.status(400).json({ message: 'Error updating subscription', error });
    }
  }

  // Delete subscription
  async delete(req: AuthRequest, res: Response):Promise<void> {
    try {
      const subscription = await Subscription.findByIdAndDelete(req.params.id);
      if (!subscription) {
        res.status(404).json({ message: 'Subscription not found' });
        return;
      }
      res.status(200).json({ message: 'Subscription deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting subscription', error });
    }
  }

  // Get subscriptions within a price range
  async getByPriceRange(req: AuthRequest, res: Response):Promise<void> {
    try {
      const { minPrice, maxPrice } = req.query;
      const subscriptions = await Subscription.find({
        price: {
          $gte: Number(minPrice) || 0,
          $lte: Number(maxPrice) || Number.MAX_VALUE
        }
      }).sort({ price: 1 });

      res.status(200).json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching subscriptions by price range', error });
    }
  }

  // Get subscriptions by validity days
  async getByValidityDays(req: AuthRequest, res: Response):Promise<void> {
    try {
      const { days } = req.query;
      const subscriptions = await Subscription.find({
        validityDays: Number(days)
      }).sort({ price: 1 });

      res.status(200).json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching subscriptions by validity days', error });
    }
  }

  // Check if subscription exists
  async exists(req: AuthRequest, res: Response):Promise<void> {
    try {
      const exists = await Subscription.exists({ _id: req.params.id });
      res.status(200).json({ exists: !!exists });
    } catch (error) {
      res.status(500).json({ message: 'Error checking subscription existence', error });
    }
  }
}

export const subscriptionController = new SubscriptionController();