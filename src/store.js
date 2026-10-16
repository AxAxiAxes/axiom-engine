const { DatabaseSync } = require("node:sqlite");
const { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const templates = require("./role-templates");
const { AppError, text, fields } = require("./errors");
const { reservedNames } = require("./identity");

class Store {
  constructor(dataDir) {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    this.path = path.join(dataDir, "axes.sqlite");
    this.lockPath = path.join(dataDir, "axes.lock");
    this.lockValue = `${process.pid}:${randomUUID()}`;
    if (existsSync(this.lockPath)) {
      const owner = readFileSync(this.lockPath, "utf8");
      const pid = Number(owner.split(":")[0]);
      if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("The local data lock is invalid. Verify no AXES instance is running before removing axes.lock.");
      try {
        process.kill(pid, 0);
        throw new Error("Another AXES process is using this data directory.");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
      unlinkSync(this.lockPath);
    }
    writeFileSync(this.lockPath, this.lockValue, { flag: "wx", mode: 0o600 });
    try {
      this.db = new DatabaseSync(this.path, { timeout: 2000 });
      this.db.exec("PRAGMA foreign_keys = ON;");
      const version = this.db.prepare("PRAGMA user_version").get().user_version;
      if (version > 3) throw new Error("Database schema is newer than this app.");
      this.transaction(() => {
        if (version === 0) this.db.exec(readFileSync(path.join(__dirname, "migrations", "001-initial.sql"), "utf8"));
        if (version < 2) this.db.exec(readFileSync(path.join(__dirname, "migrations", "002-media.sql"), "utf8"));
        if (version < 3) this.db.exec(readFileSync(path.join(__dirname, "migrations", "003-identity.sql"), "utf8"));
        const seed = this.db.prepare("INSERT OR IGNORE INTO profiles (id,name,purpose,instructions,template) VALUES (?,?,?,?,1)");
        for (const role of templates) seed.run(role.id, role.name, role.purpose, role.instructions);
        this.db.prepare("UPDATE runs SET status='interrupted',error_code='INTERRUPTED',error_message=? WHERE status IN ('pending','running')")
          .run("The app stopped before this run completed. No automatic retry was made.");
      });
    } catch (error) {
      this.db?.close();
      this.releaseLock();
      throw error;
    }
  }

  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  profiles() {
    return this.db.prepare("SELECT p.*,m.mime AS media_mime,m.id AS media_id FROM profiles p LEFT JOIN profile_media m ON m.profile_id=p.id ORDER BY p.template DESC, p.name COLLATE NOCASE").all()
      .map((p) => ({ ...p, enabled: !!p.enabled, template: !!p.template, passport_status: p.passport_candidate ? "reserved_unissued" : "unassigned" }));
  }

  profile(id) {
    const value = this.profiles().find((p) => p.id === id);
    if (!value) throw new AppError("NOT_FOUND", "Role profile not found.", 404);
    return value;
  }

  saveProfile(body, id) {
    fields(body, ["name", "purpose", "instructions", "enabled", "passport_candidate"], id ? [] : ["name", "purpose", "instructions"]);
    const previous = id ? this.profile(id) : { enabled: true };
    const p = { ...previous, ...body };
    p.name = text(p.name, "Name", 80);
    p.purpose = text(p.purpose, "Purpose", 500);
    p.instructions = text(p.instructions, "Instructions", 4000);
    if (typeof p.enabled !== "boolean") throw new AppError("INVALID_INPUT", "Enabled must be a boolean.");
    const candidate = p.passport_candidate ?? null;
    if (candidate !== null && !reservedNames.includes(candidate)) throw new AppError("INVALID_IDENTITY", "Select an exact reserved name token or leave the identity unassigned. Issued passports require verified registry evidence.");
    if (id) {
      this.db.prepare("UPDATE profiles SET name=?,purpose=?,instructions=?,enabled=?,passport_candidate=? WHERE id=?")
        .run(p.name, p.purpose, p.instructions, Number(p.enabled), candidate, id);
    } else {
      id = randomUUID();
      this.db.prepare("INSERT INTO profiles(id,name,purpose,instructions,enabled,passport_candidate) VALUES (?,?,?,?,?,?)")
        .run(id, p.name, p.purpose, p.instructions, Number(p.enabled), candidate);
    }
    return this.profile(id);
  }

  conversations() {
    return this.db.prepare("SELECT c.*,p.name AS profile_name FROM conversations c JOIN profiles p ON p.id=c.profile_id ORDER BY c.rowid DESC").all();
  }

  createConversation(body) {
    fields(body, ["profileId", "title"], ["profileId", "title"]);
    const p = this.profile(text(body.profileId, "Profile ID", 100));
    if (!p.enabled) throw new AppError("PROFILE_DISABLED", "Enable this role before starting a conversation.", 409);
    const id = randomUUID();
    this.db.prepare("INSERT INTO conversations VALUES (?,?,?,?)")
      .run(id, p.id, text(body.title, "Title", 120), new Date().toISOString());
    return this.conversation(id);
  }

  conversation(id) {
    const c = this.db.prepare("SELECT * FROM conversations WHERE id=?").get(id);
    if (!c) throw new AppError("NOT_FOUND", "Conversation not found.", 404);
    return {
      ...c,
      messages: this.db.prepare("SELECT * FROM messages WHERE conversation_id=? ORDER BY id").all(id),
      runs: this.db.prepare("SELECT * FROM runs WHERE conversation_id=? ORDER BY rowid").all(id)
    };
  }

  deleteConversation(id) {
    this.conversation(id);
    this.db.prepare("DELETE FROM conversations WHERE id=?").run(id);
  }

  startRun(conversationId, input, model, digest, instructions) {
    return this.transaction(() => {
      const id = randomUUID();
      this.db.prepare("INSERT INTO runs(id,conversation_id,status,model,digest,instructions,created_at) VALUES (?,?,'running',?,?,?,?)")
        .run(id, conversationId, model, digest, instructions, new Date().toISOString());
      this.db.prepare("INSERT INTO messages(conversation_id,run_id,role,content) VALUES (?,?,'user',?)")
        .run(conversationId, id, input);
      return this.run(id);
    });
  }

  run(id) {
    const r = this.db.prepare("SELECT * FROM runs WHERE id=?").get(id);
    if (!r) throw new AppError("NOT_FOUND", "Run not found.", 404);
    return r;
  }

  finishRun(id, status, content, error) {
    return this.transaction(() => {
      const run = this.run(id);
      if (run.status !== "running") return run;
      if (status === "completed") {
        this.db.prepare("INSERT INTO messages(conversation_id,run_id,role,content) VALUES (?,?,'assistant',?)")
          .run(run.conversation_id, id, content);
      }
      this.db.prepare("UPDATE runs SET status=?,error_code=?,error_message=? WHERE id=?")
        .run(status, error?.code || null, error?.message || null, id);
      return this.run(id);
    });
  }

  releaseLock() {
    if (existsSync(this.lockPath) && readFileSync(this.lockPath, "utf8") === this.lockValue) unlinkSync(this.lockPath);
  }

  close() { this.db.close(); this.releaseLock(); }
}

module.exports = { Store };
