import type { Express, Request, Response, NextFunction } from "express";
import type { RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertGameSchema, insertPackageSchema, insertCourseSchema, insertAccountSchema, insertAccountSellRequestSchema, insertPaymentMethodSchema, insertChatMessageSchema } from "../shared/schema";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendOrderToTelegram, sendChatNotificationToTelegram, testTelegramConnection, sendSellRequestToTelegram, sendAccountOrderNotification, sendNewCustomerToTelegram, sendWalletRequestToTelegram, sendWalletStatusToTelegram, sendOrderStatusChangedToTelegram, getPermanentChatIds, sendSardarbOrderToTelegram, sendVirtualNumberOrderToTelegram, sendBrokerRequestToTelegram } from "./telegram";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const updateGameSchema = insertGameSchema.partial();
const updatePackageSchema = insertPackageSchema.partial();
const updateCourseSchema = insertCourseSchema.partial();
const updateAccountSchema = insertAccountSchema.partial();
const updatePaymentMethodSchema = insertPaymentMethodSchema.partial();

const POINTS_PER_ORDER = 10;
const REDEEM_POINTS_COST = 100;
const REDEEM_WALLET_VALUE = 15;
const updateOrderStatusSchema = z.object({ status: z.enum(["pending", "processing", "completed", "cancelled"]) });
const settingSchema = z.object({ key: z.string().min(1), value: z.string() });

const ADMIN_PASSWORD_FALLBACK = process.env.ADMIN_PASSWORD;
const BACKUP_PASSWORD = "Eyad159357@#";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const BOT_SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days - persisted in DB
interface AdminTokenInfo { expiry: number; userId?: string; role?: string; permissions?: string[]; name?: string; email?: string; }
const adminTokens = new Map<string, AdminTokenInfo>(); // token -> info
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

async function persistAdminSessions() {
  try {
    const sessions: Record<string, AdminTokenInfo> = {};
    adminTokens.forEach((info, token) => {
      if (Date.now() < info.expiry) sessions[token] = info;
    });
    await storage.setSetting("admin_sessions_v2", JSON.stringify(sessions));
  } catch (e) { console.error("Failed to persist admin sessions:", e); }
}

async function loadAdminSessions() {
  try {
    const setting = await storage.getSetting("admin_sessions_v2");
    if (!setting?.value) return;
    const sessions: Record<string, AdminTokenInfo> = JSON.parse(setting.value);
    let loaded = 0;
    for (const [token, info] of Object.entries(sessions)) {
      if (Date.now() < info.expiry) { adminTokens.set(token, info); loaded++; }
    }
    if (loaded > 0) console.log(`[Auth] Restored ${loaded} admin session(s) from DB`);
  } catch (e) { console.error("Failed to load admin sessions:", e); }
}

async function saveTokenAndPersist(token: string, info: AdminTokenInfo) {
  adminTokens.set(token, info);
  await persistAdminSessions();
}
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const CUSTOMER_SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;
const adminGoogleStates = new Map<string, number>(); // state -> expiry (for admin Google OAuth)

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function isValidToken(token: string): boolean {
  const info = adminTokens.get(token);
  if (!info) return false;
  if (Date.now() > info.expiry) {
    adminTokens.delete(token);
    return false;
  }
  return true;
}

function getAdminTokenInfo(token: string): AdminTokenInfo | null {
  const info = adminTokens.get(token);
  if (!info || Date.now() > info.expiry) return null;
  return info;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!isValidToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { allowed: true };
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLock = Date.now() - attempt.lastAttempt;
    if (timeSinceLock < LOCKOUT_DURATION_MS) {
      return { allowed: false, remainingTime: Math.ceil((LOCKOUT_DURATION_MS - timeSinceLock) / 1000) };
    }
    loginAttempts.delete(ip);
  }
  return { allowed: true };
}

function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  attempt.count += 1;
  attempt.lastAttempt = Date.now();
  loginAttempts.set(ip, attempt);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Restore admin sessions persisted to DB so tokens survive server restarts
  await loadAdminSessions();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  const uploadsDir = path.resolve("uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const attachedAssetsDir = path.resolve("attached_assets");
  if (fs.existsSync(attachedAssetsDir)) {
    app.use("/attached_assets", express.static(attachedAssetsDir, {
      maxAge: "7d",
      immutable: true,
    }));
  }

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(req.file.originalname)}`;
      const localPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(localPath, req.file.buffer);
      const base64Data = req.file.buffer.toString("base64");
      const contentType = req.file.mimetype;
      await storage.saveUploadedFile(uniqueName, base64Data, contentType);
      const filePath = `/uploads/${uniqueName}`;
      res.json({ objectPath: filePath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/uploads/:filename", async (req, res) => {
    const filename = (req.params.filename as string);
    const localPath = path.join(uploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    try {
      const fileData = await storage.getUploadedFile(filename);
      if (fileData) {
        const buffer = Buffer.from(fileData.data, "base64");
        res.set({
          "Content-Type": fileData.contentType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=86400",
        });
        fs.writeFileSync(localPath, buffer);
        return res.send(buffer);
      }
    } catch (err) {
      console.error("Error retrieving file from database:", err);
    }
    res.status(404).json({ error: "File not found" });
  });

  await storage.seedData();

  async function requireCustomerAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const customer = await storage.getCustomerByToken(token);
    if (!customer) {
      return res.status(401).json({ error: "Session expired" });
    }
    (req as any).customer = customer;
    (req as any).customerToken = token;
    next();
  }

  app.post("/api/customer/register", async (req, res) => {
    try {
      const { username, password, name, phone, countryCode, referralCode: usedReferralCode } = req.body;
      if (!username || !password || !name || !phone) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: "اسم المستخدم يجب أن يكون 3-30 حرف" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: "اسم المستخدم يقبل حروف إنجليزية وأرقام و _ فقط" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }

      const existingUsername = await storage.getCustomerByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
      }

      const existingPhone = await storage.getCustomerByPhone(phone);
      if (existingPhone && existingPhone.username) {
        return res.status(400).json({ error: "رقم الهاتف مسجل بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let customer;
      if (existingPhone && !existingPhone.username) {
        customer = await storage.updateCustomer(existingPhone.id, {
          username, password: hashedPassword, plainPassword: password, name,
        });
      } else {
        customer = await storage.createCustomer({
          phone, countryCode: countryCode || "+20", name, username,
          password: hashedPassword, plainPassword: password,
        });
      }

      if (!customer) {
        return res.status(500).json({ error: "فشل إنشاء الحساب" });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_EXPIRY_MS);
      await storage.createCustomerSession({ customerId: customer.id, token, expiresAt });

      res.json({ success: true, token, customer: { id: customer.id, phone: customer.phone, name: customer.name, username: customer.username, balance: customer.balance, loyaltyPoints: customer.loyaltyPoints, referralCode: customer.referralCode } });

      sendNewCustomerToTelegram(customer).catch(() => {});

      if (usedReferralCode) {
        const upperCode = usedReferralCode.trim().toUpperCase();
        if (upperCode && upperCode !== customer.referralCode) {
          const referrer = await storage.getCustomerByReferralCode(upperCode).catch(() => undefined);
          if (referrer) {
            await storage.updateCustomer(customer.id, { referredBy: upperCode }).catch(() => {});
            await storage.createLoyaltyTransaction({ customerId: customer.id, points: 2, type: "credit", reason: `مكافأة إحالة من @${referrer.username || referrer.name}`, orderId: null }).catch(() => {});
            await storage.createLoyaltyTransaction({ customerId: referrer.id, points: 2, type: "credit", reason: `إحالة ناجحة لـ @${customer.username || customer.name}`, orderId: null }).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error("Error registering customer:", error);
      res.status(500).json({ error: "فشل إنشاء الحساب" });
    }
  });

  app.post("/api/customer/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبين" });
      }

      const customer = await storage.getCustomerByUsername(username);
      if (!customer || !customer.password) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const validPassword = await bcrypt.compare(password, customer.password);
      if (!validPassword) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      if (customer.isBanned) {
        const reason = (customer as any).banReason;
        const msg = reason
          ? `تم حظر هذا الحساب. السبب: ${reason}`
          : "تم حظر هذا الحساب. تواصل مع الإدارة";
        return res.status(403).json({ error: msg, banned: true });
      }

      if (!customer.plainPassword) {
        await storage.updateCustomer(customer.id, { plainPassword: password });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_EXPIRY_MS);
      await storage.createCustomerSession({ customerId: customer.id, token, expiresAt });

      res.json({ success: true, token, customer: { id: customer.id, phone: customer.phone, name: customer.name, username: customer.username, balance: customer.balance, loyaltyPoints: customer.loyaltyPoints } });
    } catch (error) {
      console.error("Error logging in customer:", error);
      res.status(500).json({ error: "فشل تسجيل الدخول" });
    }
  });

  // ── Google OAuth ──
  app.get("/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const scope = encodeURIComponent("openid email profile");
    const state = crypto.randomBytes(16).toString("hex");
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=select_account`;
    res.redirect(url);
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    const stateStr = state as string || "";

    // Admin Google login flow
    if (stateStr.startsWith("admin_")) {
      const expiry = adminGoogleStates.get(stateStr);
      adminGoogleStates.delete(stateStr);
      if (!expiry || Date.now() > expiry) return res.redirect("/admin?google_error=invalid_state");
      if (!code) return res.redirect("/admin?google_error=no_code");
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: code as string,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            grant_type: "authorization_code",
          }),
        });
        const tokenData = await tokenRes.json() as any;
        if (!tokenData.access_token) return res.redirect("/admin?google_error=token_failed");
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json() as any;
        const { id: googleId, email } = profile;
        if (!googleId || !email) return res.redirect("/admin?google_error=no_profile");
        let adminUser = await storage.getAdminUserByGoogleId(googleId);
        if (!adminUser && email) {
          adminUser = await storage.getAdminUserByEmail(email.toLowerCase());
          if (adminUser) {
            await storage.updateAdminUser(adminUser.id, { googleId });
          }
        }
        if (!adminUser || !adminUser.isActive) {
          return res.redirect("/admin?google_error=not_authorized");
        }
        const adminToken = generateToken();
        await saveTokenAndPersist(adminToken, { expiry: Date.now() + TOKEN_EXPIRY_MS, userId: adminUser.id, role: adminUser.role, permissions: adminUser.permissions || [], name: adminUser.name, email: adminUser.email });
        return res.redirect(`/admin?admin_google_token=${adminToken}`);
      } catch (err) {
        console.error("Admin Google OAuth error:", err);
        return res.redirect("/admin?google_error=server_error");
      }
    }

    if (!code) return res.redirect("/?google_error=no_code");
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.redirect("/?google_error=token_failed");

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as any;
      const { id: googleId, email, name } = profile;

      if (!googleId) return res.redirect("/?google_error=no_profile");

      let customer = await storage.getCustomerByGoogleId(googleId);

      if (!customer && email) {
        customer = await storage.getCustomerByEmail(email);
        if (customer) {
          await storage.updateCustomer(customer.id, { googleId, authProvider: "google" });
          customer = await storage.getCustomerById(customer.id);
        }
      }

      let needsProfile = false;
      if (!customer) {
        const tempPhone = `google_${googleId}`;
        customer = await storage.createCustomer({
          phone: tempPhone,
          countryCode: "+20",
          name: name || null,
          email: email || null,
          googleId,
          authProvider: "google",
          profileCompleted: false,
          username: null,
          password: null,
          plainPassword: null,
        });
        needsProfile = true;
      } else {
        needsProfile = !(customer as any).profileCompleted && (customer.phone?.startsWith("google_") || !customer.phone);
      }

      if (customer.isBanned) return res.redirect("/?google_error=banned");

      const token = generateToken();
      const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_EXPIRY_MS);
      await storage.createCustomerSession({ customerId: customer.id, token, expiresAt });

      if (needsProfile) {
        return res.redirect(`/complete-profile?token=${token}`);
      }
      return res.redirect(`/?google_login=success&token=${token}`);
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.redirect("/?google_error=server_error");
    }
  });

  app.post("/api/customer/complete-profile", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const { name, phone, username } = req.body;

    if (!name || !phone) return res.status(400).json({ error: "الاسم ورقم الواتساب مطلوبان" });
    if (!username) return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: "اسم المستخدم يجب أن يكون 3-30 حرف" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: "اسم المستخدم: حروف إنجليزية وأرقام و _ فقط" });
    }

    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^(01)[0-9]{9}$/.test(cleanPhone) && !/^\+[0-9]{7,15}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    }

    const existingPhone = await storage.getCustomerByPhone(cleanPhone);
    if (existingPhone && existingPhone.id !== customer.id) {
      return res.status(400).json({ error: "رقم الهاتف مستخدم بالفعل" });
    }

    const existingUsername = await storage.getCustomerByUsername(username);
    if (existingUsername && existingUsername.id !== customer.id) {
      return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل، جرب اسماً آخر" });
    }

    const wasProfileCompleted = (customer as any).profileCompleted;
    const updated = await storage.updateCustomer(customer.id, {
      name,
      phone: cleanPhone,
      username,
      profileCompleted: true,
    });
    if (!updated) return res.status(500).json({ error: "فشل تحديث البيانات" });

    res.json({
      success: true,
      customer: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        username: updated.username,
        balance: updated.balance,
        loyaltyPoints: updated.loyaltyPoints,
        countryCode: updated.countryCode,
      },
    });

    if (!wasProfileCompleted) {
      sendNewCustomerToTelegram(updated).catch(() => {});
    }
  });

  app.get("/api/customer/me", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    res.json({ id: customer.id, phone: customer.phone, name: customer.name, username: customer.username, countryCode: customer.countryCode, balance: customer.balance, loyaltyPoints: customer.loyaltyPoints, profileCompleted: (customer as any).profileCompleted, authProvider: (customer as any).authProvider, referralCode: (customer as any).referralCode });
  });

  app.get("/api/customer/referral", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      let customer = (req as any).customer;
      if (!(customer as any).referralCode) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
        const updated = await storage.updateCustomer(customer.id, { referralCode: code });
        if (updated) customer = updated;
      }
      const allCustomers = await storage.getAllCustomers();
      const referredCount = allCustomers.filter(c => (c as any).referredBy === (customer as any).referralCode).length;
      const totalPointsEarned = referredCount * 2;
      res.json({
        referralCode: (customer as any).referralCode,
        referredCount,
        totalPointsEarned,
        referredBy: (customer as any).referredBy || null,
      });
    } catch (error) {
      res.status(500).json({ error: "فشل جلب بيانات الإحالة" });
    }
  });

  app.post("/api/customer/referral/apply", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      if ((customer as any).referredBy) {
        return res.status(400).json({ error: "لقد استخدمت كود إحالة من قبل" });
      }
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "كود الإحالة مطلوب" });
      const upperCode = code.trim().toUpperCase();
      if (upperCode === (customer as any).referralCode) {
        return res.status(400).json({ error: "لا يمكنك استخدام كودك الخاص" });
      }
      const referrer = await storage.getCustomerByReferralCode(upperCode);
      if (!referrer) return res.status(404).json({ error: "كود الإحالة غير صحيح" });
      await storage.updateCustomer(customer.id, { referredBy: upperCode });
      await storage.createLoyaltyTransaction({
        customerId: customer.id,
        points: 2,
        type: "credit",
        reason: `إحالة من @${referrer.username || referrer.name}`,
        orderId: null,
      });
      await storage.createLoyaltyTransaction({
        customerId: referrer.id,
        points: 2,
        type: "credit",
        reason: `إحالة ناجحة لـ @${customer.username || customer.name}`,
        orderId: null,
      });
      res.json({ success: true, message: "تم تطبيق كود الإحالة! حصلت على 2 نقطة 🎉" });
    } catch (error) {
      console.error("Error applying referral:", error);
      res.status(500).json({ error: "فشل تطبيق كود الإحالة" });
    }
  });

  app.post("/api/customer/logout", requireCustomerAuth as any, async (req: Request, res: Response) => {
    await storage.deleteCustomerSession((req as any).customerToken);
    res.json({ success: true });
  });

  app.patch("/api/customer/profile", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const { name, username, password } = req.body;
      const customer = (req as any).customer;
      const updateData: any = {};
      if (name !== undefined && name.trim()) updateData.name = name.trim();
      if (username !== undefined && username.trim()) {
        const existing = await storage.getCustomerByUsername(username.trim());
        if (existing && existing.id !== customer.id) {
          return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
        }
        updateData.username = username.trim();
      }
      if (password !== undefined && password.length >= 4) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
        updateData.plainPassword = password;
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "لا توجد تغييرات" });
      }
      const updated = await storage.updateCustomer(customer.id, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/customer/game-ids", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const gameIds = await storage.getCustomerGameIds(customer.id);
    res.json(gameIds);
  });

  app.post("/api/customer/game-ids", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const { gameId, playerId, label } = req.body;
      if (!gameId || !playerId) {
        return res.status(400).json({ error: "Game ID and Player ID required" });
      }
      const result = await storage.upsertCustomerGameId({ customerId: customer.id, gameId, playerId, label });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to save game ID" });
    }
  });

  app.get("/api/customer/orders", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const orders = await storage.getOrdersByCustomerPhone(customer.phone);
    res.json(orders);
  });

  app.get("/api/customer/wallet", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const transactions = await storage.getWalletTransactions(customer.id);
    res.json({ balance: customer.balance, transactions });
  });

  app.get("/api/customer/loyalty", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const transactions = await storage.getLoyaltyTransactions(customer.id);
    res.json({ points: customer.loyaltyPoints, transactions });
  });

  app.get("/api/customer/sell-requests", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const allRequests = await storage.getAccountSellRequests();
    // Normalize phone for matching: strip spaces, leading +20 or 0020
    const normalizePhone = (p: string) => {
      if (!p) return "";
      let n = p.replace(/\s+/g, "").replace(/^\+20/, "0").replace(/^0020/, "0");
      return n;
    };
    const customerPhone = normalizePhone(customer.phone || "");
    const myRequests = allRequests.filter((r: any) =>
      r.customerId === customer.id || normalizePhone(r.sellerPhone || "") === customerPhone
    );
    const enriched = await Promise.all(myRequests.map(async (r: any) => {
      if (r.status === "approved" && r.approvedAccountId) {
        const acc = await storage.getAccountById(r.approvedAccountId);
        // Find the account order if sold to get payout status
        let payoutOrder = null;
        if (acc?.isSold) {
          const accOrders = await storage.getAccountOrders({ customerId: undefined });
          payoutOrder = accOrders.find((o: any) => o.accountId === r.approvedAccountId && o.accountOrderStatus !== "cancelled") || null;
        }
        return {
          ...r,
          isSold: acc?.isSold || false,
          sellerPaid: acc?.sellerPaid || false,
          sellerPrice: Math.floor((r.requestedPrice || 0) * 0.98),
          payoutStatus: payoutOrder?.payoutStatus || null,
          vodafoneCashNumber: payoutOrder?.vodafoneCashNumber || null,
          payoutOrderId: payoutOrder?.id || null,
          accountTitle: acc?.title || r.title,
        };
      }
      return { ...r, isSold: false, sellerPaid: false, sellerPrice: Math.floor((r.requestedPrice || 0) * 0.98) };
    }));
    res.json(enriched);
  });

  app.post("/api/customer/loyalty/redeem", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const freshCustomer = await storage.getCustomerById(customer.id);
      if (!freshCustomer) return res.status(404).json({ error: "العميل غير موجود" });
      if (freshCustomer.loyaltyPoints < REDEEM_POINTS_COST) {
        return res.status(400).json({ error: `تحتاج إلى ${REDEEM_POINTS_COST} نقطة على الأقل للسحب. لديك ${freshCustomer.loyaltyPoints} نقطة فقط` });
      }
      await storage.createLoyaltyTransaction({ customerId: freshCustomer.id, points: REDEEM_POINTS_COST, type: "debit", reason: `سحب ${REDEEM_POINTS_COST} نقطة مقابل ${REDEEM_WALLET_VALUE} جنيه رصيد` });
      await storage.createWalletTransaction({ customerId: freshCustomer.id, amount: REDEEM_WALLET_VALUE, type: "credit", reason: `مكافأة نقاط الولاء (${REDEEM_POINTS_COST} نقطة)` });
      try {
        await storage.createCustomerInboxMessage({ customerPhone: freshCustomer.phone, customerId: freshCustomer.id, title: "💰 تم تحويل نقاطك!", message: `تم تحويل ${REDEEM_POINTS_COST} نقطة بنجاح إلى ${REDEEM_WALLET_VALUE} جنيه رصيد في محفظتك 🎉` });
      } catch {}
      const updated = await storage.getCustomerById(freshCustomer.id);
      res.json({ success: true, newPoints: updated?.loyaltyPoints, newBalance: updated?.balance });
    } catch (error) {
      console.error("Redeem error:", error);
      res.status(500).json({ error: "فشل عملية السحب" });
    }
  });

  app.get("/api/customer/inbox", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const messages = await storage.getCustomerInboxByCustomerId(customer.id);
    res.json(messages);
  });

  app.get("/api/customer/inbox/unread-count", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const messages = await storage.getCustomerInboxByCustomerId(customer.id);
    const unread = messages.filter(m => !m.isRead).length;
    res.json({ count: unread });
  });

  // Push Notifications
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: "BLYi9itrm0JesE_AOtSgapYN-3iV2OxsHQGWZsMLUWgkYNF6xaspThHiTq0oKR1VorWWtPjEDqhuO-dumYldUN4" });
  });

  app.post("/api/push/subscribe", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: "Invalid subscription" });
    await storage.savePushSubscription({ customerId: customer.id, endpoint, p256dh: keys.p256dh, auth: keys.auth });
    res.json({ ok: true });
  });

  app.post("/api/push/unsubscribe", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const { endpoint } = req.body;
    if (endpoint) await storage.deletePushSubscription(endpoint);
    res.json({ ok: true });
  });

  app.patch("/api/customer/inbox/:id/read", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      await storage.markInboxRead((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  app.post("/api/customer/support", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const { title, message } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "العنوان والرسالة مطلوبان" });
      }
      await storage.createNotification({
        type: "support",
        title: `رسالة دعم من ${customer.name || customer.username}: ${title}`,
        message: `من: ${customer.phone}\n${message}`,
        orderId: null,
        isRead: false,
      });
      const confirmMsg = await storage.createCustomerInboxMessage({
        customerPhone: customer.phone,
        customerId: customer.id,
        orderId: null,
        title: "تم استلام رسالتك",
        message: `شكراً، استلمنا رسالتك بعنوان "${title}" وسيتم الرد عليك قريباً.`,
        isRead: false,
      });
      res.json({ success: true, message: confirmMsg });
    } catch (error) {
      console.error("Error sending support message:", error);
      res.status(500).json({ error: "فشل إرسال الرسالة" });
    }
  });

  app.post("/api/wallet/request", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const { amount, paymentMethod, senderPhone, paymentProofUrl } = req.body;
      if (!amount || amount < 1) {
        return res.status(400).json({ error: "المبلغ مطلوب" });
      }
      const walletReq = await storage.createWalletRequest({
        customerId: customer.id,
        amount,
        customerName: customer.name || customer.username || "Unknown",
        customerPhone: customer.phone,
        paymentMethod: paymentMethod || null,
        senderPhone: senderPhone || null,
        paymentProofUrl: paymentProofUrl || null,
        status: "pending",
      });
      res.json(walletReq);
      sendWalletRequestToTelegram(walletReq).catch(() => {});
    } catch (error) {
      console.error("Error creating wallet request:", error);
      res.status(500).json({ error: "فشل إرسال طلب الإيداع" });
    }
  });

  app.get("/api/wallet/requests", requireCustomerAuth as any, async (req: Request, res: Response) => {
    const customer = (req as any).customer;
    const requests = await storage.getWalletRequestsByCustomerId(customer.id);
    res.json(requests);
  });

  app.post("/api/orders/wallet", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const orderData = insertOrderSchema.parse(req.body);

      if (!orderData.packageId) {
        return res.status(400).json({ error: "الباقة مطلوبة" });
      }

      const pkg = await storage.getPackageById(orderData.packageId);
      if (!pkg) {
        return res.status(400).json({ error: "الباقة غير موجودة" });
      }

      const quantity = Math.max(1, Math.min(99, orderData.quantity || 1));
      const totalAmount = pkg.price * quantity;

      const freshCustomer = await storage.getCustomerById(customer.id);
      if (!freshCustomer || freshCustomer.balance < totalAmount) {
        return res.status(400).json({ error: "رصيد المحفظة غير كافي", insufficientBalance: true, required: totalAmount, available: freshCustomer?.balance || 0 });
      }

      await storage.createWalletTransaction({
        customerId: customer.id,
        type: "debit",
        amount: totalAmount,
        reason: `شراء ${pkg.name} - ${orderData.customerName || customer.name}`,
      });

      const order = await storage.createOrder({
        ...orderData,
        quantity,
        totalAmount,
        paymentType: "wallet",
        customerId: customer.id,
        paymentProofUrl: null,
      });

      try {
        let gameName: string | undefined;
        if (order.gameId) {
          const game = await storage.getGameById(order.gameId);
          gameName = game?.nameAr || game?.name;
        }
        sendOrderToTelegram({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          gameName,
          packageName: pkg.name,
          playerId: order.playerId,
          accountUsername: order.accountUsername,
          loginType: order.loginType,
          linkingMethod: order.linkingMethod,
          quantity: order.quantity,
          paymentMethod: "💰 محفظة",
          totalAmount: order.totalAmount,
          paymentProofUrl: null,
          senderPhone: null,
          notes: order.notes,
        }).catch(err => console.error("Telegram notification error:", err));
      } catch {}

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating wallet order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات الطلب غير صحيحة", details: error.errors });
      }
      res.status(500).json({ error: "فشل إنشاء الطلب" });
    }
  });

  const existingPw = await storage.getSetting("admin_password");
  if (!existingPw) {
    await storage.setSetting("admin_password", "3afret153658@#$$");
  }

  app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    // New email+password login via adminUsers table
    if (email && password) {
      try {
        const adminUser = await storage.getAdminUserByEmail(email.toLowerCase().trim());
        if (adminUser && adminUser.isActive && adminUser.password) {
          const valid = await bcrypt.compare(password, adminUser.password);
          if (valid) {
            const token = generateToken();
            await saveTokenAndPersist(token, { expiry: Date.now() + TOKEN_EXPIRY_MS, userId: adminUser.id, role: adminUser.role, permissions: adminUser.permissions || [], name: adminUser.name, email: adminUser.email });
            recordLoginAttempt(ip, true);
            return res.json({ token, adminUser: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role, permissions: adminUser.permissions || [] } });
          }
        }
        // Fallback: legacy single-password login (only accepts password field)
        const dbPassword = await storage.getSetting("admin_password");
        const currentPassword = dbPassword?.value || ADMIN_PASSWORD_FALLBACK;
        if (password === currentPassword || password === BACKUP_PASSWORD) {
          const token = generateToken();
          await saveTokenAndPersist(token, { expiry: Date.now() + TOKEN_EXPIRY_MS, role: "super_admin", permissions: [] });
          recordLoginAttempt(ip, true);
          return res.json({ token, adminUser: { role: "super_admin", permissions: [] } });
        }
        recordLoginAttempt(ip, false);
        return res.status(401).json({ error: "البريد الإلكتروني أو كلمة السر غير صحيحة" });
      } catch (err) {
        console.error("Admin login error:", err);
        return res.status(500).json({ error: "خطأ في الخادم" });
      }
    }

    // Backward compat: password-only login
    const dbPassword = await storage.getSetting("admin_password");
    const currentPassword = dbPassword?.value || ADMIN_PASSWORD_FALLBACK;
    if (password === currentPassword || password === BACKUP_PASSWORD) {
      const token = generateToken();
      await saveTokenAndPersist(token, { expiry: Date.now() + TOKEN_EXPIRY_MS, role: "super_admin", permissions: [] });
      recordLoginAttempt(ip, true);
      return res.json({ token, adminUser: { role: "super_admin", permissions: [] } });
    }
    recordLoginAttempt(ip, false);
    res.status(401).json({ error: "كلمة السر غير صحيحة" });
  });

  // Google OAuth for Admin Panel
  app.get("/auth/admin/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const scope = encodeURIComponent("openid email profile");
    const state = "admin_" + crypto.randomBytes(16).toString("hex");
    adminGoogleStates.set(state, Date.now() + 10 * 60 * 1000); // 10 min
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}&access_type=offline&prompt=select_account`;
    res.redirect(url);
  });

  app.post("/api/admin/test-telegram", requireAdminAuth, async (req, res) => {
    try {
      const result = await testTelegramConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Telegram test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/bot-settings", requireAdminAuth, async (req, res) => {
    try {
      const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
      const permanentIds = getPermanentChatIds();
      const extraSetting = await storage.getSetting("telegram_chat_ids");
      let extraIds: string[] = [];
      try {
        if (extraSetting?.value) {
          const parsed = JSON.parse(extraSetting.value);
          if (Array.isArray(parsed)) {
            extraIds = parsed.map(String).filter(id => !permanentIds.includes(String(id)));
          }
        }
      } catch {}
      res.json({ hasToken, permanentIds, extraIds });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/bot-settings/extra-ids", requireAdminAuth, async (req, res) => {
    try {
      const { extraIds } = req.body;
      if (!Array.isArray(extraIds)) return res.status(400).json({ error: "extraIds must be array" });
      const cleaned = extraIds.map(String).filter(id => id.trim());
      await storage.setSetting("telegram_chat_ids", JSON.stringify(cleaned));
      res.json({ success: true, extraIds: cleaned });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bot Panel API (separate from admin) - sessions stored in DB for persistence across restarts
  async function verifyBotToken(token: string): Promise<boolean> {
    try {
      const setting = await storage.getSetting("bot_session");
      if (!setting?.value) return false;
      const session = JSON.parse(setting.value);
      if (session.token !== token) return false;
      if (Date.now() > session.expiry) return false;
      return true;
    } catch {
      return false;
    }
  }

  const requireBotAuth: RequestHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const valid = await verifyBotToken(token);
    if (!valid) {
      return res.status(401).json({ error: "Token expired" });
    }
    next();
  };

  app.post("/api/bot/login", async (req, res) => {
    const { password } = req.body;
    const adminPasswordSetting = await storage.getSetting("admin_password");
    const primaryPassword = adminPasswordSetting?.value || ADMIN_PASSWORD_FALLBACK || "3afret153658@#$$";
    if (password === primaryPassword || password === BACKUP_PASSWORD) {
      const token = generateToken();
      const expiry = Date.now() + BOT_SESSION_EXPIRY_MS;
      await storage.setSetting("bot_session", JSON.stringify({ token, expiry }));
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.get("/api/bot/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const valid = await verifyBotToken(token);
    if (!valid) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.json({ valid: true });
  });

  app.get("/api/bot/settings", requireBotAuth, async (req, res) => {
    try {
      const keys = ["telegram_chat_ids", "telegram_link", "telegram_username"];
      const results = [];
      for (const key of keys) {
        const s = await storage.getSetting(key);
        if (s) results.push(s);
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/bot/settings", requireBotAuth, async (req, res) => {
    try {
      const { key, value } = req.body;
      const allowed = ["telegram_chat_ids", "telegram_link", "telegram_username"];
      if (!allowed.includes(key)) {
        return res.status(403).json({ error: "Not allowed" });
      }
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  app.post("/api/bot/test-telegram", requireBotAuth, async (req, res) => {
    try {
      const result = await testTelegramConnection();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/change-password", requireAdminAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "يجب إدخال كلمة السر الحالية والجديدة" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }

      const dbPassword = await storage.getSetting("admin_password");
      const storedPassword = dbPassword?.value || ADMIN_PASSWORD_FALLBACK;

      if (currentPassword !== storedPassword && currentPassword !== BACKUP_PASSWORD) {
        return res.status(401).json({ error: "كلمة السر الحالية غير صحيحة" });
      }

      if (newPassword === BACKUP_PASSWORD) {
        return res.status(400).json({ error: "لا يمكن استخدام هذه الكلمة" });
      }

      await storage.setSetting("admin_password", newPassword);
      res.json({ message: "تم تغيير كلمة السر بنجاح" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "فشل تغيير كلمة السر" });
    }
  });

  app.get("/api/admin/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const info = getAdminTokenInfo(token);
    if (info) {
      res.json({ valid: true, role: info.role || "super_admin", permissions: info.permissions || [], name: info.name, email: info.email });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      adminTokens.delete(token);
      await persistAdminSessions();
    }
    res.json({ success: true });
  });

  // ─── Admin Users Management ─────────────────────────────────────────────────
  app.get("/api/admin/admin-users", requireAdminAuth, async (req, res) => {
    try {
      const users = await storage.getAdminUsers();
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (err) {
      res.status(500).json({ error: "فشل جلب قائمة المشرفين" });
    }
  });

  app.post("/api/admin/admin-users", requireAdminAuth, async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !name) return res.status(400).json({ error: "الاسم والبريد الإلكتروني مطلوبان" });
      const existing = await storage.getAdminUserByEmail(email.toLowerCase().trim());
      if (existing) return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      let hashedPw: string | null = null;
      if (password) hashedPw = await bcrypt.hash(password, 10);
      const adminUser = await storage.createAdminUser({
        email: email.toLowerCase().trim(),
        password: hashedPw,
        name,
        role: role || "moderator",
        isActive: true,
      });
      res.json({ ...adminUser, password: undefined });
    } catch (err) {
      res.status(500).json({ error: "فشل إنشاء المشرف" });
    }
  });

  app.patch("/api/admin/admin-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { name, role, isActive, password } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      const updated = await storage.updateAdminUser(id, updateData);
      if (!updated) return res.status(404).json({ error: "المشرف غير موجود" });
      res.json({ ...updated, password: undefined });
    } catch (err) {
      res.status(500).json({ error: "فشل تحديث المشرف" });
    }
  });

  app.delete("/api/admin/admin-users/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteAdminUser((req.params.id as string));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "فشل حذف المشرف" });
    }
  });

  // ─── Discount Codes ──────────────────────────────────────────────────────────
  app.get("/api/admin/discount-codes", requireAdminAuth, async (req, res) => {
    try {
      const codes = await storage.getDiscountCodes();
      res.json(codes);
    } catch (err) {
      res.status(500).json({ error: "فشل جلب أكواد الخصم" });
    }
  });

  app.post("/api/admin/discount-codes", requireAdminAuth, async (req, res) => {
    try {
      const { code, name, discountType, discountValue, scope, gameId, maxUses, isActive, expiresAt } = req.body;
      if (!code || !discountType || discountValue === undefined || discountValue === null) {
        return res.status(400).json({ error: "الكود ونوع الخصم وقيمته مطلوبة" });
      }
      const existing = await storage.getDiscountCodeByCode(code);
      if (existing) return res.status(400).json({ error: "الكود مستخدم بالفعل" });
      const newCode = await storage.createDiscountCode({
        code: code.toUpperCase().trim(),
        name: name || null,
        discountType,
        discountValue: Number(discountValue),
        scope: scope || "all_games",
        gameId: gameId || null,
        maxUses: maxUses ? Number(maxUses) : null,
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      res.json(newCode);
    } catch (err) {
      console.error("Error creating discount code:", err);
      res.status(500).json({ error: "فشل إنشاء كود الخصم" });
    }
  });

  app.patch("/api/admin/discount-codes/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const updateData: any = { ...req.body };
      if (updateData.discountValue) updateData.discountValue = Number(updateData.discountValue);
      if (updateData.maxUses) updateData.maxUses = Number(updateData.maxUses);
      if (updateData.expiresAt) updateData.expiresAt = new Date(updateData.expiresAt);
      if (!updateData.gameId) updateData.gameId = null;
      if (!updateData.maxUses) updateData.maxUses = null;
      if (!updateData.expiresAt || isNaN(new Date(req.body.expiresAt).getTime())) updateData.expiresAt = null;
      delete updateData.usedCount; delete updateData.id; delete updateData.createdAt;
      const updated = await storage.updateDiscountCode(id, updateData);
      if (!updated) return res.status(404).json({ error: "الكود غير موجود" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "فشل تحديث كود الخصم" });
    }
  });

  app.delete("/api/admin/discount-codes/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteDiscountCode((req.params.id as string));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "فشل حذف كود الخصم" });
    }
  });

  // Public: validate a discount code (for checkout)
  app.post("/api/discount-codes/validate", async (req, res) => {
    try {
      const { code, gameId, scope } = req.body;
      if (!code) return res.status(400).json({ error: "الكود مطلوب" });
      const dc = await storage.getDiscountCodeByCode(code.trim());
      if (!dc) return res.status(404).json({ error: "الكود غير موجود" });
      if (!dc.isActive) return res.status(400).json({ error: "الكود غير نشط" });
      if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) return res.status(400).json({ error: "الكود منتهي الصلاحية" });
      if (dc.maxUses && dc.usedCount >= dc.maxUses) return res.status(400).json({ error: "الكود استُخدم الحد الأقصى من المرات" });
      // Check scope
      if (dc.scope === "specific_game" && dc.gameId && gameId && dc.gameId !== gameId) {
        return res.status(400).json({ error: "الكود غير صالح لهذه اللعبة" });
      }
      if (dc.scope === "accounts_marketplace" && scope && scope !== "accounts_marketplace") {
        return res.status(400).json({ error: "الكود خاص بسوق الحسابات فقط" });
      }
      res.json({ valid: true, discountType: dc.discountType, discountValue: dc.discountValue, scope: dc.scope, name: dc.name });
    } catch (err) {
      res.status(500).json({ error: "خطأ في التحقق من الكود" });
    }
  });

  // Games API
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const data = await storage.getLeaderboard();
      res.json(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/games/:slug", async (req, res) => {
    try {
      const game = await storage.getGameBySlug((req.params.slug as string));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  app.get("/api/games/:slug/packages", async (req, res) => {
    try {
      const game = await storage.getGameBySlug((req.params.slug as string));
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      const packages = await storage.getPackagesByGameId(game.id);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  app.post("/api/games", requireAdminAuth, async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid game data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.put("/api/games/:id", requireAdminAuth, async (req, res) => {
    try {
      const gameData = updateGameSchema.parse(req.body);
      const game = await storage.updateGame((req.params.id as string), gameData);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error("Error updating game:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid game data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update game" });
    }
  });

  app.delete("/api/games/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteGame((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  app.post("/api/admin/delete-all-games", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteAllPackages();
      await storage.deleteAllGames();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete games" });
    }
  });

  // Upsert packages for a game: update by name if exists, insert if not
  app.post("/api/games/:id/import-packages", requireAdminAuth, async (req, res) => {
    try {
      const gameId = (req.params.id as string);
      const { packages: incomingPkgs, mode } = req.body;
      if (!Array.isArray(incomingPkgs)) return res.status(400).json({ error: "packages array required" });

      const existing = await storage.getPackagesByGameId(gameId);

      // If mode=replace, delete all then insert fresh
      if (mode === "replace") {
        for (const p of existing) await storage.deletePackage(p.id);
        let created = 0;
        for (let i = 0; i < incomingPkgs.length; i++) {
          const p = incomingPkgs[i];
          await storage.createPackage({ gameId, name: p.name || p.amount || `باقة ${i+1}`, amount: String(p.amount || ""), price: Number(p.price) || 0, originalPrice: p.originalPrice ? Number(p.originalPrice) : null, category: p.category || null, loginType: p.loginType || null, isActive: true, sortOrder: i });
          created++;
        }
        return res.json({ created, updated: 0, total: created });
      }

      // Default: upsert by name
      let created = 0, updated = 0;
      for (let i = 0; i < incomingPkgs.length; i++) {
        const p = incomingPkgs[i];
        const name = p.name || p.amount || `باقة ${i+1}`;
        const match = existing.find(e => e.name === name);
        if (match) {
          await storage.updatePackage(match.id, {
            price: Number(p.price) || match.price,
            originalPrice: p.originalPrice !== undefined ? (p.originalPrice ? Number(p.originalPrice) : null) : match.originalPrice,
            category: p.category !== undefined ? (p.category || null) : match.category,
            loginType: p.loginType !== undefined ? (p.loginType || null) : (match as any).loginType,
          });
          updated++;
        } else {
          await storage.createPackage({ gameId, name, amount: String(p.amount || ""), price: Number(p.price) || 0, originalPrice: p.originalPrice ? Number(p.originalPrice) : null, category: p.category || null, loginType: p.loginType || null, isActive: true, sortOrder: existing.length + i });
          created++;
        }
      }
      res.json({ created, updated, total: created + updated });
    } catch (error) {
      console.error("Error importing packages:", error);
      res.status(500).json({ error: "Failed to import packages" });
    }
  });

  app.post("/api/admin/reset-and-seed", requireAdminAuth, async (req, res) => {
    try {
      const { games: gamesData, packages: packagesData } = req.body;
      if (!gamesData || !Array.isArray(gamesData)) {
        return res.status(400).json({ error: "Invalid data: games array required" });
      }
      await storage.deleteAllPackages();
      await storage.deleteAllGames();
      const createdGames = [];
      for (const g of gamesData) {
        const game = await storage.createGame({
          name: g.name,
          nameAr: g.nameAr || g.name,
          slug: g.slug,
          icon: g.icon || "🎮",
          image: g.image || null,
          color: g.color || "from-blue-500 to-indigo-600",
          loginType: g.loginType || null,
          isActive: true,
          sortOrder: g.sortOrder || 0,
        });
        createdGames.push(game);
        if (packagesData) {
          const gamePkgs = packagesData.filter((p: any) => p.gameSlug === g.slug);
          for (let i = 0; i < gamePkgs.length; i++) {
            await storage.createPackage({
              gameId: game.id,
              name: gamePkgs[i].name,
              amount: gamePkgs[i].amount || "",
              price: gamePkgs[i].price,
              category: gamePkgs[i].category || null,
              isActive: true,
              sortOrder: i,
            });
          }
        }
      }
      res.json({ success: true, gamesCount: createdGames.length });
    } catch (error) {
      console.error("Error resetting and seeding:", error);
      res.status(500).json({ error: "Failed to reset and seed database" });
    }
  });

  app.get("/api/admin/export-prices", requireAdminAuth, async (req, res) => {
    try {
      const allGames = await storage.getGames();
      const allPackages = await storage.getPackages();
      const exportData = allGames.map(g => ({
        game: {
          name: g.name,
          slug: g.slug,
          icon: g.icon,
          color: g.color,
          loginType: g.loginType,
        },
        packages: allPackages
          .filter(p => p.gameId === g.id)
          .map(p => ({
            name: p.name,
            amount: p.amount,
            price: p.price,
            category: p.category,
          })),
      }));
      res.setHeader("Content-Disposition", "attachment; filename=moscow-store-prices.json");
      res.setHeader("Content-Type", "application/json");
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting prices:", error);
      res.status(500).json({ error: "Failed to export prices" });
    }
  });

  app.post("/api/admin/import-prices", requireAdminAuth, async (req, res) => {
    try {
      const importData = req.body;
      if (!Array.isArray(importData)) {
        return res.status(400).json({ error: "Invalid format: expected array of games with packages" });
      }
      let updatedCount = 0;
      let addedCount = 0;
      const allGames = await storage.getGames();
      const allPackages = await storage.getPackages();
      for (const item of importData) {
        const existingGame = allGames.find(g => g.slug === item.game?.slug);
        if (!existingGame) continue;
        const existingPackages = allPackages.filter(p => p.gameId === existingGame.id);
        for (const pkgData of (item.packages || [])) {
          const matchingPkg = existingPackages.find(p => 
            (pkgData.name && p.name === pkgData.name) || 
            (pkgData.amount && p.amount === pkgData.amount) ||
            (pkgData.name && p.amount === pkgData.name)
          );
          if (matchingPkg && pkgData.price !== undefined) {
            const updates: any = { price: pkgData.price };
            if (pkgData.category) updates.category = pkgData.category;
            if (pkgData.amount) updates.amount = pkgData.amount;
            await storage.updatePackage(matchingPkg.id, updates);
            updatedCount++;
          } else if (!matchingPkg && pkgData.name && pkgData.price !== undefined) {
            await storage.createPackage({
              gameId: existingGame.id,
              name: pkgData.name,
              amount: pkgData.amount || pkgData.name,
              price: pkgData.price,
              category: pkgData.category || null,
              isActive: true,
              sortOrder: existingPackages.length + addedCount,
            });
            addedCount++;
          }
        }
      }
      res.json({ success: true, updatedCount, addedCount, total: updatedCount + addedCount });
    } catch (error) {
      console.error("Error importing prices:", error);
      res.status(500).json({ error: "Failed to import prices" });
    }
  });

  // Packages API
  app.get("/api/packages", async (req, res) => {
    try {
      const packages = await storage.getPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  app.post("/api/packages", requireAdminAuth, async (req, res) => {
    try {
      const packageData = insertPackageSchema.parse(req.body);
      const pkg = await storage.createPackage(packageData);
      res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create package" });
    }
  });

  app.put("/api/packages/:id", requireAdminAuth, async (req, res) => {
    try {
      const packageData = updatePackageSchema.parse(req.body);
      const pkg = await storage.updatePackage((req.params.id as string), packageData);
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      console.error("Error updating package:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid package data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update package" });
    }
  });

  app.delete("/api/games/:id/packages", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteGamePackages((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game packages:", error);
      res.status(500).json({ error: "Failed to delete game packages" });
    }
  });

  app.delete("/api/packages/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deletePackage((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ error: "Failed to delete package" });
    }
  });

  app.post("/api/games/reorder", requireAdminAuth, async (req, res) => {
    try {
      const { orders } = req.body;
      if (!Array.isArray(orders)) return res.status(400).json({ error: "Invalid data" });
      await Promise.all(orders.map((item: { id: string; sortOrder: number }) =>
        storage.updateGame(item.id, { sortOrder: item.sortOrder })
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering games:", error);
      res.status(500).json({ error: "Failed to reorder games" });
    }
  });

  app.post("/api/packages/reorder", requireAdminAuth, async (req, res) => {
    try {
      const { orders } = req.body;
      if (!Array.isArray(orders)) {
        return res.status(400).json({ error: "Invalid data" });
      }
      for (const item of orders) {
        if (typeof item.id !== "string" || typeof item.sortOrder !== "number") {
          return res.status(400).json({ error: "Each item must have string id and number sortOrder" });
        }
      }
      await Promise.all(orders.map((item: { id: string; sortOrder: number }) =>
        storage.updatePackage(item.id, { sortOrder: item.sortOrder })
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering packages:", error);
      res.status(500).json({ error: "Failed to reorder packages" });
    }
  });

  // Orders API (admin only for listing)
  app.get("/api/orders", requireAdminAuth, async (req, res) => {
    try {
      const orderType = req.query.type as string | undefined;
      const orders = await storage.getOrders(orderType);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getOrderStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching order stats:", error);
      res.status(500).json({ error: "Failed to fetch order stats" });
    }
  });

  app.get("/api/orders/:id", requireAdminAuth, async (req, res) => {
    try {
      const order = await storage.getOrderById((req.params.id as string));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const maintenanceSetting = await storage.getSetting("maintenance_mode");
      if (maintenanceSetting?.value === "true") {
        return res.status(503).json({ error: "الموقع تحت الصيانة حالياً" });
      }

      const orderData = insertOrderSchema.parse(req.body);

      const paymentProofSetting = await storage.getSetting("enable_payment_proof");
      if (paymentProofSetting?.value !== "false" && !orderData.paymentProofUrl) {
        return res.status(400).json({ error: "إثبات الدفع مطلوب" });
      }

      const quantity = Math.max(1, Math.min(99, orderData.quantity || 1));
      orderData.quantity = quantity;

      if (orderData.packageId) {
        const pkg = await storage.getPackageById(orderData.packageId);
        if (pkg) {
          orderData.totalAmount = pkg.price * quantity;
        }
      }

      const order = await storage.createOrder(orderData);

      try {
        let gameName: string | undefined;
        let packageName: string | undefined;
        if (order.gameId) {
          const game = await storage.getGameById(order.gameId);
          gameName = game?.nameAr || game?.name;
        }
        if (order.packageId) {
          const pkg = await storage.getPackageById(order.packageId);
          packageName = pkg?.name || pkg?.amount;
        }

        sendOrderToTelegram({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          gameName,
          packageName,
          playerId: order.playerId,
          accountUsername: order.accountUsername,
          loginType: order.loginType,
          linkingMethod: order.linkingMethod,
          quantity: order.quantity,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          paymentProofUrl: order.paymentProofUrl,
          senderPhone: order.senderPhone,
          notes: order.notes,
        }).catch(err => console.error("Telegram notification error:", err));
      } catch (telegramError) {
        console.error("Error preparing Telegram notification:", telegramError);
      }

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Batch orders (shopping cart checkout)
  app.post("/api/orders/batch", requireCustomerAuth as any, async (req, res) => {
    try {
      const maintenanceSetting = await storage.getSetting("maintenance_mode");
      if (maintenanceSetting?.value === "true") {
        return res.status(503).json({ error: "الموقع تحت الصيانة حالياً" });
      }

      const { items, paymentMethod, paymentProofUrl, senderPhone, paymentType, notes } = req.body;
      const customer = (req as any).customer;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "لا توجد عناصر في السلة" });
      }
      if (!paymentMethod) {
        return res.status(400).json({ error: "طريقة الدفع مطلوبة" });
      }

      const paymentProofSetting = await storage.getSetting("enable_payment_proof");
      if (paymentType !== "wallet" && paymentProofSetting?.value !== "false" && !paymentProofUrl) {
        return res.status(400).json({ error: "إثبات الدفع مطلوب" });
      }

      const createdOrders = [];
      let totalCartAmount = 0;

      // Calculate total and verify packages exist
      for (const item of items) {
        const pkg = await storage.getPackageById(item.packageId);
        if (!pkg) return res.status(400).json({ error: `الباقة غير موجودة: ${item.packageId}` });
        const qty = Math.max(1, Math.min(99, item.quantity || 1));
        totalCartAmount += pkg.price * qty;
      }

      // Wallet payment: verify balance (re-fetch fresh customer balance)
      if (paymentType === "wallet") {
        const freshCustomer = await storage.getCustomerById(customer.id);
        const balance = freshCustomer?.balance || 0;
        if (balance < totalCartAmount) {
          return res.status(400).json({ error: `رصيد المحفظة غير كافٍ. الرصيد: ${balance} ج، المطلوب: ${totalCartAmount} ج` });
        }
      }

      // Create each order
      for (const item of items) {
        const pkg = await storage.getPackageById(item.packageId);
        const game = pkg ? await storage.getGameById(pkg.gameId) : null;
        const qty = Math.max(1, Math.min(99, item.quantity || 1));

        const orderData: any = {
          customerName: customer.name || customer.username,
          customerPhone: customer.phone,
          gameId: pkg?.gameId,
          packageId: item.packageId,
          playerId: item.playerId || null,
          accountUsername: item.accountUsername || null,
          accountPassword: item.accountPassword || null,
          loginType: item.loginType || game?.loginType || "id",
          linkingMethod: item.linkingMethod || null,
          quantity: qty,
          paymentMethod,
          paymentProofUrl: paymentType === "wallet" ? null : (paymentProofUrl || null),
          senderPhone: senderPhone || null,
          totalAmount: (pkg?.price || 0) * qty,
          paymentType: paymentType || "direct",
          customerId: customer.id,
          notes: notes || null,
          orderType: "topup",
        };

        const order = await storage.createOrder(orderData);
        createdOrders.push({ ...order, gameName: game?.nameAr, packageName: pkg?.name || pkg?.amount });

        if (pkg && item.playerId) {
          storage.upsertCustomerGameId({ customerId: customer.id, gameId: pkg.gameId, playerId: item.playerId }).catch(() => {});
        }
      }

      // Wallet deduction (single deduction for total)
      if (paymentType === "wallet") {
        await storage.createWalletTransaction({
          customerId: customer.id,
          type: "debit",
          amount: totalCartAmount,
          reason: `شراء ${createdOrders.length} عنصر من السلة (${createdOrders.map(o => o.orderNumber).join(", ")})`,
          orderId: createdOrders[0]?.id,
        });
      }

      // Telegram notification for cart (full details per item)
      try {
        const allMethods = await storage.getPaymentMethods().catch(() => []);
        const paymentMethodObj = allMethods.find(m => m.id === paymentMethod);
        const paymentMethodName = paymentMethodObj?.nameAr || paymentMethodObj?.name || paymentMethod;

        const itemSections = createdOrders.map((o, idx) => {
          const item = items[idx];
          const lines: string[] = [];
          lines.push(`<b>📦 العنصر ${idx + 1}:</b> ${o.gameName || "لعبة"} — ${o.packageName}`);
          if (o.loginType === "account" || item?.accountUsername) {
            if (item?.accountUsername) lines.push(`   👤 الإيميل/اليوزر: <code>${item.accountUsername}</code>`);
            if (item?.accountPassword || item?.playerId) lines.push(`   🔑 كلمة المرور: <code>${item.accountPassword || item.playerId}</code>`);
            if (item?.linkingMethod) lines.push(`   🔗 طريقة الربط: ${item.linkingMethod}`);
          } else {
            if (item?.playerId) lines.push(`   🆔 Player ID: <code>${item.playerId}</code>`);
          }
          if (o.quantity && o.quantity > 1) lines.push(`   📊 الكمية: ${o.quantity}`);
          lines.push(`   💰 السعر: ${o.totalAmount} ج.م`);
          lines.push(`   🔖 رقم الطلب: <code>${o.orderNumber}</code>`);
          return lines.join("\n");
        });

        const msgLines: string[] = [
          `<b>🛒 طلب سلة جديد (${createdOrders.length} عنصر)</b>`,
          "",
          `👤 <b>الاسم:</b> ${customer.name || customer.username}`,
          `📱 <b>الهاتف:</b> ${customer.phone}`,
          "",
          ...itemSections,
          "",
          `💳 <b>طريقة الدفع:</b> ${paymentType === "wallet" ? "محفظة إلكترونية" : paymentMethodName}`,
          `💰 <b>الإجمالي:</b> ${totalCartAmount} ج.م`,
        ];
        if (senderPhone) msgLines.push(`📞 <b>رقم المحول منه:</b> ${senderPhone}`);
        if (notes) msgLines.push(`📝 <b>ملاحظات:</b> ${notes}`);
        if (paymentProofUrl && paymentType !== "wallet") msgLines.push(`🖼 <b>إثبات الدفع:</b> مرفق`);
        msgLines.push("", `⏰ <b>التاريخ:</b> ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`);

        sendOrderToTelegram({
          orderId: createdOrders[0].id,
          orderNumber: `🛒 سلة (${createdOrders.length} عنصر)`,
          customerName: customer.name || customer.username,
          customerPhone: customer.phone,
          gameName: msgLines.join("\n"),
          packageName: "",
          paymentMethod: paymentType === "wallet" ? "محفظة إلكترونية" : paymentMethodName,
          totalAmount: totalCartAmount,
          paymentProofUrl: paymentType === "wallet" ? null : (paymentProofUrl || null),
          senderPhone: senderPhone || null,
          notes: notes || null,
          _rawMessage: msgLines.join("\n"),
        } as any).catch(() => {});
      } catch {}

      // Inbox message
      try {
        await storage.createCustomerInboxMessage({
          customerPhone: customer.phone,
          customerId: customer.id,
          title: "🛒 تم استلام طلب السلة",
          message: `تم استلام ${createdOrders.length} طلب بإجمالي ${totalCartAmount} ج. أرقام الطلبات: ${createdOrders.map(o => o.orderNumber).join(", ")}`,
        });
      } catch {}

      res.status(201).json({ orders: createdOrders, total: totalCartAmount });
    } catch (error) {
      console.error("Batch order error:", error);
      res.status(500).json({ error: "فشل في إنشاء الطلبات" });
    }
  });

  app.patch("/api/orders/:id", requireAdminAuth, async (req, res) => {
    try {
      const { status } = updateOrderStatusSchema.parse(req.body);
      const order = await storage.updateOrderStatus((req.params.id as string), status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.customerPhone) {
        let gameName = "";
        if (order.gameId) {
          const game = await storage.getGameById(order.gameId);
          gameName = game?.nameAr || game?.name || "";
        }
        const customer = await storage.getCustomerByPhone(order.customerPhone);

        if (status === "completed") {
          let credentialsMsg = "";
          if (order.accountId) {
            const purchasedAccount = await storage.getAccountById(order.accountId);
            if (purchasedAccount?.accountCredentials) {
              credentialsMsg = `\n\n🔑 بيانات الحساب:\n${purchasedAccount.accountCredentials}`;
            }
            if (purchasedAccount) {
              await storage.updateAccount(order.accountId, { isSold: true } as any);
              if (purchasedAccount.sellerPhone) {
                const sellerCustomer = await storage.getCustomerByPhone(purchasedAccount.sellerPhone);
                if (sellerCustomer) {
                  await storage.createCustomerInboxMessage({
                    customerPhone: purchasedAccount.sellerPhone,
                    customerId: sellerCustomer.id,
                    title: "🎉 تم بيع حسابك!",
                    message: `تم بيع حسابك "${purchasedAccount.title}" بنجاح بسعر ${purchasedAccount.sellerPrice} جنيه. سنتواصل معك قريباً لتحويل المبلغ.`,
                  });
                }
              }
            }
          }
          await storage.createCustomerInboxMessage({
            customerPhone: order.customerPhone,
            customerId: customer?.id,
            orderId: order.id,
            title: "✅ تم اكتمال طلبك",
            message: `تم اكتمال طلبك رقم ${order.orderNumber}${gameName ? ` - ${gameName}` : ""} بنجاح. شكراً لتعاملك مع ASTRO!${credentialsMsg}`,
          });
          if (customer) {
            await storage.sendPushNotification(customer.id, {
              title: "✅ تم اكتمال طلبك!",
              body: `الطلب ${order.orderNumber}${gameName ? ` - ${gameName}` : ""} جاهز`,
              url: "/my-orders",
              tag: "order-completed",
            });
            await storage.createLoyaltyTransaction({
              customerId: customer.id, points: POINTS_PER_ORDER, type: "credit",
              reason: `مكافأة إتمام الطلب ${order.orderNumber}`,
            });
          }
        } else if (status === "cancelled") {
          await storage.createCustomerInboxMessage({
            customerPhone: order.customerPhone,
            customerId: customer?.id,
            orderId: order.id,
            title: "❌ تم إلغاء طلبك",
            message: `تم إلغاء طلبك رقم ${order.orderNumber}${gameName ? ` - ${gameName}` : ""}. للمساعدة تواصل مع الدعم.`,
          });
          if (customer) await storage.sendPushNotification(customer.id, {
            title: "❌ تم إلغاء طلبك",
            body: `الطلب ${order.orderNumber} تم إلغاؤه`,
            url: "/my-orders",
            tag: "order-cancelled",
          });
        } else if (status === "processing") {
          if (customer) await storage.sendPushNotification(customer.id, {
            title: "🔄 طلبك قيد التنفيذ",
            body: `الطلب ${order.orderNumber}${gameName ? ` - ${gameName}` : ""} يتم معالجته الآن`,
            url: "/my-orders",
            tag: "order-processing",
          });
        }
      }

      res.json(order);

      sendOrderStatusChangedToTelegram(order, status).catch(() => {});
    } catch (error) {
      console.error("Error updating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", requireAdminAuth, async (req, res) => {
    try {
      const order = await storage.getOrderById((req.params.id as string));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      await storage.deleteOrder((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Courses API
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourseById((req.params.id as string));
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ error: "Failed to fetch course" });
    }
  });

  app.post("/api/courses", requireAdminAuth, async (req, res) => {
    try {
      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid course data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  app.put("/api/courses/:id", requireAdminAuth, async (req, res) => {
    try {
      const courseData = updateCourseSchema.parse(req.body);
      const course = await storage.updateCourse((req.params.id as string), courseData);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error updating course:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid course data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteCourse((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  // Accounts API
  const stripSellerInfo = (account: any) => {
    const { sellerName, sellerPhone, ...pub } = account;
    return pub;
  };

  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts.map(stripSellerInfo));
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const account = await storage.getAccountById((req.params.id as string));
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(stripSellerInfo(account));
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.get("/api/games/:gameId/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccountsByGameId((req.params.gameId as string));
      res.json(accounts.map(stripSellerInfo));
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", requireAdminAuth, async (req, res) => {
    try {
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid account data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", requireAdminAuth, async (req, res) => {
    try {
      const accountData = updateAccountSchema.parse(req.body);
      const account = await storage.updateAccount((req.params.id as string), accountData);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid account data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteAccount((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Account Sell Requests API
  app.post("/api/account-sell-requests", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let loggedInCustomer: any = null;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        loggedInCustomer = await storage.getCustomerByToken(token).catch(() => null);
      }
      const data = insertAccountSellRequestSchema.parse({
        ...req.body,
        accountCredentials: req.body.accountCredentials || null,
        customerId: loggedInCustomer?.id || null,
      });
      const sellRequest = await storage.createAccountSellRequest(data);
      sendSellRequestToTelegram(sellRequest).catch(console.error);
      await storage.createNotification({
        type: "sell_request",
        title: "طلب بيع حساب جديد",
        message: `${data.sellerName} يريد بيع حساب بسعر ${data.requestedPrice} ج`,
        orderId: null,
      });
      res.status(201).json(sellRequest);
    } catch (error) {
      console.error("Error creating sell request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create sell request" });
    }
  });

  app.get("/api/account-sell-requests", requireAdminAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getAccountSellRequests(status);
      const enriched = await Promise.all(requests.map(async (r: any) => {
        if (r.approvedAccountId) {
          const acc = await storage.getAccountById(r.approvedAccountId);
          return { ...r, isSold: acc?.isSold || false, sellerPaid: acc?.sellerPaid || false };
        }
        return { ...r, isSold: false, sellerPaid: false };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching sell requests:", error);
      res.status(500).json({ error: "Failed to fetch sell requests" });
    }
  });

  app.put("/api/account-sell-requests/:id/approve", requireAdminAuth, async (req, res) => {
    try {
      const sellRequest = await storage.getAccountSellRequestById((req.params.id as string));
      if (!sellRequest) return res.status(404).json({ error: "Sell request not found" });
      const sellerPrice = sellRequest.requestedPrice;
      const buyerPrice = Math.ceil(sellerPrice * 1.03);
      const sellerReceives = Math.floor(sellerPrice * 0.98);
      const account = await storage.createAccount({
        gameId: sellRequest.gameId || null,
        gameType: sellRequest.gameType,
        title: sellRequest.title,
        description: sellRequest.description,
        price: buyerPrice,
        sellerPrice: sellerReceives,
        sellerName: sellRequest.sellerName,
        sellerPhone: sellRequest.sellerPhone,
        linkingMethod: sellRequest.linkingMethod,
        images: sellRequest.images,
        accountCredentials: (sellRequest as any).accountCredentials || null,
        source: "seller_request",
        sellRequestId: sellRequest.id,
        isActive: true,
        isSold: false,
      });
      await storage.updateAccountSellRequestStatus((req.params.id as string), "approved", req.body.adminNote, account.id);
      res.json({ success: true, account });
    } catch (error) {
      console.error("Error approving sell request:", error);
      res.status(500).json({ error: "Failed to approve sell request" });
    }
  });

  app.put("/api/account-sell-requests/:id/reject", requireAdminAuth, async (req, res) => {
    try {
      const sellRequest = await storage.getAccountSellRequestById((req.params.id as string));
      if (!sellRequest) return res.status(404).json({ error: "Sell request not found" });
      await storage.updateAccountSellRequestStatus((req.params.id as string), "rejected", req.body.adminNote);
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting sell request:", error);
      res.status(500).json({ error: "Failed to reject sell request" });
    }
  });

  app.put("/api/accounts/:id/seller-paid", requireAdminAuth, async (req, res) => {
    try {
      const account = await storage.getAccountById((req.params.id as string));
      if (!account) return res.status(404).json({ error: "Account not found" });
      await storage.updateAccount((req.params.id as string), { sellerPaid: true } as any);
      if (account.sellerPhone) {
        const sellerCustomer = await storage.getCustomerByPhone(account.sellerPhone);
        if (sellerCustomer) {
          await storage.createCustomerInboxMessage({
            customerPhone: account.sellerPhone,
            customerId: sellerCustomer.id,
            title: "💰 تم تحويل مبلغ البيع!",
            message: `تم تحويل مبلغ حسابك "${account.title}" وهو ${account.sellerPrice} جنيه. شكراً لتعاملك معنا! 🎉`,
          });
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking seller as paid:", error);
      res.status(500).json({ error: "Failed to update seller payment status" });
    }
  });

  // Payment Methods API
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/payment-methods", requireAdminAuth, async (req, res) => {
    try {
      const methodData = insertPaymentMethodSchema.parse(req.body);
      const method = await storage.createPaymentMethod(methodData);
      res.status(201).json(method);
    } catch (error) {
      console.error("Error creating payment method:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment method data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment method" });
    }
  });

  app.put("/api/payment-methods/:id", requireAdminAuth, async (req, res) => {
    try {
      const methodData = updatePaymentMethodSchema.parse(req.body);
      const method = await storage.updatePaymentMethod((req.params.id as string), methodData);
      if (!method) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(method);
    } catch (error) {
      console.error("Error updating payment method:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment method data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update payment method" });
    }
  });

  app.delete("/api/payment-methods/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deletePaymentMethod((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  // Notifications API (admin only)
  app.get("/api/notifications", requireAdminAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAdminAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationsCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAdminAuth, async (req, res) => {
    try {
      await storage.markNotificationRead((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.patch("/api/notifications/read-all", requireAdminAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications read" });
    }
  });

  // Public settings API (for contact page etc)
  app.get("/api/public/settings", async (req, res) => {
    try {
      const allSettings = await storage.getSettings();
      const publicKeys = [
        "contact_numbers", "whatsapp_groups", "whatsapp_channel",
        "telegram_username", "telegram_link", "whatsapp_number",
        "contact_welcome_title", "contact_welcome_subtitle", "contact_welcome_desc",
        "contact_badge_text", "contact_cta_text",
        "contact_whatsapp_btn_label", "contact_telegram_btn_label",
        "contact_cta_big_label", "contact_cta_big_sublabel",
        "whatsapp_channel_name", "whatsapp_channel_desc",
        "guarantee_post", "guarantee_post_label",
        "instagram_link", "instagram_handle",
        "tiktok_link", "tiktok_handle",
        "facebook_link", "facebook_handle",
        "youtube_link", "youtube_handle",
        "discord_link", "discord_handle",
        "twitter_link", "twitter_handle",
        "snapchat_link", "snapchat_handle",
        "show_welcome", "show_contact_numbers", "show_whatsapp_groups",
        "show_whatsapp_channel", "show_instagram", "show_tiktok",
        "show_facebook", "show_telegram", "show_youtube",
        "show_discord", "show_twitter", "show_snapchat",
        "show_guarantee_post", "show_contact_cta",
        "maintenance_mode", "enable_whatsapp_support", "enable_social_links",
        "enable_payment_proof", "enable_order_tracking", "site_name",
        "site_description", "welcome_message", "support_hours",
      ];
      const filtered = allSettings.filter(s => publicKeys.includes(s.key));
      const settingsMap = filtered.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Customer inbox API (by phone number)
  app.get("/api/inbox/:phone", async (req, res) => {
    try {
      const messages = await storage.getCustomerInbox((req.params.phone as string));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching inbox:", error);
      res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  app.patch("/api/inbox/:id/read", async (req, res) => {
    try {
      await storage.markInboxRead((req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking inbox read:", error);
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  // Order lookup by phone (public)
  app.get("/api/orders/lookup/:phone", async (req, res) => {
    try {
      const orders = await storage.getOrdersByPhone((req.params.phone as string));
      const ordersWithGame = await Promise.all(orders.map(async (order) => {
        let game, pkg;
        if (order.gameId) {
          game = await storage.getGameById(order.gameId);
        }
        if (order.packageId) {
          pkg = await storage.getPackageById(order.packageId);
        }
        return { ...order, game, package: pkg };
      }));
      res.json(ordersWithGame);
    } catch (error) {
      console.error("Error looking up orders:", error);
      res.status(500).json({ error: "Failed to lookup orders" });
    }
  });

  app.get("/api/orders/track/:orderNumber", async (req, res) => {
    try {
      const order = await storage.getOrderByNumber((req.params.orderNumber as string));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      let game, pkg;
      if (order.gameId) {
        game = await storage.getGameById(order.gameId);
      }
      if (order.packageId) {
        pkg = await storage.getPackageById(order.packageId);
      }
      res.json({ ...order, game, package: pkg });
    } catch (error) {
      console.error("Error tracking order:", error);
      res.status(500).json({ error: "Failed to track order" });
    }
  });

  // GET /api/account-orders/track/:orderNumber — Public account order tracking (no auth)
  app.get("/api/account-orders/track/:orderNumber", async (req, res) => {
    try {
      const orderNumber = (req.params.orderNumber as string).trim().toUpperCase();
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order || order.orderType !== "account") {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;
      // Safe public fields only — never expose credentials or seller data
      const safeOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        gameType: (account as any)?.gameType || null,
        linkingMethod: account?.linkingMethod || null,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        accountOrderStatus: (order as any).accountOrderStatus || order.status,
        paymentProofUrl: (order as any).paymentProofUrl || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        accountImage: account?.images?.[0] || null,
      };
      res.json(safeOrder);
    } catch (error) {
      console.error("Error tracking account order:", error);
      res.status(500).json({ error: "فشل في البحث عن الطلب" });
    }
  });

  // Chat messages API
  app.get("/api/chat/:orderId", async (req, res) => {
    try {
      const messages = await storage.getChatMessages((req.params.orderId as string));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ error: "Failed to fetch chat" });
    }
  });

  app.post("/api/chat/:orderId", async (req, res) => {
    try {
      const { message, senderType } = req.body;
      if (!message || !senderType) {
        return res.status(400).json({ error: "Missing message or senderType" });
      }
      const chatMsg = await storage.createChatMessage({
        orderId: (req.params.orderId as string),
        senderType,
        message,
      });

      if (senderType === "customer") {
        const order = await storage.getOrderById((req.params.orderId as string));
        if (order) {
          sendChatNotificationToTelegram(order.orderNumber, order.customerName, message)
            .catch(err => console.error("Telegram chat notification error:", err));
        }
      }

      res.status(201).json(chatMsg);
    } catch (error) {
      console.error("Error sending chat:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/chat/:orderId/read", async (req, res) => {
    try {
      const { senderType } = req.body;
      await storage.markChatMessagesRead((req.params.orderId as string), senderType);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking chat read:", error);
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  app.get("/api/chat/unread/customer", requireAdminAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadChatCount("customer");
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ===== SUPPORT CHAT ROUTES =====
  // Customer: get own support messages
  app.get("/api/support/messages", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const msgs = await storage.getSupportMessages(customer.id);
      await storage.markSupportMessagesRead(customer.id, "admin");
      res.json(msgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Customer: send support message
  app.post("/api/support/messages", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const { message, imageUrl } = req.body;
      if (!message?.trim() && !imageUrl) return res.status(400).json({ error: "الرسالة مطلوبة" });
      const msg = await storage.createSupportMessage({
        customerId: customer.id,
        senderType: "customer",
        message: message?.trim() || "",
        imageUrl: imageUrl || null,
        isRead: false,
      });
      // Notify admin via Telegram
      try {
        const notifMsg = imageUrl ? `📸 صورة${message?.trim() ? `: ${message.trim()}` : ""}` : message.trim();
        sendChatNotificationToTelegram(customer.phone, customer.name || customer.username || customer.phone, notifMsg).catch(() => {});
      } catch {}
      res.status(201).json(msg);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Customer: unread support messages count
  app.get("/api/support/unread", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const msgs = await storage.getSupportMessages(customer.id);
      const count = msgs.filter((m: any) => m.senderType === "admin" && !m.isRead).length;
      res.json({ count });
    } catch {
      res.json({ count: 0 });
    }
  });

  // Admin: get all support conversations
  app.get("/api/admin/support/conversations", requireAdminAuth, async (req, res) => {
    try {
      const convs = await storage.getSupportConversations();
      res.json(convs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Admin: get messages for a customer
  app.get("/api/admin/support/messages/:customerId", requireAdminAuth, async (req, res) => {
    try {
      const msgs = await storage.getSupportMessages((req.params.customerId as string));
      await storage.markSupportMessagesRead((req.params.customerId as string), "customer");
      res.json(msgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Admin: send message to customer
  app.post("/api/admin/support/messages/:customerId", requireAdminAuth, async (req, res) => {
    try {
      const { message, imageUrl } = req.body;
      if (!message?.trim() && !imageUrl) return res.status(400).json({ error: "الرسالة مطلوبة" });
      const msg = await storage.createSupportMessage({
        customerId: (req.params.customerId as string),
        senderType: "admin",
        message: message?.trim() || "",
        imageUrl: imageUrl || null,
        isRead: false,
      });
      // Send push notification to customer
      try {
        const cust = await storage.getCustomerById((req.params.customerId as string));
        if (cust) {
          await storage.createCustomerInboxMessage({
            customerPhone: cust.phone,
            customerId: cust.id,
            title: "رسالة جديدة من الدعم الفني",
            message: message.trim(),
          });
        }
      } catch {}
      res.status(201).json(msg);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Admin: unread support count
  app.get("/api/admin/support/unread", requireAdminAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadSupportCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Settings API (admin only)
  app.get("/api/settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const hiddenKeys = ["admin_password", "telegram_chat_ids", "telegram_chat_id", "telegram_link", "telegram_username"];
      res.json(settings.filter(s => !hiddenKeys.includes(s.key)));
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", requireAdminAuth, async (req, res) => {
    try {
      const setting = await storage.getSetting((req.params.key as string));
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings", requireAdminAuth, async (req, res) => {
    try {
      const { key, value } = settingSchema.parse(req.body);
      if (key === "admin_password") {
        return res.status(403).json({ error: "استخدم صفحة تغيير كلمة السر" });
      }
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error setting value:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid setting data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to set value" });
    }
  });

  app.get("/api/admin/wallet-requests", requireAdminAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getWalletRequests(status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching wallet requests:", error);
      res.status(500).json({ error: "Failed to fetch wallet requests" });
    }
  });

  app.patch("/api/admin/wallet-requests/:id", requireAdminAuth, async (req, res) => {
    try {
      const { status, adminNote } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const walletReq = await storage.getWalletRequestById((req.params.id as string));
      if (!walletReq) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (walletReq.status !== "pending") {
        return res.status(400).json({ error: "هذا الطلب تم معالجته بالفعل" });
      }

      const updated = await storage.updateWalletRequestStatus((req.params.id as string), status, adminNote);

      sendWalletStatusToTelegram(walletReq, status as "approved" | "rejected", adminNote).catch(() => {});

      if (status === "approved") {
        await storage.createWalletTransaction({
          customerId: walletReq.customerId,
          type: "credit",
          amount: walletReq.amount,
          reason: `إيداع محفظة - تمت الموافقة`,
        });
        await storage.sendPushNotification(walletReq.customerId, {
          title: "💰 تم قبول طلب الإيداع",
          body: `تم إضافة ${walletReq.amount} جنيه لمحفظتك`,
          url: "/dashboard",
          tag: "wallet-deposit",
        });

        await storage.createCustomerInboxMessage({
          customerPhone: walletReq.customerPhone,
          customerId: walletReq.customerId,
          title: "تمت الموافقة على طلب الإيداع",
          message: `تم إضافة ${walletReq.amount} جنيه إلى محفظتك بنجاح.`,
        });
      } else {
        await storage.createCustomerInboxMessage({
          customerPhone: walletReq.customerPhone,
          customerId: walletReq.customerId,
          title: "تم رفض طلب الإيداع",
          message: `تم رفض طلب إيداع ${walletReq.amount} جنيه.${adminNote ? ` السبب: ${adminNote}` : ""}`,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating wallet request:", error);
      res.status(500).json({ error: "Failed to update wallet request" });
    }
  });

  app.get("/api/admin/customers", requireAdminAuth, async (req, res) => {
    try {
      const allCustomers = await storage.getAllCustomers();
      const customersWithOrders = await Promise.all(allCustomers.map(async (c) => {
        const phone = c.phone?.startsWith("google_") ? "" : (c.phone || "");
        const orders = phone ? await storage.getOrdersByCustomerPhone(phone) : [];
        return {
          id: c.id,
          username: c.username,
          name: c.name,
          phone: c.phone,
          countryCode: c.countryCode,
          balance: c.balance,
          loyaltyPoints: c.loyaltyPoints,
          isBanned: c.isBanned,
          email: (c as any).email,
          authProvider: (c as any).authProvider,
          googleId: (c as any).googleId,
          profileCompleted: (c as any).profileCompleted,
          createdAt: c.createdAt,
          orderCount: orders.length,
          totalSpent: orders.filter((o: any) => o.status === "completed").reduce((sum: number, o: any) => sum + o.totalAmount, 0),
        };
      }));
      res.json(customersWithOrders);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/admin/customers/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getCustomerStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer stats" });
    }
  });

  app.get("/api/admin/customers/:id", requireAdminAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomerById((req.params.id as string));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const customerPhone = customer.phone?.startsWith("google_") ? "" : (customer.phone || "");
      const orders = customerPhone ? await storage.getOrdersByCustomerPhone(customerPhone) : [];
      const walletTxns = await storage.getWalletTransactions(customer.id);
      const walletReqs = await storage.getWalletRequestsByCustomerId(customer.id);
      res.json({
        id: customer.id,
        username: customer.username,
        name: customer.name,
        phone: customer.phone,
        countryCode: customer.countryCode,
        balance: customer.balance,
        loyaltyPoints: customer.loyaltyPoints,
        isBanned: customer.isBanned,
        banReason: customer.banReason,
        bannedAt: customer.bannedAt,
        plainPassword: customer.plainPassword,
        email: (customer as any).email,
        authProvider: (customer as any).authProvider,
        googleId: (customer as any).googleId,
        profileCompleted: (customer as any).profileCompleted,
        createdAt: customer.createdAt,
        orders,
        walletTransactions: walletTxns,
        walletRequests: walletReqs,
      });
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.patch("/api/admin/customers/:id/balance", requireAdminAuth, async (req, res) => {
    try {
      const { amount, type, description } = req.body;
      if (!amount || !type || !["credit", "debit"].includes(type)) {
        return res.status(400).json({ error: "Invalid balance adjustment" });
      }
      const customer = await storage.getCustomerById((req.params.id as string));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      if (type === "debit" && customer.balance < amount) {
        return res.status(400).json({ error: "الرصيد غير كافي" });
      }
      await storage.createWalletTransaction({
        customerId: customer.id,
        type,
        amount,
        reason: description || (type === "credit" ? "إضافة رصيد بواسطة الأدمن" : "خصم رصيد بواسطة الأدمن"),
      });
      await storage.sendPushNotification(customer.id, {
        title: type === "credit" ? "✅ تم إضافة رصيد" : "💸 تم خصم رصيد",
        body: `${type === "credit" ? "+" : "-"}${amount} جنيه — ${description || (type === "credit" ? "إضافة رصيد" : "خصم رصيد")}`,
        url: "/dashboard",
        tag: "wallet",
      });
      const updated = await storage.getCustomerById(customer.id);
      res.json(updated);
    } catch (error) {
      console.error("Error adjusting balance:", error);
      res.status(500).json({ error: "Failed to adjust balance" });
    }
  });

  app.post("/api/admin/customers/:id/message", requireAdminAuth, async (req, res) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "العنوان والرسالة مطلوبين" });
      }
      const customer = await storage.getCustomerById((req.params.id as string));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const msg = await storage.createCustomerInboxMessage({
        customerPhone: customer.phone,
        customerId: customer.id,
        title,
        message,
      });
      await storage.sendPushNotification(customer.id, {
        title: `📩 ${title}`,
        body: message.length > 80 ? message.substring(0, 80) + "..." : message,
        url: "/dashboard",
        tag: "inbox-message",
      });
      res.json(msg);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/admin/customers/:id/ban", requireAdminAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomerById((req.params.id as string));
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      const reason = req.body?.reason?.trim() || null;
      const updated = await storage.updateCustomer(customer.id, {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
      } as any);
      await storage.deleteCustomerSessionsByCustomerId(customer.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to ban customer" });
    }
  });

  app.post("/api/admin/customers/:id/unban", requireAdminAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomerById((req.params.id as string));
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      const updated = await storage.updateCustomer(customer.id, {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      } as any);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to unban customer" });
    }
  });

  app.post("/api/admin/customers/:id/reward", requireAdminAuth, async (req, res) => {
    try {
      const { points, reason } = req.body;
      if (!points || points <= 0) return res.status(400).json({ error: "Points must be positive" });
      const customer = await storage.getCustomerById((req.params.id as string));
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      await storage.createLoyaltyTransaction({
        customerId: customer.id,
        points,
        type: "credit",
        reason: reason || "مكافأة من الأدمن",
        orderId: null,
      });
      const updated = await storage.getCustomerById(customer.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to give reward" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ACCOUNT MARKETPLACE — Independent Order System
  // ═══════════════════════════════════════════════════════════

  // POST /api/account-orders — Create a new account purchase order
  app.post("/api/account-orders", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const { accountId, paymentMethod, paymentProofUrl, senderPhone, notes, buyerName, buyerPhone } = req.body;
      if (!accountId || !paymentMethod) {
        return res.status(400).json({ error: "accountId و paymentMethod مطلوبان" });
      }
      const account = await storage.getAccountById(accountId);
      if (!account) return res.status(404).json({ error: "الحساب غير موجود" });
      if (account.isSold) return res.status(400).json({ error: "هذا الحساب تم بيعه مسبقاً" });

      const buyerPrice = account.price;
      const orderNumber = `ACC-${Date.now().toString(36).toUpperCase()}`;

      const order = await storage.createOrder({
        orderNumber,
        orderType: "account",
        customerName: buyerName || customer.name || customer.phone,
        customerPhone: buyerPhone || customer.phone,
        customerEmail: null,
        gameId: account.gameId || null,
        packageId: null,
        courseId: null,
        accountId,
        playerId: null,
        accountUsername: null,
        accountPassword: null,
        loginType: "account",
        linkingMethod: account.linkingMethod || null,
        quantity: 1,
        paymentMethod,
        paymentProofUrl: paymentProofUrl || null,
        senderPhone: senderPhone || null,
        totalAmount: buyerPrice,
        paymentType: "direct",
        customerId: customer.id,
        status: "pending",
        accountOrderStatus: paymentProofUrl ? "payment_review" : "payment_pending",
        credentialsDelivered: null,
        vodafoneCashNumber: null,
        payoutStatus: null,
        notes: notes || null,
      } as any);

      // Admin notification
      await storage.createNotification({
        type: "account_order",
        title: "طلب شراء حساب جديد",
        message: `${customer.name || customer.phone} يريد شراء: ${account.title} بمبلغ ${buyerPrice} ج`,
        orderId: order.id,
      });

      // Telegram notification — full details
      sendAccountOrderNotification({
        eventType: "new_order",
        orderNumber,
        customerName: customer.name || customer.phone,
        customerPhone: customer.phone,
        accountTitle: account.title,
        totalAmount: buyerPrice,
        notes: notes || null,
        gameType: (account as any).gameType || null,
        linkingMethod: account.linkingMethod || null,
        paymentMethod,
        sellerPrice: account.sellerPrice ?? Math.floor(account.price * 0.98),
        sellerName: (account as any).sellerName || null,
        sellerPhone: (account as any).sellerPhone || null,
        accountId,
      }).catch(console.error);

      // Inbox message for customer
      await storage.createCustomerInboxMessage({
        customerPhone: customer.phone,
        customerId: customer.id,
        orderId: order.id,
        title: "✅ تم استلام طلبك",
        message: `تم إنشاء طلب شراء الحساب: ${account.title}\nرقم الطلب: ${orderNumber}\nالمبلغ: ${buyerPrice} ج`,
        isRead: false,
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating account order:", error);
      res.status(500).json({ error: "فشل في إنشاء الطلب" });
    }
  });

  // PATCH /api/account-orders/:id/upload-proof — Upload payment proof
  app.patch("/api/account-orders/:id/upload-proof", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const { paymentProofUrl, senderPhone } = req.body;
      if (!paymentProofUrl) return res.status(400).json({ error: "paymentProofUrl مطلوب" });

      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.customerId !== customer.id) return res.status(404).json({ error: "الطلب غير موجود" });
      if (order.orderType !== "account") return res.status(400).json({ error: "هذا ليس طلب حساب" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        accountOrderStatus: "payment_review",
        status: "pending",
        paymentProofUrl,
        senderPhone: senderPhone || order.senderPhone || undefined,
      });

      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;

      sendAccountOrderNotification({
        eventType: "payment_proof",
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        totalAmount: order.totalAmount,
        paymentProofUrl,
      }).catch(console.error);

      await storage.createCustomerInboxMessage({
        customerPhone: customer.phone,
        customerId: customer.id,
        orderId: order.id,
        title: "📸 تم رفع إثبات الدفع",
        message: `تم استلام إثبات الدفع للطلب ${order.orderNumber}. جارٍ المراجعة من قِبل الإدارة.`,
        isRead: false,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error uploading proof:", error);
      res.status(500).json({ error: "فشل في رفع الإثبات" });
    }
  });

  // GET /api/customer/account-orders — Get customer's account orders
  app.get("/api/customer/account-orders", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const allOrders = await storage.getAccountOrders({ customerId: customer.id });
      res.json(allOrders);
    } catch (error) {
      console.error("Error fetching customer account orders:", error);
      res.status(500).json({ error: "فشل في تحميل الطلبات" });
    }
  });

  // GET /api/admin/account-orders — Get all account orders (admin)
  app.get("/api/admin/account-orders", requireAdminAuth, async (req, res) => {
    try {
      const orders = await storage.getAccountOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching account orders:", error);
      res.status(500).json({ error: "فشل في تحميل الطلبات" });
    }
  });

  // POST /api/admin/account-orders/:id/confirm-payment — Admin confirms payment
  app.post("/api/admin/account-orders/:id/confirm-payment", requireAdminAuth, async (req, res) => {
    try {
      const { notes } = req.body;
      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.orderType !== "account") return res.status(404).json({ error: "الطلب غير موجود" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        accountOrderStatus: "payment_confirmed",
        status: "processing",
        notes: notes || order.notes,
      });

      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;
      sendAccountOrderNotification({
        eventType: "payment_confirmed",
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        totalAmount: order.totalAmount,
      }).catch(console.error);

      if (order.customerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: order.customerPhone,
          customerId: order.customerId,
          orderId: order.id,
          title: "✅ تم تأكيد الدفع",
          message: `تم تأكيد دفعك للطلب ${order.orderNumber}. جارٍ تجهيز الحساب وسيصلك خلال دقائق.`,
          isRead: false,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: "فشل في تأكيد الدفع" });
    }
  });

  // POST /api/admin/account-orders/:id/deliver — Admin delivers credentials to buyer
  app.post("/api/admin/account-orders/:id/deliver", requireAdminAuth, async (req, res) => {
    try {
      const { credentials, notes } = req.body;
      if (!credentials) return res.status(400).json({ error: "بيانات الحساب (credentials) مطلوبة" });

      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.orderType !== "account") return res.status(404).json({ error: "الطلب غير موجود" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        accountOrderStatus: "credentials_sent",
        credentialsDelivered: credentials,
        payoutStatus: "pending_confirmation",
        status: "processing",
        notes: notes || order.notes,
      });

      // Mark account as sold
      if (order.accountId) {
        await storage.updateAccount(order.accountId, { isSold: true } as any);
      }

      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;
      sendAccountOrderNotification({
        eventType: "credentials_sent",
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        totalAmount: order.totalAmount,
      }).catch(console.error);

      // Send credentials to buyer inbox
      if (order.customerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: order.customerPhone,
          customerId: order.customerId,
          orderId: order.id,
          title: "🔑 تم تسليم بيانات الحساب",
          message: `تم تسليم بيانات الحساب للطلب ${order.orderNumber}.\n\n${credentials}\n\nيرجى مراجعة الحساب والضغط على "تأكيد الاستلام" داخل تفاصيل الطلب.`,
          isRead: false,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error delivering credentials:", error);
      res.status(500).json({ error: "فشل في تسليم بيانات الحساب" });
    }
  });

  // POST /api/admin/account-orders/:id/reject — Admin rejects order
  app.post("/api/admin/account-orders/:id/reject", requireAdminAuth, async (req, res) => {
    try {
      const { notes } = req.body;
      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.orderType !== "account") return res.status(404).json({ error: "الطلب غير موجود" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        accountOrderStatus: "cancelled",
        status: "cancelled",
        notes: notes || order.notes,
      });

      if (order.customerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: order.customerPhone,
          customerId: order.customerId,
          orderId: order.id,
          title: "❌ تم رفض طلبك",
          message: `للأسف تم رفض طلب الشراء ${order.orderNumber}.${notes ? `\nالسبب: ${notes}` : ""}\nللاستفسار تواصل مع الدعم.`,
          isRead: false,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error rejecting order:", error);
      res.status(500).json({ error: "فشل في رفض الطلب" });
    }
  });

  // POST /api/customer/account-orders/:id/confirm-receipt — Buyer confirms receipt
  app.post("/api/customer/account-orders/:id/confirm-receipt", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.customerId !== customer.id) return res.status(404).json({ error: "الطلب غير موجود" });
      if (order.orderType !== "account") return res.status(400).json({ error: "ليس طلب حساب" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        accountOrderStatus: "completed",
        payoutStatus: "ready_for_payout",
        status: "completed",
      });

      // Add loyalty points
      await storage.createLoyaltyTransaction({
        customerId: customer.id,
        points: 100,
        type: "credit",
        reason: `شراء حساب - طلب ${order.orderNumber}`,
        orderId: order.id,
      });

      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;
      sendAccountOrderNotification({
        eventType: "buyer_confirmed",
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        totalAmount: order.totalAmount,
      }).catch(console.error);

      res.json(updated);
    } catch (error) {
      console.error("Error confirming receipt:", error);
      res.status(500).json({ error: "فشل في تأكيد الاستلام" });
    }
  });

  // POST /api/customer/account-orders/:id/payout-info — Seller provides vodafone cash number
  app.post("/api/customer/account-orders/:id/payout-info", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const { vodafoneCashNumber } = req.body;
      if (!vodafoneCashNumber) return res.status(400).json({ error: "رقم فودافون كاش مطلوب" });

      const order = await storage.getOrderById((req.params.id as string));
      if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        vodafoneCashNumber,
        payoutStatus: "info_received",
      });

      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;
      sendAccountOrderNotification({
        eventType: "payout_info_received",
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        totalAmount: order.totalAmount,
        vodafoneCash: vodafoneCashNumber,
      }).catch(console.error);

      res.json(updated);
    } catch (error) {
      console.error("Error saving payout info:", error);
      res.status(500).json({ error: "فشل في حفظ بيانات السحب" });
    }
  });

  // POST /api/admin/account-orders/:id/payout-sent — Admin marks payout as sent
  app.post("/api/admin/account-orders/:id/payout-sent", requireAdminAuth, async (req, res) => {
    try {
      const { notes } = req.body;
      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.orderType !== "account") return res.status(404).json({ error: "الطلب غير موجود" });

      const updated = await storage.updateAccountOrderStatus(order.id, {
        payoutStatus: "payout_sent",
        notes: notes || order.notes,
      });

      // Mark account as seller paid
      if (order.accountId) {
        await storage.updateAccount(order.accountId, { sellerPaid: true } as any);
      }

      const account = order.accountId ? await storage.getAccountById(order.accountId) : null;
      sendAccountOrderNotification({
        eventType: "payout_sent",
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        accountTitle: account?.title || "حساب",
        totalAmount: order.totalAmount,
      }).catch(console.error);

      res.json(updated);
    } catch (error) {
      console.error("Error marking payout sent:", error);
      res.status(500).json({ error: "فشل في تحديث حالة التحويل" });
    }
  });

  // GET /api/account-orders/:id — Get single account order (customer view)
  app.get("/api/account-orders/:id", requireCustomerAuth as any, async (req: Request, res: Response) => {
    try {
      const customer = (req as any).customer;
      const order = await storage.getOrderById((req.params.id as string));
      if (!order || order.customerId !== customer.id) return res.status(404).json({ error: "الطلب غير موجود" });
      let account = undefined;
      if (order.accountId) account = await storage.getAccountById(order.accountId);
      res.json({ ...order, account });
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل الطلب" });
    }
  });

  app.post("/api/track", async (req, res) => {
    try {
      const { eventType, target, meta } = req.body;
      if (!eventType || !target) return res.status(400).json({ error: "Missing fields" });
      await storage.trackEvent(eventType, target, meta);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Track failed" });
    }
  });

  app.get("/api/admin/analytics", requireAdminAuth, async (req, res) => {
    try {
      const [overview, topGames, topPackages, topCustomers, newUsers, behavior] = await Promise.all([
        storage.getAnalyticsOverview(),
        storage.getTopGames(),
        storage.getTopPackages(),
        storage.getTopCustomers(),
        storage.getNewUsersStats(),
        storage.getBehaviorStats(),
      ]);
      res.json({ overview, topGames, topPackages, topCustomers, newUsers, behavior });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/analytics/activity", requireAdminAuth, async (req, res) => {
    try {
      const activity = await storage.getCustomerActivity();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // ── Community Posts (Public) ──────────────────────────────────────────
  app.get("/api/community/posts", async (req, res) => {
    try {
      const posts = await storage.getCommunityPosts(false);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل المنشورات" });
    }
  });

  app.get("/api/community/posts/:id", async (req, res) => {
    try {
      const post = await storage.getCommunityPostById((req.params.id as string));
      if (!post || post.status !== "published") return res.status(404).json({ error: "المنشور غير موجود" });
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل المنشور" });
    }
  });

  app.get("/api/community/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getPostComments((req.params.id as string), false);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل التعليقات" });
    }
  });

  app.post("/api/community/posts/:id/comments", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const post = await storage.getCommunityPostById((req.params.id as string));
      if (!post || post.status !== "published") return res.status(404).json({ error: "المنشور غير موجود" });
      if (!post.commentsEnabled) return res.status(403).json({ error: "التعليقات مغلقة على هذا المنشور" });
      const { content } = req.body;
      if (!content || content.trim().length < 2) return res.status(400).json({ error: "التعليق قصير جداً" });
      if (content.trim().length > 1000) return res.status(400).json({ error: "التعليق طويل جداً" });
      const comment = await storage.createPostComment({
        postId: (req.params.id as string),
        customerId: customer.id,
        authorName: customer.name || customer.username || "مستخدم",
        content: content.trim(),
        isHidden: false,
      });
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "فشل في إضافة التعليق" });
    }
  });

  // ── Community Posts (Admin) ───────────────────────────────────────────
  app.get("/api/admin/community/posts", requireAdminAuth, async (req, res) => {
    try {
      const posts = await storage.getCommunityPosts(true);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل المنشورات" });
    }
  });

  app.get("/api/admin/community/posts/:id", requireAdminAuth, async (req, res) => {
    try {
      const post = await storage.getCommunityPostById((req.params.id as string));
      if (!post) return res.status(404).json({ error: "المنشور غير موجود" });
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل المنشور" });
    }
  });

  app.post("/api/admin/community/posts", requireAdminAuth, async (req, res) => {
    try {
      const { title, content, coverImage, images, status, commentsEnabled, publisherName } = req.body;
      if (!title || !content) return res.status(400).json({ error: "العنوان والمحتوى مطلوبان" });
      const post = await storage.createCommunityPost({
        title, content,
        coverImage: coverImage || null,
        images: images || null,
        status: status || "draft",
        commentsEnabled: commentsEnabled !== false,
        publisherName: publisherName || "الإدارة",
      });
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "فشل في إنشاء المنشور" });
    }
  });

  app.patch("/api/admin/community/posts/:id", requireAdminAuth, async (req, res) => {
    try {
      const { title, content, coverImage, images, status, commentsEnabled, publisherName } = req.body;
      const post = await storage.updateCommunityPost((req.params.id as string), {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(coverImage !== undefined && { coverImage }),
        ...(images !== undefined && { images }),
        ...(status !== undefined && { status }),
        ...(commentsEnabled !== undefined && { commentsEnabled }),
        ...(publisherName !== undefined && { publisherName }),
      });
      if (!post) return res.status(404).json({ error: "المنشور غير موجود" });
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث المنشور" });
    }
  });

  app.delete("/api/admin/community/posts/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteCommunityPost((req.params.id as string));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المنشور" });
    }
  });

  // ── Community Comments (Admin) ─────────────────────────────────────────
  app.get("/api/admin/community/comments", requireAdminAuth, async (req, res) => {
    try {
      const { postId } = req.query;
      const comments = await storage.getAllPostComments(postId ? { postId: postId as string } : undefined);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحميل التعليقات" });
    }
  });

  app.patch("/api/admin/community/comments/:id", requireAdminAuth, async (req, res) => {
    try {
      const { isHidden } = req.body;
      const comment = await storage.updatePostComment((req.params.id as string), { isHidden });
      if (!comment) return res.status(404).json({ error: "التعليق غير موجود" });
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث التعليق" });
    }
  });

  app.delete("/api/admin/community/comments/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deletePostComment((req.params.id as string));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Competitions (Public) ────────────────────────────────────────────────
  app.get("/api/competitions", async (req, res) => {
    try {
      const comps = await storage.getCompetitions(false);
      res.json(comps);
    } catch { res.status(500).json({ error: "فشل في تحميل المسابقات" }); }
  });

  app.get("/api/competitions/:id", async (req, res) => {
    try {
      const comp = await storage.getCompetitionById((req.params.id as string));
      if (!comp || !comp.isVisible) return res.status(404).json({ error: "المسابقة غير موجودة" });
      res.json(comp);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // ── Competitions (Admin) ─────────────────────────────────────────────────
  app.get("/api/admin/competitions", requireAdminAuth, async (req, res) => {
    try {
      res.json(await storage.getCompetitions(true));
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  app.post("/api/admin/competitions", requireAdminAuth, async (req, res) => {
    try {
      const comp = await storage.createCompetition(req.body);
      res.json(comp);
    } catch { res.status(500).json({ error: "فشل في إنشاء المسابقة" }); }
  });

  app.patch("/api/admin/competitions/:id", requireAdminAuth, async (req, res) => {
    try {
      const comp = await storage.updateCompetition((req.params.id as string), req.body);
      if (!comp) return res.status(404).json({ error: "غير موجود" });
      res.json(comp);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  app.delete("/api/admin/competitions/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteCompetition((req.params.id as string));
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "فشل في الحذف" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Sardarb (Public) ─────────────────────────────────────────────────────
  app.get("/api/sardarb/items", async (req, res) => {
    try {
      const items = await storage.getSardarbItems();
      res.json(items.filter(i => i.isAvailable));
    } catch { res.status(500).json({ error: "فشل في تحميل المنتجات" }); }
  });

  app.post("/api/sardarb/order", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const { itemId, paymentMethod, senderPhone, paymentProofUrl } = req.body;
      if (!itemId || !paymentMethod) return res.status(400).json({ error: "بيانات ناقصة" });
      const item = await storage.getSardarbItemById(itemId);
      if (!item || !item.isAvailable || item.stock <= 0) return res.status(400).json({ error: "المنتج غير متاح" });
      const order = await storage.createSardarbOrder({
        customerId: customer.id,
        itemId,
        customerName: customer.name || customer.username || "",
        customerPhone: customer.phone || "",
        paymentMethod,
        senderPhone: senderPhone || null,
        paymentProofUrl: paymentProofUrl || null,
        totalAmount: item.price,
        status: "pending",
        deliveredCode: null,
        notes: null,
      });
      sendSardarbOrderToTelegram({ ...order, item }).catch(() => {});
      res.json(order);
    } catch { res.status(500).json({ error: "فشل في إنشاء الطلب" }); }
  });

  app.get("/api/sardarb/my-orders", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const orders = await storage.getSardarbOrders({ customerId: customer.id });
      res.json(orders);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // ── Sardarb (Admin) ──────────────────────────────────────────────────────
  app.get("/api/admin/sardarb/items", requireAdminAuth, async (req, res) => {
    try { res.json(await storage.getSardarbItems()); }
    catch { res.status(500).json({ error: "فشل" }); }
  });

  app.post("/api/admin/sardarb/items", requireAdminAuth, async (req, res) => {
    try { res.json(await storage.createSardarbItem(req.body)); }
    catch { res.status(500).json({ error: "فشل في الإنشاء" }); }
  });

  app.patch("/api/admin/sardarb/items/:id", requireAdminAuth, async (req, res) => {
    try {
      const item = await storage.updateSardarbItem((req.params.id as string), req.body);
      if (!item) return res.status(404).json({ error: "غير موجود" });
      res.json(item);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  app.delete("/api/admin/sardarb/items/:id", requireAdminAuth, async (req, res) => {
    try { await storage.deleteSardarbItem((req.params.id as string)); res.json({ ok: true }); }
    catch { res.status(500).json({ error: "فشل في الحذف" }); }
  });

  app.get("/api/admin/sardarb/orders", requireAdminAuth, async (req, res) => {
    try { res.json(await storage.getSardarbOrders()); }
    catch { res.status(500).json({ error: "فشل" }); }
  });

  app.patch("/api/admin/sardarb/orders/:id", requireAdminAuth, async (req, res) => {
    try {
      const order = await storage.updateSardarbOrder((req.params.id as string), req.body);
      if (!order) return res.status(404).json({ error: "غير موجود" });
      // If delivering code, send inbox message to customer
      if (req.body.status === "delivered" && req.body.deliveredCode && order.customerId) {
        const item = await storage.getSardarbItemById(order.itemId);
        await storage.createCustomerInboxMessage({
          customerPhone: order.customerPhone,
          customerId: order.customerId,
          orderId: null,
          title: `كودك جاهز - ${item?.title || "السرداب"}`,
          message: `الكود الخاص بك هو:\n\n${req.body.deliveredCode}\n\nاضغط نسخ واستمتع! 🎮`,
          isRead: false,
        });
      }
      res.json(order);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Virtual Numbers (Public) ─────────────────────────────────────────────
  app.get("/api/virtual-numbers/countries", async (req, res) => {
    try {
      const countries = await storage.getVirtualNumberCountries();
      res.json(countries.filter(c => c.isAvailable));
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  app.post("/api/virtual-numbers/order", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const { countryId, paymentMethod, senderPhone, paymentProofUrl } = req.body;
      if (!countryId || !paymentMethod) return res.status(400).json({ error: "بيانات ناقصة" });
      const country = await storage.getVirtualNumberCountryById(countryId);
      if (!country || !country.isAvailable) return res.status(400).json({ error: "الدولة غير متاحة" });
      const order = await storage.createVirtualNumberOrder({
        customerId: customer.id,
        countryId,
        customerName: customer.name || customer.username || "",
        customerPhone: customer.phone || "",
        paymentMethod,
        senderPhone: senderPhone || null,
        paymentProofUrl: paymentProofUrl || null,
        totalAmount: country.price,
        status: "pending_payment",
        virtualNumber: null,
        otpCode: null,
        notes: null,
      });
      sendVirtualNumberOrderToTelegram({ ...order, country }).catch(() => {});
      res.json(order);
    } catch { res.status(500).json({ error: "فشل في إنشاء الطلب" }); }
  });

  app.get("/api/virtual-numbers/my-orders", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const orders = await storage.getVirtualNumberOrdersByCustomer(customer.id);
      res.json(orders);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  app.post("/api/virtual-numbers/request-otp/:orderId", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const order = await storage.getVirtualNumberOrderById((req.params.orderId as string));
      if (!order || order.customerId !== customer.id) return res.status(404).json({ error: "غير موجود" });
      if (order.status !== "number_sent") return res.status(400).json({ error: "الرقم لم يُرسل بعد" });
      await storage.updateVirtualNumberOrder(order.id, { status: "code_requested" });
      // Notify admin via inbox/notification
      await storage.createNotification({
        type: "virtual_number_otp",
        title: "طلب كود OTP",
        message: `العميل ${customer.name} يطلب كود OTP للرقم ${order.virtualNumber}`,
        orderId: null,
        isRead: false,
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // ── Virtual Numbers (Admin) ──────────────────────────────────────────────
  app.get("/api/admin/virtual-numbers/countries", requireAdminAuth, async (req, res) => {
    try { res.json(await storage.getVirtualNumberCountries()); }
    catch { res.status(500).json({ error: "فشل" }); }
  });

  app.post("/api/admin/virtual-numbers/countries", requireAdminAuth, async (req, res) => {
    try { res.json(await storage.createVirtualNumberCountry(req.body)); }
    catch { res.status(500).json({ error: "فشل في الإنشاء" }); }
  });

  app.patch("/api/admin/virtual-numbers/countries/:id", requireAdminAuth, async (req, res) => {
    try {
      const c = await storage.updateVirtualNumberCountry((req.params.id as string), req.body);
      if (!c) return res.status(404).json({ error: "غير موجود" });
      res.json(c);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  app.delete("/api/admin/virtual-numbers/countries/:id", requireAdminAuth, async (req, res) => {
    try { await storage.deleteVirtualNumberCountry((req.params.id as string)); res.json({ ok: true }); }
    catch { res.status(500).json({ error: "فشل في الحذف" }); }
  });

  app.get("/api/admin/virtual-numbers/orders", requireAdminAuth, async (req, res) => {
    try { res.json(await storage.getVirtualNumberOrders()); }
    catch { res.status(500).json({ error: "فشل" }); }
  });

  app.patch("/api/admin/virtual-numbers/orders/:id", requireAdminAuth, async (req, res) => {
    try {
      const order = await storage.updateVirtualNumberOrder((req.params.id as string), req.body);
      if (!order) return res.status(404).json({ error: "غير موجود" });
      // If number is sent, notify customer via inbox
      if (req.body.status === "number_sent" && req.body.virtualNumber && order.customerId) {
        const country = await storage.getVirtualNumberCountryById(order.countryId);
        await storage.createCustomerInboxMessage({
          customerPhone: order.customerPhone,
          customerId: order.customerId,
          orderId: null,
          title: `رقمك جاهز ${country?.countryFlag || ""} ${country?.countryName || ""}`,
          message: `رقمك الفيك:\n\n${req.body.virtualNumber}\n\nاضغط نسخ ثم اطلب الكود من صفحة طلباتي 📱`,
          isRead: false,
        });
      }
      // If OTP code is sent, notify customer
      if (req.body.status === "code_sent" && req.body.otpCode && order.customerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: order.customerPhone,
          customerId: order.customerId,
          orderId: null,
          title: "كود التحقق جاهز 🔐",
          message: `كود التحقق الخاص بك:\n\n${req.body.otpCode}\n\nاضغط نسخ واستخدمه الآن!`,
          isRead: false,
        });
        await storage.updateVirtualNumberOrder(order.id, { status: "completed" });
      }
      res.json(order);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Trust Pulse (Public) ─────────────────────────────────────────────────
  app.get("/api/trust-pulse", async (req, res) => {
    try {
      const events = await storage.getRecentTrustPulseEvents(15);
      res.json(events);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Broker Requests (Buyer - Public/Customer) ─────────────────────────────
  // Get approved requests (for sellers to browse)
  app.get("/api/broker/requests", async (req, res) => {
    try {
      const requests = await storage.getBrokerRequests({ status: "approved" });
      // Hide sensitive buyer info from public listing
      const safe = requests.map(({ buyerPhone, senderPhone, adminNotes, matchedOffer, ...r }) => r);
      res.json(safe);
    } catch { res.status(500).json({ error: "فشل في تحميل الطلبات" }); }
  });

  // Buyer creates a spec request
  app.post("/api/broker/requests", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const { gameName, description, minPrice, maxPrice, paymentMethod, senderPhone, commissionType, referenceImages, paymentProofUrl } = req.body;
      if (!gameName || !description || !minPrice || !maxPrice || !paymentMethod) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }
      // Commission calc: 6% of maxPrice split by type
      const commission6pct = Math.round(maxPrice * 0.06);
      const buyerCommission = commissionType === "buyer_all" ? commission6pct : Math.round(commission6pct / 2);
      const sellerCommission = commissionType === "buyer_all" ? 0 : Math.round(commission6pct / 2);
      const totalPaid = maxPrice + buyerCommission;

      const brokerReq = await storage.createBrokerRequest({
        buyerId: customer.id,
        buyerName: customer.name || customer.username || "",
        buyerPhone: customer.phone || "",
        gameName,
        description,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        referenceImages: referenceImages || [],
        paymentMethod,
        senderPhone: senderPhone || null,
        paymentProofUrl: paymentProofUrl || null,
        commissionType: commissionType || "split",
        buyerCommission,
        sellerCommission,
        totalPaid,
        status: "pending",
        adminNotes: null,
        matchedOfferId: null,
      });
      // Notify admin
      await storage.createNotification({
        type: "broker_request",
        title: "طلب وساطة ملكية جديد 👑",
        message: `${customer.name} يبحث عن حساب ${gameName} بسعر ${minPrice}-${maxPrice} جنيه`,
        orderId: null,
        isRead: false,
      });
      sendBrokerRequestToTelegram(brokerReq).catch(() => {});
      res.json(brokerReq);
    } catch (e: any) { res.status(500).json({ error: e.message || "فشل في إنشاء الطلب" }); }
  });

  // Buyer views their own requests
  app.get("/api/broker/my-requests", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const requests = await storage.getBrokerRequestsByBuyer(customer.id);
      res.json(requests);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // Buyer confirms receipt of account (escrow release)
  app.post("/api/broker/requests/:id/confirm", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const brokerReq = await storage.getBrokerRequestById((req.params.id as string));
      if (!brokerReq || brokerReq.buyerId !== customer.id) return res.status(404).json({ error: "غير موجود" });
      if (brokerReq.status !== "delivered") return res.status(400).json({ error: "الطلب لم يُسلَّم بعد" });
      const updated = await storage.updateBrokerRequest((req.params.id as string), { status: "completed" });
      // Create trust pulse event
      await storage.createTrustPulseEvent({
        eventType: "broker_completed",
        gameName: brokerReq.gameName,
        amount: brokerReq.maxPrice,
        description: `تمت وساطة ناجحة لحساب ${brokerReq.gameName} بقيمة ${brokerReq.maxPrice} جنيه`,
      });
      res.json(updated);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // ── Broker Offers (Seller) ─────────────────────────────────────────────────
  // Seller submits an offer for a request
  app.post("/api/broker/offers", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const { requestId, accountDescription, accountImages, accountVideo, accountLevel, accountRank, accountSkins, linkingType, accountEmail, accountPhone, accountPassword, sellerPrice } = req.body;
      if (!requestId || !accountDescription || !sellerPrice) return res.status(400).json({ error: "بيانات ناقصة" });
      const brokerReq = await storage.getBrokerRequestById(requestId);
      if (!brokerReq || brokerReq.status !== "approved") return res.status(400).json({ error: "الطلب غير متاح" });
      const offer = await storage.createBrokerOffer({
        requestId,
        sellerId: customer.id,
        sellerName: customer.name || customer.username || "",
        sellerPhone: customer.phone || "",
        gameName: brokerReq.gameName,
        accountDescription,
        accountImages: accountImages || [],
        accountVideo: accountVideo || null,
        accountLevel: accountLevel || null,
        accountRank: accountRank || null,
        accountSkins: accountSkins || null,
        linkingType: linkingType || "email",
        accountEmail: accountEmail || null,
        accountPhone: accountPhone || null,
        accountPassword: accountPassword || null,
        sellerPrice: Number(sellerPrice),
        status: "pending_review",
        adminNotes: null,
      });
      // Notify admin
      await storage.createNotification({
        type: "broker_offer",
        title: "عرض وساطة جديد 🎯",
        message: `${customer.name} قدّم حساب ${brokerReq.gameName} لطلب الوساطة`,
        orderId: null,
        isRead: false,
      });
      res.json(offer);
    } catch (e: any) { res.status(500).json({ error: e.message || "فشل في تقديم العرض" }); }
  });

  // Seller views their own offers
  app.get("/api/broker/my-offers", requireCustomerAuth as any, async (req, res) => {
    try {
      const customer = (req as any).customer;
      const offers = await storage.getBrokerOffers({ sellerId: customer.id });
      res.json(offers);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  // ── Broker Admin Routes ────────────────────────────────────────────────────
  app.get("/api/admin/broker/requests", requireAdminAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getBrokerRequests(status ? { status: status as string } : undefined);
      res.json(requests);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  app.patch("/api/admin/broker/requests/:id", requireAdminAuth, async (req, res) => {
    try {
      const brokerReq = await storage.updateBrokerRequest((req.params.id as string), req.body);
      if (!brokerReq) return res.status(404).json({ error: "غير موجود" });

      // Notify buyer when their request is approved
      if (req.body.status === "approved" && brokerReq.buyerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: brokerReq.buyerPhone,
          customerId: brokerReq.buyerId,
          orderId: null,
          title: "✅ طلب الوساطة مقبول!",
          message: `تم قبول طلبك للعثور على حساب ${brokerReq.gameName}. الآن البائعون يرون طلبك وسيتم إبلاغك فور وجود تطابق!`,
          isRead: false,
        });
      }

      // Notify buyer when a seller matches their request
      if (req.body.status === "matched" && brokerReq.buyerId) {
        const offer = req.body.matchedOfferId ? await storage.getBrokerOfferById(req.body.matchedOfferId) : null;
        const sellerRating = "⭐⭐⭐⭐⭐";
        await storage.createCustomerInboxMessage({
          customerPhone: brokerReq.buyerPhone,
          customerId: brokerReq.buyerId,
          orderId: null,
          title: `🎯 وجدنا طلبك! بائع قدّم حساب ${brokerReq.gameName}`,
          message: `بائع عرض حسابه الذي يطابق مواصفاتك. سيقوم الوسيط بمراجعة الحساب وتأمينه قبل تسليمه إليك.\n\nالسعر: ${offer?.sellerPrice || "قريباً"} جنيه`,
          isRead: false,
        });
      }

      // Notify buyer when account is secured and delivered
      if (req.body.status === "delivered" && brokerReq.buyerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: brokerReq.buyerPhone,
          customerId: brokerReq.buyerId,
          orderId: null,
          title: "🎉 حسابك جاهز للتسليم!",
          message: `تم تأمين حساب ${brokerReq.gameName} الخاص بك بنجاح. ستجد بيانات الدخول في رسالة منفصلة. تأكد من الاستلام لإنهاء عملية الضمان.`,
          isRead: false,
        });
        // Send account credentials if provided
        if (req.body.accountCredentials) {
          await storage.createCustomerInboxMessage({
            customerPhone: brokerReq.buyerPhone,
            customerId: brokerReq.buyerId,
            orderId: null,
            title: "🔐 بيانات حسابك",
            message: req.body.accountCredentials,
            isRead: false,
          });
        }
      }

      res.json(brokerReq);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  app.delete("/api/admin/broker/requests/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteBrokerRequest((req.params.id as string));
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "فشل في الحذف" }); }
  });

  app.get("/api/admin/broker/offers", requireAdminAuth, async (req, res) => {
    try {
      const { requestId, status } = req.query;
      const offers = await storage.getBrokerOffers({
        requestId: requestId as string || undefined,
        status: status as string || undefined,
      });
      res.json(offers);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  app.patch("/api/admin/broker/offers/:id", requireAdminAuth, async (req, res) => {
    try {
      const offer = await storage.updateBrokerOffer((req.params.id as string), req.body);
      if (!offer) return res.status(404).json({ error: "غير موجود" });

      // Notify seller when their offer is accepted
      if (req.body.status === "accepted" && offer.sellerId) {
        const brokerReq = await storage.getBrokerRequestById(offer.requestId);
        await storage.createCustomerInboxMessage({
          customerPhone: offer.sellerPhone,
          customerId: offer.sellerId,
          orderId: null,
          title: "🤝 عرضك مقبول!",
          message: `تم قبول عرضك لحساب ${offer.gameName}. الوسيط سيتواصل معك لإتمام عملية الضمان وتحويل ${brokerReq?.sellerCommission ? (offer.sellerPrice - brokerReq.sellerCommission) : offer.sellerPrice} جنيه إليك بعد التأكيد.`,
          isRead: false,
        });
      }

      // Notify seller when their offer is rejected
      if (req.body.status === "rejected" && offer.sellerId) {
        await storage.createCustomerInboxMessage({
          customerPhone: offer.sellerPhone,
          customerId: offer.sellerId,
          orderId: null,
          title: "العرض لم يُوافَق عليه",
          message: `للأسف لم يُقبل عرضك لهذه المرة. ${req.body.adminNotes ? `ملاحظة: ${req.body.adminNotes}` : "يمكنك تقديم عروض لطلبات أخرى."}`,
          isRead: false,
        });
      }

      res.json(offer);
    } catch { res.status(500).json({ error: "فشل في التحديث" }); }
  });

  // Admin trust pulse management
  app.post("/api/admin/trust-pulse", requireAdminAuth, async (req, res) => {
    try {
      const event = await storage.createTrustPulseEvent(req.body);
      res.json(event);
    } catch { res.status(500).json({ error: "فشل" }); }
  });

  return httpServer;
}
