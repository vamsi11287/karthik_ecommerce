const http = require('http');

function apiCall(options, data) {
  return new Promise((resolve) => {
    const postData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: options.path,
        method: options.method || 'GET',
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runFullAudit() {
  console.log('====================================================');
  console.log('   FULL E-COMMERCE END-TO-END SYSTEM AUDIT');
  console.log('====================================================\n');

  const report = [];

  function record(module, action, role, expected, res) {
    const isSuccess = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
    const item = {
      module,
      action,
      role,
      expected: Array.isArray(expected) ? expected.join('/') : expected,
      actual: res.status,
      pass: isSuccess,
      message: res.data?.message || (res.data?.success !== undefined ? `success: ${res.data.success}` : '') || res.error || '',
    };
    report.push(item);
    console.log(
      `[${isSuccess ? 'PASS' : 'FAIL'}] ${module.padEnd(12)} | ${role.padEnd(12)} | ${action.padEnd(35)} | Expected: ${item.expected} Got: ${item.actual} (${item.message})`
    );
    return item;
  }

  // --- 1. HEALTH & PUBLIC STOREFRONT ---
  console.log('\n--- 1. Health & Public Endpoints ---');
  record('Health', 'GET /health', 'PUBLIC', 200, await apiCall({ path: '/health' }));
  record('Settings', 'GET /api/v1/settings/public', 'PUBLIC', 200, await apiCall({ path: '/api/v1/settings/public' }));
  record('Categories', 'GET /api/v1/categories', 'PUBLIC', 200, await apiCall({ path: '/api/v1/categories' }));
  record('Products', 'GET /api/v1/products', 'PUBLIC', 200, await apiCall({ path: '/api/v1/products?limit=5' }));
  record('Brands', 'GET /api/v1/brands', 'PUBLIC', 200, await apiCall({ path: '/api/v1/brands' }));
  record('Collections', 'GET /api/v1/collections', 'PUBLIC', 200, await apiCall({ path: '/api/v1/collections' }));
  record('Offers', 'GET /api/v1/offers/active', 'PUBLIC', 200, await apiCall({ path: '/api/v1/offers/active' }));

  // --- 2. AUTHENTICATION & SESSIONS ---
  console.log('\n--- 2. Auth & Roles ---');
  const testCustomerEmail = `audit_user_${Date.now()}@test.com`;
  const regRes = await apiCall(
    { path: '/api/v1/auth/register', method: 'POST' },
    { name: 'Audit User', email: testCustomerEmail, password: 'Customer@2026!' }
  );
  record('Auth', 'POST /register (Customer)', 'PUBLIC', 201, regRes);
  const customerToken = regRes.data?.data?.token;

  // Duplicate register (Clumsy flow)
  const dupReg = await apiCall(
    { path: '/api/v1/auth/register', method: 'POST' },
    { name: 'Audit User', email: testCustomerEmail, password: 'Customer@2026!' }
  );
  record('Auth', 'POST /register Duplicate Email', 'PUBLIC', [400, 409], dupReg);

  // Customer Login
  const custLogin = await apiCall(
    { path: '/api/v1/auth/login', method: 'POST' },
    { email: testCustomerEmail, password: 'Customer@2026!' }
  );
  record('Auth', 'POST /login (Customer)', 'PUBLIC', 200, custLogin);

  // Admin Login
  const adminLogin = await apiCall(
    { path: '/api/v1/auth/login', method: 'POST' },
    { email: 'admin@luxwear.com', password: 'Admin@2026!' }
  );
  record('Auth', 'POST /login (Admin)', 'PUBLIC', 200, adminLogin);
  const adminToken = adminLogin.data?.data?.token;

  // Super Admin Login
  const superLogin = await apiCall(
    { path: '/api/v1/auth/login', method: 'POST' },
    { email: 'superadmin@luxwear.com', password: 'SuperAdmin@2026!' }
  );
  record('Auth', 'POST /login (Super Admin)', 'PUBLIC', 200, superLogin);
  const superToken = superLogin.data?.data?.token;

  // GET /me
  record(
    'Auth',
    'GET /auth/me',
    'CUSTOMER',
    200,
    await apiCall({ path: '/api/v1/auth/me', headers: { Authorization: `Bearer ${customerToken}` } })
  );

  // --- 3. RBAC SECURITY BOUNDARIES (CLUMSY / ATTACK FLOWS) ---
  console.log('\n--- 3. Role-Based Access Control (RBAC) Security ---');
  record(
    'RBAC',
    'Customer accessing /admin/products',
    'CUSTOMER',
    403,
    await apiCall({ path: '/api/v1/products/admin/all', headers: { Authorization: `Bearer ${customerToken}` } })
  );
  record(
    'RBAC',
    'Customer accessing /inventory/adjust',
    'CUSTOMER',
    403,
    await apiCall({ path: '/api/v1/inventory/adjust', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } })
  );
  record(
    'RBAC',
    'Customer accessing /audit-logs',
    'CUSTOMER',
    403,
    await apiCall({ path: '/api/v1/audit-logs', headers: { Authorization: `Bearer ${customerToken}` } })
  );
  record(
    'RBAC',
    'Customer accessing /settings/admin',
    'CUSTOMER',
    403,
    await apiCall({ path: '/api/v1/settings/admin', headers: { Authorization: `Bearer ${customerToken}` } })
  );
  record(
    'RBAC',
    'Admin accessing /audit-logs',
    'ADMIN',
    [200, 403],
    await apiCall({ path: '/api/v1/audit-logs', headers: { Authorization: `Bearer ${adminToken}` } })
  );
  record(
    'RBAC',
    'Super Admin accessing /audit-logs',
    'SUPER_ADMIN',
    200,
    await apiCall({ path: '/api/v1/audit-logs', headers: { Authorization: `Bearer ${superToken}` } })
  );

  // --- 4. CART & REAL-TIME IN-CART VALIDATION ---
  console.log('\n--- 4. Cart & Real-Time Validation ---');
  // Get active products for test
  const prodsRes = await apiCall({ path: '/api/v1/products?limit=2' });
  const testProd = prodsRes.data?.data?.[0];
  const testVariant = testProd?.variants?.[0]?.sku || testProd?.sku;

  // Add to cart
  const addCartRes = await apiCall(
    { path: '/api/v1/cart/items', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
    { productId: testProd?._id, variantSku: testVariant, quantity: 1 }
  );
  record('Cart', 'POST /cart/items', 'CUSTOMER', [200, 201], addCartRes);

  // Validate cart (Happy flow)
  const valHappyRes = await apiCall(
    { path: '/api/v1/cart/validate', method: 'POST' },
    { items: [{ productId: testProd?._id, variantSku: testVariant, quantity: 1, name: testProd?.name }] }
  );
  record('Cart', 'POST /cart/validate (Valid Stock)', 'PUBLIC', 200, valHappyRes);

  // Validate cart (Clumsy flow: Non-existent SKU / Out of stock)
  const valClumsyRes = await apiCall(
    { path: '/api/v1/cart/validate', method: 'POST' },
    { items: [{ productId: testProd?._id, variantSku: 'NON_EXISTENT_SKU_XYZ', quantity: 999, name: 'Fake' }] }
  );
  record('Cart', 'POST /cart/validate (Invalid/OOS SKU)', 'PUBLIC', 200, valClumsyRes);

  // Coupon Validation
  const couponRes = await apiCall(
    { path: '/api/v1/coupons/validate', method: 'POST' },
    { code: 'LUXURY10', cartTotal: 5000 }
  );
  record('Coupon', 'POST /coupons/validate', 'PUBLIC', [200, 400, 404], couponRes);

  // --- 5. CHECKOUT & PAYMENT HOLD ---
  console.log('\n--- 5. Checkout & Inventory Hold ---');
  const quoteRes = await apiCall(
    { path: '/api/v1/checkout/quote', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
    {
      items: [{ productId: testProd?._id, variantSku: testVariant, quantity: 1 }],
      shippingAddress: { pincode: '560001', state: 'KA' },
    }
  );
  record('Checkout', 'POST /checkout/quote', 'CUSTOMER', 200, quoteRes);

  // 5a. Enable COD first
  await apiCall(
    { path: '/api/v1/settings/admin/payments', method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` } },
    { codEnabled: true }
  );

  // 5b. Initiate COD Checkout (Happy flow)
  const codInitRes = await apiCall(
    { path: '/api/v1/checkout/initiate', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
    {
      paymentMethod: 'COD',
      items: [{ productId: testProd?._id, variantSku: testVariant, quantity: 1 }],
      shippingAddress: {
        fullName: 'Audit User',
        phone: '+919876543210',
        addressLine1: 'MG Road 10',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    }
  );
  record('Checkout', 'POST /checkout/initiate (COD Happy Flow)', 'CUSTOMER', [200, 201], codInitRes);
  const createdOrderId = codInitRes.data?.data?.order?._id;

  // 5c. Initiate Online Checkout (Razorpay 10-Min Hold Flow)
  const rzpInitRes = await apiCall(
    { path: '/api/v1/checkout/initiate', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
    {
      paymentMethod: 'RAZORPAY',
      items: [{ productId: testProd?._id, variantSku: testVariant, quantity: 1 }],
      shippingAddress: {
        fullName: 'Audit User',
        phone: '+919876543210',
        addressLine1: 'MG Road 10',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    }
  );
  record('Checkout', 'POST /checkout/initiate (Razorpay Hold Flow)', 'CUSTOMER', [200, 201], rzpInitRes);

  // 5d. Disable COD to test Clumsy flow
  await apiCall(
    { path: '/api/v1/settings/admin/payments', method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` } },
    { codEnabled: false }
  );
  const codDisabledRes = await apiCall(
    { path: '/api/v1/checkout/initiate', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
    {
      paymentMethod: 'COD',
      items: [{ productId: testProd?._id, variantSku: testVariant, quantity: 1 }],
      shippingAddress: {
        fullName: 'Audit User',
        phone: '+919876543210',
        addressLine1: 'MG Road 10',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    }
  );
  record('Checkout', 'POST /checkout/initiate (COD Disabled Rejection)', 'CUSTOMER', 400, codDisabledRes);

  // Re-enable COD
  await apiCall(
    { path: '/api/v1/settings/admin/payments', method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` } },
    { codEnabled: true }
  );

  // 5e. Clumsy Checkout: Out-of-bounds quantity (e.g. 99999 units)
  const oosCheckoutRes = await apiCall(
    { path: '/api/v1/checkout/initiate', method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
    {
      paymentMethod: 'COD',
      items: [{ productId: testProd?._id, variantSku: testVariant, quantity: 999999 }],
      shippingAddress: {
        fullName: 'Audit User',
        phone: '+919876543210',
        addressLine1: 'MG Road 10',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    }
  );
  record('Checkout', 'POST /checkout/initiate (Excess Stock Rejected)', 'CUSTOMER', [400, 422], oosCheckoutRes);

  // --- 6. ORDERS & FULFILLMENT ---
  console.log('\n--- 6. Orders Management ---');
  record(
    'Orders',
    'GET /orders/my (Customer)',
    'CUSTOMER',
    200,
    await apiCall({ path: '/api/v1/orders/my', headers: { Authorization: `Bearer ${customerToken}` } })
  );
  record(
    'Orders',
    'GET /orders/admin/all (Admin)',
    'ADMIN',
    200,
    await apiCall({ path: '/api/v1/orders/admin/all', headers: { Authorization: `Bearer ${adminToken}` } })
  );

  if (createdOrderId) {
    const statusUpdateRes = await apiCall(
      { path: `/api/v1/orders/${createdOrderId}/status`, method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` } },
      { fulfillmentStatus: 'CONFIRMED', notes: 'Audit verification' }
    );
    record('Orders', 'PATCH /orders/:id/status (Confirm)', 'ADMIN', 200, statusUpdateRes);
  }

  // --- 7. ADMIN CATALOG & INVENTORY ---
  console.log('\n--- 7. Admin Catalog & Inventory ---');
  record(
    'Inventory',
    'GET /inventory (Admin)',
    'ADMIN',
    200,
    await apiCall({ path: '/api/v1/inventory', headers: { Authorization: `Bearer ${adminToken}` } })
  );

  // Variant Stock Adjustment (Happy Flow)
  const adjustRes = await apiCall(
    { path: '/api/v1/inventory/adjust', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
    {
      productId: testProd?._id,
      reason: 'Audit physical count check',
      variants: [{ sku: testVariant, size: testProd?.variants?.[0]?.size || 'M', stock: 15 }],
    }
  );
  record('Inventory', 'POST /inventory/adjust (Multi-variant)', 'ADMIN', 200, adjustRes);

  // Clumsy stock adjustment: Zero change or missing reason
  const badAdjustRes = await apiCall(
    { path: '/api/v1/inventory/adjust', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
    { productId: testProd?._id, reason: '' }
  );
  record('Inventory', 'POST /inventory/adjust (Missing data rejected)', 'ADMIN', [400, 422], badAdjustRes);

  // Create Product with Apparel Sizing (XS - XXL)
  const createProdRes = await apiCall(
    { path: '/api/v1/products', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
    {
      name: `Audit Runway Tee ${Date.now()}`,
      sku: `RUNWAY-${Math.floor(Math.random() * 9000 + 1000)}`,
      description: 'Audit drop oversized silhouette',
      sellingPrice: 1500,
      originalPrice: 1800,
      category: '6ad7acea83467827a5ab4e31',
      brand: 'LUXWEAR',
      hasVariants: true,
      variants: [
        { size: 'XS', stock: 2, price: 1500 },
        { size: 'S', stock: 5, price: 1500 },
        { size: 'M', stock: 8, price: 1500 },
        { size: 'L', stock: 8, price: 1500 },
        { size: 'XL', stock: 4, price: 1500 },
        { size: 'XXL', stock: 2, price: 1500 },
      ],
    }
  );
  record('Products', 'POST /products (Apparel Sizing)', 'ADMIN', 201, createProdRes);

  // --- 8. REPORTS & SETTINGS ---
  console.log('\n--- 8. Reports & Settings ---');
  record(
    'Reports',
    'GET /reports/dashboard',
    'ADMIN',
    200,
    await apiCall({ path: '/api/v1/reports/dashboard', headers: { Authorization: `Bearer ${adminToken}` } })
  );
  record(
    'Settings',
    'GET /settings/admin',
    'ADMIN',
    200,
    await apiCall({ path: '/api/v1/settings/admin', headers: { Authorization: `Bearer ${adminToken}` } })
  );
  record(
    'Settings',
    'PATCH /settings/admin/payments',
    'ADMIN',
    200,
    await apiCall(
      { path: '/api/v1/settings/admin/payments', method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` } },
      { codEnabled: true }
    )
  );

  console.log('\n====================================================');
  console.log(`TOTAL AUDIT CHECKS: ${report.length}`);
  const passed = report.filter((r) => r.pass).length;
  const failed = report.filter((r) => !r.pass).length;
  console.log(`PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');
}

runFullAudit();
