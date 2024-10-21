const jwt = require('jsonwebtoken');
const User = require('../models/user');

const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
  
    const decoded = jwt.verify(token, '0308'); // Thay 'yourSecretKey' bằng khóa bí mật thực sự của bạn
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    next();
  } catch (err) {

    return res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.status(401).json({ msg: 'Bạn cần đăng nhập để thực hiện hành động này' });
  }
};

// Middleware to check if the user has a specific role
const hasRole = (roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
  };
};

// Middleware to check if the user is an admin
const isAdmin = hasRole(['admin']);

// Middleware to check if the user is a manager
const isManager = hasRole(['manager']);

// Middleware to check if the user is an accountant
const isAccountant = hasRole(['accountant']);

// Middleware to check if the user is a sales staff
const isSalesStaff = hasRole(['sales_staff_1', 'sales_staff_2', 'sales_staff_3', 'shipper']);

// Middleware to check if the user is a shipper
const isShipper = hasRole(['shipper']);

module.exports = { isAuthenticated, isAdmin, isManager, isAccountant, isSalesStaff, isShipper };


