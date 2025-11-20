import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// All portfolio routes require authentication
router.use(authenticate);
// Get portfolio balance
router.get('/balance', (req, res) => {
    res.json({ message: 'Portfolio balance endpoint (To be implemented)' });
});
// Get portfolio history
router.get('/history', (req, res) => {
    res.json({ message: 'Portfolio history endpoint (To be implemented)' });
});
export default router;
