import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

// Test cases (Courier only):
// - Happy: register courier with OTP -> approvalStatus=PENDING -> admin approves -> APPROVED
// - Happy: register courier with OTP -> admin rejects with reason -> REJECTED + rejectionReason
// - Happy: admin creates courier -> get by id -> update -> delete
// - Happy: list couriers with search filter includes created courier
// - Failed: OTP verify with invalid code should fail
// - Failed: register courier with invalid verification token should fail
// - Failed: non-admin cannot approve/reject courier
// - Edge: approve already-approved courier returns unchanged data (idempotent)
// - Edge: reject already-rejected courier returns unchanged data (idempotent)
describe('Courier registration flow', () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for courier e2e tests');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const cleanupPhones: string[] = [];
  const cleanupEmails: string[] = [];
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vhandelivery.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const loginAsAdmin = async () => {
    const res = await axios.post('/auth/login', {
      email: adminEmail,
      password: adminPassword,
    });

    return res.data.access_token as string;
  };

  const registerAndLoginUser = async (phone: string) => {
    const unique = Date.now().toString();
    const email = `courier_${unique}@example.com`;
    const password = 'Test1234!';
    const username = `courier_${unique}`;

    await axios.post('/auth/register', {
      email,
      password,
      username,
      phone,
    });

    cleanupPhones.push(phone);
    cleanupEmails.push(email);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not created');
    }

    const res = await axios.post('/auth/login', {
      email,
      password,
    });

    return {
      token: res.data.access_token as string,
      email,
      phone,
      userId: user.id,
    };
  };

  const createCourierAsUser = async (phone: string) => {
    const user = await registerAndLoginUser(phone);
    const verificationToken = await requestAndVerifyOtp(phone);
    const register = await axios.post(
      '/couriers/register',
      {
        name: `Courier ${phone}`,
        phone,
        verificationToken,
      },
      {
        headers: { Authorization: `Bearer ${user.token}` },
      }
    );

    return { user, courier: register.data };
  };

  const requestAndVerifyOtp = async (phone: string) => {
    await axios.post('/couriers/otp/request', { phone });

    const latestOtp = await prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw new Error('OTP not created');
    }

    const verify = await axios.post('/couriers/otp/verify', {
      phone,
      code: latestOtp.code,
    });

    return verify.data.verificationToken as string;
  };

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: cleanupEmails } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.$transaction([
      prisma.courier.deleteMany({ where: { phone: { in: cleanupPhones } } }),
      prisma.otpVerification.deleteMany({
        where: { phone: { in: cleanupPhones } },
      }),
      prisma.userRole.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.user.deleteMany({ where: { email: { in: cleanupEmails } } }),
    ]);
    await prisma.$disconnect();
  });

  it('registers courier as PENDING then approves', async () => {
    const phone = `090${Date.now().toString().slice(-7)}`;
    const adminToken = await loginAsAdmin();

    const { courier } = await createCourierAsUser(phone);

    expect(courier.approvalStatus).toBe('PENDING');

    const approve = await axios.patch(
      `/couriers/${courier.id}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(approve.data.approvalStatus).toBe('APPROVED');

    await axios.delete(`/couriers/${courier.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  it('rejects courier with reason', async () => {
    const phone = `091${Date.now().toString().slice(-7)}`;
    const adminToken = await loginAsAdmin();

    const { courier } = await createCourierAsUser(phone);

    const reject = await axios.patch(
      `/couriers/${courier.id}/reject`,
      { reason: 'Incomplete documents' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(reject.data.approvalStatus).toBe('REJECTED');
    expect(reject.data.rejectionReason).toBe('Incomplete documents');

    await axios.delete(`/couriers/${courier.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  it('admin creates courier then get, update, delete', async () => {
    const adminToken = await loginAsAdmin();
    const phone = `092${Date.now().toString().slice(-7)}`;
    const user = await registerAndLoginUser(phone);

    const created = await axios.post(
      '/couriers/admin-create',
      {
        userId: user.userId,
        name: 'Admin Courier',
        phone,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const courierId = created.data.id;

    const fetched = await axios.get(`/couriers/${courierId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(fetched.data.id).toBe(courierId);

    const updated = await axios.patch(
      `/couriers/${courierId}`,
      { name: 'Admin Courier Updated' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(updated.data.name).toBe('Admin Courier Updated');

    const deleted = await axios.delete(`/couriers/${courierId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(deleted.data.message).toBe('Courier deleted successfully');
  });

  it('lists couriers with search filter', async () => {
    const adminToken = await loginAsAdmin();
    const phone = `093${Date.now().toString().slice(-7)}`;
    const { courier } = await createCourierAsUser(phone);

    const list = await axios.get(`/couriers?search=${phone}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(list.data.total).toBeGreaterThan(0);
    expect(list.data.data.some((item) => item.id === courier.id)).toBe(true);
  });

  it('fails to verify OTP with invalid code', async () => {
    const phone = `094${Date.now().toString().slice(-7)}`;
    await axios.post('/couriers/otp/request', { phone });
    try {
      await axios.post('/couriers/otp/verify', { phone, code: '000000' });
      throw new Error('Expected OTP verify to fail');
    } catch (error: any) {
      expect(error.response?.status).toBe(400);
    }
  });

  it('fails to register courier with invalid verification token', async () => {
    const phone = `095${Date.now().toString().slice(-7)}`;
    const user = await registerAndLoginUser(phone);

    try {
      await axios.post(
        '/couriers/register',
        {
          name: 'Invalid Token Courier',
          phone,
          verificationToken: 'invalid-token',
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      throw new Error('Expected register to fail');
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }
  });

  it('prevents non-admin from approving or rejecting courier', async () => {
    const phone = `096${Date.now().toString().slice(-7)}`;
    const { user, courier } = await createCourierAsUser(phone);

    try {
      await axios.patch(
        `/couriers/${courier.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      throw new Error('Expected approve to fail');
    } catch (error: any) {
      expect(error.response?.status).toBe(403);
    }

    try {
      await axios.patch(
        `/couriers/${courier.id}/reject`,
        { reason: 'No permission' },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      throw new Error('Expected reject to fail');
    } catch (error: any) {
      expect(error.response?.status).toBe(403);
    }
  });

  it('approves already-approved courier idempotently', async () => {
    const adminToken = await loginAsAdmin();
    const phone = `097${Date.now().toString().slice(-7)}`;
    const { courier } = await createCourierAsUser(phone);

    const first = await axios.patch(
      `/couriers/${courier.id}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const second = await axios.patch(
      `/couriers/${courier.id}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(first.data.approvalStatus).toBe('APPROVED');
    expect(second.data.approvalStatus).toBe('APPROVED');
  });

  it('rejects already-rejected courier idempotently', async () => {
    const adminToken = await loginAsAdmin();
    const phone = `098${Date.now().toString().slice(-7)}`;
    const { courier } = await createCourierAsUser(phone);

    const first = await axios.patch(
      `/couriers/${courier.id}/reject`,
      { reason: 'Incomplete documents' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const second = await axios.patch(
      `/couriers/${courier.id}/reject`,
      { reason: 'Incomplete documents' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(first.data.approvalStatus).toBe('REJECTED');
    expect(second.data.approvalStatus).toBe('REJECTED');
  });
});
