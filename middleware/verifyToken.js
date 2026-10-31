const jwt = require('jsonwebtoken');
const { connectDB } = require('../db');
const { ObjectId } = require('mongodb');

const verifyToken = async (req, res, next) => {
  try {
    
    const customToken = req.cookies.token;
    if (customToken) {
      try {
        const decoded = jwt.verify(customToken, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (err) {
        
      }
    }

   
    const baToken = req.cookies['better-auth.session_token'] || req.cookies['__Secure-better-auth.session_token'];
    if (baToken) {
      const db = await connectDB();
      
      const session = await db.collection('session').findOne({ token: baToken.split('.')[0] });
      
      if (session) {
        const user = await db.collection('user').findOne({ _id: new ObjectId(session.userId) });
        if (user) {
          req.user = { id: user._id, email: user.email, name: user.name };
          return next();
        }
      }
    }

    return res.status(401).json({ message: 'Unauthorized: Please login again' });
  } catch (error) {
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = verifyToken;