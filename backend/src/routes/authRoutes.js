import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const role = req.body.role === 'admin' ? 'admin' : 'viewer';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role });

    res.status(201).json({
      token: signToken(user),
      user: { email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const requestedRole = req.body.role === 'admin' ? 'admin' : 'viewer';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.role !== requestedRole) {
      return res.status(403).json({ message: `This account is registered as ${user.role}, not ${requestedRole}.` });
    }

    res.json({
      token: signToken(user),
      user: { email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
