const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

router.post('/', apiKeyAuth, async (req, res) => {
  try {
    const { plan_id, feature_code, limit_value } = req.body;
    if (!plan_id || !feature_code) return res.status(400).json({ error: 'plan_id and feature_code are required' });

    const { data, error } = await supabase
      .from('plan_features')
      .upsert([{ plan_id, feature_code, limit_value }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', apiKeyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('plan_features').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
