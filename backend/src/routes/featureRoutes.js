const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const { apiKeyAuth } = require('../middleware/apiKeyAuth');

/**
 * GET /api/v1/features
 */
router.get('/', apiKeyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/features (Admin only)
 */
router.post('/', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { code, name, description, usage_tracked } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });

    const { data, error } = await supabase
      .from('features')
      .insert([{ code: code.toUpperCase(), name, description, usage_tracked: !!usage_tracked }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
