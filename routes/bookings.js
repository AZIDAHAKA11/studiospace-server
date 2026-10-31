const express = require('express');
const { ObjectId } = require('mongodb');
const { connectDB } = require('../db');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// 1. Create a Booking (With Double-Booking Prevention)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { studioId, date, startTime, endTime, totalPrice } = req.body;
    const db = await connectDB();

   
    const existingBooking = await db.collection('bookings').findOne({
      studioId,
      date,
      status: { $in: ['Pending', 'Confirmed'] }, 
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: "This time slot is already booked. Please select a different time." 
      });
    }

    const newBooking = {
      studioId,
      userEmail: req.user.email,
      userName: req.user.name,
      date,
      startTime,
      endTime,
      totalPrice,
      status: 'Pending',
      createdAt: new Date()
    };

    const result = await db.collection('bookings').insertOne(newBooking);
    res.status(201).json({ message: 'Booking requested successfully', bookingId: result.insertedId });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 2. Get My Bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = await db.collection('bookings')
      .find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 3. Cancel a Booking
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const bookingId = req.params.id;

    
    const result = await db.collection('bookings').updateOne(
      { _id: new ObjectId(bookingId), userEmail: req.user.email },
      { $set: { status: 'Cancelled' } }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'Booking not found or unauthorized' });
    }

    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;