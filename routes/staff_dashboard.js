const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/product");
const { isAuthenticated, isSalesStaff } = require('../middleware/auth');

// Lấy thống kê về đơn hàng và doanh thu
router.get('/staff/dashboard/orders-revenue', isAuthenticated, isSalesStaff, async (req, res) => {
  try {
    // Tổng hợp số lượng đơn hàng và doanh thu hàng ngày trong 7 ngày qua
    const ordersRevenueDaily = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7)) // Lọc đơn hàng từ 7 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Nhóm theo ngày
          totalOrders: { $sum: 1 }, // Tổng số đơn hàng
          totalRevenue: { $sum: "$total" } // Tổng doanh thu
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo ngày tăng dần
      }
    ]);

    // Tổng hợp số lượng đơn hàng và doanh thu hàng tuần trong 30 ngày qua
    const ordersRevenueWeekly = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Lọc đơn hàng từ 30 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $isoWeek: "$createdAt" }, // Nhóm theo tuần
          totalOrders: { $sum: 1 }, // Tổng số đơn hàng
          totalRevenue: { $sum: "$total" } // Tổng doanh thu
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tuần tăng dần
      }
    ]);

    // Tổng hợp số lượng đơn hàng và doanh thu hàng tháng trong 1 năm qua
    const ordersRevenueMonthly = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) // Lọc đơn hàng từ 1 năm trước
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // Nhóm theo tháng
          totalOrders: { $sum: 1 }, // Tổng số đơn hàng
          totalRevenue: { $sum: "$total" } // Tổng doanh thu
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tháng tăng dần
      }
    ]);

    // Trả về kết quả thống kê
    res.status(200).json({
      daily: ordersRevenueDaily.map(item => ({
        date: item._id,
        totalOrders: item.totalOrders,
        totalRevenue: item.totalRevenue,
      })),
      weekly: ordersRevenueWeekly.map(item => ({
        week: item._id,
        totalOrders: item.totalOrders,
        totalRevenue: item.totalRevenue,
      })),
      monthly: ordersRevenueMonthly.map(item => ({
        month: item._id,
        totalOrders: item.totalOrders,
        totalRevenue: item.totalRevenue,
      })),
    });
  } catch (err) {
    console.error("Error fetching orders and revenue data:", err);
    res.status(500).json({ msg: "Error fetching orders and revenue data" });
  }
});

// Endpoint để lấy thông tin thống kê cơ bản trên dashboard
router.get('/staff/dashboard/stats', isAuthenticated, isSalesStaff, async (req, res) => {
  try {
    // Tổng số đơn hàng
    const totalOrders = await Order.countDocuments({});
    
    // Tổng doanh thu
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Trả về kết quả thống kê cơ bản
    res.status(200).json({ totalOrders, revenue });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ msg: "Error fetching dashboard stats" });
  }
});

// Lấy thông tin về các đơn hàng bị hủy
router.get('/staff/dashboard/cancelled-orders', isAuthenticated, isSalesStaff, async (req, res) => {
  try {
    // Tổng hợp số lượng đơn hàng yêu cầu hoàn tiền hàng ngày trong 7 ngày qua
    const cancelledOrdersDaily = await Order.aggregate([
      {
        $match: {
          status: "hoàn trả", // Chỉ lọc đơn hàng có trạng thái 'hoàn trả'
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7)) // Lọc đơn hàng từ 7 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Nhóm theo ngày
          total: { $sum: 1 } // Tổng số đơn hàng bị hủy
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo ngày tăng dần
      }
    ]);

    // Tổng hợp số lượng đơn hàng yêu cầu hoàn tiền hàng tuần trong 30 ngày qua
    const cancelledOrdersWeekly = await Order.aggregate([
      {
        $match: {
          status: "hoàn trả", // Chỉ lọc đơn hàng có trạng thái 'hoàn trả'
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Lọc đơn hàng từ 30 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $isoWeek: "$createdAt" }, // Nhóm theo tuần
          total: { $sum: 1 } // Tổng số đơn hàng bị hủy
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tuần tăng dần
      }
    ]);

    // Tổng hợp số lượng đơn hàng yêu cầu hoàn tiền hàng tháng trong 1 năm qua
    const cancelledOrdersMonthly = await Order.aggregate([
      {
        $match: {
          status: "hoàn trả", // Chỉ lọc đơn hàng có trạng thái 'hoàn trả'
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) // Lọc đơn hàng từ 1 năm trước
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // Nhóm theo tháng
          total: { $sum: 1 } // Tổng số đơn hàng bị hủy
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tháng tăng dần
      }
    ]);

    // Trả về kết quả thống kê đơn hàng bị hủy
    res.status(200).json({
      daily: cancelledOrdersDaily.map(item => ({ date: item._id, total: item.total })),
      weekly: cancelledOrdersWeekly.map(item => ({ week: item._id, total: item.total })),
      monthly: cancelledOrdersMonthly.map(item => ({ month: item._id, total: item.total })),
    });
  } catch (err) {
    console.error("Error fetching cancelled orders data:", err);
    res.status(500).json({ msg: "Error fetching cancelled orders data" });
  }
});

// Endpoint để lấy thông tin thống kê tổng hợp
router.get('/staff/dashboard/combined-stats', isAuthenticated, isSalesStaff, async (req, res) => {
  try {
    // Lấy tổng số đơn hàng và doanh thu
    const totalOrders = await Order.countDocuments({});
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Lấy thông tin thống kê đơn hàng và doanh thu theo ngày, tuần, tháng
    const ordersRevenueDaily = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7)) // Lọc đơn hàng từ 7 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Nhóm theo ngày
          totalOrders: { $sum: 1 }, // Tổng số đơn hàng
          totalRevenue: { $sum: "$total" } // Tổng doanh thu
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo ngày tăng dần
      }
    ]);

    const ordersRevenueWeekly = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Lọc đơn hàng từ 30 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $isoWeek: "$createdAt" }, // Nhóm theo tuần
          totalOrders: { $sum: 1 }, // Tổng số đơn hàng
          totalRevenue: { $sum: "$total" } // Tổng doanh thu
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tuần tăng dần
      }
    ]);

    const ordersRevenueMonthly = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) // Lọc đơn hàng từ 1 năm trước
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // Nhóm theo tháng
          totalOrders: { $sum: 1 }, // Tổng số đơn hàng
          totalRevenue: { $sum: "$total" } // Tổng doanh thu
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tháng tăng dần
      }
    ]);

    // Lấy thông tin thống kê đơn hàng bị hủy theo ngày, tuần, tháng
    const cancelledOrdersDaily = await Order.aggregate([
      {
        $match: {
          status: "hoàn trả", // Chỉ lọc đơn hàng có trạng thái 'hoàn trả'
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7)) // Lọc đơn hàng từ 7 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Nhóm theo ngày
          total: { $sum: 1 } // Tổng số đơn hàng bị hủy
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo ngày tăng dần
      }
    ]);

    const cancelledOrdersWeekly = await Order.aggregate([
      {
        $match: {
          status: "hoàn trả", // Chỉ lọc đơn hàng có trạng thái 'hoàn trả'
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Lọc đơn hàng từ 30 ngày trước
          }
        }
      },
      {
        $group: {
          _id: { $isoWeek: "$createdAt" }, // Nhóm theo tuần
          total: { $sum: 1 } // Tổng số đơn hàng bị hủy
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tuần tăng dần
      }
    ]);

    const cancelledOrdersMonthly = await Order.aggregate([
      {
        $match: {
          status: "hoàn trả", // Chỉ lọc đơn hàng có trạng thái 'hoàn trả'
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) // Lọc đơn hàng từ 1 năm trước
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // Nhóm theo tháng
          total: { $sum: 1 } // Tổng số đơn hàng bị hủy
        }
      },
      {
        $sort: { _id: 1 } // Sắp xếp theo tháng tăng dần
      }
    ]);

    // Trả về kết quả thống kê tổng hợp
    res.status(200).json({
      stats: { totalOrders, revenue },
      ordersRevenue: {
        daily: ordersRevenueDaily.map(item => ({
          date: item._id,
          totalOrders: item.totalOrders,
          totalRevenue: item.totalRevenue
        })),
        weekly: ordersRevenueWeekly.map(item => ({
          week: item._id,
          totalOrders: item.totalOrders,
          totalRevenue: item.totalRevenue
        })),
        monthly: ordersRevenueMonthly.map(item => ({
          month: item._id,
          totalOrders: item.totalOrders,
          totalRevenue: item.totalRevenue
        }))
      },
      cancelledOrders: {
        daily: cancelledOrdersDaily.map(item => ({ date: item._id, total: item.total })),
        weekly: cancelledOrdersWeekly.map(item => ({ week: item._id, total: item.total })),
        monthly: cancelledOrdersMonthly.map(item => ({ month: item._id, total: item.total }))
      }
    });
  } catch (err) {
    console.error("Error fetching combined stats data:", err);
    res.status(500).json({ msg: "Error fetching combined stats data" });
  }
});

module.exports = router;
