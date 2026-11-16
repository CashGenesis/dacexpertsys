import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// Official DAC policy sections (the policy documents in the RAG knowledge base).
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, metadata
       FROM rag_documents
       WHERE document_type = 'dac_policy'
       ORDER BY id`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

export default router;
