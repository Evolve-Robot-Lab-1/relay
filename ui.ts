export const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="dark">
  <meta name="referrer" content="no-referrer">
  <meta name="description" content="Relay helps you handle difficult conversations while staying in control.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Relay">
  <meta property="og:description" content="Your representative for difficult conversations.">
  <meta property="og:image" content="https://relay.durgaai.com/relay-social.png">
  <meta property="og:image:width" content="1254">
  <meta property="og:image:height" content="1254">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Relay">
  <meta name="twitter:description" content="Your representative for difficult conversations.">
  <meta name="twitter:image" content="https://relay.durgaai.com/relay-social.png">
  <link rel="icon" type="image/png" href="/relay-mark.png">
  <title>Relay</title>
  <style>
    :root{--bg:#080a09;--panel:#101311;--panel2:#171b18;--line:#29302b;--text:#f3f6f4;--muted:#8d9891;--green:#00e982;--green2:#00b969;--red:#ff5a64;--amber:#f2bb49;--blue:#61a8ff;--radius:6px;--max:760px}
    *{box-sizing:border-box;letter-spacing:0}
    html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    button,input,textarea,select{font:inherit;letter-spacing:0}
    button{cursor:pointer}
    button:disabled{cursor:not-allowed;opacity:.55}
    .shell{width:min(100%,var(--max));margin:0 auto;min-height:100vh;padding:18px 18px 92px}
    header{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);margin-bottom:20px;padding:12px 0}
    .brand{font-size:22px;line-height:1;font-weight:800;color:#fff}
    .brand-group{display:flex;align-items:center;gap:11px;min-width:0}
    .brand-logo{width:36px;height:36px;object-fit:cover;flex:0 0 auto;border-radius:4px}
    .header-copy{min-width:0}
    .tagline{color:var(--muted);font-size:12px;line-height:1.2;margin-top:5px;white-space:nowrap}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .icon{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
    .icon-btn{width:44px;height:44px;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:var(--radius);display:inline-grid;place-items:center}
    .icon-btn:hover{border-color:#435047;background:var(--panel2)}
    .view[hidden],.hidden{display:none!important}
    .name-banner{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,auto);gap:16px;align-items:center;border-bottom:1px solid var(--line);padding:0 0 18px;margin-bottom:18px}
    .name-banner strong{display:block;font-size:14px}
    .name-banner span{display:block;color:var(--muted);font-size:12px;margin-top:3px}
    .name-banner-form{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:8px;align-items:center}
    .name-banner-form input{height:40px}
    .section{margin-top:24px}
    .home-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--line);margin:2px 0 18px}
    .home-tab{height:44px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted);font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px}
    .home-tab.active{border-bottom-color:var(--green);color:var(--text)}
    .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
    .section-title{margin:0;font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase}
    .text-btn{border:0;background:transparent;color:var(--muted);padding:3px 0}
    .text-btn:hover{color:var(--text)}
    .text-btn.danger{color:var(--red)}
    .empty{padding:22px 0;color:var(--muted);border-top:1px solid var(--line)}
    .list{border-top:1px solid var(--line)}
    .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 2px;border-bottom:1px solid var(--line)}
    .row-main{min-width:0;border:0;background:transparent;color:inherit;padding:0;text-align:left}
    .row-title{display:flex;align-items:center;gap:8px;font-weight:700;min-width:0}
    .row-title span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .row-sub{color:var(--muted);font-size:12px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .row-meta{display:flex;align-items:center;gap:8px;color:#6f7a73;font-size:11px;margin-top:7px;min-width:0}
    .row-meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .row-actions{display:flex;gap:6px;align-items:center}
    .conversation-list{border:0;display:grid;gap:8px}
    .conversation-row{border:1px solid var(--line);border-radius:6px;background:var(--panel);padding:13px}
    .conversation-row.needs-action{border-left:3px solid var(--green)}
    .conversation-row .row-main{width:100%}
    .empty-state{min-height:320px;display:grid;place-items:center;text-align:center;border-top:1px solid var(--line);padding:36px 16px}
    .empty-state strong{display:block;color:var(--text);font-size:16px}
    .empty-state p{max-width:340px;color:var(--muted);margin:8px auto 18px}
    .small-btn{height:30px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:4px;padding:0 10px;font-size:12px}
    .small-btn:hover{border-color:#435047}
    .small-btn.danger{color:var(--red)}
    .badge{display:inline-flex;align-items:center;height:20px;padding:0 7px;border:1px solid var(--line);border-radius:999px;font-size:10px;color:var(--muted);white-space:nowrap;text-transform:uppercase}
    .badge.active,.badge.confirming,.badge.approval{border-color:#695521;color:var(--amber)}
    .badge.resolved,.badge.closed,.badge.done{border-color:#176d48;color:var(--green)}
    .badge.waiting,.badge.draft{border-color:#244766;color:var(--blue)}
    .badge.response{border-color:#168052;color:var(--green)}
    .protect{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:#101a15;border:1px solid #1d5138;padding:12px;margin-bottom:18px;border-radius:var(--radius)}
    .protect strong{display:block;font-size:13px}
    .protect span{display:block;color:var(--muted);font-size:12px;margin-top:2px}
    .primary{height:40px;border:0;background:var(--green);color:#001b0d;border-radius:var(--radius);font-weight:800;padding:0 16px}
    .primary:hover{background:#12f08c}
    .secondary{height:40px;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:var(--radius);font-weight:700;padding:0 16px}
    .danger-btn{height:40px;border:1px solid #743038;background:#211113;color:#ff858c;border-radius:var(--radius);font-weight:700;padding:0 16px}
    .fab{position:fixed;right:max(22px,calc((100vw - var(--max))/2 + 22px));bottom:22px;width:54px;height:54px;border:0;border-radius:50%;background:var(--green);color:#001b0d;display:grid;place-items:center;box-shadow:0 8px 28px #00e98245}
    .fab .icon{width:24px;height:24px}
    .fab:hover{background:#16f493}
    dialog{width:min(calc(100% - 28px),500px);max-height:calc(100vh - 40px);overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);padding:0;box-shadow:0 22px 80px #000b}
    dialog::backdrop{background:#000b}
    .dialog-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}
    .dialog-head h2{font-size:16px;margin:0}
    .dialog-body{padding:18px}
    .dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:0 18px 18px}
    label{display:block;color:#cbd2cd;font-size:12px;font-weight:700;margin:15px 0 6px}
    label:first-child{margin-top:0}
    input,textarea,select{width:100%;border:1px solid var(--line);border-radius:var(--radius);background:#090b0a;color:var(--text);padding:10px 11px;outline:none}
    input:focus,textarea:focus,select:focus{border-color:var(--green2)}
    textarea{min-height:98px;resize:vertical}
    .hint{color:var(--muted);font-size:12px;margin:7px 0 0}
    .code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere;background:#070908;border:1px solid var(--line);padding:11px;border-radius:var(--radius);color:#b8fbd6}
    .divider{height:1px;background:var(--line);margin:20px 0}
    .back{height:40px;border:0;background:transparent;color:var(--muted);padding:0 0 10px;font-weight:700;display:inline-flex;align-items:center;gap:6px}
    .back:hover{color:var(--text)}
    .convo-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;border-bottom:1px solid var(--line);padding-bottom:14px}
    .convo-head h1{font-size:18px;margin:0 0 7px;overflow-wrap:anywhere}
    .convo-meta{display:flex;gap:7px;align-items:center;color:var(--muted);font-size:12px}
    .convo-actions{display:flex;gap:6px}
    .tabs{display:grid;grid-template-columns:1fr 1fr;margin:14px 0;border-bottom:1px solid var(--line)}
    .tab{height:44px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted);font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px}
    .tab.active{color:var(--text);border-bottom-color:var(--green)}
    .result-panel{background:var(--panel);border-left:3px solid var(--amber);padding:13px 14px;margin:14px 0}
    .result-panel.confirmed{border-left-color:var(--green)}
    .result-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .result-panel h2{font-size:12px;text-transform:uppercase;margin:0;color:var(--muted)}
    .result-summary{font-size:14px;margin:9px 0 0;overflow-wrap:anywhere}
    .facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
    .fact{border:1px solid var(--line);border-radius:4px;padding:4px 7px;color:#c6cec8;font-size:11px}
    .result-actions{display:flex;gap:7px;margin-top:12px}
    .messages{min-height:230px;max-height:52vh;overflow:auto;padding:8px 0 14px}
    .message{width:fit-content;max-width:min(82%,580px);margin:7px 0;padding:9px 34px 9px 10px;border:1px solid #aa3333;border-radius:6px;position:relative;overflow-wrap:anywhere;background:#1a0d0d}
    .message.mine{margin-left:auto;text-align:right;background:#0d2137;border-color:#0055aa}
    .message .who{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;margin-bottom:4px}
    .message.mine .who{color:#4488ff}.message:not(.mine) .who{color:#ff6644}
    .message-original{font-size:11px;color:#66717a;font-style:italic;margin-top:6px;border-top:1px solid #33404b;padding-top:5px}
    .message .when{font-size:10px;color:#66716a;margin-top:5px}
    .message-delete{position:absolute;right:5px;top:5px;width:26px;height:26px;border:0;background:transparent;color:#718078;font-size:18px;border-radius:4px}
    .message-delete:hover{background:#ffffff0b;color:var(--red)}
    .draft-card{border:1px solid #00ff8840;background:#151816;padding:13px;margin:14px 0;border-radius:6px}
    .draft-card h3{font-size:11px;text-transform:uppercase;color:var(--green);margin:0 0 8px}
    .draft-text{font-size:14px;overflow-wrap:anywhere}
    .draft-actions{display:flex;gap:7px;margin-top:12px;align-items:center;flex-wrap:wrap}
    .draft-original{font-size:11px;color:#66716a;font-style:italic;margin-top:7px}
    .tone-options{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:12px}
    .tone-option{height:32px;border:1px solid var(--line);border-radius:4px;background:#090b0a;color:var(--muted);font-size:11px}
    .tone-option.active{border-color:var(--green);background:#102d20;color:var(--green)}
    .draft-status{min-height:17px;color:var(--muted);font-size:11px;margin-top:6px}
    .composer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;position:sticky;bottom:0;background:var(--bg);padding:10px 0 0}
    .composer textarea{min-height:44px;max-height:120px}
    .composer .primary{height:44px}
    .representative-row{display:flex;justify-content:flex-end;padding-top:7px}
    .representative-toggle{height:28px;border:1px solid var(--green);border-radius:4px;background:#102d20;color:var(--green);font-size:11px;padding:0 9px}
    .representative-toggle.off{border-color:var(--line);background:#101211;color:var(--muted)}
    .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#252b27;color:#fff;border:1px solid #465049;border-radius:var(--radius);padding:10px 14px;z-index:20;max-width:min(90vw,460px);box-shadow:0 10px 35px #000a}
    .blocked-row{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding:9px 0}
    @media(max-width:600px){.shell{padding:10px 12px 84px}.brand{font-size:20px}.tagline{font-size:11px}.name-banner{grid-template-columns:1fr;gap:10px}.name-banner-form{grid-template-columns:minmax(0,1fr) auto}.row{grid-template-columns:minmax(0,1fr)}.row-actions{justify-content:flex-start}.conversation-row{grid-template-columns:minmax(0,1fr) auto}.protect{grid-template-columns:1fr}.convo-head{grid-template-columns:1fr}.convo-actions{justify-content:flex-start}.message{max-width:92%}.tone-options{grid-template-columns:1fr 1fr}.dialog-actions{flex-wrap:wrap}.dialog-actions button{flex:1}.fab{right:18px;bottom:18px}}
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div class="brand-group"><img class="brand-logo" src="/relay-mark.png" alt=""><div class="header-copy"><div class="brand">RELAY</div><div id="tagline" class="tagline">say it better.</div></div><span id="connection" class="sr-only" aria-live="polite">Connecting</span></div>
      <button id="profile-button" class="icon-btn" type="button" title="Profile and recovery" aria-label="Profile and recovery"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path></svg></button>
    </header>

    <section id="name-banner" class="name-banner hidden" aria-labelledby="name-banner-title">
      <div><strong id="name-banner-title">Choose your display name</strong><span>This is how people in your conversations will know you.</span></div>
      <div class="name-banner-form"><label class="sr-only" for="onboarding-name">Display name</label><input id="onboarding-name" maxlength="48" placeholder="Your name" autocomplete="name"><button id="save-onboarding-name" class="primary" type="button" data-action="save-onboarding-name">Save</button></div>
    </section>

    <section id="home-view" class="view">
      <div id="protect-banner" class="protect hidden">
        <div><strong>Protect your profile</strong><span>Keep your conversations and contacts when you change devices.</span></div>
        <button class="primary" type="button" data-action="open-profile">View recovery code</button>
      </div>
      <div class="home-tabs"><button id="home-conversations-tab" class="home-tab active" type="button" data-action="set-home-tab" data-tab="conversations"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>Conversations</button><button id="home-contacts-tab" class="home-tab" type="button" data-action="set-home-tab" data-tab="contacts"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Contacts</button></div>
      <section id="home-conversations-panel" class="section">
        <div class="section-head"><h1 class="section-title">Active conversations</h1><button id="manage-conversations-button" class="text-btn hidden" type="button" data-action="toggle-manage">Manage</button></div>
        <div id="thread-list" class="list conversation-list"></div>
      </section>
      <section id="home-contacts-panel" class="section hidden">
        <div class="section-head"><h2 class="section-title">Contacts</h2></div>
        <div id="contact-list" class="list"></div>
      </section>
      <button class="fab" type="button" data-action="open-create" title="Start a new conversation" aria-label="Start a new conversation"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
    </section>

    <section id="conversation-view" class="view" hidden>
      <button class="back" type="button" data-action="go-home"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>Back</button>
      <div class="convo-head">
        <div><h1 id="conversation-title">Conversation</h1><div class="convo-meta"><span id="conversation-status" class="badge">Draft</span><span id="conversation-peer"></span></div></div>
        <div class="convo-actions"><button id="share-button" class="small-btn hidden" type="button" data-action="share-invite">Share invite</button><button class="small-btn danger" type="button" data-action="remove-conversation">Remove</button><button id="delete-everyone-button" class="small-btn danger hidden" type="button" data-action="delete-everyone">Delete for all</button></div>
      </div>
      <div class="tabs"><button id="private-tab" class="tab active" type="button" data-action="set-tab" data-tab="private"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Private</button><button id="shared-tab" class="tab" type="button" data-action="set-tab" data-tab="shared"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"></path></svg>Shared</button></div>
      <section id="draft-card" class="draft-card hidden">
        <h3>Review before sending</h3><div id="draft-text" class="draft-text"></div><div id="draft-original" class="draft-original"></div><div id="draft-facts" class="facts"></div>
        <div id="tone-options" class="tone-options"><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="professional">Professional</button><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="friendly">Friendly</button><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="direct">Direct</button><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="casual">Casual</button></div>
        <div id="draft-status" class="draft-status"></div><div class="draft-actions"><button class="primary" type="button" data-action="approve-draft">Approve and send</button><button class="secondary" type="button" data-action="reject-draft">Discard</button></div>
      </section>
      <section id="result-panel" class="result-panel">
        <div class="result-head"><h2>Conversation result</h2><span id="result-state" class="badge">Open</span></div>
        <p id="result-summary" class="result-summary">No clear result yet.</p>
        <div id="result-facts" class="facts"></div>
        <div id="result-actions" class="result-actions"></div>
      </section>
      <div id="message-list" class="messages"></div>
      <div id="composer-area"><div class="composer"><textarea id="reply-input" rows="1" maxlength="4000" placeholder="Write a reply..."></textarea><button id="reply-button" class="primary" type="button" data-action="draft-reply">Send</button></div><div class="representative-row"><button id="representative-toggle" class="representative-toggle" type="button" data-action="toggle-representative">Representative ON</button></div></div>
    </section>
  </main>

  <dialog id="create-dialog">
    <div class="dialog-head"><h2>New conversation</h2><button class="icon-btn" type="button" data-close="create-dialog" aria-label="Close">&times;</button></div>
    <div class="dialog-body">
      <label for="target-contact">Start with</label><select id="target-contact"><option value="">Secure invite link</option></select>
      <label for="new-message">What do you want to communicate?</label><textarea id="new-message" maxlength="4000" placeholder="Write what you want the other person to understand."></textarea>
      <p class="hint">Your words stay private. Review Relay's draft before it is sent.</p>
    </div>
    <div class="dialog-actions"><button class="secondary" type="button" data-close="create-dialog">Cancel</button><button id="create-button" class="primary" type="button" data-action="create-goal">Generate draft</button></div>
  </dialog>

  <dialog id="profile-dialog">
    <div class="dialog-head"><h2>Relay profile</h2><button class="icon-btn" type="button" data-close="profile-dialog" aria-label="Close">&times;</button></div>
    <div class="dialog-body">
      <label for="display-name">Display name</label><input id="display-name" maxlength="48" placeholder="Name shown to contacts">
      <button class="secondary" type="button" data-action="save-name">Save name</button>
      <div class="divider"></div>
      <label>Recovery code</label><div id="recovery-code" class="code"></div><p class="hint">Anyone with this code can access your Relay profile. Store it privately.</p>
      <button class="secondary" type="button" data-action="copy-recovery">Copy recovery code</button>
      <div class="divider"></div>
      <button class="text-btn" type="button" data-action="open-restore">Restore a different profile</button>
      <section id="blocked-section" class="section hidden"><h3 class="section-title">Blocked profiles</h3><div id="blocked-list"></div></section>
    </div>
  </dialog>

  <dialog id="restore-dialog">
    <div class="dialog-head"><h2>Restore profile</h2></div>
    <div class="dialog-body"><label for="restore-code">Recovery code</label><textarea id="restore-code" class="code" placeholder="RLY1.A..." autocomplete="off"></textarea><p id="restore-help" class="hint">Use the recovery code saved from another browser or device.</p></div>
    <div class="dialog-actions"><button id="new-profile-button" class="secondary" type="button" data-action="new-profile">Create new</button><button class="primary" type="button" data-action="restore-profile">Restore</button></div>
  </dialog>

  <div id="toast" class="toast hidden" role="status"></div>

  <script nonce="__NONCE__">
  (() => {
    'use strict';
    const state = { recovery: localStorage.getItem('relayRecovery') || '', profile: null, threads: [], contacts: [], blocks: [], goal: null, ws: null, reconnectTimer: null, invite: new URLSearchParams(location.search).get('invite'), homeTab: 'conversations', tab: 'private', welcomed: false, toneUpdating: false, toneNotice: '', replySending: false, managingThreads: false, nameSaving: false };
    const byId = id => document.getElementById(id);
    const statusLabels = { draft:'Draft', waiting:'Waiting for participant', active:'Active', confirming:'Confirming details', resolved:'Resolved', closed:'Closed', completed:'Closed', cancelled:'Closed' };
    const labelFor = profile => profile ? profile.name || 'Other person' : 'Waiting for participant';

    function relativeTime(value) {
      const elapsed = Math.max(0, Date.now() - Number(value || 0));
      const minutes = Math.floor(elapsed / 60_000);
      if (minutes < 1) return 'just now';
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + 'h ago';
      const days = Math.floor(hours / 24);
      if (days === 1) return 'yesterday';
      if (days < 7) return days + 'd ago';
      return new Date(value).toLocaleDateString();
    }

    function normalizeGoal(goal) {
      if (!goal || goal.result) return goal;
      const legacy = goal.agreement || {};
      const requiresConfirmation = Boolean(legacy.date || legacy.time || legacy.location || legacy.facts?.date?.value || legacy.facts?.time?.value || legacy.facts?.location?.value);
      goal.result = {
        version: legacy.version || 0,
        summary: legacy.summary || goal.thread?.at(-1)?.text || '',
        type: requiresConfirmation ? 'commitment' : 'progress',
        requiresConfirmation,
        date: legacy.date || legacy.facts?.date?.value || null,
        time: legacy.time || legacy.facts?.time?.value || null,
        location: legacy.location || legacy.facts?.location?.value || null,
        status: legacy.lockedAt || legacy.status === 'agreed' ? 'confirmed' : requiresConfirmation ? 'confirming' : 'open',
        confirmations: legacy.confirmations || {},
        lockedAt: legacy.lockedAt || null
      };
      if (goal.status === 'agreed') goal.status = 'resolved';
      else if (goal.status === 'proposed') goal.status = requiresConfirmation ? 'confirming' : 'active';
      return goal;
    }

    function node(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }

    function actionButton(label, action, className = 'small-btn') {
      const button = node('button', className, label);
      button.type = 'button';
      button.dataset.action = action;
      return button;
    }

    function toast(message) {
      const element = byId('toast');
      element.textContent = message;
      element.classList.remove('hidden');
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => element.classList.add('hidden'), 3200);
    }

    async function api(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (state.recovery) headers.set('authorization', 'Bearer ' + state.recovery);
      if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
      const response = await fetch(path, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Request failed.');
      return data;
    }

    async function createProfile(skipLegacy = false) {
      const legacyId = skipLegacy ? null : localStorage.getItem('aid');
      const response = await api('/api/profile', { method: 'POST', body: JSON.stringify({ legacyId }) });
      state.recovery = response.recoveryCode;
      localStorage.setItem('relayRecovery', state.recovery);
      if (response.legacyClaimed) toast('Your existing profile is now protected.');
      byId('restore-dialog').close();
      connect();
    }

    async function start() {
      if (!state.recovery) {
        try { await createProfile(false); }
        catch (error) {
          byId('restore-help').textContent = error.message;
          byId('restore-dialog').showModal();
        }
        return;
      }
      try {
        await api('/api/profile/restore', { method: 'POST', body: JSON.stringify({ recoveryCode: state.recovery }) });
        connect();
      } catch {
        byId('restore-help').textContent = 'This browser\\'s saved profile could not be restored. Enter its recovery code or create a new profile.';
        byId('restore-dialog').showModal();
      }
    }

    function connect() {
      clearTimeout(state.reconnectTimer);
      if (state.ws && state.ws.readyState <= WebSocket.OPEN) state.ws.close();
      const connection = byId('connection');
      connection.textContent = 'Connecting';
      connection.classList.remove('offline');
      const socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      state.ws = socket;
      socket.addEventListener('open', () => socket.send(JSON.stringify({ type:'init', recoveryCode:state.recovery })));
      socket.addEventListener('message', event => handleMessage(JSON.parse(event.data)));
      socket.addEventListener('close', () => {
        state.welcomed = false;
        connection.textContent = 'Offline';
        connection.classList.add('offline');
        state.reconnectTimer = setTimeout(connect, 1500);
      });
      socket.addEventListener('error', () => socket.close());
    }

    function send(message) {
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN || !state.welcomed) {
        toast('Still connecting. Try again in a moment.');
        return false;
      }
      state.ws.send(JSON.stringify(message));
      return true;
    }

    function handleMessage(message) {
      if (message.type === 'auth-error') {
        state.recovery = '';
        localStorage.removeItem('relayRecovery');
        byId('restore-help').textContent = message.message;
        if (!byId('restore-dialog').open) byId('restore-dialog').showModal();
        return;
      }
      if (message.type === 'welcome') {
        state.welcomed = true;
        byId('connection').textContent = 'Connected';
        applyBootstrap(message);
        if (state.invite) send({ type:'claim-invite', invite:state.invite });
        return;
      }
      if (message.type === 'bootstrap') return applyBootstrap(message);
      if (message.type === 'goal-created') {
        state.goal = normalizeGoal(message.goal);
        byId('create-dialog').close();
        byId('create-button').disabled = false;
        if (message.shareUrl) copyText(message.shareUrl, 'Invite link copied.');
        showConversation();
        return;
      }
      if (message.type === 'goal-loaded' || message.type === 'invite-claimed') {
        state.goal = normalizeGoal(message.goal);
        if (message.type === 'invite-claimed') {
          state.invite = null;
          history.replaceState(null, '', location.pathname);
          toast('Conversation joined.');
        }
        showConversation();
        return;
      }
      if (message.type === 'goal-updated') {
        message.goal = normalizeGoal(message.goal);
        if (state.goal?.id === message.goal.id) {
          if (state.toneUpdating) {
            state.toneUpdating = false;
            const appliedTone = message.goal.pendingDraft?.tone || message.goal.tone || 'professional';
            state.toneNotice = message.goal.pendingDraft ? appliedTone.charAt(0).toUpperCase() + appliedTone.slice(1) + ' tone applied' : '';
          }
          state.goal = message.goal;
          renderConversation();
        }
        return;
      }
      if (message.type === 'invite-rotated') return copyText(message.shareUrl, 'Invite link copied.');
      if (message.type === 'reply-sent' && state.goal?.id === message.goalId) {
        state.replySending = false;
        byId('reply-input').value = '';
        renderConversation();
        return;
      }
      if (message.type === 'conversation-removed' || message.type === 'conversation-deleted' || message.type === 'conversations-cleared') {
        if (!message.goalId || state.goal?.id === message.goalId) goHome();
        return;
      }
      if (message.type === 'error') {
        byId('create-button').disabled = false;
        state.toneUpdating = false;
        if (message.action === 'set-name') state.nameSaving = false;
        if (message.action === 'draft-reply') state.replySending = false;
        if (state.goal) renderConversation();
        renderNameBanner();
        toast(message.message || 'The action could not be completed.');
      }
    }

    function applyBootstrap(data) {
      const savedName = state.nameSaving;
      state.profile = data.profile;
      state.nameSaving = false;
      state.threads = (data.threads || []).map(thread => ({ ...thread, status:thread.status === 'agreed' ? 'resolved' : thread.status === 'proposed' ? 'active' : thread.status }));
      state.contacts = data.contacts || [];
      state.blocks = data.blocks || [];
      if (!state.threads.length) state.managingThreads = false;
      renderHome();
      renderProfile();
      if (savedName && state.profile?.name) toast('Name saved.');
    }

    function renderHome() {
      renderNameBanner();
      renderThreads();
      renderContacts();
      byId('home-conversations-tab').classList.toggle('active', state.homeTab === 'conversations');
      byId('home-contacts-tab').classList.toggle('active', state.homeTab === 'contacts');
      byId('home-conversations-panel').classList.toggle('hidden', state.homeTab !== 'conversations');
      byId('home-contacts-panel').classList.toggle('hidden', state.homeTab !== 'contacts');
      const manage = byId('manage-conversations-button');
      manage.classList.toggle('hidden', state.threads.length === 0);
      manage.textContent = state.managingThreads ? 'Done' : 'Manage';
      const useful = state.threads.some(thread => ['active','confirming','resolved','closed'].includes(thread.status));
      byId('protect-banner').classList.toggle('hidden', !useful || localStorage.getItem('relayRecoveryAcknowledged') === '1');
    }

    function renderNameBanner() {
      const banner = byId('name-banner');
      const needsName = Boolean(state.profile && !state.profile.name?.trim());
      banner.classList.toggle('hidden', !needsName);
      const button = byId('save-onboarding-name');
      button.disabled = state.nameSaving;
      button.textContent = state.nameSaving ? 'Saving...' : 'Save';
    }

    function renderThreads() {
      const list = byId('thread-list');
      list.replaceChildren();
      if (!state.threads.length) {
        const empty = node('div', 'empty-state');
        const content = node('div');
        content.append(node('strong', '', 'No conversations yet.'), node('p', '', 'Start one when there is something you would rather not say alone.'));
        const start = actionButton('Start a conversation', 'open-create', 'primary');
        content.append(start); empty.append(content); list.append(empty); return;
      }
      state.threads.forEach(thread => {
        const row = node('article', 'row conversation-row' + (thread.actionRequired ? ' needs-action' : ''));
        const main = node('button', 'row-main');
        main.type = 'button'; main.dataset.action = 'open-thread'; main.dataset.goalId = thread.goalId;
        const title = node('div', 'row-title');
        title.append(node('span', '', thread.title || 'New conversation'), node('span', 'badge ' + (thread.statusKey || thread.status), thread.displayStatus || statusLabels[thread.status] || thread.status));
        const meta = node('div', 'row-meta');
        meta.append(node('span', '', thread.peerLabel || labelFor(thread.peer)), node('span', '', 'Updated ' + relativeTime(thread.updatedAt)));
        main.append(title, node('div', 'row-sub', thread.summary || ''), meta);
        const actions = node('div', 'row-actions');
        const remove = actionButton('Remove', 'remove-thread', 'small-btn danger'); remove.dataset.goalId = thread.goalId;
        actions.append(remove); actions.classList.toggle('hidden', !state.managingThreads); row.append(main, actions); list.append(row);
      });
    }

    function renderContacts() {
      const list = byId('contact-list');
      list.replaceChildren();
      const select = byId('target-contact');
      select.replaceChildren();
      const inviteOption = document.createElement('option'); inviteOption.value = ''; inviteOption.textContent = 'Secure invite link'; select.append(inviteOption);
      if (!state.contacts.length) list.append(node('div', 'empty', 'Contacts appear after another person joins your conversation.'));
      state.contacts.forEach(contact => {
        const option = document.createElement('option'); option.value = contact.id; option.textContent = labelFor(contact); select.append(option);
        const row = node('div', 'row');
        const info = node('div', 'row-main'); info.append(node('div', 'row-title', labelFor(contact)), node('div', 'row-sub', 'Last active ' + relativeTime(contact.updatedAt)));
        const actions = node('div', 'row-actions');
        const message = actionButton('Message', 'message-contact'); message.dataset.contactId = contact.id;
        const remove = actionButton('Remove', 'remove-contact'); remove.dataset.contactId = contact.id;
        const block = actionButton('Block', 'block-contact', 'small-btn danger'); block.dataset.contactId = contact.id;
        actions.append(message, remove, block); row.append(info, actions); list.append(row);
      });
    }

    function renderProfile() {
      if (!state.profile) return;
      byId('display-name').value = state.profile.name || '';
      byId('recovery-code').textContent = state.recovery;
      const list = byId('blocked-list'); list.replaceChildren();
      byId('blocked-section').classList.toggle('hidden', state.blocks.length === 0);
      state.blocks.forEach(block => {
        const row = node('div', 'blocked-row'); row.append(node('span', '', block.name || 'Blocked profile'));
        const button = actionButton('Unblock', 'unblock-contact'); button.dataset.contactId = block.id; row.append(button); list.append(row);
      });
    }

    function showConversation() {
      byId('home-view').hidden = true;
      byId('conversation-view').hidden = false;
      renderConversation();
    }

    function goHome() {
      state.goal = null;
      byId('conversation-view').hidden = true;
      byId('home-view').hidden = false;
      renderHome();
    }

    function renderConversation() {
      const goal = state.goal;
      if (!goal) return;
      const peer = goal.participants.find(profile => profile.id !== state.profile.id);
      byId('conversation-title').textContent = goal.title || labelFor(peer);
      byId('conversation-peer').textContent = peer ? labelFor(peer) : 'Invite not claimed';
      const status = byId('conversation-status'); status.textContent = statusLabels[goal.status] || goal.status; status.className = 'badge ' + goal.status;
      byId('share-button').classList.toggle('hidden', !goal.canInvite);
      byId('delete-everyone-button').classList.toggle('hidden', !goal.canDeleteEveryone);
      byId('private-tab').classList.toggle('active', state.tab === 'private');
      byId('shared-tab').classList.toggle('active', state.tab === 'shared');
      renderResult(goal);
      renderMessages(goal);
      renderDraft(goal);
      byId('composer-area').classList.toggle('hidden', ['resolved','closed'].includes(goal.status) || Boolean(goal.pendingDraft));
      const representative = goal.representativeMode !== false;
      const toggle = byId('representative-toggle'); toggle.textContent = representative ? 'Representative ON' : 'Representative OFF'; toggle.classList.toggle('off', !representative);
      const reply = byId('reply-button');
      reply.textContent = state.replySending ? 'Sending...' : representative ? 'Send' : 'Send direct';
      reply.disabled = state.replySending;
      byId('reply-input').disabled = state.replySending;
      toggle.disabled = state.replySending;
    }

    function renderResult(goal) {
      const result = goal.result || {};
      const panel = byId('result-panel');
      const meaningful = Boolean(result.requiresConfirmation || ['confirmed','resolved','closed'].includes(result.status) || (result.type && result.type !== 'progress' && goal.thread.length > 1));
      panel.classList.toggle('hidden', !meaningful);
      panel.classList.toggle('confirmed', ['confirmed','resolved','closed'].includes(result.status));
      const badge = byId('result-state');
      const stateLabels = { open:'Open', confirming:'Details to confirm', confirmed:'Confirmed', resolved:'Resolved', closed:'Closed' };
      badge.textContent = stateLabels[result.status] || 'Open';
      badge.className = 'badge ' + (goal.status || 'active');
      byId('result-summary').textContent = result.summary || 'No clear result yet.';
      const facts = byId('result-facts'); facts.replaceChildren();
      [['date','Date'],['time','Time'],['location','Location']].forEach(([key,label]) => { if (result[key]) facts.append(node('span', 'fact', label + ': ' + result[key])); });
      const actions = byId('result-actions'); actions.replaceChildren();
      if (['confirmed','resolved','closed'].includes(result.status)) {
        actions.append(actionButton('Continue conversation', 'continue-conversation', 'secondary'));
        return;
      }
      if (result.status === 'confirming' && result.requiresConfirmation && goal.participants.length === 2) {
        const confirmed = result.confirmations?.[state.profile.id] === result.version;
        const button = actionButton(confirmed ? 'Details confirmed' : 'Confirm details', 'confirm-result', confirmed ? 'secondary' : 'primary');
        button.disabled = confirmed; actions.append(button);
      }
      if (goal.thread.length) actions.append(actionButton('Mark resolved', 'mark-resolved', 'secondary'));
      actions.append(actionButton('Close', 'close-conversation', 'small-btn'));
    }

    function renderMessages(goal) {
      const list = byId('message-list'); list.replaceChildren();
      if (!goal.thread.length) list.append(node('div', 'empty', 'No approved messages have been shared yet.'));
      goal.thread.forEach(message => {
        const mine = message.from === state.profile.id;
        const item = node('article', 'message' + (mine ? ' mine' : ''));
        item.append(node('div', 'who', mine ? 'You' : labelFor(goal.participants.find(profile => profile.id === message.from))), node('div', '', message.text));
        if (mine && state.tab === 'private' && message.privateOriginal) item.append(node('div', 'message-original', 'You said: "' + message.privateOriginal + '"'));
        item.append(node('div', 'when', new Date(message.createdAt).toLocaleString()));
        if (mine) {
          const remove = actionButton('\\u00d7', 'delete-message', 'message-delete'); remove.dataset.messageId = message.id; remove.title = 'Delete message'; remove.setAttribute('aria-label', 'Delete message'); item.append(remove);
        }
        list.append(item);
      });
      list.scrollTop = list.scrollHeight;
    }

    function renderDraft(goal) {
      const card = byId('draft-card'); card.classList.toggle('hidden', !goal.pendingDraft);
      if (!goal.pendingDraft) { state.toneUpdating = false; state.toneNotice = ''; return; }
      byId('draft-text').textContent = goal.pendingDraft.draft;
      byId('draft-original').textContent = goal.pendingDraft.original ? 'You said: "' + goal.pendingDraft.original + '"' : '';
      const selectedTone = goal.pendingDraft.tone || goal.tone || 'professional';
      byId('tone-options').querySelectorAll('[data-tone]').forEach(button => {
        button.classList.toggle('active', button.dataset.tone === selectedTone);
        button.disabled = state.toneUpdating;
      });
      card.querySelectorAll('[data-action="approve-draft"],[data-action="reject-draft"]').forEach(button => { button.disabled = state.toneUpdating; });
      const toneLabel = selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1);
      byId('draft-status').textContent = state.toneUpdating ? 'Updating tone...' : state.toneNotice || toneLabel + ' tone selected';
      const facts = byId('draft-facts'); facts.replaceChildren();
      [['date','Date'],['time','Time'],['location','Location']].forEach(([key,label]) => { if (goal.pendingDraft.facts?.[key]) facts.append(node('span', 'fact', label + ': ' + goal.pendingDraft.facts[key])); });
    }

    async function copyText(value, success) {
      try { await navigator.clipboard.writeText(value); toast(success); }
      catch { window.prompt('Copy this value:', value); }
    }

    function openCreate(contactId = '') {
      byId('target-contact').value = contactId;
      byId('new-message').value = '';
      byId('create-dialog').showModal();
      setTimeout(() => byId('new-message').focus(), 50);
    }

    async function restoreProfile() {
      const recoveryCode = byId('restore-code').value.trim();
      try {
        await api('/api/profile/restore', { method:'POST', body:JSON.stringify({ recoveryCode }) });
        state.recovery = recoveryCode;
        localStorage.setItem('relayRecovery', recoveryCode);
        byId('restore-dialog').close();
        connect();
      } catch (error) { byId('restore-help').textContent = error.message; }
    }

    document.addEventListener('click', event => {
      const close = event.target.closest('[data-close]');
      if (close) return byId(close.dataset.close).close();
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'open-create') return openCreate();
      if (action === 'set-home-tab') { state.homeTab = target.dataset.tab; renderHome(); return; }
      if (action === 'toggle-manage') { state.managingThreads = !state.managingThreads; renderHome(); return; }
      if (action === 'message-contact') return openCreate(target.dataset.contactId);
      if (action === 'go-home') return goHome();
      if (action === 'open-profile') {
        localStorage.setItem('relayRecoveryAcknowledged', '1');
        byId('protect-banner').classList.add('hidden');
        renderProfile(); byId('profile-dialog').showModal(); return;
      }
      if (action === 'open-restore') { byId('profile-dialog').close(); byId('restore-dialog').showModal(); return; }
      if (action === 'copy-recovery') return copyText(state.recovery, 'Recovery code copied.');
      if (action === 'save-onboarding-name') {
        const name = byId('onboarding-name').value.trim();
        if (!name) return toast('Enter a display name.');
        state.nameSaving = true; renderNameBanner();
        if (!send({ type:'set-name', name })) { state.nameSaving = false; renderNameBanner(); }
        return;
      }
      if (action === 'save-name') return send({ type:'set-name', name:byId('display-name').value });
      if (action === 'new-profile') { localStorage.removeItem('aid'); state.recovery = ''; localStorage.removeItem('relayRecovery'); createProfile(true).catch(error => toast(error.message)); return; }
      if (action === 'restore-profile') return restoreProfile();
      if (action === 'create-goal') {
        const message = byId('new-message').value.trim(); if (!message) return toast('Write what you want to communicate first.');
        target.disabled = true;
        if (!send({ type:'create-goal', message, tone:'professional', targetId:byId('target-contact').value || null })) target.disabled = false;
        return;
      }
      if (action === 'open-thread') return send({ type:'open-goal', goalId:target.dataset.goalId });
      if (action === 'remove-thread') { if (confirm('Remove this conversation from your list?')) send({ type:'remove-conversation', goalId:target.dataset.goalId }); return; }
      if (action === 'remove-contact') return send({ type:'remove-contact', contactId:target.dataset.contactId });
      if (action === 'block-contact') { if (confirm('Block this profile? New direct conversations and invites will be rejected.')) send({ type:'block-contact', contactId:target.dataset.contactId }); return; }
      if (action === 'unblock-contact') return send({ type:'unblock-contact', contactId:target.dataset.contactId });
      if (!state.goal) return;
      if (action === 'set-tab') { state.tab = target.dataset.tab; renderConversation(); return; }
      if (action === 'draft-reply') {
        const text = byId('reply-input').value.trim(); if (!text || state.replySending) return;
        state.replySending = true; renderConversation();
        if (!send({ type:'draft-reply', goalId:state.goal.id, text })) { state.replySending = false; renderConversation(); }
        return;
      }
      if (action === 'toggle-representative') return send({ type:'toggle-representative', goalId:state.goal.id });
      if (action === 'set-draft-tone') {
        if (!state.goal.pendingDraft || target.dataset.tone === state.goal.pendingDraft.tone) return;
        state.toneUpdating = true; state.toneNotice = ''; renderDraft(state.goal);
        if (!send({ type:'redraft', goalId:state.goal.id, tone:target.dataset.tone })) { state.toneUpdating = false; renderDraft(state.goal); }
        return;
      }
      if (action === 'approve-draft') return send({ type:'approve-outbound', goalId:state.goal.id });
      if (action === 'reject-draft') return send({ type:'reject-outbound', goalId:state.goal.id });
      if (action === 'delete-message') { if (confirm('Delete this message for both participants?')) send({ type:'delete-message', goalId:state.goal.id, messageId:target.dataset.messageId }); return; }
      if (action === 'remove-conversation') { if (confirm('Remove this conversation from your list?')) send({ type:'remove-conversation', goalId:state.goal.id }); return; }
      if (action === 'delete-everyone') { if (confirm('Permanently delete this conversation for both participants?')) send({ type:'delete-conversation-everyone', goalId:state.goal.id }); return; }
      if (action === 'share-invite') return send({ type:'rotate-invite', goalId:state.goal.id });
      if (action === 'confirm-result') return send({ type:'confirm-result', goalId:state.goal.id, version:state.goal.result.version });
      if (action === 'mark-resolved') return send({ type:'mark-resolved', goalId:state.goal.id });
      if (action === 'close-conversation') { if (confirm('Close this conversation for both participants?')) send({ type:'close-conversation', goalId:state.goal.id }); return; }
      if (action === 'continue-conversation') return send({ type:'continue-conversation', goalId:state.goal.id });
    });

    byId('reply-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); document.querySelector('[data-action="draft-reply"]').click(); } });
    byId('new-message').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); byId('create-button').click(); } });
    byId('onboarding-name').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); byId('save-onboarding-name').click(); } });
    byId('profile-button').addEventListener('click', () => document.querySelector('[data-action="open-profile"]').click());
    start();
  })();
  </script>
</body>
</html>`;
