const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");
const Order = require("../models/orderModel");
const OrderDetail = require("../models/orderDetailModel");
const { v4: uuidv4 } = require("uuid");
const authenticateToken = require("../middleware/auth");
const moment = require("moment");
const qs = require("qs");

// --- CẤU HÌNH MOMO ---
const momoPartnerCode = "MOMOYS4Y20250609";
const momoAccessKey = "RHUgLUY2qTrOvKBz";
const momoSecretKey = "4Vf1eeXWH0DqBN7IzDvKePIGMPb4fk2m";
const momoRedirectUrl = "http://localhost:3007/checkout/momo/return";
const momoIpnUrl = "https://deploy-nodejs-4u6l.onrender.com/payment/payment-ipn";

// ====== MOMO ROUTE ======
router.post("/momo", authenticateToken, async (req, res) => {
  const { amount, orderId, orderInfo, items, shippingInfo, coupon, shippingFee } = req.body;
  const userId = req.user?.id || req.user?._id;

  if (!amount || !orderId || !orderInfo || !items || !shippingInfo) {
    return res.status(400).json({ message: "Thiếu thông tin đơn hàng!" });
  }

  let newOrder;
  try {
    newOrder = await Order.create({
      orderId,
      shippingInfo: { ...shippingInfo, userId: userId || null },
      shippingFee: shippingFee || 0,
      totalPrice: amount,
      paymentMethod: "momo",
      coupon: coupon || "",
      paymentStatus: "pending",
      orderStatus: "waiting",
    });
  } catch (err) {
    return res.status(500).json({ message: "Lưu đơn hàng thất bại", detail: err.message });
  }

  try {
    await Promise.all(items.map((item) =>
      OrderDetail.create({
        orderId: newOrder.orderId || newOrder._id.toString(),
        productId: item.productId,
        productName: item.productName,
        variant: item.variant,
        quantity: item.quantity,
        image: item.image,
        price: item.price * item.quantity,
        coupon: coupon || "",
      })
    ));
  } catch (err) {
    return res.status(500).json({ message: "Lưu chi tiết đơn hàng thất bại", detail: err.message });
  }

  const requestId = uuidv4();
  const rawSignature =
    "accessKey=" + momoAccessKey +
    "&amount=" + amount +
    "&extraData=" +
    "&ipnUrl=" + momoIpnUrl +
    "&orderId=" + orderId +
    "&orderInfo=" + orderInfo +
    "&partnerCode=" + momoPartnerCode +
    "&redirectUrl=" + momoRedirectUrl +
    "&requestId=" + requestId +
    "&requestType=captureWallet";

  const signature = crypto.createHmac("sha256", momoSecretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = {
    partnerCode: momoPartnerCode,
    accessKey: momoAccessKey,
    requestId,
    amount: `${amount}`,
    orderId,
    orderInfo,
    redirectUrl: momoRedirectUrl,
    ipnUrl: momoIpnUrl,
    extraData: "",
    requestType: "captureWallet",
    signature,
  };

  try {
    const momoRes = await axios.post("https://payment.momo.vn/v2/gateway/api/create", requestBody);
    if (momoRes.data && momoRes.data.resultCode === 0) {
      res.json({ paymentUrl: momoRes.data.payUrl });
    } else {
      res.status(400).json({ message: momoRes.data.message || "Lỗi từ Momo", momoRes: momoRes.data });
    }
  } catch (err) {
    res.status(500).json({ message: "Tạo link thanh toán thất bại!", detail: err?.response?.data || err.message });
  }
});

// Hàm sắp xếp object theo key
function sortObject(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// ✅ API tạo link thanh toán VNPay
router.post('/vnpay/create_payment_url', (req, res) => {
  process.env.TZ = 'Asia/Ho_Chi_Minh';
  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');
  const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  const vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;

  const orderId = moment(date).format('DDHHmmss');
  const amount = req.body.amount;
  const bankCode = req.body.bankCode;
  const locale = req.body.language || 'vn';

  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: 'Thanh toan don hang ' + orderId,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

  vnp_Params = sortObject(vnp_Params);
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params['vnp_SecureHash'] = signed;

  const redirectUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });
  res.json({ paymentUrl: redirectUrl });
});

// ✅ API xử lý trả về từ VNPay
router.get('/vnpay_return', (req, res) => {
  const vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const signed = crypto.createHmac('sha512', process.env.VNP_HASHSECRET)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  if (secureHash === signed) {
    res.redirect(`/checkout/vnpay/return?status=success&orderId=${vnp_Params['vnp_TxnRef']}`);
  } else {
    res.redirect('/checkout/vnpay/return?status=failed');
  }
});

module.exports = router;
