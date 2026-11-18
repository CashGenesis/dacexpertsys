import {
  createEvidenceService,
  getEvidenceByIdService,
  getEvidenceService,
  updateEvidenceService,
  deleteEvidenceService,
  attachEvidenceToCaseService,
} from '../services/evidence.service.js';
import { getCaseByIdService } from '../services/cases.service.js';
import { resolveEvidenceUrl, uploadEvidenceFile } from '../services/storage.service.js';

export async function getEvidenceController(req, res) {
  try {
    const caseId = req.query?.case_id ? Number(req.query.case_id) : null;
    const evidence = await getEvidenceService({ caseId });
    return res.status(200).json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return res.status(500).json({ error: 'Failed to fetch evidence' });
  }
}

export async function getEvidenceByIdController(req, res) {
  try {
    const evidenceId = Number(req.params.id);
    if (!evidenceId) {
      return res.status(400).json({ error: 'A valid evidence id is required' });
    }

    const evidence = await getEvidenceByIdService(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return res.status(500).json({ error: 'Failed to fetch evidence' });
  }
}

export async function uploadEvidenceController(req, res) {
  try {
    // case_id for one case, or case_ids ("12,13,14") for a group incident: the file is
    // stored once and attached to every listed case.
    const rawIds = req.body?.case_ids || req.query?.case_ids || req.body?.case_id || req.query?.case_id || '';
    const caseIds = [...new Set(String(rawIds).split(',').map((v) => Number(v.trim())).filter(Boolean))];
    if (!caseIds.length) {
      return res.status(400).json({ error: 'case_id is required' });
    }
    if (caseIds.length > 50) {
      return res.status(400).json({ error: 'Evidence can be attached to at most 50 cases at once' });
    }

    const existing = await Promise.all(caseIds.map((id) => getCaseByIdService(id)));
    if (existing.some((c) => !c)) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Evidence file is required' });
    }

    // Stored reference: "supabase://<bucket>/cases/<first case id>/<file>" (private bucket).
    const fileUrl = await uploadEvidenceFile({
      caseId: caseIds[0],
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      extension: req.file.extension || '',
      randomId: req.file.randomId,
    });

    const evidenceRows = [];
    for (const caseId of caseIds) {
      evidenceRows.push(await createEvidenceService({
        caseId,
        fileUrl,
        fileType: req.file.mimetype,
        uploadedBy: Number(req.user?.sub) || null,
      }));
      await attachEvidenceToCaseService(caseId, fileUrl);
    }

    return res.status(201).json({
      evidence: evidenceRows[0],
      evidenceCount: evidenceRows.length,
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    if (error?.message === 'STORAGE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Evidence storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.',
      });
    }
    console.error('Evidence upload error:', error);
    const details = error?.code === 'STORAGE_UPLOAD_FAILED' ? error.message : undefined;
    return res.status(500).json({ error: 'Failed to upload evidence', details });
  }
}

// GET /api/cases/:id/evidence — the case's evidence files with links the browser can open.
// Staff may view any case; students only their own. Supabase links expire after 10 minutes.
export async function getCaseEvidenceController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const caseItem = await getCaseByIdService(caseId);
    const isOtherStudentsCase = String(req.user?.role || '').toLowerCase() === 'student'
      && Number(caseItem?.student_id) !== Number(req.user?.sub);
    if (!caseItem || isOtherStudentsCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const backendOrigin = `${req.protocol}://${req.get('host')}`;
    const rows = await getEvidenceService({ caseId });

    // Older cases may only have cases.evidence_url without an evidence row.
    if (!rows.length && caseItem.evidence_url) {
      rows.push({ id: null, case_id: caseId, file_url: caseItem.evidence_url, file_type: null, created_at: caseItem.created_at });
    }

    const items = await Promise.all(rows.map(async (row) => ({
      id: row.id,
      file_type: row.file_type,
      created_at: row.created_at,
      name: String(row.file_url || '').split('/').pop() || 'Evidence',
      url: await resolveEvidenceUrl(row.file_url, backendOrigin),
    })));

    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching case evidence:', error);
    return res.status(500).json({ error: 'Failed to fetch case evidence' });
  }
}

export async function updateEvidenceController(req, res) {
  try {
    const evidenceId = Number(req.params.id);
    if (!evidenceId) {
      return res.status(400).json({ error: 'A valid evidence id is required' });
    }

    const updated = await updateEvidenceService(evidenceId, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating evidence:', error);
    return res.status(500).json({ error: 'Failed to update evidence' });
  }
}

export async function deleteEvidenceController(req, res) {
  try {
    const evidenceId = Number(req.params.id);
    if (!evidenceId) {
      return res.status(400).json({ error: 'A valid evidence id is required' });
    }

    const deleted = await deleteEvidenceService(evidenceId);
    if (!deleted) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json({ message: 'Evidence deleted', evidence: deleted });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return res.status(500).json({ error: 'Failed to delete evidence' });
  }
}
