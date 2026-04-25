import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Client as PGClient } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-default-key";

// --- Firebase Admin Setup ---
// We initialize it using the project ID. In Cloud Run, it should use ambient credentials.
try {
  admin.initializeApp({
    projectId: "gen-lang-client-0471330857"
  });
} catch (error) {
  console.log("Firebase Admin already initialized or failed to initialize ambiently");
}

// --- Multer Setup for Local Uploads ---
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Development logger
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });
  
  // Serve static uploads
  app.use("/uploads", express.static(uploadDir));

  // --- Site Settings Initialization ---
  let cachedSettings: any = null;

  // --- Email Setup ---
  const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    console.log(`[Email] Sending to: ${to} | Subject: ${subject}`);
    
    // Always fetch latest settings for SMTP
    const settings = await getSettings();
    const smtpUser = (settings?.smtpUser || process.env.SMTP_USER || "").trim();
    const smtpPass = settings?.smtpPass || process.env.SMTP_PASS;
    const smtpHost = (settings?.smtpHost || process.env.SMTP_HOST || "smtp.ethereal.email").trim();
    const smtpPort = settings?.smtpPort || parseInt(process.env.SMTP_PORT || "587");

    if (smtpUser && smtpPass) {
      try {
        const port = Number(smtpPort) || 587;
        const dynamicTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: port,
          secure: port === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          connectionTimeout: 10000,
        });

        await dynamicTransporter.sendMail({
          from: `"${settings?.schoolName || 'BIAIS'}" <${settings?.contactEmail || 'noreply@biais.edu.ng'}>`,
          to,
          subject,
          text,
          html: html || text.replace(/\n/g, '<br>'),
        });
        console.log(`[Email] Real email sent successfully to ${to}`);
      } catch (error) {
        console.error(`[Email] Failed to send real email to ${to}:`, error);
        // Fallback to log on failure if it's a dev env or just for visibility
        const logEntry = `\n--- FAILED EMAIL ATTEMPT ${new Date().toISOString()} ---\nTo: ${to}\nSubject: ${subject}\nError: ${error}\n------------------------------\n`;
        fs.appendFileSync(path.join(process.cwd(), "email-logs.txt"), logEntry);
      }
    } else {
      console.log(`[Email] No SMTP credentials. Email to ${to} logged to console and file.`);
      const logEntry = `\n--- ${new Date().toISOString()} ---\nTo: ${to}\nSubject: ${subject}\nBody: ${text}\n------------------------------\n`;
      fs.appendFileSync(path.join(process.cwd(), "email-logs.txt"), logEntry);
    }
  };

  const getSettings = async () => {
    if (cachedSettings) return cachedSettings;
    try {
      let settings = await prisma.siteSettings.findUnique({ where: { id: "global" } });
      if (!settings) {
        try {
          settings = await prisma.siteSettings.create({
            data: { id: "global" }
          });
        } catch (createError) {
          // If creation failed, likely another request created it simultaneously
          settings = await prisma.siteSettings.findUnique({ where: { id: "global" } });
        }
      }
      cachedSettings = settings;
      return settings;
    } catch (error) {
      console.error("Database error in getSettings:", error);
      throw error;
    }
  };
  
  // Seed initial programs if empty
  const seedPrograms = async () => {
    const count = await prisma.program.count();
    if (count === 0) {
      const initialCourses = [
        "Diploma in Arabic & Islamic Studies",
        "Diploma in Sharia & Law",
        "Certificate in Arabic Language Proficiency",
        "Higher National Diploma in Islamic Banking"
      ];
      for (const name of initialCourses) {
        await prisma.program.create({
          data: { name }
        });
      }
      console.log("Seed: Default programs created.");
    }
  };

  // Initialize on start
  getSettings();
  seedPrograms();

  // --- API Routes ---

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Auto-assign ADMIN role to the primary developer email
      const role = email === "anasyakubuabubakar@gmail.com" ? "ADMIN" : "APPLICANT";
      
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, fullName, role }
      });
      res.json({ message: "User registered successfully", role });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(400).json({ error: "Register failed. Email might already exist." });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Auto-promote developer email to ADMIN if not already
      if (email === "anasyakubuabubakar@gmail.com" && user.role !== "ADMIN") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" }
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      console.log(`[Auth] User ${user.email} logged in. Role: ${user.role}`);
      
      res.cookie("auth_token", token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'none',
        secure: true
      });
      res.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Auth: Get Me
  app.get("/api/auth/me", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      sameSite: 'none',
      secure: true
    });
    res.json({ message: "Logged out" });
  });

  // Auth: Google Login
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) return res.status(400).json({ error: "Missing ID Token" });

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, name, picture } = decodedToken;

      if (!email) return res.status(400).json({ error: "No email associated with Google account" });

      // Find or create user
      let user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        // Create user if not exists
        // We set a random password as they use Google to login
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
        user = await prisma.user.create({
          data: {
            email,
            fullName: name || "Google User",
            password: randomPassword,
            role: email === "anasyakubuabubakar@gmail.com" ? "ADMIN" : "APPLICANT"
          }
        });
        console.log(`[Auth] New user registered via Google: ${email}`);
      } else {
        // Auto-promote developer email to ADMIN if not already
        if (email === "anasyakubuabubakar@gmail.com" && user.role !== "ADMIN") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" }
          });
        }
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("auth_token", token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'none',
        secure: true
      });

      res.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(401).json({ error: "Unauthorized: Invalid Google Token" });
    }
  });

  // Auth: Forgot Password - Request Token
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        // We return success even if user not found for security (prevent email enumeration)
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expires
        }
      });

      const settings = await getSettings();
      const resetLink = `${req.get("origin")}/reset-password?token=${token}`;
      
      await sendEmail(
        user.email,
        "Password Reset Request",
        `Hello ${user.fullName},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
        `<h2>Password Reset Request</h2>
         <p>Hello <strong>${user.fullName}</strong>,</p>
         <p>You requested a password reset. Please click the button below to reset your password:</p>
         <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
         <p>Alternatively, copy and paste this link: <br> ${resetLink}</p>
         <p>This link will expire in 1 hour.</p>
         <p>If you did not request this, please ignore this email.</p>`
      );

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  });

  // Auth: Reset Password - Using Token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: "Password reset token is invalid or has expired." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      res.json({ message: "Password has been reset successfully." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  });

  // Notifications: Get My Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const notifications = await prisma.notification.findMany({
        where: { userId: decoded.userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Notifications: Mark as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      await prisma.notification.update({
        where: { id: req.params.id, userId: decoded.userId },
        data: { isRead: true }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Notifications: Mark all as read
  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      await prisma.notification.updateMany({
        where: { userId: decoded.userId, isRead: false },
        data: { isRead: true }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  // Local File Upload API
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file to local storage" });
    }
  });

  // Applications: Submit
  app.post("/api/applications", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const { courseApplied, documents, olevelResults, paymentReference, amountPaid } = req.body;

      // Check for existing active application (not rejected)
      const existingApp = await prisma.application.findFirst({
        where: {
          userId: decoded.userId,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (existingApp) {
        return res.status(400).json({ 
          error: "Duplicate application", 
          message: "You already have an active application. You cannot apply again unless your previous application is rejected." 
        });
      }

      const application = await prisma.application.create({
        data: {
          courseApplied,
          documents: JSON.stringify(documents),
          olevelResults: olevelResults ? JSON.stringify(olevelResults) : null,
          userId: decoded.userId,
          paymentStatus: 'COMPLETED', // In a real app, verify reference with a gateway first
          paymentReference,
          amountPaid: amountPaid ? parseFloat(amountPaid) : undefined
        }
      });
      res.json(application);
    } catch (error: any) {
      console.error("Submit app error:", error);
      res.status(500).json({ 
        error: "Failed to submit application",
        message: error?.message || "Internal server error"
      });
    }
  });

  // Applications: Get My Applications
  app.get("/api/applications/my", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const apps = await prisma.application.findMany({
        where: { userId: decoded.userId },
        orderBy: { createdAt: 'desc' }
      });
      
      const parsedApps = apps.map(app => ({
        ...app,
        documents: app.documents ? JSON.parse(app.documents) : null,
        olevelResults: app.olevelResults ? JSON.parse(app.olevelResults) : null
      }));
      
      res.json(parsedApps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Admin: Get All Applications (Paginated & Filtered)
  app.get("/api/admin/applications", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status && status !== 'all') {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { courseApplied: { contains: search } },
          { user: { fullName: { contains: search } } },
          { user: { email: { contains: search } } },
        ];
      }

      const [apps, totalCount] = await Promise.all([
        prisma.application.findMany({
          where,
          include: { user: { select: { fullName: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.application.count({ where })
      ]);

      const parsedApps = apps.map(app => ({
        ...app,
        documents: app.documents ? JSON.parse(app.documents) : null,
        olevelResults: app.olevelResults ? JSON.parse(app.olevelResults) : null
      }));

      res.json({
        data: parsedApps,
        meta: {
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          limit
        }
      });
    } catch (error) {
      console.error("Admin apps error:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Site Settings: Get
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await getSettings();
      res.json(settings);
    } catch (error) {
      console.error("CRITICAL ERROR: Failed to fetch settings:", error);
      res.status(500).json({ 
        error: "Failed to fetch settings",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin: Update Settings
  app.patch("/api/admin/settings", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { schoolName, schoolShortName, schoolDescription, contactEmail, logoUrl, applicationFee, smtpHost, smtpPort, smtpUser, smtpPass, databaseUrl, admissionLetterTemplate } = req.body;
      const updated = await prisma.siteSettings.update({
        where: { id: "global" },
        data: { 
          schoolName, 
          schoolShortName, 
          schoolDescription, 
          contactEmail, 
          logoUrl,
          applicationFee: applicationFee ? parseFloat(applicationFee) : undefined,
          smtpHost,
          smtpPort: smtpPort ? parseInt(smtpPort) : undefined,
          smtpUser,
          smtpPass,
          databaseUrl,
          admissionLetterTemplate
        }
      });
      cachedSettings = updated;
      res.json(updated);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // --- Program Management APIs ---
  
  // Public: Get Active Programs
  app.get("/api/programs", async (req, res) => {
    try {
      const programs = await prisma.program.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      res.json(programs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch programs" });
    }
  });

  // Admin: Get All Programs
  app.get("/api/admin/programs", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const userRes = await prisma.user.findUnique({
        where: { id: (jwt.verify(token, JWT_SECRET) as any).userId }
      });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const programs = await prisma.program.findMany({
        orderBy: { name: 'asc' }
      });
      res.json(programs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch programs" });
    }
  });

  // Admin: Create Program
  app.post("/api/admin/programs", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const userRes = await prisma.user.findUnique({
        where: { id: (jwt.verify(token, JWT_SECRET) as any).userId }
      });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { name, description, isActive } = req.body;
      const program = await prisma.program.create({
        data: { name, description, isActive }
      });
      res.json(program);
    } catch (error) {
      res.status(500).json({ error: "Failed to create program" });
    }
  });

  // Admin: Update Program
  app.patch("/api/admin/programs/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const userRes = await prisma.user.findUnique({
        where: { id: (jwt.verify(token, JWT_SECRET) as any).userId }
      });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { name, description, isActive } = req.body;
      const program = await prisma.program.update({
        where: { id: req.params.id },
        data: { name, description, isActive }
      });
      res.json(program);
    } catch (error) {
      res.status(500).json({ error: "Failed to update program" });
    }
  });

  // Admin: Delete Program
  app.delete("/api/admin/programs/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const userRes = await prisma.user.findUnique({
        where: { id: (jwt.verify(token, JWT_SECRET) as any).userId }
      });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      await prisma.program.delete({ where: { id: req.params.id } });
      res.json({ message: "Program deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete program" });
    }
  });

  // --- Admin User Management APIs ---
  
  // Admin: Test Email Connectivity
  app.post("/api/admin/test-email", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const userRes = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

      if (!smtpHost || !smtpUser || !smtpPass) {
        return res.status(400).json({ error: "Missing configuration", message: "Host, User, and Password are required." });
      }

      // Warn if password looks like a masked value from a screenshot
      if (smtpPass.includes('*')) {
         return res.status(400).json({ error: "Invalid Password", message: "It looks like you entered a masked password (with asterisks). Please copy the actual password from your SMTP provider." });
      }

      const port = parseInt(smtpPort) || 587;
      // Create a temporary transporter for testing
      const transporter = nodemailer.createTransport({
        host: smtpHost.trim(),
        port: port,
        secure: port === 465,
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass,
        },
        connectionTimeout: 10000, // 10 seconds timeout
      });

      // Verify connection
      await transporter.verify();

      // Send a test message
      const settings = await prisma.siteSettings.findFirst();
      await transporter.sendMail({
        from: `"${settings?.schoolName || 'BIAIS'}" <${settings?.contactEmail || smtpUser}>`,
        to: userRes.email,
        subject: "SMTP Connection Test",
        text: `Success! Your SMTP settings at ${smtpHost} are working correctly.`,
      });

      res.json({ message: `Test email sent successfully to ${userRes.email}!` });
    } catch (error: any) {
      console.error("Test email failed:", error);
      res.status(500).json({ 
        error: "Connection failed", 
        message: error.message 
      });
    }
  });

  // Admin: List all users
  app.get("/api/admin/users", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const admin = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (admin?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const users = await prisma.user.findMany({
        select: { id: true, email: true, fullName: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin: Test Database Connectivity
  app.post("/api/admin/test-db", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const userRes = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { databaseUrl } = req.body;
      if (!databaseUrl) {
        return res.status(400).json({ error: "Missing configuration", message: "Database URL is required." });
      }

      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        const client = new PGClient({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000,
        });

        await client.connect();
        const result = await client.query('SELECT NOW()');
        await client.end();
        
        res.json({ message: "Successfully connected to PostgreSQL database!", serverTime: result.rows[0].now });
      } else {
        res.status(400).json({ error: "Unsupported Database", message: "Currently only PostgreSQL URLs are supported for connection testing." });
      }
    } catch (error: any) {
      console.error("Test DB failed:", error);
      res.status(500).json({ 
        error: "Connection failed", 
        message: error.message 
      });
    }
  });

  // Admin: Comprehensive Health Check
  app.get("/api/admin/health-check", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const userRes = await prisma.user.findUnique({ where: { id: (jwt.verify(token, JWT_SECRET) as any).userId } });
      if (userRes?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const checks: any = {};

      // 1. Database (Current Prisma)
      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { status: "OK", type: "Prisma Connect" };
      } catch (e: any) {
        checks.database = { status: "FAIL", message: e.message };
      }

      // 2. Email (Current Setup)
      try {
        const settings = await getSettings();
        if (settings?.smtpUser && settings?.smtpPass) {
          checks.email = { status: "CONFIGURED", host: settings.smtpHost };
        } else {
          checks.email = { status: "LOG_ONLY", message: "Using local file logging" };
        }
      } catch (e) {
        checks.email = { status: "ERROR" };
      }

      // 3. Firebase
      try {
        const apps = admin.apps;
        checks.firebase = { status: apps.length > 0 ? "INITIALIZED" : "NOT_FOUND" };
      } catch (e) {
        checks.firebase = { status: "ERROR" };
      }

      // 4. Storage
      try {
        fs.accessSync(uploadDir, fs.constants.W_OK);
        checks.storage = { status: "WRITABLE" };
      } catch (e) {
        checks.storage = { status: "READ_ONLY" };
      }

      res.json(checks);
    } catch (error: any) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // Admin: Create new user (Admin or Applicant)
  app.post("/api/admin/users", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const admin = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (admin?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { email, password, fullName, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await prisma.user.create({
        data: { email, password: hashedPassword, fullName, role: role || "APPLICANT" }
      });
      res.json({ id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role });
    } catch (error) {
      console.error("Admin user create error:", error);
      res.status(400).json({ error: "Failed to create user. Email might exist." });
    }
  });

  // Admin: Update user profile
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const admin = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (admin?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { fullName, role, email } = req.body;
      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { fullName, role, email }
      });
      res.json({ id: updatedUser.id, email: updatedUser.email, fullName: updatedUser.fullName, role: updatedUser.role });
    } catch (error) {
      res.status(400).json({ error: "Update failed" });
    }
  });

  // Admin: Reset user password
  app.patch("/api/admin/users/:id/password", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const admin = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (admin?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      const { password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { id: req.params.id },
        data: { password: hashedPassword }
      });
      res.json({ message: "Password reset successful" });
    } catch (error) {
      res.status(400).json({ error: "Password reset failed" });
    }
  });

  // Admin: Delete user
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const admin = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (admin?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

      // Prevent self-deletion
      if (admin.id === req.params.id) {
        return res.status(400).json({ error: "You cannot delete yourself" });
      }

      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(400).json({ error: "Delete failed" });
    }
  });

  // Applications: Update (Partial update for documents)
  app.patch("/api/applications/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const { status, documents } = req.body;
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      const application = await prisma.application.findUnique({ where: { id: req.params.id } });

      if (!application) return res.status(404).json({ error: "Application not found" });

      // Only owner can update documents, only ADMIN can update status
      const isOwner = application.userId === decoded.userId;
      const isAdmin = user?.role === "ADMIN";

      if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

      const data: any = {};
      if (isAdmin && status) data.status = status;
      if (documents) {
        data.documents = typeof documents === 'string' ? documents : JSON.stringify(documents);
      }

      const updated = await prisma.application.update({
        where: { id: req.params.id },
        data
      });

      // Handle notifications and emails for status changes
      if (isAdmin && status === "APPROVED") {
        const settings = await getSettings();
        const appUser = await prisma.user.findUnique({ where: { id: application.userId } });
        
        if (appUser) {
          // Create in-app notification
          await prisma.notification.create({
            data: {
              userId: appUser.id,
              title: "Admission Approved!",
              message: `Congratulations! Your application for ${application.courseApplied} has been approved. You can now download your admission letter.`,
              type: "SUCCESS"
            }
          });

          // Send email
          await sendEmail(
            appUser.email,
            "Admission Offer - BIAIS",
            `Congratulations ${appUser.fullName}!\n\nYour application for ${application.courseApplied} has been approved by the admissions committee.\n\nPlease log in to your dashboard at ${req.get("origin")} to download your formal admission acceptance letter and proceed with registration.\n\nRegistry Office,\n${settings.schoolName}`,
            `<h2>Admission Offer!</h2>
             <p>Congratulations <strong>${appUser.fullName}</strong>,</p>
             <p>Your application for <strong>${application.courseApplied}</strong> has been approved by the admissions committee.</p>
             <p>Please log in to your dashboard to download your formal admission acceptance letter and proceed with registration.</p>
             <a href="${req.get("origin")}/dashboard" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:5px;">Go to Dashboard</a>
             <p>Best regards,<br>Registry Office,<br>${settings.schoolName}</p>`
          );
        }
      } else if (isAdmin && status === "REJECTED") {
        const appUser = await prisma.user.findUnique({ where: { id: application.userId } });
        if (appUser) {
          await prisma.notification.create({
            data: {
              userId: appUser.id,
              title: "Application Status Update",
              message: `We regret to inform you that your application for ${application.courseApplied} was not successful at this time.`,
              type: "WARNING"
            }
          });
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  // --- Vite Integration ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use('/assets', express.static(path.join(distPath, 'assets')));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
