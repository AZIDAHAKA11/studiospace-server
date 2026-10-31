const express = require('express');
const { ObjectId } = require('mongodb');
const { connectDB } = require('../db');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// 1. Add New Studio (Protected)
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const studio = {
      ...req.body,
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      createdAt: new Date()
    };
    const result = await db.collection('studios').insertOne(studio);
    res.status(201).json({ message: 'Studio added successfully', insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 2. Get all studios (with limit and category filter)
router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    const limit = parseInt(req.query.limit) || 0;
    const category = req.query.category;
    
    let queryObj = {};
    if (category) {
      queryObj.category = category; 
    }

    let query = db.collection('studios').find(queryObj);
    if (limit > 0) query = query.limit(limit);
    
    const studios = await query.toArray();
    res.status(200).json(studios);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 3. Get My Listings 
router.get('/my-listings', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const studios = await db.collection('studios')
      .find({ ownerEmail: req.user.email })
      .toArray();
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

// 5. Update a Studio (Protected)
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    const result = await db.collection('studios').updateOne(
      { _id: new ObjectId(id), ownerEmail: req.user.email },
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

// 6. Delete a Studio (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    const result = await db.collection('studios').deleteOne(
      { _id: new ObjectId(id), ownerEmail: req.user.email }
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