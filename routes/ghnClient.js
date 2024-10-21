const axios = require('axios');

// Thay thế với thông tin của bạn
const GHN_API_KEY = 'af00057e-605e-11ef-8e53-0a00184fe694';
const GHN_BASE_URL = 'https://api.ghn.vn'; // URL chính thức của GHN

const ghnClient = axios.create({
  baseURL: GHN_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GHN_API_KEY}`,
    'Content-Type': 'application/json',
  }
});

// Hàm lấy danh sách các khu vực
const getProvinces = async () => {
  try {
    const response = await ghnClient.get('/v1/provinces');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tỉnh thành:', error);
    throw error;
  }
};

// Hàm lấy danh sách quận huyện theo tỉnh
const getDistricts = async (provinceId) => {
  try {
    const response = await ghnClient.get(`/v1/districts?province_id=${provinceId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách quận huyện:', error);
    throw error;
  }
};

// Hàm lấy danh sách xã phường theo quận huyện
const getWards = async (districtId) => {
  try {
    const response = await ghnClient.get(`/v1/wards?district_id=${districtId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách xã phường:', error);
    throw error;
  }
};

module.exports = { getProvinces, getDistricts, getWards };
