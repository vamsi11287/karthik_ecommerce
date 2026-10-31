import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;

  if (env.EMAIL_USER && env.EMAIL_PASS) {
    const cleanPass = env.EMAIL_PASS.replace(/\s+/g, '');
    if (env.EMAIL_SERVICE) {
      transporter = nodemailer.createTransport({
        service: env.EMAIL_SERVICE,
        auth: {
          user: env.EMAIL_USER,
          pass: cleanPass,
        },
      });
    } else if (env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.EMAIL_USER,
          pass: cleanPass,
        },
      });
    }
  }

  return transporter;
};

const getSenderAddress = (): string => {
  return env.EMAIL_SERVICE === 'gmail' && env.EMAIL_USER
    ? `"SPUN Luxury" <${env.EMAIL_USER}>`
    : env.EMAIL_FROM || env.EMAIL_USER || 'no-reply@spunluxury.com';
};

/**
 * Sends a luxury-styled password reset OTP email to user or admin
 */
export const sendPasswordResetOtpEmail = async (
  toEmail: string,
  otp: string,
  userName: string = 'Customer'
): Promise<boolean> => {
  const mailClient = getTransporter();

  // If email transporter is not yet configured, log OTP to console for effortless local testing
  if (!mailClient) {
    logger.warn('====================================================');
    logger.warn(` [EMAIL NOT CONFIGURED] Password Reset OTP for ${toEmail}: ${otp}`);
    logger.warn(' Add EMAIL_USER & EMAIL_PASS in backend/.env to send live emails via Nodemailer.');
    logger.warn('====================================================');
    return true;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ECECE8; margin: 0; padding: 40px 15px; }
          .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5E0; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #121212; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 26px; font-weight: 900; letter-spacing: 0.15em; color: #121212; text-transform: uppercase; margin: 0; }
          .sub { font-size: 11px; letter-spacing: 0.2em; color: #71716E; text-transform: uppercase; margin-top: 5px; }
          .title { font-size: 18px; font-weight: 700; color: #121212; margin-bottom: 12px; }
          .text { font-size: 14px; color: #4A4A46; line-height: 1.6; margin-bottom: 25px; }
          .otp-box { background: #F5F5F0; border: 1px dashed #121212; text-align: center; padding: 20px; margin-bottom: 25px; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #121212; font-family: monospace; }
          .notice { font-size: 12px; color: #888880; line-height: 1.5; margin-bottom: 25px; }
          .footer { font-size: 11px; color: #9E9E98; border-top: 1px solid #EFEFEA; padding-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="brand">SPUN</h1>
            <div class="sub">HAUTE STREETWEAR • SECURITY</div>
          </div>
          <div class="title">Password Reset Request</div>
          <p class="text">Hello ${userName},<br>We received a request to reset your password. Use the verification code below to complete your password update:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p class="notice">This code is valid for <strong>10 minutes</strong>. If you did not request this password reset, you can safely ignore this email — your account remains secure.</p>
          <div class="footer">
            © ${new Date().getFullYear()} SPUN Apparel Inc. All rights reserved.<br>
            Single-Vendor Editorial Luxury Storefront.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await mailClient.sendMail({
      from: getSenderAddress(),
      to: toEmail,
      subject: `SPUN — ${otp} is your password reset verification code`,
      text: `Hello ${userName},\n\nYour SPUN password reset verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
      html: htmlContent,
    });
    logger.info(`Password reset OTP email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${toEmail}:`, error);
    throw error;
  }
};

/**
 * 1. Sends Order Confirmation Email with payment info and product details
 */
export const sendOrderConfirmationEmail = async (
  toEmail: string,
  customerName: string,
  order: any
): Promise<boolean> => {
  const mailClient = getTransporter();

  if (!mailClient) {
    logger.warn('====================================================');
    logger.warn(` [EMAIL NOT CONFIGURED] Order Confirmed Email for ${toEmail}: Order #${order.orderNumber}`);
    logger.warn(` Total: ₹${order.pricing?.grandTotal || 0} | Items: ${order.items?.length || 0}`);
    logger.warn('====================================================');
    return true;
  }

  const itemsRows = (order.items || [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #EEEEEE;">
          <div style="font-weight: 700; color: #121212; font-size: 14px;">${item.name}</div>
          <div style="font-size: 12px; color: #71716E;">SKU: ${item.variantSku || 'STANDARD'}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #EEEEEE; text-align: center; color: #121212; font-size: 13px;">
          x${item.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #EEEEEE; text-align: right; font-weight: 700; color: #121212; font-size: 14px;">
          ₹${item.subtotal || item.price * item.quantity}
        </td>
      </tr>
    `
    )
    .join('');

  const shippingAddr = order.shippingAddress || {};
  const formattedAddress = [
    shippingAddr.fullName,
    shippingAddr.addressLine1 || shippingAddr.street,
    shippingAddr.addressLine2,
    `${shippingAddr.city || ''}, ${shippingAddr.state || ''} ${shippingAddr.postalCode || ''}`,
    shippingAddr.country || 'India',
    `Phone: ${shippingAddr.phone || ''}`,
  ]
    .filter(Boolean)
    .join('<br>');

  const paymentMethodLabel =
    order.paymentMethod === 'ONLINE' || order.paymentMethod === 'RAZORPAY'
      ? 'Online Payment (Razorpay)'
      : 'Cash on Delivery (COD)';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ECECE8; margin: 0; padding: 40px 15px; }
          .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5E0; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #121212; padding-bottom: 20px; margin-bottom: 25px; }
          .brand { font-size: 26px; font-weight: 900; letter-spacing: 0.15em; color: #121212; text-transform: uppercase; margin: 0; }
          .sub { font-size: 11px; letter-spacing: 0.2em; color: #71716E; text-transform: uppercase; margin-top: 5px; }
          .badge { display: inline-block; background: #121212; color: #FFFFFF; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; padding: 6px 14px; margin-top: 15px; }
          .title { font-size: 20px; font-weight: 800; color: #121212; margin-top: 25px; margin-bottom: 8px; }
          .meta-box { background: #F9F9F6; border: 1px solid #EFEFEA; padding: 15px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; }
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .summary-table td { padding: 6px 0; font-size: 13px; color: #4A4A46; }
          .grand-total { font-size: 17px; font-weight: 900; color: #121212; border-top: 2px solid #121212; padding-top: 10px !important; }
          .address-box { background: #F9F9F6; border-left: 3px solid #121212; padding: 15px 20px; margin: 25px 0; font-size: 13px; line-height: 1.6; color: #333; }
          .footer { font-size: 11px; color: #9E9E98; border-top: 1px solid #EFEFEA; padding-top: 20px; margin-top: 30px; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="brand">SPUN</h1>
            <div class="sub">HAUTE STREETWEAR • ORDER CONFIRMATION</div>
            <div class="badge">ORDER CONFIRMED</div>
          </div>

          <div class="title">Thank you for your order, ${customerName}!</div>
          <p style="font-size: 14px; color: #555550; line-height: 1.6;">
            Your order <strong>#${order.orderNumber}</strong> has been received and confirmed. Our team is hand-packaging your pieces.
          </p>

          <div class="meta-box">
            <div><strong>Order Number:</strong> #${order.orderNumber}</div>
            <div><strong>Order Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
            <div><strong>Payment Method:</strong> ${paymentMethodLabel}</div>
            <div><strong>Payment Status:</strong> <span style="color: #059669; font-weight: 700;">${order.paymentStatus || 'COMPLETED'}</span></div>
          </div>

          <h3 style="font-size: 15px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #121212; padding-bottom: 6px;">
            Purchased Pieces (${order.items?.length || 0})
          </h3>

          <table>
            <thead>
              <tr style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888;">
                <th style="text-align: left; padding-bottom: 8px;">Product</th>
                <th style="text-align: center; padding-bottom: 8px;">Qty</th>
                <th style="text-align: right; padding-bottom: 8px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <table class="summary-table">
            <tr>
              <td>Items Subtotal</td>
              <td style="text-align: right;">₹${order.pricing?.subtotal || 0}</td>
            </tr>
            ${order.pricing?.discountTotal ? `
            <tr>
              <td>Promotion Discount ${order.pricing?.couponCode ? `(${order.pricing.couponCode})` : ''}</td>
              <td style="text-align: right; color: #059669;">-₹${order.pricing.discountTotal}</td>
            </tr>
            ` : ''}
            <tr>
              <td>Standard Insured Delivery</td>
              <td style="text-align: right;">${order.pricing?.shippingFee ? `₹${order.pricing.shippingFee}` : 'FREE'}</td>
            </tr>
            <tr class="grand-total">
              <td><strong>Grand Total</strong></td>
              <td style="text-align: right;"><strong>₹${order.pricing?.grandTotal || 0}</strong></td>
            </tr>
          </table>

          <div class="address-box">
            <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Delivery Destination:</div>
            ${formattedAddress}
          </div>

          <div class="footer">
            © ${new Date().getFullYear()} SPUN Apparel Inc. All rights reserved.<br>
            For order inquiries or support, reply directly to this email or visit your account portal.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await mailClient.sendMail({
      from: getSenderAddress(),
      to: toEmail,
      subject: `SPUN — Order Confirmed: #${order.orderNumber}`,
      text: `Thank you for your order, ${customerName}!\n\nOrder #${order.orderNumber} is confirmed.\nTotal: ₹${order.pricing?.grandTotal || 0}\nPayment: ${paymentMethodLabel} (${order.paymentStatus})\n\nView details in your account portal.`,
      html: htmlContent,
    });
    logger.info(`Order confirmation email sent successfully to ${toEmail} for #${order.orderNumber}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send order confirmation email to ${toEmail}:`, error);
    return false;
  }
};

/**
 * 2. Sends Successful Delivery Email to customer
 */
export const sendOrderDeliveredEmail = async (
  toEmail: string,
  customerName: string,
  order: any
): Promise<boolean> => {
  const mailClient = getTransporter();

  if (!mailClient) {
    logger.warn('====================================================');
    logger.warn(` [EMAIL NOT CONFIGURED] Order Delivered Email for ${toEmail}: Order #${order.orderNumber}`);
    logger.warn('====================================================');
    return true;
  }

  const itemsList = (order.items || [])
    .map((item: any) => `• ${item.name} (${item.variantSku || 'STANDARD'}) x ${item.quantity}`)
    .join('<br>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ECECE8; margin: 0; padding: 40px 15px; }
          .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5E0; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #121212; padding-bottom: 20px; margin-bottom: 25px; }
          .brand { font-size: 26px; font-weight: 900; letter-spacing: 0.15em; color: #121212; text-transform: uppercase; margin: 0; }
          .badge { display: inline-block; background: #059669; color: #FFFFFF; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; padding: 6px 14px; margin-top: 15px; }
          .title { font-size: 20px; font-weight: 800; color: #121212; margin-top: 25px; margin-bottom: 8px; }
          .box { background: #F9F9F6; border: 1px solid #EFEFEA; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8; }
          .footer { font-size: 11px; color: #9E9E98; border-top: 1px solid #EFEFEA; padding-top: 20px; margin-top: 30px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="brand">SPUN</h1>
            <div style="font-size: 11px; letter-spacing: 0.2em; color: #71716E; text-transform: uppercase; margin-top: 5px;">HAUTE STREETWEAR • DELIVERY COMPLETE</div>
            <div class="badge">PACKAGE DELIVERED</div>
          </div>

          <div class="title">Your package has arrived, ${customerName}!</div>
          <p style="font-size: 14px; color: #555550; line-height: 1.6;">
            We are pleased to inform you that your order <strong>#${order.orderNumber}</strong> has been successfully delivered.
          </p>

          <div class="box">
            <div><strong>Delivered Pieces:</strong></div>
            <div style="margin-top: 6px; color: #333;">${itemsList}</div>
            <div style="margin-top: 12px;"><strong>Total Paid:</strong> ₹${order.pricing?.grandTotal || 0}</div>
            <div><strong>Delivered to:</strong> ${order.shippingAddress?.fullName}, ${order.shippingAddress?.city}</div>
          </div>

          <p style="font-size: 13px; color: #71716E; line-height: 1.6;">
            If you need any sizing adjustments or wish to initiate an eligible return within our return policy window, you can submit a return request anytime from your <strong>My Orders</strong> page.
          </p>

          <div class="footer">
            © ${new Date().getFullYear()} SPUN Apparel Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await mailClient.sendMail({
      from: getSenderAddress(),
      to: toEmail,
      subject: `SPUN — Delivered: Order #${order.orderNumber}`,
      text: `Hello ${customerName},\n\nYour order #${order.orderNumber} has been delivered successfully!\n\nDelivered pieces:\n${itemsList.replace(/<br>/g, '\n')}\n\nThank you for choosing SPUN.`,
      html: htmlContent,
    });
    logger.info(`Order delivered email sent to ${toEmail} for #${order.orderNumber}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send order delivered email to ${toEmail}:`, error);
    return false;
  }
};

/**
 * 3. Sends Return Status Email (Approved or Completed Refund) to customer
 */
export const sendOrderReturnStatusEmail = async (
  toEmail: string,
  customerName: string,
  order: any,
  decision: 'APPROVE' | 'REJECT' | 'COMPLETE'
): Promise<boolean> => {
  const mailClient = getTransporter();

  if (!mailClient) {
    logger.warn('====================================================');
    logger.warn(` [EMAIL NOT CONFIGURED] Return Status (${decision}) Email for ${toEmail}: Order #${order.orderNumber}`);
    logger.warn('====================================================');
    return true;
  }

  const isCompleted = decision === 'COMPLETE';
  const isApproved = decision === 'APPROVE';

  const returnedItems = order.returnedItems && order.returnedItems.length > 0
    ? order.returnedItems
    : order.items || [];
  const returnedAmount = order.returnedItems && order.returnedItems.length > 0
    ? order.returnedItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0)
    : (order.pricing?.grandTotal || 0);

  const badgeText = isCompleted
    ? 'RETURN & REFUND COMPLETED'
    : isApproved
    ? 'RETURN APPROVED'
    : 'RETURN REQUEST REJECTED';

  const badgeColor = isCompleted || isApproved ? '#059669' : '#DC2626';

  const explanation = isCompleted
    ? `Your returned piece(s) have been received and inspected at our atelier. A refund of <strong>₹${returnedAmount}</strong> has been executed successfully to your original payment method.`
    : isApproved
    ? `Your return request for order <strong>#${order.orderNumber}</strong> (${returnedItems.length} piece(s) — ₹${returnedAmount}) has been approved. Our courier service will arrange for doorstep pickup within 1-2 business days.`
    : `Your return request for order <strong>#${order.orderNumber}</strong> could not be approved at this time. Please contact support if you need further clarification.`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ECECE8; margin: 0; padding: 40px 15px; }
          .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5E0; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #121212; padding-bottom: 20px; margin-bottom: 25px; }
          .brand { font-size: 26px; font-weight: 900; letter-spacing: 0.15em; color: #121212; text-transform: uppercase; margin: 0; }
          .badge { display: inline-block; background: ${badgeColor}; color: #FFFFFF; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; padding: 6px 14px; margin-top: 15px; }
          .title { font-size: 20px; font-weight: 800; color: #121212; margin-top: 25px; margin-bottom: 12px; }
          .box { background: #F9F9F6; border: 1px solid #EFEFEA; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8; }
          .footer { font-size: 11px; color: #9E9E98; border-top: 1px solid #EFEFEA; padding-top: 20px; margin-top: 30px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="brand">SPUN</h1>
            <div style="font-size: 11px; letter-spacing: 0.2em; color: #71716E; text-transform: uppercase; margin-top: 5px;">HAUTE STREETWEAR • RETURN PORTAL</div>
            <div class="badge">${badgeText}</div>
          </div>

          <div class="title">Return Update for Order #${order.orderNumber}</div>
          <p style="font-size: 14px; color: #4A4A46; line-height: 1.6;">
            Hello ${customerName},<br>
            ${explanation}
          </p>

          <div class="box">
            <div><strong>Order Number:</strong> #${order.orderNumber}</div>
            <div><strong>Return Status:</strong> <span style="font-weight: 700; color: ${badgeColor};">${order.returnStatus}</span></div>
            <div><strong>Original Order Amount:</strong> ₹${order.pricing?.grandTotal || 0}</div>
            <div><strong>Return Value:</strong> ₹${returnedAmount}</div>
            ${returnedItems.length > 0 ? `
              <div style="margin-top: 10px; border-top: 1px dashed #DDD; padding-top: 8px;">
                <strong>Returned Piece(s):</strong>
                ${returnedItems.map((it: any) => `<div>• ${it.name} (${it.variantSku}) × ${it.quantity} — ₹${it.price * it.quantity}</div>`).join('')}
              </div>
            ` : ''}
            ${order.returnReason ? `<div style="margin-top: 8px;"><strong>Reason:</strong> ${order.returnReason}</div>` : ''}
          </div>

          <div class="footer">
            © ${new Date().getFullYear()} SPUN Apparel Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await mailClient.sendMail({
      from: getSenderAddress(),
      to: toEmail,
      subject: `SPUN — Return Update: #${order.orderNumber} (${badgeText})`,
      text: `Hello ${customerName},\n\nYour return for order #${order.orderNumber} has been updated to: ${badgeText}.\n\n${explanation.replace(/<[^>]+>/g, '')}`,
      html: htmlContent,
    });
    logger.info(`Return status email sent to ${toEmail} for #${order.orderNumber} (${decision})`);
    return true;
  } catch (error) {
    logger.error(`Failed to send return status email to ${toEmail}:`, error);
    return false;
  }
};
