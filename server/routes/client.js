import express from 'express';
import { protect } from '../middleware/auth.js';
import { getClientProfile, updateClientProfile } from '../controllers/clientController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Client dashboard route
router.get('/dashboard', async (req, res) => {
  try {
    // Get client profile
    const profile = await getClientProfile(req, res);
    
    // Get active jobs, contracts, and other dashboard data
    // This would typically involve fetching from multiple collections
    const dashboardData = {
      profile,
      stats: {
        activeJobs: 0,
        totalSpent: 0,
        activeContracts: 0,
        completedJobs: 0
      },
      recentActivity: [],
      notifications: []
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Client dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard data'
    });
  }
});

// Client profile routes
router.route('/profile')
  .get(getClientProfile)
  .put(updateClientProfile);

// Get specific client profile
router.get('/profile/:id', getClientProfile);

export default router;