import { Router } from 'express';
import {
  getEvidenceController,
  getEvidenceByIdController,
  updateEvidenceController,
  deleteEvidenceController,
} from '../controllers/evidence.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), getEvidenceController);
router.get('/:id', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), getEvidenceByIdController);
router.put('/:id', requireRoles('admin'), updateEvidenceController);
router.delete('/:id', requireRoles('admin'), deleteEvidenceController);

export default router;
