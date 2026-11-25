const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Import all necessary models
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');

// @route   GET /api/analytics/summary
// @desc    Get a summary of key CRM metrics
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const customerQuery = isAdmin ? {} : { user: req.user.id };
    const leadQuery = isAdmin ? {} : { owner: req.user.id };
    const opportunityQuery = isAdmin ? {} : { user: req.user.id };

    const [totalCustomers, totalLeads, totalOpportunities, recentCustomers] = await Promise.all([
      Customer.countDocuments(customerQuery),
      Lead.countDocuments(leadQuery),
      Opportunity.countDocuments(opportunityQuery),
      Customer.find(customerQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name company'),
    ]);

    const pipeline = [];
    if (!isAdmin) {
      pipeline.push({ $match: { user: new mongoose.Types.ObjectId(req.user.id) } });
    }
    pipeline.push(
      {
        $group: {
          _id: '$stage',
          totalValue: { $sum: '$value' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    );
    const salesPipeline = await Opportunity.aggregate(pipeline);

    const summary = {
      totalCounts: {
        customers: totalCustomers,
        leads: totalLeads,
        opportunities: totalOpportunities,
      },
      salesPipeline,
      recentCustomers,
      ...(isAdmin ? { totalUsers: await require('../models/User').countDocuments() } : {}),
    };

    res.json(summary);
  } catch (err) {
    console.error('Server Error in analytics route:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
