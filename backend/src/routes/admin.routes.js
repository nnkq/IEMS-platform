const express = require('express');
const {
  getPendingStores,
  approveStore,
  rejectStore,
  getAllOrders,
  getUsersAndPartners,
  getPackages,
  getRevenueStats,
} = require('../controllers/AdminController');
const {
  getAdminPromotionCampaigns,
  approvePromotionCampaign,
  rejectPromotionCampaign,
} = require('../controllers/subscriptionController');

const router = express.Router();

// 1. Phê duyệt & Lấy cửa hàng chờ duyệt
router.get('/pending-stores', getPendingStores);
router.post('/approve-store/:storeId', approveStore);
router.post('/reject-store/:storeId', rejectStore);

// 2. Quản lý Đơn hàng (Tracking)
router.get('/orders', getAllOrders);

// 3. Quản lý Người Dùng & Đối Tác
router.get('/users-partners', getUsersAndPartners);

// 4. Quản Lý Gói Dịch Vụ
router.get('/packages', getPackages);
router.get('/promotion-campaigns', getAdminPromotionCampaigns);
router.post('/promotion-campaigns/:id/approve', approvePromotionCampaign);
router.post('/promotion-campaigns/:id/reject', rejectPromotionCampaign);

// 5. Báo Cáo Doanh Thu
router.get('/revenue', getRevenueStats);

module.exports = router;
