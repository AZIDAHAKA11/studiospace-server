const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../db');

const router = express.Router();

// 1. User Registration (Sign Up)
router.post('/register', async (req, res) => {
  try {
    const { name, email, photoURL, password } = req.body;
    const db = await connectDB();

   
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // পাসওয়ার্ড হ্যাশ করা
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      photoURL: photoURL || '',
      password: hashedPassword,
      role: 'user',
      createdAt: new Date()
    };

    await db.collection('users').insertOne(newUser);
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 2. User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await connectDB();

  
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

   
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

   
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, 
      sameSite: 'none', 
      maxAge: 7 * 24 * 60 * 60 * 1000 // ৭ দিন
    });

    res.status(200).json({ 
      message: 'Login successful', 
      user: { name: user.name, email: user.email, photoURL: user.photoURL } 
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 3. Get Current User (Check if logged in)
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await connectDB();

    const user = await db.collection('users').findOne(
      { email: decoded.email },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// 4. Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;