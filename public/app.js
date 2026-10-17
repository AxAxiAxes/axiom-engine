"use strict";
const $ = (id) => document.getElementById(id);
const state = { csrf: null, profiles: [], conversations: [], profile: null, conversation: null, status: null, active: null, editorId: null, dirty: false, sending: false, paired: false, refreshing: false };

function notice(message) {
  $("notice").textContent = message;
  $("notice").hidden = !message;
}

async function api(url, options = {}) {
  const headers = { ...options.headers };
  if (options.method && options.method !== "GET") headers["X-AXES-CSRF"] = state.csrf || "";
  if (options.body && !(options.body instanceof File)) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api${url}`, { ...options, headers, credentials: "same-origin" });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !url.startsWith("/session")) lock();
    throw new Error(data.error?.message || `Local request failed (${response.status}).`);
  }
  return data;
}

function action(fn) {
  return async (event) => {
    event?.preventDefault();
    notice("");
    try { await fn(event); } catch (error) { notice(error.message); }
  };
}

function lock() {
  state.paired = false;
  state.csrf = null;
  state.profiles = [];
  state.conversations = [];
  state.profile = state.conversation = state.active = state.status = null;
  state.dirty = false;
  $("profile-editor").hidden = true;
  $("workspace").hidden = true;
  $("logout").hidden = true;
  $("pairing").hidden = false;
  $("messages").replaceChildren();
  $("role-list").replaceChildren();
  $("avatar").replaceChildren();
  $("profile-identity").textContent = "No profile selected. No agent identity is assigned automatically.";
  for (const id of ["profile-name", "profile-purpose", "profile-instructions", "message", "media-file", "pair-code"]) $(id).value = "";
  $("pair-code").focus();
}

function option(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

function renderRoles() {
  const query = $("role-search").value.toLowerCase();
  $("role-list").replaceChildren();
  const roles = state.profiles.filter((p) => `${p.name} ${p.purpose}`.toLowerCase().includes(query));
  for (const p of roles) {
    const button = document.createElement("button");
    button.className = "role-button";
    button.disabled = state.sending;
    button.setAttribute("aria-pressed", String(state.profile?.id === p.id));
    const initial = document.createElement("span");
    initial.className = "role-initial";
    initial.textContent = p.name.slice(0, 1);
    initial.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.append(document.createTextNode(p.name));
    const detail = document.createElement("small");
    detail.textContent = `${p.template ? "Starter template" : "Custom profile"}${p.enabled ? "" : " / disabled"}`;
    copy.append(detail);
    button.append(initial, copy);
    button.addEventListener("click", action(() => selectProfile(p)));
    $("role-list").append(button);
  }
  if (!roles.length) $("role-list").textContent = "No matching roles.";
}

function discard() {
  return !state.dirty || window.confirm("Discard unsaved role edits?");
}

async function selectProfile(profile) {
  if (!discard()) return;
  state.profile = profile;
  state.conversation = null;
  state.dirty = false;
  $("profile-editor").hidden = true;
  renderProfile();
  renderHistory();
  renderMessages();
}

function renderProfile() {
  const p = state.profile;
  $("conversation-title").textContent = p ? p.name : "Choose a role to begin";
  $("role-purpose").textContent = p ? p.purpose : "A focused conversation, powered locally.";
  $("profile-identity").textContent = p ?
    `${p.template ? "Starter template" : "Custom profile"} / local ID: ${p.id} / ${p.passport_candidate ? `${p.passport_candidate}: reserved, unissued candidate` : "Passport unassigned"}. No verified deployed agent identity.` :
    "No profile selected. No agent identity is assigned automatically.";
  $("edit-role").disabled = !p;
  $("new-conversation").disabled = !p?.enabled;
  $("avatar").replaceChildren();
  $("avatar").removeAttribute("aria-hidden");
  if (p?.media_id) {
    const media = document.createElement(p.media_mime === "video/mp4" ? "video" : "img");
    media.src = `/api/profiles/${encodeURIComponent(p.id)}/media?v=${encodeURIComponent(p.media_id)}`;
    if (media.tagName === "VIDEO") {
      media.controls = true;
      media.muted = true;
      media.preload = "metadata";
      media.playsInline = true;
      media.setAttribute("aria-label", `${p.name} uploaded profile video`);
    } else media.alt = "";
    media.addEventListener("error", () => notice("The local avatar could not be loaded. Replace or delete it in Edit role."));
    $("avatar").append(media);
  } else {
    $("avatar").setAttribute("aria-hidden", "true");
    const initial = document.createElement("span");
    initial.textContent = p?.name.slice(0, 1) || "A";
    $("avatar").append(initial);
  }
  renderRoles();
  updateSend();
}

function renderHistory() {
  $("history").replaceChildren(option("", "New conversation"));
  for (const c of state.conversations.filter((c) => c.profile_id === state.profile?.id)) {
    $("history").append(option(c.id, c.title));
  }
  $("history").value = state.conversation?.id || "";
  $("delete-conversation").disabled = !state.conversation || state.active?.conversation_id === state.conversation.id;
}

function renderMessages() {
  const box = $("messages");
  const oldScroll = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
  box.replaceChildren();
  if (!state.conversation?.messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const route = document.createElement("div");
    route.className = "origin-line";
    route.setAttribute("aria-hidden", "true");
    const heading = document.createElement("h2");
    heading.textContent = state.profile ? `Work with ${state.profile.name}` : "Start with a role. Keep the work here.";
    const p = document.createElement("p");
    p.textContent = state.profile ? "Choose an installed local model and send a message. This role is a prompt profile, not an independent worker." : "Select a role from the registry. Nothing is working in the background.";
    empty.append(route, heading, p);
    box.append(empty);
  }
  for (const message of state.conversation?.messages || []) {
    const article = document.createElement("article");
    article.className = `message ${message.role}`;
    const label = document.createElement("strong");
    label.textContent = message.role === "user" ? "You" : "Local model response";
    const content = document.createElement("p");
    content.textContent = message.content;
    article.append(label, content);
    const run = state.conversation.runs.find((r) => r.id === message.run_id);
    if (message.role === "user" && run?.error_message) {
      const error = document.createElement("p");
      error.className = "turn-error";
      error.textContent = `${run.status}: ${run.error_message} This turn is not replayed to the model.`;
      article.append(error);
    }
    box.append(article);
  }
  if (oldScroll) box.scrollTop = box.scrollHeight;
}

function updateSend() {
  const reason = !state.profile ? "Select a role." : !state.profile.enabled ? "This profile is disabled." :
    !state.status?.runtime.ready ? "Local runtime unavailable; editing and history still work." :
    state.status.storage !== "ready" ? "Storage needs attention. Restart after checking permissions." :
    state.active || state.status?.preparing || state.sending ? "One generation is active." :
    !$("model").value ? "Choose an installed local model." : "Local model / no cloud fallback";
  $("send-reason").textContent = reason;
  $("send").disabled = reason !== "Local model / no cloud fallback";
  $("message").disabled = state.sending;
  $("model").disabled = state.sending;
  $("history").disabled = state.sending;
  $("add-role").disabled = state.sending;
  $("edit-role").disabled = !state.profile || state.sending;
  $("new-conversation").disabled = !state.profile?.enabled || state.sending;
  $("delete-conversation").disabled = !state.conversation || state.active?.conversation_id === state.conversation.id || state.sending;
  for (const button of $("role-list").querySelectorAll("button")) button.disabled = state.sending;
  $("cancel-run").hidden = !state.active;
  $("run-state").textContent = state.active ? `Generating locally with ${state.active.model}. You can cancel.` :
    state.status?.preparing ? "Verifying the local model..." : "No active run.";
}

async function loadModels() {
  const selected = $("model").value;
  $("model").replaceChildren(option("", "Choose a model"));
  if (state.status?.runtime.ready) {
    const models = await api("/models");
    for (const m of models) $("model").append(option(m.name, m.name));
    if (models.some((m) => m.name === selected)) $("model").value = selected;
    if (!models.length) notice("No verifiable local models found. Provision a local model beforehand; AXES will not download one.");
  }
  updateSend();
}

async function refresh(full = false) {
  if (!state.paired || state.refreshing) return;
  state.refreshing = true;
  try {
    const previousReady = state.status?.runtime.ready;
    state.status = await api("/status");
    const status = state.status;
    $("runtime-title").textContent = status.runtime.ready ? "Local runtime ready" : "Inference not ready";
    $("runtime-indicator").classList.toggle("ready", status.runtime.ready);
    $("runtime-detail").textContent = status.runtime.message;
    $("counts").textContent = `${status.counts.templates} templates / ${status.counts.enabledProfiles} enabled / ${status.counts.activeRuns} active runs`;
    $("overview-templates").textContent = String(status.counts.templates);
    $("overview-enabled").textContent = String(status.counts.enabledProfiles);
    $("overview-runs").textContent = String(status.counts.activeRuns);
    $("data-path").textContent = status.database;
    $("storage-status").textContent = status.storage === "ready" ? "Local storage ready." : "Storage failure: stop the app and check permissions/free disk space.";
    $("media-state").textContent = status.media?.message || "Media setup is unavailable.";
    if (full) {
      state.profiles = await api("/profiles");
      state.conversations = await api("/conversations");
      if (state.profile) state.profile = state.profiles.find((p) => p.id === state.profile.id);
      renderProfile();
      renderHistory();
      const identity = await api("/identity");
      $("identity-note").textContent = `Origin: ${identity.originReference}. ${identity.ownership.claimant}: founder ownership asserted and recorded as established in the internal record; requested share ${identity.ownership.requestedSharePercent}%. App registration and passport issuance remain unverified.`;
      $("ownership-policy").textContent = identity.ownershipPolicy.retention;
      const candidate = $("passport-candidate").value;
      $("passport-candidate").replaceChildren(option("", "Unassigned"));
      for (const token of identity.reservedNames) $("passport-candidate").append(option(token, `${token} / reserved, unissued`));
      $("passport-candidate").value = candidate;
    }
    if (full || previousReady !== status.runtime.ready) await loadModels();
    if (status.activeRun) state.active = await api(`/runs/${status.activeRun}`);
    else if (state.active) {
      const finished = await api(`/runs/${state.active.id}`);
      state.active = null;
      notice(finished.status === "completed" ? "Local response saved." : finished.error_message || `Run ${finished.status}.`);
      if (state.conversation) {
        state.conversation = await api(`/conversations/${state.conversation.id}`);
        renderMessages();
      }
    }
    renderHistory();
    updateSend();
  } finally { state.refreshing = false; }
}

function openEditor(isNew = false) {
  if (!discard()) return;
  const p = isNew ? null : state.profile;
  state.editorId = p?.id || null;
  state.dirty = false;
  $("editor-title").textContent = p ? "Edit role profile" : "Create role profile";
  $("profile-name").value = p?.name || "";
  $("profile-purpose").value = p?.purpose || "";
  $("profile-instructions").value = p?.instructions || "";
  $("profile-enabled").checked = p ? p.enabled : true;
  $("passport-candidate").value = p?.passport_candidate || "";
  $("passport-state").textContent = p?.passport_candidate ? `${p.passport_candidate}: reserved, unissued candidate. No verified passport ID.` : "Unassigned. Passport issuance remains unverified.";
  $("media-editor").hidden = !p;
  $("delete-media").disabled = !p?.media_id;
  $("media-file").value = "";
  $("media-rights").checked = false;
  $("profile-editor").hidden = false;
  $("profile-name").focus();
}

$("pair-form").addEventListener("submit", action(async () => {
  const result = await api("/session", { method: "POST", body: JSON.stringify({ code: $("pair-code").value }) });
  $("pair-code").value = "";
  state.csrf = result.csrf;
  state.paired = true;
  $("pairing").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  await refresh(true);
  $("workspace").focus();
}));
$("logout").addEventListener("click", action(async () => { if (discard()) { await api("/session", { method: "DELETE", body: "{}" }); lock(); } }));
$("role-search").addEventListener("input", renderRoles);
$("edit-role").addEventListener("click", () => openEditor());
$("add-role").addEventListener("click", () => openEditor(true));
$("profile-form").addEventListener("input", () => { state.dirty = true; });
$("close-editor").addEventListener("click", () => { if (discard()) { state.dirty = false; $("profile-editor").hidden = true; } });
$("profile-form").addEventListener("submit", action(async () => {
  const p = await api(`/profiles${state.editorId ? `/${state.editorId}` : ""}`, { method: state.editorId ? "PATCH" : "POST", body: JSON.stringify({
    name: $("profile-name").value, purpose: $("profile-purpose").value, instructions: $("profile-instructions").value, enabled: $("profile-enabled").checked,
    passport_candidate: $("passport-candidate").value || null
  }) });
  state.dirty = false;
  state.profile = p;
  $("profile-editor").hidden = true;
  await refresh(true);
  notice("Profile saved. Editing instructions does not change previous run snapshots.");
}));
$("history").addEventListener("change", action(async () => {
  state.conversation = $("history").value ? await api(`/conversations/${$("history").value}`) : null;
  renderHistory();
  renderMessages();
}));
$("new-conversation").addEventListener("click", () => {
  state.conversation = null;
  renderHistory(); renderMessages(); $("message").focus();
});
$("delete-conversation").addEventListener("click", action(async () => {
  if (!state.conversation || !window.confirm("Delete this conversation and all its messages from local storage? Backups are not affected.")) return;
  await api(`/conversations/${state.conversation.id}`, { method: "DELETE", body: "{}" });
  state.conversation = null;
  await refresh(true);
  renderMessages();
  notice("Conversation deleted locally. Backups and forensic recovery are outside this operation.");
}));
$("model").addEventListener("change", updateSend);
$("refresh").addEventListener("click", action(() => refresh(true)));
$("compose").addEventListener("submit", action(async () => {
  if ($("send").disabled) return;
  state.sending = true;
  updateSend();
  try {
    if (!state.conversation) {
      state.conversation = await api("/conversations", { method: "POST", body: JSON.stringify({ profileId: state.profile.id, title: $("message").value.trim().slice(0, 80) || "Conversation" }) });
    }
    state.active = await api(`/conversations/${state.conversation.id}/runs`, { method: "POST", body: JSON.stringify({ input: $("message").value, model: $("model").value }) });
    $("message").value = "";
    state.conversation = await api(`/conversations/${state.conversation.id}`);
    state.conversations = await api("/conversations");
    renderMessages();
    renderHistory();
  } finally { state.sending = false; updateSend(); }
}));
$("cancel-run").addEventListener("click", action(async () => {
  if (!state.active) return;
  await api(`/runs/${state.active.id}/cancel`, { method: "POST", body: "{}" });
  $("run-state").textContent = "Cancellation requested. Waiting for the local request to stop.";
}));
$("upload-media").addEventListener("click", action(async () => {
  const file = $("media-file").files[0];
  if (!file) throw new Error("Choose a JPEG/PNG image or short MP4.");
  if (!$("media-rights").checked) throw new Error("Confirm that you have the rights and permissions to use this media.");
  if (file.size > (file.type === "video/mp4" ? 25 : 12) * 1024 * 1024) throw new Error("Images are limited to 12 MiB; MP4 videos to 25 MiB.");
  $("upload-media").disabled = true;
  notice("Validating and normalizing media locally. Keep this workspace open.");
  try {
    const p = await api(`/profiles/${state.editorId}/media`, { method: "PUT", body: file, headers: { "Content-Type": file.type, "X-AXES-Rights": "confirmed" } });
    state.profile = p;
    await refresh(true);
    $("delete-media").disabled = false;
    $("media-file").value = "";
    $("media-rights").checked = false;
    notice("Avatar saved locally. Metadata removed; video audio removed. It is not sent to the model.");
  } finally { $("upload-media").disabled = false; }
}));
$("delete-media").addEventListener("click", action(async () => {
  if (!window.confirm("Delete this uploaded avatar from local storage? Backups are not affected.")) return;
  await api(`/profiles/${state.editorId}/media`, { method: "DELETE", body: "{}" });
  await refresh(true);
  $("delete-media").disabled = true;
  notice("Avatar deleted locally. This does not erase backups or guarantee forensic erasure.");
}));
for (const id of ["help-button", "media-help"]) $(id).addEventListener("click", () => $("help").showModal());
$("close-help").addEventListener("click", () => $("help").close());
window.addEventListener("beforeunload", (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
setInterval(() => { if (state.paired && !document.hidden) refresh().catch((error) => notice(error.message)); }, 2000);
action(async () => {
  const response = await fetch("/api/session", { credentials: "same-origin" });
  if (response.status === 401) return;
  if (!response.ok) throw new Error("The local session could not be checked. Use the printed app address.");
  state.csrf = (await response.json()).csrf;
  state.paired = true;
  $("pairing").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  await refresh(true);
})();
