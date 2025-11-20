import { Router } from 'express';
const router = Router();
// Get current prices
router.get('/prices', (req, res) => {
    res.json({ message: 'Market prices endpoint (To be implemented)' });
});
// Get candle data
router.get('/candles', (req, res) => {
    res.json({ message: 'Candles endpoint (To be implemented)' });
});
// Get order book
router.get('/orderbook', (req, res) => {
    res.json({ message: 'Order book endpoint (To be implemented)' });
});
export default router;
