const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

/**
 * GET /api/v1/plans
 */
router.get('/', apiKeyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/plans/:id
 */
router.get('/:id', apiKeyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Plan not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/plans (Admin only)
 */
router.post('/', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, description, price, interval, feature_limits } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { data, error } = await supabase
      .from('plans')
      .insert([{
        name,
        description: description || `The ${name} plan`,
        price: parseFloat(price) || 0,
        interval: interval || 'MONTHLY',
        feature_limits: feature_limits || {}
      }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
