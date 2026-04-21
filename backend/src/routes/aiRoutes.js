const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getUpgradeRecommendation } = require('../services/geminiService');

router.post('/recommend', authenticate, async (req, res) => {
  try {
    const { currentPlan, deniedFeature, usageData } = req.body;
    const recommendation = await getUpgradeRecommendation(currentPlan, deniedFeature, usageData);
    res.json(recommendation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

module.exports = router;
