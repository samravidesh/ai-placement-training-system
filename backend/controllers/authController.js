const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, findUserById } = require('../models/userModel');
const { jwt: jwtConfig } = require('../config/env');

const validInterestTypes = ['govt', 'private', 'tech', 'non-tech'];
const deriveNameFromEmail = (email) => {
  const local = String(email || '').split('@')[0] || 'new_user';
  return local
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') || 'New User';
};

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      branch,
      education_level,
      interest_type
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'password must be at least 6 characters'
      });
    }

    const normalizedInterestType = interest_type || 'tech';
    if (!validInterestTypes.includes(normalizedInterestType)) {
      return res.status(400).json({
        message: 'interest_type must be one of: govt, private, tech, non-tech'
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      name: name || deriveNameFromEmail(email),
      email,
      password: hashedPassword,
      branch,
      education_level,
      interest_type: normalizedInterestType
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        branch: user.branch,
        education_level: user.education_level,
        interest_type: user.interest_type,
        onboarding_completed: Boolean(user.onboarding_completed)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};
