/** HTTP layer for /api/bookings. */
import { Request, Response } from 'express';
import { bookingService } from '../services/bookingService.js';

class BookingController {
  async getAvailability(req: Request, res: Response): Promise<void> {
    const { date } = req.query as { date: string };
    const slots = await bookingService.getAvailability(date);
    res.status(200).json(slots);
  }

  async createBooking(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.createBooking(req.body, 'online');
    res.status(201).json(booking);
  }

  async getAllBookings(req: Request, res: Response): Promise<void> {
    const { date } = req.query as { date?: string };
    const bookings = await bookingService.getAllBookings(date);
    res.status(200).json(bookings);
  }

  async createManualBooking(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.createBooking(req.body, 'manual', req.user!.id);
    res.status(201).json(booking);
  }

  async cancelBooking(req: Request, res: Response): Promise<void> {
    // req.params.id presence is guaranteed by bookingIdParamSchema validation upstream.
    const id = req.params.id as string;
    const booking = await bookingService.cancelBooking(id);
    res.status(200).json(booking);
  }
}

export const bookingController = new BookingController();
