import { Router } from 'express';
import {
  getRulesController,
  createRuleController,
  updateRuleController,
  deleteRuleController,
  loadDacPolicyRulesController,
} from '../controllers/rules.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getRulesController);
router.post('/', requireRoles('admin'), createRuleController);
router.put('/:id', requireRoles('admin'), updateRuleController);
router.delete('/:id', requireRoles('admin'), deleteRuleController);
router.post('/load-dac-policy', requireRoles('admin'), loadDacPolicyRulesController);

export default router;
