import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import PDFDocument from "pdfkit";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const SESSION_SECRET = process.env.SESSION_SECRET || "session_secret";

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in your .env file");
  process.exit(1);
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("❌ Google OAuth credentials are missing in your .env file");
  process.exit(1);
}

// Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Initialize SQLite Database
const db = new Database(path.join(__dirname, "database.sqlite"));

// Folders
const downloadsDir = path.join(__dirname, "user_downloads");
const profilePicDir = path.join(__dirname, "profile_pictures");

if (!fs.existsSync(profilePicDir)) {
  fs.mkdirSync(profilePicDir, { recursive: true });
}

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    startup_stage TEXT NOT NULL DEFAULT 'Just Exploring',
    bio TEXT DEFAULT '',
    profile_picture TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT NOT NULL,
    estimated_cost TEXT,
    first_step TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS saved_schemes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scheme_id TEXT NOT NULL,
    scheme_name TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    source_type TEXT DEFAULT 'general',
    mime_type TEXT DEFAULT 'application/pdf',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration for saved_schemes.scheme_name
try {
  const savedSchemesColumns = db.prepare(`PRAGMA table_info(saved_schemes)`).all() as Array<{
    name: string;
  }>;

  const hasSchemeName = savedSchemesColumns.some((col) => col.name === "scheme_name");

  if (!hasSchemeName) {
    db.exec(`ALTER TABLE saved_schemes ADD COLUMN scheme_name TEXT DEFAULT ''`);
    console.log("✅ Added scheme_name column to saved_schemes table");
  }
} catch (error) {
  console.error("Migration error for saved_schemes:", error);
}

// Migration for downloads columns
try {
  const downloadsColumns = db.prepare(`PRAGMA table_info(downloads)`).all() as Array<{
    name: string;
  }>;

  const hasSourceType = downloadsColumns.some((col) => col.name === "source_type");
  const hasMimeType = downloadsColumns.some((col) => col.name === "mime_type");

  if (!hasSourceType) {
    db.exec(`ALTER TABLE downloads ADD COLUMN source_type TEXT DEFAULT 'general'`);
    console.log("✅ Added source_type column to downloads table");
  }

  if (!hasMimeType) {
    db.exec(`ALTER TABLE downloads ADD COLUMN mime_type TEXT DEFAULT 'application/pdf'`);
    console.log("✅ Added mime_type column to downloads table");
  }
} catch (error) {
  console.error("Migration error for downloads:", error);
}

// Migration for users.profile_picture
try {
  const usersColumns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{
    name: string;
  }>;

  const hasProfilePicture = usersColumns.some((col) => col.name === "profile_picture");

  if (!hasProfilePicture) {
    db.exec(`ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT ''`);
    console.log("✅ Added profile_picture column to users table");
  }
} catch (error) {
  console.error("Migration error for users profile_picture:", error);
}

type Idea = {
  title: string;
  tagline: string;
  description: string;
  estimatedCost: string;
  firstStep: string;
};

type JwtPayload = {
  userId: number;
};

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  startup_stage: string;
  bio: string;
  profile_picture: string;
  created_at: string;
  updated_at: string;
};

function safeParseIdeas(text: string | undefined): Idea[] {
  if (!text) {
    throw new Error("No response text received from Gemini");
  }

  const cleanedText = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(cleanedText);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not an array");
  }

  return parsed.map((item) => ({
    title: String(item.title || ""),
    tagline: String(item.tagline || ""),
    description: String(item.description || ""),
    estimatedCost: String(item.estimatedCost || ""),
    firstStep: String(item.firstStep || ""),
  }));
}

function getUserFromToken(req: Request): UserRow | null {
  try {
    let token: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(decoded.userId) as UserRow | undefined;

    return user || null;
  } catch {
    return null;
  }
}

function formatCurrency(value: number | string | undefined, symbol = "$") {
  const num = Number(value || 0);
  return `${symbol}${num.toLocaleString("en-US")}`;
}

function createPdfFile(filePath: string, writeContent: (doc: any) => void) {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    writeContent(doc);
    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

function getProfilePictureUrl(fileName: string | null | undefined) {
  return fileName ? `/profile-picture/${fileName}` : null;
}

function deleteProfilePictureFile(fileName: string | null | undefined) {
  if (!fileName) return;

  const filePath = path.join(profilePicDir, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Passport session setup
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: number, done) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || "Google User";

        if (!email) {
          return done(new Error("Google account email not found"), undefined);
        }

        let user = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as UserRow | undefined;

        if (!user) {
          const result = db
            .prepare(
              `
              INSERT INTO users (full_name, email, password_hash, startup_stage, bio, profile_picture)
              VALUES (?, ?, ?, ?, ?, ?)
              `
            )
            .run(name, email, "", "Just Exploring", "", "");

          user = db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(result.lastInsertRowid) as UserRow | undefined;
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "25mb" }));

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/profile-picture", express.static(profilePicDir));

  // Normal signup
  app.post("/api/signup", async (req: Request, res: Response) => {
    try {
      const { name, email, password, stage } = req.body as {
        name?: string;
        email?: string;
        password?: string;
        stage?: string;
      };

      if (!name || !email || !password || !stage) {
        return res.status(400).json({ message: "All fields required" });
      }

      const existingUser = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(email) as UserRow | undefined;

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = db
        .prepare(
          "INSERT INTO users (full_name, email, password_hash, startup_stage, bio, profile_picture) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(name, email, hashedPassword, stage, "", "");

      const token = jwt.sign(
        { userId: Number(result.lastInsertRowid) },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: Number(result.lastInsertRowid),
          name,
          email,
          stage,
          bio: "",
          profilePicture: null,
        },
      });
    } catch (err) {
      console.error("Signup error:", err);
      return res.status(500).json({ message: "Signup failed" });
    }
  });

  // Normal login
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(email) as UserRow | undefined;

      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      if (!user.password_hash) {
        return res.status(400).json({ message: "Please login with Google for this account" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          stage: user.startup_stage,
          bio: user.bio,
          profilePicture: getProfilePictureUrl(user.profile_picture),
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // Google login start
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google callback
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      session: false,
    }),
    (req: any, res: Response) => {
      const user = req.user as UserRow;

      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const redirectUrl = `http://localhost:3000/oauth-success?token=${token}`;
      res.redirect(redirectUrl);
    }
  );

  // Current logged-in user
  app.get("/api/me", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          stage: user.startup_stage,
          bio: user.bio,
          profilePicture: getProfilePictureUrl(user.profile_picture),
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update profile
  app.put("/api/update-profile", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, email, stage, bio } = req.body as {
        name?: string;
        email?: string;
        stage?: string;
        bio?: string;
      };

      if (!name || !email || !stage) {
        return res.status(400).json({ message: "Name, email and stage are required" });
      }

      const existingUser = db
        .prepare("SELECT * FROM users WHERE email = ? AND id != ?")
        .get(email, user.id) as UserRow | undefined;

      if (existingUser) {
        return res.status(400).json({ message: "Email already in use by another account" });
      }

      db.prepare(
        `
        UPDATE users
        SET full_name = ?, email = ?, startup_stage = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      ).run(name, email, stage, bio || "", user.id);

      const updatedUser = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(user.id) as UserRow | undefined;

      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user.id,
          name,
          email,
          stage,
          bio: bio || "",
          profilePicture: getProfilePictureUrl(updatedUser?.profile_picture || ""),
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Upload profile picture
  app.post("/api/upload-profile-picture", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { imageData } = req.body as {
        imageData?: string;
      };

      if (!imageData) {
        return res.status(400).json({ message: "Image data required" });
      }

      let extension = "png";

      if (imageData.startsWith("data:image/jpeg")) extension = "jpg";
      else if (imageData.startsWith("data:image/jpg")) extension = "jpg";
      else if (imageData.startsWith("data:image/webp")) extension = "webp";
      else if (imageData.startsWith("data:image/png")) extension = "png";
      else if (imageData.startsWith("data:image/")) extension = "png";
      else {
        return res.status(400).json({ message: "Invalid image format" });
      }

      const base64Data = imageData.includes(",")
        ? imageData.split(",")[1]
        : imageData;

      const fileName = `${user.id}-${Date.now()}.${extension}`;
      const filePath = path.join(profilePicDir, fileName);

      // delete old picture first
      if (user.profile_picture) {
        deleteProfilePictureFile(user.profile_picture);
      }

      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      db.prepare(
        `
        UPDATE users
        SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      ).run(fileName, user.id);

      return res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        imageUrl: getProfilePictureUrl(fileName),
      });
    } catch (error) {
      console.error("Upload profile picture error:", error);
      return res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Delete profile picture only
  app.delete("/api/delete-profile-picture", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.profile_picture) {
        deleteProfilePictureFile(user.profile_picture);
      }

      db.prepare(
        `
        UPDATE users
        SET profile_picture = '', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      ).run(user.id);

      return res.json({
        success: true,
        message: "Profile picture deleted successfully",
      });
    } catch (error) {
      console.error("Delete profile picture error:", error);
      return res.status(500).json({ message: "Failed to delete profile picture" });
    }
  });

  // Save idea
  app.post("/api/save-idea", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { title, tagline, description, estimatedCost, firstStep } = req.body as {
        title?: string;
        tagline?: string;
        description?: string;
        estimatedCost?: string;
        firstStep?: string;
      };

      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }

      const result = db
        .prepare(
          `
          INSERT INTO saved_ideas (user_id, title, tagline, description, estimated_cost, first_step)
          VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          user.id,
          title,
          tagline || "",
          description,
          estimatedCost || "",
          firstStep || ""
        );

      return res.json({
        success: true,
        message: "Idea saved successfully",
        ideaId: result.lastInsertRowid,
      });
    } catch (error) {
      console.error("Save idea error:", error);
      return res.status(500).json({ message: "Failed to save idea" });
    }
  });

  // Get ideas
  app.get("/api/my-ideas", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const ideas = db
        .prepare(
          `
          SELECT id, title, tagline, description, estimated_cost, first_step, created_at
          FROM saved_ideas
          WHERE user_id = ?
          ORDER BY created_at DESC
          `
        )
        .all(user.id);

      return res.json({
        success: true,
        ideas,
      });
    } catch (error) {
      console.error("Fetch ideas error:", error);
      return res.status(500).json({ message: "Failed to fetch ideas" });
    }
  });

  // Delete idea
  app.delete("/api/delete-idea/:id", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const ideaId = req.params.id;

      const result = db
        .prepare(
          `
          DELETE FROM saved_ideas
          WHERE id = ? AND user_id = ?
          `
        )
        .run(ideaId, user.id);

      if (result.changes === 0) {
        return res.status(404).json({ message: "Idea not found" });
      }

      return res.json({
        success: true,
        message: "Idea deleted successfully",
      });
    } catch (error) {
      console.error("Delete idea error:", error);
      return res.status(500).json({ message: "Failed to delete idea" });
    }
  });

  // Save scheme
  app.post("/api/save-scheme", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { schemeId, schemeName } = req.body as {
        schemeId?: string;
        schemeName?: string;
      };

      if (!schemeId) {
        return res.status(400).json({ message: "schemeId is required" });
      }

      const existing = db
        .prepare(
          `
          SELECT * FROM saved_schemes
          WHERE user_id = ? AND scheme_id = ?
          `
        )
        .get(user.id, schemeId);

      if (existing) {
        return res.status(400).json({ message: "Scheme already saved" });
      }

      const result = db
        .prepare(
          `
          INSERT INTO saved_schemes (user_id, scheme_id, scheme_name)
          VALUES (?, ?, ?)
          `
        )
        .run(user.id, schemeId, schemeName || "");

      return res.json({
        success: true,
        message: "Scheme saved successfully",
        savedSchemeId: result.lastInsertRowid,
      });
    } catch (error) {
      console.error("Save scheme error:", error);
      return res.status(500).json({ message: "Failed to save scheme" });
    }
  });

  // Get schemes
  app.get("/api/my-schemes", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const savedSchemes = db
        .prepare(
          `
          SELECT id, scheme_id, scheme_name, created_at
          FROM saved_schemes
          WHERE user_id = ?
          ORDER BY created_at DESC
          `
        )
        .all(user.id);

      return res.json({
        success: true,
        schemes: savedSchemes,
      });
    } catch (error) {
      console.error("Fetch schemes error:", error);
      return res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });

  // Delete scheme
  app.delete("/api/delete-scheme/:id", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const savedSchemeId = req.params.id;

      const result = db
        .prepare(
          `
          DELETE FROM saved_schemes
          WHERE id = ? AND user_id = ?
          `
        )
        .run(savedSchemeId, user.id);

      if (result.changes === 0) {
        return res.status(404).json({ message: "Scheme not found" });
      }

      return res.json({
        success: true,
        message: "Scheme deleted successfully",
      });
    } catch (error) {
      console.error("Delete scheme error:", error);
      return res.status(500).json({ message: "Failed to delete scheme" });
    }
  });

  // Save generic download from frontend
  app.post("/api/save-download", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { title, fileName, fileData, mimeType, sourceType } = req.body as {
        title?: string;
        fileName?: string;
        fileData?: string;
        mimeType?: string;
        sourceType?: string;
      };

      if (!title || !fileName || !fileData) {
        return res.status(400).json({ message: "title, fileName and fileData are required" });
      }

      const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const fullPath = path.join(downloadsDir, safeFileName);

      const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
      fs.writeFileSync(fullPath, Buffer.from(base64Data, "base64"));

      const result = db
        .prepare(
          `
          INSERT INTO downloads (user_id, title, file_name, file_path, source_type, mime_type)
          VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          user.id,
          title,
          safeFileName,
          fullPath,
          sourceType || "general",
          mimeType || "application/pdf"
        );

      return res.json({
        success: true,
        message: "Download saved successfully",
        downloadId: Number(result.lastInsertRowid),
      });
    } catch (error) {
      console.error("Save download error:", error);
      return res.status(500).json({ message: "Failed to save download" });
    }
  });

  // Generate PDF for cost calculator and save in downloads
  app.post("/api/generate-cost-pdf", async (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const {
        title,
        currencySymbol,
        oneTimeCosts,
        monthlyCosts,
        reserveFund,
        runwayMonths,
        totalOneTime,
        totalMonthly,
        totalRunway,
        grandTotal,
      } = req.body as {
        title?: string;
        currencySymbol?: string;
        oneTimeCosts?: Record<string, number>;
        monthlyCosts?: Record<string, number>;
        reserveFund?: number;
        runwayMonths?: number;
        totalOneTime?: number;
        totalMonthly?: number;
        totalRunway?: number;
        grandTotal?: number;
      };

      const pdfTitle = title || "Startup Cost Estimate";
      const safeFileName = `${Date.now()}-startup-cost-estimate.pdf`;
      const fullPath = path.join(downloadsDir, safeFileName);
      const symbol = currencySymbol || "$";

      await createPdfFile(fullPath, (doc) => {
        doc.fontSize(22).text(pdfTitle, { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown(1.5);

        doc.fontSize(16).text("One-Time Costs", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Incorporation & Legal: ${formatCurrency(oneTimeCosts?.incorporation, symbol)}`);
        doc.text(`Branding & Website: ${formatCurrency(oneTimeCosts?.branding, symbol)}`);
        doc.text(`Equipment & Hardware: ${formatCurrency(oneTimeCosts?.equipment, symbol)}`);
        doc.text(`Initial Inventory: ${formatCurrency(oneTimeCosts?.inventory, symbol)}`);
        doc.moveDown();
        doc.fontSize(13).text(`Total One-Time Costs: ${formatCurrency(totalOneTime, symbol)}`);
        doc.moveDown(1.5);

        doc.fontSize(16).text("Monthly Operating Costs", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Rent & Utilities: ${formatCurrency(monthlyCosts?.rent, symbol)}`);
        doc.text(`Software Subscriptions: ${formatCurrency(monthlyCosts?.software, symbol)}`);
        doc.text(`Marketing & Ads: ${formatCurrency(monthlyCosts?.marketing, symbol)}`);
        doc.text(`Salaries & Wages: ${formatCurrency(monthlyCosts?.salaries, symbol)}`);
        doc.moveDown();
        doc.fontSize(13).text(`Monthly Total: ${formatCurrency(totalMonthly, symbol)}`);
        doc.text(`Runway Months: ${runwayMonths || 0}`);
        doc.text(`Runway Total: ${formatCurrency(totalRunway, symbol)}`);
        doc.moveDown(1.5);

        doc.fontSize(16).text("Reserve Fund", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Safety Net / Reserve Fund: ${formatCurrency(reserveFund, symbol)}`);
        doc.moveDown(1.5);

        doc.fontSize(18).text(`Grand Total Required: ${formatCurrency(grandTotal, symbol)}`, {
          align: "left",
        });
      });

      const result = db
        .prepare(
          `
          INSERT INTO downloads (user_id, title, file_name, file_path, source_type, mime_type)
          VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          user.id,
          pdfTitle,
          safeFileName,
          fullPath,
          "cost-calculator",
          "application/pdf"
        );

      return res.json({
        success: true,
        message: "PDF generated successfully",
        downloadId: Number(result.lastInsertRowid),
      });
    } catch (error) {
      console.error("Generate cost PDF error:", error);
      return res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Get downloads
  app.get("/api/my-downloads", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const downloads = db
        .prepare(
          `
          SELECT id, title, file_name, source_type, mime_type, created_at
          FROM downloads
          WHERE user_id = ?
          ORDER BY created_at DESC
          `
        )
        .all(user.id);

      return res.json({
        success: true,
        downloads,
      });
    } catch (error) {
      console.error("Fetch downloads error:", error);
      return res.status(500).json({ message: "Failed to fetch downloads" });
    }
  });

  // View download in browser
  app.get("/api/downloads/:id/view", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const file = db
        .prepare(
          `
          SELECT * FROM downloads
          WHERE id = ? AND user_id = ?
          `
        )
        .get(req.params.id, user.id) as
        | {
            id: number;
            title: string;
            file_name: string;
            file_path: string;
            mime_type: string;
          }
        | undefined;

      if (!file) {
        return res.status(404).json({ message: "Download not found" });
      }

      if (!fs.existsSync(file.file_path)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      res.setHeader("Content-Type", file.mime_type || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${file.file_name}"`);

      return res.sendFile(file.file_path);
    } catch (error) {
      console.error("View download error:", error);
      return res.status(500).json({ message: "Failed to open file" });
    }
  });

  // Download file
  app.get("/api/downloads/:id/file", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const file = db
        .prepare(
          `
          SELECT * FROM downloads
          WHERE id = ? AND user_id = ?
          `
        )
        .get(req.params.id, user.id) as
        | {
            id: number;
            title: string;
            file_name: string;
            file_path: string;
            mime_type: string;
          }
        | undefined;

      if (!file) {
        return res.status(404).json({ message: "Download not found" });
      }

      if (!fs.existsSync(file.file_path)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      return res.download(file.file_path, file.file_name);
    } catch (error) {
      console.error("Download file error:", error);
      return res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Delete download
  app.delete("/api/delete-download/:id", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const file = db
        .prepare(
          `
          SELECT * FROM downloads
          WHERE id = ? AND user_id = ?
          `
        )
        .get(req.params.id, user.id) as
        | {
            id: number;
            file_path: string;
          }
        | undefined;

      if (!file) {
        return res.status(404).json({ message: "Download not found" });
      }

      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      db.prepare("DELETE FROM downloads WHERE id = ? AND user_id = ?").run(req.params.id, user.id);

      return res.json({
        success: true,
        message: "Download deleted successfully",
      });
    } catch (error) {
      console.error("Delete download error:", error);
      return res.status(500).json({ message: "Failed to delete download" });
    }
  });

  // Delete account
  app.delete("/api/delete-account", (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // delete user downloads files
      const files = db
        .prepare("SELECT file_path FROM downloads WHERE user_id = ?")
        .all(user.id) as { file_path: string }[];

      files.forEach((file) => {
        if (fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }
      });

      // delete profile picture
      if (user.profile_picture) {
        deleteProfilePictureFile(user.profile_picture);
      }

      db.prepare("DELETE FROM downloads WHERE user_id = ?").run(user.id);
      db.prepare("DELETE FROM saved_ideas WHERE user_id = ?").run(user.id);
      db.prepare("DELETE FROM saved_schemes WHERE user_id = ?").run(user.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

      return res.json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      console.error("Delete account error:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Health
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Reply with exactly: Backend is running!",
      });

      return res.json({
        success: true,
        message: response.text || "Backend is running!",
      });
    } catch (error: any) {
      console.error("Health check error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Health check failed",
      });
    }
  });

  // Idea generation
  app.post("/api/ideas", async (req: Request, res: Response) => {
    try {
      const { industry, skills, budget, timeCommitment } = req.body as {
        industry?: string;
        skills?: string;
        budget?: string;
        timeCommitment?: string;
      };

      if (!industry || !skills || !budget || !timeCommitment) {
        return res.status(400).json({
          success: false,
          message: "industry, skills, budget, and timeCommitment are required",
        });
      }

      const prompt = `
You are an expert startup consultant for an entrepreneurship awareness and startup guidance portal.

Generate exactly 3 practical startup ideas for this user.

User details:
- Industry / Interests: ${industry}
- Skills: ${skills}
- Budget: ${budget}
- Time Commitment: ${timeCommitment}

Instructions:
- Keep the ideas realistic, beginner-friendly, and actionable.
- Prefer ideas that can work well for students, freshers, or small founders.
- Return ONLY a JSON array.
- Each object must contain:
  - title
  - tagline
  - description
  - estimatedCost
  - firstStep
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                tagline: { type: Type.STRING },
                description: { type: Type.STRING },
                estimatedCost: { type: Type.STRING },
                firstStep: { type: Type.STRING },
              },
              required: [
                "title",
                "tagline",
                "description",
                "estimatedCost",
                "firstStep",
              ],
            },
          },
        },
      });

      const ideas = safeParseIdeas(response.text);

      return res.json({
        success: true,
        ideas,
      });
    } catch (error: any) {
      console.error("Idea generation error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate startup ideas",
      });
    }
  });

  // Vite / static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));

    app.get(/.*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});