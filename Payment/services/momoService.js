// services/momoService.js
const axios = require("axios");
const crypto = require("crypto");

exports.createMomoPayment = async (amount, momoOrderId) => {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;

  if (!partnerCode || !accessKey || !secretKey) {
    throw new Error("Missing MoMo credentials in the .env file.");
  }

  const requestId = momoOrderId;
  const orderId = momoOrderId;
  const orderInfo = "Payment for tour vehicle booking";
  const redirectUrl = process.env.REDIRECT_URL;
  const ipnUrl = process.env.IPN_URL;

  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=payWithATM`
  ].join("&");

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const response = await axios.post(
    "https://test-payment.momo.vn/v2/gateway/api/create",
    {
      partnerCode,
      accessKey,
      requestId,
      amount: amount.toString(),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData: "",
      requestType: "payWithATM",
      signature,
      lang: "vi"
    },
    { timeout: 10000 }
  );

  if (response.data.resultCode !== 0) {
    throw new Error(`MoMo error: ${response.data.message || 'Unknown error'}`);
  }

  console.log("✅ MoMo create payment success");
  return response.data.payUrl;
};

module.exports = { createMomoPayment: exports.createMomoPayment };