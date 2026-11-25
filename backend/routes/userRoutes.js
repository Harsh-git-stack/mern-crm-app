const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role active createdAt')
      .sort({ createdAt: -1 })
      .lean();
    const userIds = users.map((user) => user._id);
    const [customerCounts, leadCounts, opportunityCounts] = await Promise.all([
      Customer.aggregate([{ $match: { user: { $in: userIds } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: { owner: { $in: userIds } } }, { $group: { _id: '$owner', count: { $sum: 1 } } }]),
      Opportunity.aggregate([{ $match: { user: { $in: userIds } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]),
    ]);

    const countMap = (counts) => new Map(counts.map((item) => [item._id.toString(), item.count]));
    const customersByUser = countMap(customerCounts);
    const leadsByUser = countMap(leadCounts);
    const opportunitiesByUser = countMap(opportunityCounts);
    res.json(users.map((user) => ({
      ...user,
      counts: {
        customers: customersByUser.get(user._id.toString()) || 0,
        leads: leadsByUser.get(user._id.toString()) || 0,
        opportunities: opportunitiesByUser.get(user._id.toString()) || 0,
      },
    })));
  } catch (err) {
    console.error('Admin user list error:', err.message);
    res.status(500).json({ msg: 'Could not load users' });
  }
});

router.patch(
  '/:id/role',
  auth,
  requireAdmin,
  [check('role', 'Role must be user or admin').isIn(['user', 'admin'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).json({ msg: 'User not found' });
      if (target.id === req.user.id && req.body.role !== 'admin') {
        return res.status(400).json({ msg: 'You cannot remove your own administrator role' });
      }

      if (target.role === 'admin' && req.body.role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin', active: { $ne: false } });
        if (adminCount <= 1) {
          return res.status(400).json({ msg: 'The last active administrator cannot be demoted' });
        }
      }

      target.role = req.body.role;
      await target.save();
      res.json({ id: target.id, role: target.role });
    } catch (err) {
      console.error('Admin role update error:', err.message);
      res.status(500).json({ msg: 'Could not update user role' });
    }
  }
);

router.patch(
  '/:id/status',
  auth,
  requireAdmin,
  [check('active', 'Active status must be a boolean').isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).json({ msg: 'User not found' });
      if (target.id === req.user.id && req.body.active === false) {
        return res.status(400).json({ msg: 'You cannot deactivate your own account' });
      }

      if (target.role === 'admin' && req.body.active === false) {
        const adminCount = await User.countDocuments({ role: 'admin', active: { $ne: false } });
        if (adminCount <= 1) {
          return res.status(400).json({ msg: 'The last active administrator cannot be deactivated' });
        }
      }

      target.active = req.body.active;
      await target.save();
      res.json({ id: target.id, active: target.active });
    } catch (err) {
      console.error('Admin status update error:', err.message);
      res.status(500).json({ msg: 'Could not update account status' });
    }
  }
);

router.post(
  '/bootstrap-admin',
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const setupKey = process.env.ADMIN_SETUP_KEY;
    const providedKey = req.header('x-admin-setup-key') || '';
    if (!setupKey) {
      return res.status(503).json({ msg: 'Administrator setup is not enabled on this server' });
    }

    const expected = Buffer.from(setupKey);
    const provided = Buffer.from(providedKey);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return res.status(403).json({ msg: 'Administrator setup key is invalid' });
    }

    const email = req.body.email.trim().toLowerCase();
    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!configuredEmail || email !== configuredEmail) {
      return res.status(400).json({ msg: 'Email must match the configured ADMIN_EMAIL' });
    }

    try {
      if (await User.exists({ role: 'admin' })) {
        return res.status(409).json({ msg: 'An administrator already exists' });
      }

      let user = await User.findOne({ email });
      if (user) {
        user.name = req.body.name.trim();
        user.password = await bcrypt.hash(req.body.password, 10);
        user.role = 'admin';
        user.active = true;
      } else {
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        user = new User({
          name: req.body.name.trim(),
          email,
          password: passwordHash,
          role: 'admin',
        });
      }
      await user.save();

      const token = jwt.sign(
        { user: { id: user.id, role: 'admin' } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: 'admin' },
      });
    } catch (err) {
      console.error('Administrator bootstrap error:', err.message);
      return res.status(500).json({ msg: 'Could not initialize administrator account' });
    }
  }
);

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // See if user already exists
      let user = await User.findOne({ email: email.trim().toLowerCase() });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      // Encrypt the password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save the user to the database
      await user.save();

      // Create and return a JSON Web Token
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err.message);
      if (err.code === 11000) {
        return res.status(409).json({ msg: 'User already exists' });
      }
      res.status(500).json({ msg: 'Server Error' });
    }
  }
);

module.exports = router;
