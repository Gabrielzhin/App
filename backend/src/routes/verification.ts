import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Token expires in 24 hours
const TOKEN_EXPIRY_HOURS = 24;

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// In production, this would send actual emails/SMS
// For now, we'll just log them (or return in response for testing)
async function sendEmailVerification(email: string, token: string) {
  console.log(`[EMAIL] Send verification code to ${email}: ${token}`);
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
}

async function sendPhoneVerification(phone: string, token: string) {
  console.log(`[SMS] Send verification code to ${phone}: ${token}`);
  // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
}

export async function verificationRoutes(fastify: FastifyInstance) {
  // Request email verification
  fastify.post('/api/verify/email/request', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true }
    });
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return reply.code(400).send({ error: 'Email already verified' });
    }
    
    const token = generateVerificationCode();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry
      }
    });
    
    await sendEmailVerification(user.email, token);
    
    return { 
      message: 'Verification code sent to your email',
      // For testing only - remove in production
      ...(process.env.NODE_ENV === 'development' && { token })
    };
  });
  
  // Verify email with token
  fastify.post<{
    Body: { token: string }
  }>('/api/verify/email/confirm', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { token } = request.body;
    const userId = request.user.id;
    
    if (!token) {
      return reply.code(400).send({ error: 'Token required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        emailVerificationToken: true,
        emailVerificationExpiry: true
      }
    });
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return reply.code(400).send({ error: 'Email already verified' });
    }
    
    if (!user.emailVerificationToken || !user.emailVerificationExpiry) {
      return reply.code(400).send({ error: 'No verification pending. Request a new code.' });
    }
    
    if (new Date() > user.emailVerificationExpiry) {
      return reply.code(400).send({ error: 'Verification code expired. Request a new one.' });
    }
    
    if (user.emailVerificationToken !== token) {
      return reply.code(400).send({ error: 'Invalid verification code' });
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      }
    });
    
    return { message: 'Email verified successfully' };
  });
  
  // Request phone verification
  fastify.post<{
    Body: { phone: string }
  }>('/api/verify/phone/request', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { phone } = request.body;
    const userId = request.user.id;
    
    if (!phone) {
      return reply.code(400).send({ error: 'Phone number required' });
    }
    
    // Basic phone validation (E.164 format)
    if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
      return reply.code(400).send({ 
        error: 'Invalid phone format. Use E.164 format (e.g., +1234567890)' 
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneVerified: true }
    });
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    if (user.phoneVerified) {
      return reply.code(400).send({ error: 'Phone already verified' });
    }
    
    const token = generateVerificationCode();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone,
        phoneVerificationToken: token,
        phoneVerificationExpiry: expiry
      }
    });
    
    await sendPhoneVerification(phone, token);
    
    return { 
      message: 'Verification code sent to your phone',
      // For testing only - remove in production
      ...(process.env.NODE_ENV === 'development' && { token })
    };
  });
  
  // Verify phone with token
  fastify.post<{
    Body: { token: string }
  }>('/api/verify/phone/confirm', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { token } = request.body;
    const userId = request.user.id;
    
    if (!token) {
      return reply.code(400).send({ error: 'Token required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phoneVerified: true,
        phoneVerificationToken: true,
        phoneVerificationExpiry: true
      }
    });
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    if (user.phoneVerified) {
      return reply.code(400).send({ error: 'Phone already verified' });
    }
    
    if (!user.phoneVerificationToken || !user.phoneVerificationExpiry) {
      return reply.code(400).send({ error: 'No verification pending. Request a new code.' });
    }
    
    if (new Date() > user.phoneVerificationExpiry) {
      return reply.code(400).send({ error: 'Verification code expired. Request a new one.' });
    }
    
    if (user.phoneVerificationToken !== token) {
      return reply.code(400).send({ error: 'Invalid verification code' });
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationToken: null,
        phoneVerificationExpiry: null
      }
    });
    
    return { message: 'Phone verified successfully' };
  });
}
