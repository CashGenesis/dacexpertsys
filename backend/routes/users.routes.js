import { Router } from 'express';
import {
	getAllUsersController,
	getUserByIdController,
	getMeController,
	createUserController,
	updateUserController,
	deleteUserController,
	updateUserRoleController,
	resetUserPasswordController,
} from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), getAllUsersController);
router.get('/me', getMeController);
router.get('/:id', requireRoles('admin'), getUserByIdController);
router.post('/', requireRoles('admin'), createUserController);
router.put('/:id', requireRoles('admin'), updateUserController);
router.delete('/:id', requireRoles('admin'), deleteUserController);
router.put('/:id/role', requireRoles('admin'), updateUserRoleController);
router.post('/:id/reset-password', requireRoles('admin'), resetUserPasswordController);

export default router;
