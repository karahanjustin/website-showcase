(function () {
  "use strict";

  // Set this to your deployed Worker URL after `wrangler deploy`.
  const WORKER_URL = "https://david-chat.karahan-justin.workers.dev/";

  const MAX_HISTORY = 18;

  const css = `
    .david-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 9998;
      width: 60px; height: 60px; border-radius: 50%;
      background: #0a0a0a; border: 1px solid #00f0ff;
      color: #00f0ff; font-family: 'Orbitron', sans-serif;
      font-weight: 700; font-size: 0.7rem; letter-spacing: 2px;
      cursor: pointer; box-shadow: 0 0 20px rgba(0, 240, 255, 0.35);
      transition: all 0.3s;
    }
    .david-fab:hover { box-shadow: 0 0 35px rgba(0, 240, 255, 0.7); transform: scale(1.06); }

    .david-panel {
      position: fixed; bottom: 100px; right: 24px; z-index: 9999;
      width: min(380px, calc(100vw - 32px));
      height: min(560px, calc(100vh - 140px));
      background: #0a0a0a; border: 1px solid rgba(0, 240, 255, 0.4);
      border-radius: 16px; overflow: hidden;
      display: none; flex-direction: column;
      box-shadow: 0 0 40px rgba(0, 240, 255, 0.2), 0 20px 40px rgba(0, 0, 0, 0.6);
      font-family: 'Inter', sans-serif;
    }
    .david-panel.open { display: flex; }

    .david-header {
      padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; justify-content: space-between; align-items: center;
      background: #111;
    }
    .david-title {
      font-family: 'Orbitron', sans-serif; font-size: 0.9rem;
      letter-spacing: 3px; color: #00f0ff;
      text-shadow: 0 0 8px #00f0ff, 0 0 24px #00f0ff66;
    }
    .david-sub { font-size: 0.7rem; color: #666; margin-top: 2px; letter-spacing: 0.5px; }
    .david-close {
      background: none; border: none; color: #666; font-size: 1.4rem;
      cursor: pointer; padding: 0 4px;
    }
    .david-close:hover { color: #ff00e5; }

    .david-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .david-messages::-webkit-scrollbar { width: 6px; }
    .david-messages::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.2); border-radius: 3px; }

    .david-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      font-size: 0.88rem; line-height: 1.45;
      white-space: pre-wrap; word-wrap: break-word;
    }
    .david-msg.bot {
      background: #121212; border: 1px solid rgba(0,240,255,0.15);
      color: #e0e0e0; align-self: flex-start;
    }
    .david-msg.user {
      background: rgba(255, 0, 229, 0.08);
      border: 1px solid rgba(255, 0, 229, 0.3);
      color: #f5f5f5; align-self: flex-end;
    }
    .david-msg.error {
      background: rgba(255, 80, 80, 0.08); border-color: rgba(255,80,80,0.3);
      color: #ff8080;
    }

    .david-typing { display: inline-flex; gap: 4px; align-items: center; }
    .david-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #00f0ff; opacity: 0.4;
      animation: davidPulse 1.2s infinite;
    }
    .david-typing span:nth-child(2) { animation-delay: 0.2s; }
    .david-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes davidPulse { 0%,100%{opacity:0.3;} 50%{opacity:1;} }

    .david-input-row {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 12px; display: flex; gap: 8px; background: #0c0c0c;
    }
    .david-input {
      flex: 1; background: #111; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px; padding: 10px 12px; color: #f0f0f0;
      font-family: inherit; font-size: 0.88rem; resize: none;
      max-height: 100px; outline: none;
    }
    .david-input:focus { border-color: #00f0ff; box-shadow: 0 0 0 2px rgba(0,240,255,0.15); }
    .david-send {
      background: #00f0ff; color: #000; border: none; border-radius: 10px;
      padding: 0 16px; font-family: 'Orbitron', sans-serif; font-weight: 700;
      font-size: 0.7rem; letter-spacing: 1px; cursor: pointer;
      transition: all 0.2s;
    }
    .david-send:hover:not(:disabled) { box-shadow: 0 0 15px rgba(0,240,255,0.6); }
    .david-send:disabled { opacity: 0.4; cursor: not-allowed; }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const fab = document.createElement("button");
  fab.className = "david-fab";
  fab.textContent = "ASK\nDAVID";
  fab.setAttribute("aria-label", "Open chat with David");
  fab.style.whiteSpace = "pre-line";
  document.body.appendChild(fab);

  const panel = document.createElement("div");
  panel.className = "david-panel";
  panel.innerHTML = `
    <div class="david-header">
      <div>
        <div class="david-title">DAVID</div>
        <div class="david-sub">FAQ • Justin's services</div>
      </div>
      <button class="david-close" aria-label="Close">×</button>
    </div>
    <div class="david-messages" role="log" aria-live="polite"></div>
    <div class="david-input-row">
      <textarea class="david-input" rows="1" placeholder="Ask about services, pricing…" maxlength="2000"></textarea>
      <button class="david-send">SEND</button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector(".david-messages");
  const inputEl = panel.querySelector(".david-input");
  const sendBtn = panel.querySelector(".david-send");
  const closeBtn = panel.querySelector(".david-close");

  const history = [];
  let greeted = false;

  function addMsg(role, text, cls) {
    const el = document.createElement("div");
    el.className = "david-msg " + (cls || role);
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "david-msg bot";
    el.innerHTML = '<span class="david-typing"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function openPanel() {
    panel.classList.add("open");
    if (!greeted) {
      addMsg("bot", "Hi, I'm David. I answer questions about Justin's services — websites and AI integrations. How can I help?\n\nHallo, ich bin David. Ich beantworte Fragen zu Justins Leistungen — Websites und KI-Integrationen. Wie kann ich helfen?");
      greeted = true;
    }
    setTimeout(() => inputEl.focus(), 50);
  }
  function closePanel() { panel.classList.remove("open"); }

  fab.addEventListener("click", () => {
    panel.classList.contains("open") ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener("click", send);

  async function send() {
    const text = inputEl.value.trim();
    if (!text || sendBtn.disabled) return;

    addMsg("user", text);
    history.push({ role: "user", content: text });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    inputEl.value = "";
    inputEl.style.height = "auto";
    sendBtn.disabled = true;
    const typing = addTyping();

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      typing.remove();

      if (!res.ok || !data.reply) {
        addMsg("bot", "Sorry, I couldn't reach the server. Please try again or email karahan.justin@gmail.com.", "error");
      } else {
        addMsg("bot", data.reply);
        history.push({ role: "assistant", content: data.reply });
      }
    } catch {
      typing.remove();
      addMsg("bot", "Network error. Please try again or email karahan.justin@gmail.com.", "error");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }
})();
