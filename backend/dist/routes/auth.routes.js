import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
const router = Router();
// Get nonce for wallet authentication
router.get('/nonce', (req, res) => {
    res.json({ message: 'Auth nonce endpoint (To be implemented)' });
});
// Login with wallet signature
router.post('/login', authLimiter, (req, res) => {
    res.json({ message: 'Auth login endpoint (To be implemented)' });
});
// Verify authentication
router.get('/verify', (req, res) => {
    res.json({ message: 'Auth verify endpoint (To be implemented)' });
});
// Logout
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});
export default router;
