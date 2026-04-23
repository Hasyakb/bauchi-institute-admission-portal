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
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  
  // Serve static uploads
  app.use("/uploads", express.static(uploadDir));

  // --- Site Settings Initialization ---
  let cachedSettings: any = null;
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
      
      const { courseApplied, documents, paymentReference, amountPaid } = req.body;

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
          userId: decoded.userId,
          paymentStatus: 'COMPLETED', // In a real app, verify reference with a gateway first
          paymentReference,
          amountPaid: amountPaid ? parseFloat(amountPaid) : undefined
        }
      });
      res.json(application);
    } catch (error) {
      console.error("Submit app error:", error);
      res.status(500).json({ error: "Failed to submit application" });
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
        documents: app.documents ? JSON.parse(app.documents) : null
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
        documents: app.documents ? JSON.parse(app.documents) : null
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

      const { schoolName, schoolShortName, schoolDescription, contactEmail, logoUrl, applicationFee } = req.body;
      const updated = await prisma.siteSettings.update({
        where: { id: "global" },
        data: { 
          schoolName, 
          schoolShortName, 
          schoolDescription, 
          contactEmail, 
          logoUrl,
          applicationFee: applicationFee ? parseFloat(applicationFee) : undefined
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
