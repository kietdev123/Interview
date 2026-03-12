import 'dotenv/config';
import axios from 'axios';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  CourierApprovalStatus,
  CourierOnlineStatus,
  PrismaClient,
} from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for e2e tests');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const API_PREFIX = '/api';

async function registerAndLogin(email: string, password: string) {
  const res = await axios.post(`${API_PREFIX}/auth/register`, {
    email,
    password,
    username: email.split('@')[0],
    phone: '0900000000',
  });

  expect(res.status).toBe(201);
  expect(res.data?.access_token).toBeTruthy();
  return res.data as { access_token: string };
}

async function login(email: string, password: string) {
  const res = await axios.post(`${API_PREFIX}/auth/login`, {
    email,
    password,
  });

  expect(res.status).toBe(201);
  expect(res.data?.access_token).toBeTruthy();
  return res.data as { access_token: string };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Task 3 e2e', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it('should allow merchant to publish product and customer to order from cart', async () => {
    const now = Date.now();
    const merchantOwnerEmail = `merchant_owner_${now}@example.com`;
    const customerEmail = `customer_${now}@example.com`;
    const courierEmail = `courier_${now}@example.com`;
    const password = 'Password123!';

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vhandelivery.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminLogin = await login(adminEmail, adminPassword);
    const merchantOwnerLogin = await registerAndLogin(
      merchantOwnerEmail,
      password
    );
    const customerLogin = await registerAndLogin(customerEmail, password);

    // ---------------------------------------------------------------------
    // Merchant registration via OTP
    // ---------------------------------------------------------------------
    const merchantPhone = `09${String(now).slice(-8)}`;

    const requestOtpRes = await axios.post(`${API_PREFIX}/merchants/otp/request`, {
      phone: merchantPhone,
    });
    expect(requestOtpRes.status).toBe(201);

    const otpRecord = await prisma.otpVerification.findFirst({
      where: { phone: merchantPhone },
      orderBy: { createdAt: 'desc' },
    });
    expect(otpRecord?.code).toBeTruthy();

    const verifyOtpRes = await axios.post(`${API_PREFIX}/merchants/otp/verify`, {
      phone: merchantPhone,
      code: otpRecord!.code,
    });
    expect(verifyOtpRes.status).toBe(201);
    expect(verifyOtpRes.data?.verificationToken).toBeTruthy();

    const createMerchantRes = await axios.post(
      `${API_PREFIX}/merchants/register`,
      {
        name: 'Test Merchant',
        phone: merchantPhone,
        verificationToken: verifyOtpRes.data.verificationToken,
        address: '123 Test St',
        city: 'HCM',
        contactName: 'Owner',
        businessType: 'ONLINE',
        businessCategory: 'FOOD',
        hasBusinessLicense: false,
      },
      { headers: authHeader(merchantOwnerLogin.access_token) }
    );
    expect(createMerchantRes.status).toBe(201);
    expect(createMerchantRes.data?.externalId).toBeTruthy();

    const merchantExternalId = createMerchantRes.data.externalId as string;

    // Admin approves merchant -> auto assign MERCHANT_OWNER role and link merchantId
    const approveMerchantRes = await axios.patch(
      `${API_PREFIX}/merchants/${merchantExternalId}/status`,
      { status: 'APPROVED' },
      { headers: authHeader(adminLogin.access_token) }
    );
    expect(approveMerchantRes.status).toBe(200);

    // Fetch merchant to get internal numeric id
    const merchantDetailRes = await axios.get(
      `${API_PREFIX}/merchants/${merchantExternalId}`,
      {
        headers: authHeader(merchantOwnerLogin.access_token),
      }
    );
    expect(merchantDetailRes.status).toBe(200);
    expect(merchantDetailRes.data?.id).toBeTruthy();
    const merchantId = String(merchantDetailRes.data.id);

    // ---------------------------------------------------------------------
    // Courier setup (DB assisted)
    // ---------------------------------------------------------------------
    await registerAndLogin(courierEmail, password);

    const courierUser = await prisma.user.findUnique({
      where: { email: courierEmail },
      select: { id: true },
    });
    expect(courierUser?.id).toBeTruthy();

    const courierRole = await prisma.role.findUnique({
      where: { name: 'COURIER' },
      select: { id: true },
    });
    expect(courierRole?.id).toBeTruthy();

    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: courierUser!.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(existingUserRole?.id).toBeTruthy();

    await prisma.userRole.update({
      where: { id: existingUserRole!.id },
      data: { roleId: courierRole!.id },
    });

    let courier = await prisma.courier.findUnique({
      where: { userId: courierUser!.id },
    });
    if (!courier) {
      courier = await prisma.courier.create({
        data: {
          userId: courierUser!.id,
          approvalStatus: CourierApprovalStatus.PENDING,
          onlineStatus: CourierOnlineStatus.OFFLINE,
          latitude: 10,
          longitude: 10,
        },
      });
    }

    // Approve courier (admin)
    const approveCourierRes = await axios.patch(
      `${API_PREFIX}/couriers/${courier.id}/approve`,
      { approvalStatus: CourierApprovalStatus.APPROVED },
      { headers: authHeader(adminLogin.access_token) }
    );
    expect(approveCourierRes.status).toBe(200);

    // Login courier again to get token with COURIER role
    const courierLogin = await login(courierEmail, password);
    const setCourierOnlineRes = await axios.patch(
      `${API_PREFIX}/couriers/me/status`,
      { onlineStatus: CourierOnlineStatus.ONLINE },
      { headers: authHeader(courierLogin.access_token) }
    );
    expect(setCourierOnlineRes.status).toBe(200);

    // ---------------------------------------------------------------------
    // Merchant creates product (DRAFT) then publishes
    // ---------------------------------------------------------------------
    const createProductRes = await axios.post(
      `${API_PREFIX}/products?merchantId=${encodeURIComponent(merchantId)}`,
      {
        name: { vi: 'Banh mi' },
        description: { vi: 'Ngon' },
        price: 100,
        sku: `SKU-${now}`,
        stock: 10,
        status: 'DRAFT',
      },
      { headers: authHeader(merchantOwnerLogin.access_token) }
    );

    expect(createProductRes.status).toBe(201);
    expect(createProductRes.data?.externalId).toBeTruthy();
    const productExternalId = createProductRes.data.externalId as string;

    const publishRes = await axios.patch(
      `${API_PREFIX}/products/${productExternalId}`,
      { status: 'PUBLISHED' },
      { headers: authHeader(merchantOwnerLogin.access_token) }
    );
    expect(publishRes.status).toBe(200);

    // ---------------------------------------------------------------------
    // Customer storefront -> add cart -> create order
    // ---------------------------------------------------------------------
    const listProductsRes = await axios.get(`${API_PREFIX}/storefront/products`, {
      headers: authHeader(customerLogin.access_token),
    });
    expect(listProductsRes.status).toBe(200);

    const products = listProductsRes.data?.data ?? listProductsRes.data;
    expect(Array.isArray(products)).toBe(true);

    const addToCartRes = await axios.post(
      `${API_PREFIX}/carts/merchant/${merchantId}/items`,
      { productExternalId, quantity: 1 },
      { headers: authHeader(customerLogin.access_token) }
    );
    expect(addToCartRes.status).toBe(201);

    const createOrderRes = await axios.post(
      `${API_PREFIX}/orders/merchant/${merchantId}`,
      {
        deliveryAddress: {
          name: 'Customer',
          phone: '0900000001',
          addressLine: '456 Customer St',
        },
      },
      { headers: authHeader(customerLogin.access_token) }
    );
    expect(createOrderRes.status).toBe(201);
    expect(createOrderRes.data?.id).toBeTruthy();
  });
});
