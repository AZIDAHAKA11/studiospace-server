const express = require('express');
const { ObjectId } = require('mongodb');
const { connectDB } = require('../db');
const verifyToken = require('../middleware/verifyToken');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper to get email from either Query or JWT Cookie
const getEmail = (req) => {
  let email = req.query.email;
  if (!email && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      email = decoded.email;
    } catch (err) {}
  }
  return email;
};

// 1. Add New Studio
router.post('/', async (req, res) => {
  try {
    const email = getEmail(req);
    let name = req.body.ownerName;

    // If using Email login, get name from cookie
    if (!name && req.cookies.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        name = decoded.name;
      } catch (err) {}
    }

    if (!email) return res.status(401).json({ message: 'Unauthorized' });

    const db = await connectDB();
    const studio = {
      ...req.body,
      ownerEmail: email,
      ownerName: name || 'Host',
      createdAt: new Date()
    };
    const result = await db.collection('studios').insertOne(studio);
    res.status(201).json({ message: 'Studio added successfully', insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 2. Get all studios
router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    const limit = parseInt(req.query.limit) || 0;
    let query = db.collection('studios').find({});
    if (limit > 0) query = query.limit(limit);
    const studios = await query.toArray();
    res.status(200).json(studios);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 3. Get My Listings (Unified for both Google and Email)
router.get('/my-listings', async (req, res) => {
  try {
    const email = getEmail(req);
    if (!email) return res.status(401).json({ message: 'Unauthorized' });

    const db = await connectDB();
    const studios = await db.collection('studios').find({ ownerEmail: email }).toArray();
    res.status(200).json(studios);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 4. Get a single studio
router.get('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const studio = await db.collection('studios').findOne({ _id: new ObjectId(req.params.id) });
    if (!studio) return res.status(404).json({ message: 'Studio not found' });
    res.status(200).json(studio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 5. Update a Studio (Unified)
router.patch('/:id', async (req, res) => {
  try {
    const email = getEmail(req);
    if (!email) return res.status(401).json({ message: 'Unauthorized' });

    const db = await connectDB();
    const result = await db.collection('studios').updateOne(
      { _id: new ObjectId(req.params.id), ownerEmail: email },
      { $set: req.body }
    );
    if (result.matchedCount === 0) {
      return res.status(403).json({ message: 'Unauthorized or Studio not found' });
    }
    res.status(200).json({ message: 'Studio updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 6. Delete a Studio (Unified)
router.delete('/:id', async (req, res) => {
  try {
    const email = getEmail(req);
    if (!email) return res.status(401).json({ message: 'Unauthorized' });

    const db = await connectDB();
    const result = await db.collection('studios').deleteOne(
      { _id: new ObjectId(req.params.id), ownerEmail: email }
    );
    if (result.deletedCount === 0) {
      return res.status(403).json({ message: 'Unauthorized or Studio not found' });
    }
    res.status(200).json({ message: 'Studio deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;