import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';

const router = Router();
const googleClient = new OAuth2Client();

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const role = 'viewer';

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

    const valid = user.passwordHash && await bcrypt.compare(password, user.passwordHash);
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

router.post('/google', async (req, res, next) => {
  try {
    if (!config.googleClientId) {
      return res.status(503).json({ message: 'Google sign-in is not configured.' });
    }

    const credential = req.body.credential;
    if (typeof credential !== 'string' || !credential) {
      return res.status(400).json({ message: 'A Google credential is required.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Invalid Google credential.' });
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ message: 'Google must provide a verified email address.' });
    }

    const email = payload.email.trim().toLowerCase();
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.findOne({ email });
      if (user?.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ message: 'This email is linked to a different Google account.' });
      }

      if (user) {
        user.googleId = payload.sub;
        await user.save();
      } else {
        user = await User.create({ email, googleId: payload.sub, role: 'viewer' });
      }
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
