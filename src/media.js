const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { AppError } = require("./errors");
const sharp = require("sharp");

sharp.concurrency(1);
sharp.cache(false);

const mediaLimits = Object.freeze({ imageBytes: 12 * 1024 * 1024, videoBytes: 25 * 1024 * 1024, duration: 15, timeout: 30000 });

function tool(name, explicit) {
  const candidates = explicit ? [explicit] : (process.env.PATH || "").split(path.delimiter).filter(Boolean)
    .map((dir) => path.join(dir, process.platform === "win32" ? `${name}.exe` : name));
  const found = candidates.find((p) => path.isAbsolute(p) && fs.existsSync(p) && fs.statSync(p).isFile());
  if (!found) throw new AppError("MEDIA_TOOLS_MISSING", "Install FFmpeg and ffprobe beforehand; set AXES_FFMPEG_EXE and AXES_FFPROBE_EXE to their absolute paths, then restart.", 503);
  return found;
}

function command(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let bytes = 0;
    let output = "";
    let failure;
    const timer = setTimeout(() => {
      failure = new AppError("MEDIA_TIMEOUT", "Media validation exceeded 30 seconds. Use a smaller file.", 422);
      child.kill();
    }, mediaLimits.timeout);
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        failure = new AppError("MEDIA_INVALID", "Media metadata exceeds the validation limit.", 422);
        child.kill();
      } else output += chunk.toString();
    });
    child.stderr.resume();
    child.once("error", () => {
      clearTimeout(timer);
      reject(new AppError("MEDIA_TOOL_FAILED", "The local media tool could not start. Check installation and permissions.", 503));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) reject(new AppError("MEDIA_INVALID", "Media could not be decoded safely. Choose a valid JPEG/PNG image or short MP4.", 422));
      else resolve(output);
    });
  });
}

function inspect(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new AppError("MEDIA_EMPTY", "Choose a nonempty media file.");
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const mp4 = buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (!(mime === "image/png" && png || mime === "image/jpeg" && jpeg || mime === "video/mp4" && mp4)) {
    throw new AppError("MEDIA_TYPE", "File content must match JPEG, PNG, or MP4. SVG, GIF, WebM, and remote media are not supported.", 415);
  }
  const max = mime === "video/mp4" ? mediaLimits.videoBytes : mediaLimits.imageBytes;
  if (buffer.length > max) throw new AppError("MEDIA_TOO_LARGE", "Images are limited to 12 MiB; videos to 25 MiB.", 413);
}

function validateMetadata(info, video) {
  if (!Array.isArray(info.streams)) throw new AppError("MEDIA_INVALID", "Media metadata is missing.", 422);
  const streams = info.streams.filter((s) => s.codec_type === "video");
  const s = streams[0];
  if (streams.length !== 1 || !Number.isSafeInteger(s.width) || !Number.isSafeInteger(s.height) ||
      s.width < 1 || s.height < 1 || s.width > (video ? 1920 : 2048) || s.height > (video ? 1080 : 2048) ||
      !(video ? s.codec_name === "h264" : ["png", "mjpeg"].includes(s.codec_name)) ||
      (!video && !["png_pipe", "jpeg_pipe", "image2"].includes(info.format?.format_name))) {
    throw new AppError("MEDIA_DIMENSIONS", "Use one PNG/JPEG image up to 2048 x 2048, or one H.264 MP4 up to 1920 x 1080.", 422);
  }
  if (video && (!info.format?.format_name?.split(",").includes("mp4") ||
      !Number.isFinite(Number(info.format.duration)) || Number(info.format.duration) <= 0 ||
      Number(info.format.duration) > mediaLimits.duration ||
      info.streams.some((stream) => !["video", "audio"].includes(stream.codec_type)))) {
    throw new AppError("MEDIA_DURATION", "Use an MP4 up to 15 seconds long with video and optional audio only. Audio will be removed.", 422);
  }
}

class Media {
  constructor(dataDir, store, options = {}) {
    this.dir = path.join(dataDir, "media");
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    this.store = store;
    this.execute = options.execute || command;
    this.busy = false;
    try {
      this.ffmpeg = tool("ffmpeg", options.ffmpeg || process.env.AXES_FFMPEG_EXE);
      this.ffprobe = tool("ffprobe", options.ffprobe || process.env.AXES_FFPROBE_EXE);
      this.state = { ready: true, videoReady: true, message: "Images ready. Local video tools found; video audio is removed." };
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      this.state = { ready: true, videoReady: false, message: `Images ready. Video: ${error.message}` };
    }
    const owned = new Set(store.db.prepare("SELECT id,mime FROM profile_media").all().map((m) => this.filename(m)));
    for (const entry of fs.readdirSync(this.dir)) {
      if (/^[0-9a-f-]{36}\.(input|png|mp4)$/.test(entry) && !owned.has(entry)) fs.unlinkSync(path.join(this.dir, entry));
    }
  }

  filename(record) { return `${record.id}.${record.mime === "video/mp4" ? "mp4" : "png"}`; }
  record(profileId) { return this.store.db.prepare("SELECT * FROM profile_media WHERE profile_id=?").get(profileId); }
  status() { return { ...this.state, busy: this.busy, limits: mediaLimits }; }

  async replace(profileId, buffer, mime, acknowledged) {
    this.store.profile(profileId);
    if (!this.state.ready) throw new AppError("MEDIA_STOPPED", "Media processing is stopped. Restart the app.", 503);
    if (!acknowledged) throw new AppError("RIGHTS_REQUIRED", "Confirm you have the rights and permissions to use this media.");
    if (mime === "video/mp4" && !this.state.videoReady) throw new AppError("MEDIA_TOOLS_MISSING", this.state.message, 503);
    if (this.busy) throw new AppError("MEDIA_BUSY", "One media operation is already active. Wait for it to finish.", 409);
    inspect(buffer, mime);
    this.busy = true;
    let settle;
    this.current = new Promise((resolve) => { settle = resolve; });
    const id = randomUUID();
    const video = mime === "video/mp4";
    const outputMime = video ? "video/mp4" : "image/png";
    const input = path.join(this.dir, `${id}.input`);
    const output = path.join(this.dir, `${id}.${video ? "mp4" : "png"}`);
    let committed = false;
    try {
      fs.writeFileSync(input, buffer, { flag: "wx", mode: 0o600 });
      if (video) {
        const metadata = await this.execute(this.ffprobe, ["-v", "error", "-protocol_whitelist", "file,pipe",
          "-show_streams", "-show_format", "-of", "json", input]);
        let info;
        try { info = JSON.parse(metadata); } catch { throw new AppError("MEDIA_INVALID", "Media metadata is invalid.", 422); }
        validateMetadata(info, true);
        await this.execute(this.ffmpeg, ["-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file,pipe",
          "-threads", "1", "-i", input, "-map", "0:v:0", "-an", "-sn", "-dn", "-map_metadata", "-1",
          "-t", "15", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-threads", "1",
          "-pix_fmt", "yuv420p", "-r", "24", "-movflags", "+faststart",
          "-fs", String(mediaLimits.videoBytes), output]);
      } else {
        let normalized;
        try {
          const image = sharp(buffer, { limitInputPixels: 2048 * 2048, failOn: "warning", animated: false });
          const metadata = await image.metadata();
          if (!["jpeg", "png"].includes(metadata.format) || metadata.width > 2048 || metadata.height > 2048 ||
              (metadata.pages || 1) !== 1) throw new Error("Image bounds");
          normalized = await image.rotate().png().timeout({ seconds: 30 }).toBuffer();
        } catch {
          throw new AppError("MEDIA_INVALID", "Choose a valid, single-frame JPEG/PNG up to 2048 x 2048. The image could not be safely normalized.", 422);
        }
        if (normalized.length > mediaLimits.imageBytes) throw new AppError("MEDIA_TOO_LARGE", "Normalized image exceeds 12 MiB.", 422);
        fs.writeFileSync(output, normalized, { flag: "wx", mode: 0o600 });
      }
      const bytes = fs.statSync(output).size;
      if (!bytes || bytes > (video ? mediaLimits.videoBytes : mediaLimits.imageBytes)) throw new AppError("MEDIA_TOO_LARGE", "Normalized media exceeds its storage limit.", 422);
      const previous = this.record(profileId);
      this.store.db.prepare("INSERT INTO profile_media VALUES (?,?,?,?,?,1) ON CONFLICT(profile_id) DO UPDATE SET id=excluded.id,mime=excluded.mime,bytes=excluded.bytes,created_at=excluded.created_at,rights_acknowledged=1")
        .run(profileId, id, outputMime, bytes, new Date().toISOString());
      committed = true;
      if (previous) fs.unlinkSync(path.join(this.dir, this.filename(previous)));
      return this.store.profile(profileId);
    } finally {
      try {
        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (!committed && fs.existsSync(output)) fs.unlinkSync(output);
      } finally { this.busy = false; settle(); }
    }
  }

  async stop() {
    this.state.ready = false;
    await this.current;
  }

  delete(profileId) {
    if (this.busy) throw new AppError("MEDIA_BUSY", "Wait for the current media operation before deleting.", 409);
    this.store.profile(profileId);
    const previous = this.record(profileId);
    if (!previous) throw new AppError("NOT_FOUND", "This profile has no uploaded media.", 404);
    this.store.db.prepare("DELETE FROM profile_media WHERE profile_id=?").run(profileId);
    fs.unlinkSync(path.join(this.dir, this.filename(previous)));
  }

  serve(profileId, res) {
    const record = this.record(profileId);
    if (!record) throw new AppError("NOT_FOUND", "No media is assigned to this profile.", 404);
    res.type(record.mime);
    res.set("Content-Disposition", "inline");
    res.sendFile(path.join(this.dir, this.filename(record)));
  }
}

module.exports = { Media, mediaLimits, inspect, validateMetadata, command };
