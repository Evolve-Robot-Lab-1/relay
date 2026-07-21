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
    .starter-list{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:360px;margin:0 auto 18px}
    .starter-chip{height:32px;border:1px solid #2a322e;background:transparent;color:#8d9891;border-radius:4px;padding:0 10px;font-size:12px;font-weight:500}
    .starter-chip:hover{border-color:#3d4a42;background:#121614;color:#c6cec8}
    .progress-strip{display:none}
    .status-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 2px}
    .status-row.hidden{display:none!important}
    .status-chip{border:1px solid #244766;background:#0d1620;color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:7px 10px;text-align:left;border-radius:4px;display:inline-flex;align-items:center;gap:6px}
    .status-chip.reached{color:var(--green);border-color:#176d48;background:#0d1a14}
    .status-chip.draft{color:var(--amber);border-color:#5a4a20;background:#1a160c}
    .status-chip .chev{font-size:10px;opacity:.85}
    .status-hint{color:#66716a;font-size:11px;margin:0 0 8px}
    .status-hint.hidden{display:none!important}
    .more-btn.hidden{display:none!important}
    .status-sub{color:var(--muted);font-size:12px;margin:0 0 8px}
    .progress-history{border:1px solid var(--line);background:var(--panel);border-radius:6px;padding:10px 12px;margin:0 0 10px;display:grid;gap:6px}
    .progress-history.hidden{display:none!important}
    .progress-history-row{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--muted)}
    .progress-history-row.done{color:var(--text)}
    .progress-history-row.current{color:var(--blue)}
    .more-wrap{position:relative;flex:0 0 auto}
    .more-btn{height:36px;min-width:36px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:4px;font-size:13px;font-weight:700;padding:0 10px;display:inline-flex;align-items:center;gap:4px}
    .more-btn:hover{border-color:#435047}
    .more-btn .dots{font-size:16px;line-height:1;letter-spacing:-1px}
    .more-menu{position:absolute;right:0;top:40px;min-width:220px;background:#121512;border:1px solid var(--line);border-radius:6px;padding:6px;z-index:12;box-shadow:0 12px 30px #000a}
    .more-menu.hidden{display:none!important}
    .more-item{width:100%;height:40px;border:0;background:transparent;color:var(--text);text-align:left;padding:0 10px;border-radius:4px;font-size:13px}
    .more-item:hover{background:#1a201c}
    .more-item.danger{color:var(--red)}
    .more-item.hidden{display:none!important}
    .privacy-note{color:var(--muted);font-size:12px;margin:8px 0 0;line-height:1.4}
    .feedback-panel{border:1px solid var(--line);background:var(--panel);border-radius:6px;padding:12px 14px;margin:14px 0}
    .feedback-panel strong{display:block;font-size:13px;margin-bottom:8px}
    .feedback-actions{display:flex;gap:8px;flex-wrap:wrap}
    .coming-next{margin-top:10px;font-size:11px;color:#66716a}
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
    #invite-name-dialog::backdrop{background:#0007;backdrop-filter:blur(1.5px)}
    .invite-stage{pointer-events:none;user-select:none}
    .invite-waiting{min-height:320px;display:grid;place-items:center;border-top:1px solid var(--line);margin-top:18px;text-align:center;color:var(--muted)}
    .invite-waiting strong{display:block;color:var(--text);font-size:16px;margin-bottom:5px}
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
    .back{height:40px;border:0;background:transparent;color:var(--muted);padding:0;font-weight:700;display:inline-flex;align-items:center;gap:6px}
    .back:hover{color:var(--text)}
    .convo-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 8px}
    .convo-head{border-bottom:1px solid var(--line);padding-bottom:12px}
    .convo-head h1{font-size:18px;margin:0;overflow-wrap:anywhere}
    .convo-goal{margin:4px 0 0;font-size:12px;line-height:1.4;color:var(--muted)}
    .convo-goal.hidden{display:none!important}
    .convo-goal-main,.convo-goal-meta{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .convo-goal-meta{color:#66716a;margin-top:1px}
    .convo-meta{display:none}
    .convo-actions{display:none}
    .small-icon-btn{width:30px;height:30px;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:4px;display:inline-grid;place-items:center}
    .small-icon-btn:hover{border-color:#435047;color:var(--text)}
    .preview-banner{min-height:44px;margin:14px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #176d48;border-bottom:1px solid #176d48;color:var(--green);font-size:12px;font-weight:700}
    .result-panel{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--amber);padding:13px 14px;margin:14px 0;border-radius:6px}
    .result-panel.confirmed{border-left-color:var(--green)}
    .result-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .result-panel h2{font-size:12px;text-transform:uppercase;margin:0;color:var(--muted)}
    .result-summary{font-size:14px;margin:9px 0 0;overflow-wrap:anywhere}
    .intent-rows{display:grid;gap:10px;margin-top:12px}
    .intent-row{display:grid;gap:2px}
    .intent-label{font-size:11px;color:var(--muted);font-weight:700}
    .intent-value{font-size:14px;overflow-wrap:anywhere}
    .result-panel.intent{border:0;border-left:2px solid #2a4a66;background:transparent;padding:2px 0 2px 10px;margin:6px 0 10px;border-radius:0}
    .result-panel.intent .result-head h2{font-size:10px;color:#7eb6e8}
    .result-panel.intent .intent-rows{display:grid;gap:2px;margin-top:2px}
    .result-panel.intent .intent-row{display:block;border:0;padding:0;border-radius:0}
    .result-panel.intent .intent-label{font-size:11px;color:var(--muted);font-weight:700;display:block;margin-bottom:2px}
    .result-panel.intent .intent-value{font-size:13px;color:var(--text);line-height:1.35}
    .result-panel.intent .intent-detail{font-size:11px;color:#66716a;margin-top:2px}
    .status-sub.hidden{display:none!important}
    .understanding-row{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin-top:8px}
    .understanding-mark{flex:0 0 auto;width:18px;text-align:center}
    .waiting-banner{display:none!important}
    .invite-cta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 12px}
    .invite-cta.hidden{display:none!important}
    .invite-cta .text-btn{color:var(--green);font-weight:700;font-size:13px;padding:0}
    .invite-cta .text-btn:hover{color:#12f08c}
    .invite-cta .muted{color:var(--muted);font-size:12px}
    .facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
    .fact{border:1px solid var(--line);border-radius:4px;padding:4px 7px;color:#c6cec8;font-size:11px}
    .result-actions{display:flex;gap:7px;margin-top:12px}
    .tone-heading{font-size:12px;font-weight:700;color:#cbd2cd;margin:14px 0 6px}
    .draft-section-label{font-size:11px;text-transform:uppercase;color:var(--green);margin:0 0 8px;font-weight:800}
    .messages{min-height:230px;max-height:52vh;overflow:auto;padding:8px 0 14px}
    .message{width:fit-content;max-width:min(82%,580px);margin:7px 0;padding:9px 34px 9px 10px;border:1px solid #aa3333;border-radius:6px;position:relative;overflow-wrap:anywhere;background:#1a0d0d}
    .message.mine{margin-left:auto;text-align:right;background:#0d2137;border-color:#0055aa}
    .message .who{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;margin-bottom:4px}
    .message.mine .who{color:#4488ff}.message:not(.mine) .who{color:#ff6644}
    .message-original{font-size:11px;color:#7b8780;margin-top:6px;border-top:1px solid #33404b;padding-top:6px}
    .private-label{color:#c6cec8;font-size:11px;font-style:normal;font-weight:700;text-transform:none;margin-bottom:1px;letter-spacing:0}
    .private-sub{color:#66716a;font-size:10px;margin-bottom:5px}
    .original-text{font-style:italic}
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
      <button id="home-fab" class="fab hidden" type="button" data-action="open-create" title="Start a new conversation" aria-label="Start a new conversation"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
    </section>

    <section id="invite-stage" class="view invite-stage" hidden aria-hidden="true">
      <div class="convo-head">
        <div><h1>Private conversation</h1><div class="convo-meta"><span class="badge waiting">Invite</span><span>Ready to join</span></div></div>
      </div>
      <div class="invite-waiting"><div><strong>A private message is waiting.</strong><span>Join to open it. Nothing is shared without approval.</span></div></div>
    </section>

    <section id="conversation-view" class="view" hidden>
      <div class="convo-nav">
        <button class="back" type="button" data-action="go-home"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>Back</button>
        <div class="more-wrap">
          <button id="more-button" class="more-btn" type="button" data-action="toggle-more-menu" title="More options" aria-label="More options" aria-haspopup="menu" aria-expanded="false"><span class="dots" aria-hidden="true">⋮</span> More</button>
          <div id="more-menu" class="more-menu hidden" role="menu">
            <button class="more-item" type="button" data-action="toggle-representative" data-more="representative">Relay ON</button>
            <button class="more-item" type="button" data-action="open-share" data-more="share">Share invite</button>
            <button class="more-item" type="button" data-action="copy-invite" data-more="copy">Copy invite link</button>
            <button class="more-item" type="button" data-action="toggle-shared-preview" data-more="preview">View shared conversation</button>
            <button class="more-item" type="button" data-action="mark-resolved" data-more="resolved">Mark as resolved</button>
            <button class="more-item" type="button" data-action="remove-conversation" data-more="remove">Remove from my list</button>
            <button class="more-item danger" type="button" data-action="delete-everyone" data-more="delete">Delete for everyone</button>
          </div>
        </div>
      </div>
      <div class="convo-head">
        <h1 id="conversation-title">Conversation</h1>
        <p id="conversation-goal" class="convo-goal hidden"><span class="convo-goal-main"></span><span class="convo-goal-meta"></span></p>
      </div>
      <div class="status-row">
        <button id="conversation-status" class="status-chip" type="button" data-action="toggle-progress-history" aria-expanded="false">WAITING FOR RESPONSE <span class="chev" aria-hidden="true">▾</span></button>
      </div>
      <div id="status-hint" class="status-hint">Tap status for progress</div>
      <div id="conversation-peer" class="status-sub"></div>
      <div id="progress-history" class="progress-history hidden" aria-label="Conversation progress"></div>
      <div id="invite-cta" class="invite-cta hidden">
        <span class="muted">Share the link to begin.</span>
        <button class="text-btn" type="button" data-action="open-share">Share invite</button>
      </div>
      <div id="shared-preview-banner" class="preview-banner hidden"><span>Viewing what the other person sees</span><button class="small-btn" type="button" data-action="toggle-shared-preview">Exit preview</button></div>
      <section id="intent-panel" class="result-panel intent hidden" aria-hidden="true">
        <div class="result-head"><h2 id="intent-panel-title">Your Goal</h2></div>
        <div id="intent-rows" class="intent-rows"></div>
      </section>
      <section id="draft-card" class="draft-card hidden">
        <h3 class="draft-section-label">Relay's message</h3>
        <div id="draft-text" class="draft-text"></div>
        <div id="draft-original" class="draft-original"></div>
        <div class="tone-heading">How should Relay represent you?</div>
        <div id="tone-options" class="tone-options"><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="professional">Professional</button><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="friendly">Friendly</button><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="direct">Direct</button><button class="tone-option" type="button" data-action="set-draft-tone" data-tone="casual">Casual</button></div>
        <div id="draft-status" class="draft-status"></div>
        <div class="draft-actions"><button id="approve-draft-button" class="primary" type="button" data-action="approve-draft">Approve and create invite</button><button class="secondary" type="button" data-action="reject-draft">Edit</button></div>
      </section>
      <section id="result-panel" class="result-panel">
        <div class="result-head"><h2 id="result-panel-title">Outcome</h2><span id="result-state" class="badge">Open</span></div>
        <p id="result-summary" class="result-summary">No clear result yet.</p>
        <div id="result-facts" class="facts"></div>
        <div id="understanding-rows" class="intent-rows"></div>
        <div id="result-actions" class="result-actions"></div>
      </section>
      <section id="feedback-panel" class="feedback-panel hidden">
        <strong>Did Relay help?</strong>
        <div class="feedback-actions">
          <button class="secondary" type="button" data-action="feedback" data-value="yes">Yes</button>
          <button class="secondary" type="button" data-action="feedback" data-value="partly">Partly</button>
          <button class="secondary" type="button" data-action="feedback" data-value="no">No</button>
        </div>
        <div class="coming-next">Coming next: Calendar · Meet · Reminder</div>
      </section>
      <div id="message-list" class="messages"></div>
      <div id="composer-area"><div class="composer"><textarea id="reply-input" rows="1" maxlength="4000" placeholder="Tell Relay what you want to say..."></textarea><button id="reply-button" class="primary" type="button" data-action="draft-reply">Send</button></div></div>
    </section>
  </main>

  <dialog id="share-dialog">
    <div class="dialog-head"><h2>Share invite</h2><button class="icon-btn" type="button" data-close="share-dialog" aria-label="Close">&times;</button></div>
    <div class="dialog-body">
      <p class="hint" style="margin:0">Send this link so the other person can join.</p>
    </div>
    <div class="dialog-actions"><button class="secondary" type="button" data-action="copy-invite">Copy invite link</button><button class="primary" type="button" data-action="share-invite">Share invite</button></div>
  </dialog>

  <dialog id="create-dialog">
    <div class="dialog-head"><h2>New conversation</h2><button class="icon-btn" type="button" data-close="create-dialog" aria-label="Close">&times;</button></div>
    <div class="dialog-body">
      <label for="target-contact">How will they join?</label><select id="target-contact"><option value="">Secure invite link</option></select>
      <label for="new-message">What do you want the other person to understand?</label><textarea id="new-message" maxlength="4000" placeholder="Example: arrange an online meeting tomorrow"></textarea>
      <p class="privacy-note">Only you can see this.</p>
    </div>
    <div class="dialog-actions"><button class="secondary" type="button" data-close="create-dialog">Cancel</button><button id="create-button" class="primary" type="button" data-action="create-goal">Continue</button></div>
  </dialog>

  <dialog id="invite-name-dialog" aria-labelledby="invite-name-title">
    <div class="dialog-head"><h2 id="invite-name-title">Join conversation</h2></div>
    <div class="dialog-body">
      <label for="invite-name">What should the other person call you?</label>
      <input id="invite-name" maxlength="48" placeholder="Your name" autocomplete="name">
      <p class="hint">This name is saved to your private Relay profile.</p>
    </div>
    <div class="dialog-actions"><button id="join-conversation-button" class="primary" type="button" data-action="save-invite-name">Join conversation</button></div>
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
    const pathInvite = /^\\/i\\/([A-Za-z0-9_-]{22})\\/?$/.exec(location.pathname)?.[1] || null;
    const pathGoal = /^\\/c\\/(G[0-9a-f]{32})\\/?$/i.exec(location.pathname)?.[1] || null;
    const state = { recovery: localStorage.getItem('relayRecovery') || '', profile: null, threads: [], contacts: [], blocks: [], goal: null, ws: null, reconnectTimer: null, invite: pathInvite || new URLSearchParams(location.search).get('invite'), openGoalId: pathGoal || sessionStorage.getItem('relayOpenGoal') || '', inviteClaiming: false, homeTab: 'conversations', previewShared: false, welcomed: false, toneUpdating: false, toneNotice: '', replySending: false, managingThreads: false, nameSaving: false, shareUrl: '', editDraftText: '', lastFailedAction: null, progressOpen: false, moreOpen: false };
    const byId = id => document.getElementById(id);
    const statusLabels = { draft:'Draft', waiting:'Waiting', active:'Active', confirming:'Confirming', resolved:'Goal reached', closed:'Closed', completed:'Closed', cancelled:'Closed' };
    const toneDescriptions = {
      professional: 'Clear, respectful and formal.',
      friendly: 'Warm and approachable.',
      direct: 'Short and to the point.',
      casual: 'Relaxed, everyday wording.'
    };
    const conversationStarters = [
      ['Ask for money back', 'ask them to repay the money they owe me'],
      ['Arrange a meeting', 'arrange an online meeting tomorrow'],
      ['Decline politely', 'decline their invitation politely'],
      ['Discuss a payment', 'discuss payment for the current bill']
    ];
    const labelFor = profile => profile ? profile.name || 'Other person' : 'Invite not claimed';

    function friendlyError(raw, action) {
      const text = String(raw || '');
      const lower = text.toLocaleLowerCase();
      if (/invite|expired|invalid|already claimed|unavailable|not found/.test(lower)) return 'Invite expired. Ask for a new link.';
      if (/offline|connecting|websocket|network|disconnect/.test(lower)) return 'Participant disconnected. Try again.';
      if (/rewrite|understand|draft|could not|unavailable/.test(lower) || action === 'create-goal' || action === 'redraft') return 'Relay could not understand the intent. Try again.';
      if (action === 'draft-reply' || /send|reply|message failed/.test(lower)) return 'Message failed to send. Try again.';
      return text || 'Something went wrong. Try again.';
    }

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
        toast('Still connecting. Try again.');
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
        if (state.invite) clearPendingInvite();
        if (message.type === 'invite-claimed') toast('Conversation joined.');
        showConversation();
        return;
      }
      if (message.type === 'goal-updated') {
        message.goal = normalizeGoal(message.goal);
        if (state.goal?.id === message.goal.id) {
          if (state.toneUpdating) {
            state.toneUpdating = false;
            const appliedTone = message.goal.pendingDraft?.tone || message.goal.tone || 'professional';
            state.toneNotice = toneDescriptions[appliedTone] || '';
          }
          state.goal = message.goal;
          renderConversation();
        }
        return;
      }
      if (message.type === 'invite-ready') {
        state.shareUrl = message.shareUrl || '';
        if (state.goal) renderConversation();
        return shareInvite(message.shareUrl);
      }
      if (message.type === 'invite-rotated') {
        state.shareUrl = message.shareUrl || '';
        return shareInvite(message.shareUrl);
      }
      if (message.type === 'reply-sent' && state.goal?.id === message.goalId) {
        state.replySending = false;
        byId('reply-input').value = '';
        renderConversation();
        return;
      }
      if (message.type === 'conversation-removed' || message.type === 'conversation-deleted' || message.type === 'conversations-cleared') {
        if (!message.goalId || state.goal?.id === message.goalId) {
          goHome();
          if (state.editDraftText) {
            const text = state.editDraftText;
            state.editDraftText = '';
            openCreate('', text);
          }
        }
        return;
      }
      if (message.type === 'error') {
        byId('create-button').disabled = false;
        state.toneUpdating = false;
        if (message.action === 'set-name') state.nameSaving = false;
        if (message.action === 'claim-invite') {
          clearPendingInvite();
          goHome();
        }
        if (message.action === 'open-goal') {
          state.openGoalId = '';
          sessionStorage.removeItem('relayOpenGoal');
          if (/^\\/c\\//.test(location.pathname)) history.replaceState(null, '', '/');
          goHome();
        }
        if (message.action === 'draft-reply') state.replySending = false;
        if (state.goal) renderConversation();
        renderNameBanner();
        renderInviteEntry();
        state.lastFailedAction = message.action || null;
        toast(friendlyError(message.message, message.action));
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
      if (savedName && state.profile?.name && !state.invite) toast('Name saved.');
      renderInviteEntry();
      claimPendingInvite();
      restoreOpenGoal();
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
      byId('home-fab').classList.toggle('hidden', state.homeTab !== 'conversations' || state.threads.length === 0);
      const useful = state.threads.some(thread => ['active','confirming','resolved','closed'].includes(thread.status));
      byId('protect-banner').classList.toggle('hidden', !useful || localStorage.getItem('relayRecoveryAcknowledged') === '1');
    }

    function renderNameBanner() {
      const banner = byId('name-banner');
      const needsName = Boolean(state.profile && !state.profile.name?.trim() && !state.invite);
      banner.classList.toggle('hidden', !needsName);
      byId('name-banner-title').textContent = 'Choose your display name';
      banner.querySelector('span').textContent = 'This is how people in your conversations will know you.';
      const button = byId('save-onboarding-name');
      button.disabled = state.nameSaving;
      button.textContent = state.nameSaving ? 'Saving...' : 'Save';
    }

    function renderInviteEntry() {
      const dialog = byId('invite-name-dialog');
      const home = byId('home-view');
      const stage = byId('invite-stage');
      if (!state.invite) {
        stage.hidden = true;
        if (dialog.open) dialog.close();
        return;
      }
      home.hidden = true;
      stage.hidden = false;
      stage.inert = true;
      byId('conversation-view').hidden = true;
      byId('name-banner').classList.add('hidden');
      const hasName = Boolean(state.profile?.name?.trim());
      const button = byId('join-conversation-button');
      button.disabled = state.nameSaving || hasName || state.inviteClaiming;
      button.textContent = hasName || state.inviteClaiming ? 'Joining...' : state.nameSaving ? 'Saving...' : 'Join conversation';
      if (!dialog.open) {
        dialog.showModal();
        setTimeout(() => byId('invite-name').focus(), 50);
      }
    }

    function clearPendingInvite() {
      state.invite = null;
      state.inviteClaiming = false;
      state.nameSaving = false;
      const dialog = byId('invite-name-dialog');
      if (dialog.open) dialog.close();
      byId('invite-stage').hidden = true;
      history.replaceState(null, '', '/');
    }

    function claimPendingInvite() {
      if (!state.invite || state.inviteClaiming || !state.profile?.name?.trim()) return;
      state.inviteClaiming = true;
      renderInviteEntry();
      if (!send({ type:'claim-invite', invite:state.invite })) state.inviteClaiming = false;
    }

    function renderThreads() {
      const list = byId('thread-list');
      list.replaceChildren();
      if (!state.threads.length) {
        const empty = node('div', 'empty-state');
        const content = node('div');
        content.append(node('strong', '', 'No conversations yet.'), node('p', '', 'Need help saying something? Start here.'));
        const starters = node('div', 'starter-list');
        conversationStarters.forEach(([label, text]) => {
          const chip = actionButton(label, 'use-starter', 'starter-chip');
          chip.dataset.starter = text;
          starters.append(chip);
        });
        content.append(starters);
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
      state.previewShared = false;
      if (state.goal?.id) {
        state.openGoalId = state.goal.id;
        sessionStorage.setItem('relayOpenGoal', state.goal.id);
        if (!state.invite) history.replaceState(null, '', '/c/' + state.goal.id);
      }
      byId('home-view').hidden = true;
      byId('conversation-view').hidden = false;
      renderConversation();
    }

    function goHome() {
      state.goal = null;
      state.openGoalId = '';
      state.previewShared = false;
      state.progressOpen = false;
      closeMenus();
      sessionStorage.removeItem('relayOpenGoal');
      if (!state.invite) history.replaceState(null, '', '/');
      byId('conversation-view').hidden = true;
      byId('home-view').hidden = false;
      renderHome();
    }

    function restoreOpenGoal() {
      if (state.invite || !state.openGoalId || state.goal?.id === state.openGoalId) return;
      const known = state.threads.some(thread => thread.goalId === state.openGoalId);
      if (!known) {
        state.openGoalId = '';
        sessionStorage.removeItem('relayOpenGoal');
        if (/^\\/c\\//.test(location.pathname)) history.replaceState(null, '', '/');
        return;
      }
      send({ type: 'open-goal', goalId: state.openGoalId });
    }

    function extractAmount(text) {
      const source = String(text || '');
      const currency = source.match(/(?:₹|rs\\.?\\s*|inr\\s*)\\s*\\d[\\d,]*(?:\\.\\d+)?k?\\b/i);
      if (currency) return currency[0].replace(/\\s+/g, ' ').trim();
      if (/\\b(?:lend|borrow|pay|paid|bill|rupees?|amount|money|cost|price|owe|₹|rs)\\b/i.test(source)) {
        const match = source.match(/\\b\\d[\\d,]*(?:\\.\\d+)?k?\\b/i);
        return match ? match[0] : '';
      }
      return '';
    }

    function extractDay(text) {
      const match = String(text || '').match(/\\b(?:today|tonight|tomorrow|tmrw|this\\s+weekend|next\\s+week|next\\s+month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b/i);
      if (!match) return '';
      const raw = match[0].toLocaleLowerCase();
      if (raw === 'tmrw' || raw === 'tomorrow') return 'Tomorrow';
      if (raw === 'today') return 'Today';
      if (raw === 'tonight') return 'Tonight';
      return match[0].replace(/\\s+/g, ' ').replace(/^\\w/, c => c.toUpperCase());
    }

    function extractClock(text) {
      const source = String(text || '');
      let hour = 0;
      let minute = '00';
      let meridiem = '';
      const dotted = source.match(/\\b(\\d{1,2})[:.](\\d{2})\\s*(am|pm)\\b/i);
      if (dotted) {
        hour = Number(dotted[1]);
        minute = dotted[2];
        meridiem = dotted[3].toUpperCase();
      } else {
        const plain = source.match(/\\b(\\d{1,2})\\s*(am|pm)\\b/i);
        if (plain) {
          hour = Number(plain[1]);
          meridiem = plain[2].toUpperCase();
        } else {
          const at = source.match(/\\bat\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\b/i);
          if (!at) return '';
          hour = Number(at[1]);
          if (at[2]) minute = at[2];
        }
      }
      if (hour > 23 || Number(minute) > 59) return '';
      if (!meridiem) {
        if (hour >= 1 && hour <= 11) meridiem = 'AM';
        else if (hour === 12) meridiem = 'PM';
        else if (hour > 12 && hour < 24) { hour -= 12; meridiem = 'PM'; }
        else meridiem = 'AM';
      } else if (hour < 1 || hour > 12) {
        return '';
      }
      return hour + ':' + minute + ' ' + meridiem;
    }

    function extractWhere(text) {
      const source = String(text || '');
      const labeled = source.match(/\\b(?:at|in)\\s+(?:the\\s+)?([A-Za-z][\\w'&\\-]*(?:\\s+[A-Za-z][\\w'&\\-]*){0,4})/i);
      if (labeled && !/^(?:the|a|an|my|our|your|his|her|their|this|that|tomorrow|today|tonight|\\d)\\b/i.test(labeled[1])) {
        return labeled[1].trim();
      }
      if (/\\b(?:location|place|venue|address|office)\\b/i.test(source)) return 'Mentioned';
      return '';
    }

    function intentSource(goal) {
      const first = (goal.thread || []).find(item => !item.deletedAt) || null;
      return {
        original: goal.pendingDraft?.original || first?.privateOriginal || '',
        draft: goal.pendingDraft?.draft || first?.text || ''
      };
    }

    function isMeetingIntent(source) {
      return /\\b(meet\\w*|meting|availab\\w*|availab[el]+|availality|free|schedule|slot)\\b/.test(source)
        || /\\b(tmrw|tomorrow|today|tonight)\\b/.test(source);
    }

    function summarizeGoal(original, draft) {
      const draftL = String(draft || '').toLocaleLowerCase();
      const originalL = String(original || '').toLocaleLowerCase();
      const source = draftL + ' ' + originalL;
      const day = extractDay(draft) || extractDay(original);
      const amount = extractAmount(draft) || extractAmount(original);
      const dayPhrase = day === 'Tomorrow' ? 'tomorrow' : day === 'Today' ? 'today' : day === 'Tonight' ? 'tonight' : day ? ('on ' + day) : '';
      const clock = extractClock(draft) || extractClock(original);

      if (/\\b(cancel|withdraw)\\b/.test(source)) return 'Cancel the outstanding request';
      if (/\\b(decline|reject|not accept)\\b/.test(source)) {
        if (/\\b(dinner|lunch|invite|invitation)\\b/.test(source)) return 'Decline the invitation politely';
        if (isMeetingIntent(source)) return dayPhrase ? ('Decline the meeting ' + dayPhrase) : 'Decline the meeting politely';
        return 'Decline the request politely';
      }
      if (/(not comfortable|rather not|prefer not|keep.{0,20}private)/.test(source)) return 'Communicate a personal boundary';

      // Meeting / availability first — even if the draft also says "invite".
      if (isMeetingIntent(source) && !/\\bworkshop\\b/.test(source)) {
        const online = /\\b(online|virtual|zoom|google meet|video call)\\b/.test(source);
        const arrange = /\\b(arrange|schedule|set up|setup)\\b/.test(source) || online;
        if (arrange) return online ? 'Request an online meeting' : 'Request a meeting';
        return 'Confirm availability for a meeting';
      }

      if (/\\b(invite|invitation|workshop|event|rsvp)\\b/.test(source)) {
        if (/\\b(decline|reject|not accept)\\b/.test(source)) return 'Decline the invitation politely';
        if (/\\bworkshop\\b/.test(source)) return 'Get a clear response to the workshop invitation';
        if (/\\bevent\\b/.test(source)) return 'Get a clear response to the event invitation';
        return 'Get a clear response to the invitation';
      }

      if (/\\b(lend|borrow|owe|bill|rupees?|money|amount|₹|rs|repay|pay\\s*back)\\b/.test(source) || amount) {
        if (/\\b(repay|pay\\s*back|owe)\\b/.test(source) && amount) return 'Ask for repayment of ' + amount;
        if (amount) return 'Ask for ' + amount;
        return 'Ask for a payment or loan';
      }

      if (/\\b(deliver|delivery|deadline|due date|project)\\b/.test(source)) {
        return dayPhrase ? ('Agree on a project delivery date ' + dayPhrase) : 'Agree on a project delivery date';
      }

      if (/\\b(confirm|confirmation)\\b/.test(source)) {
        return dayPhrase ? ('Confirm the plan ' + dayPhrase) : 'Confirm the plan with the other person';
      }

      // Prefer a short gist of Relay's draft over a generic fallback.
      const gist = String(draft || original || '').replace(/\\s+/g, ' ').trim().split(/[.!?]/)[0].trim();
      if (gist.length >= 12) return gist.length <= 78 ? gist : gist.slice(0, 75).trimEnd() + '...';
      return 'Get a clear answer from the other person';
    }

    function detailStatus(original, draft, threadText, goal) {
      const result = goal?.result || {};
      const thread = String(threadText || '');
      const threadL = thread.toLocaleLowerCase();
      const source = (original + ' ' + draft + ' ' + thread).toLocaleLowerCase();
      if (goal?.status === 'closed' || result.status === 'closed' || goal?.status === 'cancelled') return 'Closed';
      if (goal?.status === 'resolved' || ['confirmed', 'resolved'].includes(result.status)) {
        if (/\\b(not available|unavailable|can'?t make|cannot make|won'?t (?:be|work)|declin)/i.test(threadL)) return 'Declined';
        return 'Agreed';
      }
      if (/\\b(not available|unavailable|can'?t make|cannot make|won'?t (?:be|work)|declin|not free|busy)\\b/i.test(threadL)) return 'Declined';
      const day = extractDay(thread) || extractDay(draft) || extractDay(original);
      const clock = extractClock(thread) || extractClock(draft) || extractClock(original);
      const accepted = /\\b(works|yes|yep|yeah|ok|okay|sure|fine|perfect|sounds good|available|i'?m free)\\b/i.test(threadL);
      if ((day || clock) && accepted) return 'Agreed';
      if (day || clock) return 'Proposed';
      if (isMeetingIntent(source) || /\\b(invite|invitation|repay|pay|amount|₹)\\b/.test(source)) return 'Open';
      return 'Open';
    }

    function formatKeyDetails(original, draft, threadText, goal) {
      const day = extractDay(threadText) || extractDay(draft) || extractDay(original);
      const clock = extractClock(threadText) || extractClock(draft) || extractClock(original);
      const amount = extractAmount(threadText) || extractAmount(draft) || extractAmount(original);
      const where = extractWhere(threadText) || extractWhere(draft) || extractWhere(original);
      const parts = [];
      if (isMeetingIntent((original + ' ' + draft + ' ' + threadText).toLocaleLowerCase()) || day || clock) {
        parts.push('Date: ' + (day || 'Not specified'));
        parts.push('Time: ' + (clock || 'Not specified'));
      }
      if (amount) parts.push('Amount: ' + amount);
      const combined = original + ' ' + draft + ' ' + threadText;
      if (/\\brepay|pay\\s*back\\b/i.test(combined)) {
        const repay = (threadText + ' ' + draft + ' ' + original).match(/(?:repay|pay\\s*back)[^.!?]{0,40}/i);
        parts.push('Repayment: ' + (repay ? repay[0].trim() : 'Mentioned'));
      }
      if (where && !/^\\d/.test(where) && !/am|pm/i.test(where)) parts.push('Place: ' + where);
      parts.push('Status: ' + detailStatus(original, draft, threadText, goal));
      return parts.join(' · ');
    }

    function formatGoalMeta(original, draft, threadText, goal) {
      const day = extractDay(threadText) || extractDay(draft) || extractDay(original);
      const clock = extractClock(threadText) || extractClock(draft) || extractClock(original);
      const amount = extractAmount(threadText) || extractAmount(draft) || extractAmount(original);
      const where = extractWhere(threadText) || extractWhere(draft) || extractWhere(original);
      const source = (original + ' ' + draft + ' ' + threadText).toLocaleLowerCase();
      const status = detailStatus(original, draft, threadText, goal);
      const bits = [];
      if (isMeetingIntent(source) || day || clock) {
        bits.push('Date: ' + (day || 'Not specified'));
        if (clock) bits.push('Time: ' + clock);
        else bits.push('Time: Not specified');
      } else if (amount) {
        bits.push('Amount: ' + amount);
      } else if (where && !/^\\d/.test(where) && !/am|pm/i.test(where)) {
        bits.push('Place: ' + where);
      } else {
        bits.push('Date: Not specified');
      }
      bits.push('Status: ' + status);
      return bits.join(' · ');
    }

    function simplifyGoalLine(text) {
      const clean = String(text || '').replace(/\\s+/g, ' ').trim();
      if (clean.length <= 56) return clean;
      return clean.slice(0, 53).trimEnd() + '...';
    }

    function intentGoalStatus(goal) {
      if (goal.pendingDraft) return 'Not started';
      const result = goal.result || {};
      const hasPeer = (goal.participants || []).length >= 2;
      const threadText = (goal.thread || []).filter(item => !item.deletedAt).map(item => item.text).join(' ').toLocaleLowerCase();
      const { original, draft } = intentSource(goal);

      if (goal.status === 'closed' || result.status === 'closed' || goal.status === 'cancelled') return 'Closed';
      if (goal.status === 'resolved' || result.status === 'confirmed' || result.status === 'resolved') {
        if (/\\b(not available|unavailable|can'?t make|cannot make|won'?t (?:be|work)|declin)/i.test(threadText)) return 'Closed';
        return 'Solved';
      }
      if (result.status === 'confirming' || goal.status === 'confirming') return 'Needs your input';

      if (hasPeer && isMeetingIntent((original + ' ' + draft + ' ' + threadText).toLocaleLowerCase())) {
        const hasTime = Boolean(extractClock(draft) || extractClock(original) || extractClock(threadText));
        if (hasTime && /\\b(yes|yep|yeah|works|available|ok|okay|sure|fine|perfect)\\b/i.test(threadText)) return 'Needs your input';
        if (!hasTime && (goal.thread || []).filter(item => !item.deletedAt).length > 1) return 'Needs your input';
      }

      if (!hasPeer) return 'In progress';
      return 'In progress';
    }

    function extractIntentRows(goal) {
      const { original, draft } = intentSource(goal);
      const threadText = (goal.thread || []).filter(item => !item.deletedAt).map(item => item.text).join(' ');
      const reviewing = Boolean(goal.pendingDraft);
      const rows = [['Goal', summarizeGoal(original, draft)]];
      const details = formatKeyDetails(original, draft, threadText, goal);
      if (details) rows.push(['Key details', details]);
      rows.push(['Status', intentGoalStatus(goal)]);
      if (reviewing) {
        const tone = goal.pendingDraft.tone || goal.tone || 'professional';
        rows.push(['Tone', tone.charAt(0).toUpperCase() + tone.slice(1)]);
      }
      return rows;
    }

    function extractUnderstandingRows(goal) {
      const result = goal.result || {};
      const { original, draft } = intentSource(goal);
      const thread = (goal.thread || []).filter(item => !item.deletedAt);
      const threadText = thread.map(item => item.text).join(' ');
      const source = (original + ' ' + draft + ' ' + threadText).toLocaleLowerCase();
      const rows = [];
      const day = extractDay(threadText) || extractDay(draft) || extractDay(original);
      const clockInThread = extractClock(threadText);
      const clock = clockInThread || extractClock(draft) || extractClock(original);
      const amount = extractAmount(threadText + ' ' + (result.summary || ''));
      const reached = ['confirmed', 'resolved', 'closed'].includes(result.status) || ['resolved', 'closed'].includes(goal.status);
      const peerReplied = thread.length >= 2;
      const accepted = /\\b(yes|yep|yeah|works|available|ok|okay|sure|fine|perfect|sounds good)\\b/i.test(threadText);

      if (amount) {
        rows.push({
          mark: result.requiresConfirmation && !reached ? 'proposed' : (peerReplied || reached ? 'confirmed' : 'proposed'),
          label: 'Amount',
          value: amount
        });
      }

      if (isMeetingIntent(source) || day || clock || result.date || result.time) {
        const dateValue = day || result.date || 'Not confirmed';
        rows.push({
          mark: day || result.date ? 'confirmed' : 'open',
          label: 'Date',
          value: dateValue
        });
        const timeConfirmed = Boolean(clockInThread || (clock && peerReplied && accepted) || (result.time && reached));
        rows.push({
          mark: timeConfirmed ? 'confirmed' : (clock || result.time ? 'proposed' : 'open'),
          label: 'Time',
          value: clock || result.time || 'Not confirmed'
        });
      } else {
        [['date', 'Date'], ['time', 'Time'], ['location', 'Location']].forEach(([key, label]) => {
          if (result[key]) rows.push({ mark: reached ? 'confirmed' : 'proposed', label, value: result[key] });
        });
      }

      if (reached) rows.push({ mark: 'confirmed', label: 'Goal', value: 'Solved' });
      else if ((day || result.date) && (clockInThread || result.time) && peerReplied && accepted) {
        rows.push({ mark: 'proposed', label: 'Goal', value: 'Ready — mark resolved' });
      }

      if (!rows.length && result.summary) rows.push({ mark: 'proposed', label: 'Summary', value: result.summary });
      if (!rows.length) rows.push({ mark: 'open', label: 'Details', value: 'Not discussed yet' });
      return rows;
    }

    function understandingMark(kind) {
      if (kind === 'confirmed') return '✓';
      if (kind === 'proposed') return '🟡';
      if (kind === 'declined') return '✕';
      return '○';
    }

    function displayTitle(goal, reviewingFirstDraft, peer) {
      if (reviewingFirstDraft) return 'Review your conversation';
      const { original, draft } = intentSource(goal);
      const source = (original + ' ' + draft).replace(/Robotucs/gi, 'Robotics');
      const sourceL = source.toLocaleLowerCase();
      const day = extractDay(draft) || extractDay(original);
      if (/\\bworkshop\\b/i.test(sourceL)) {
        return /\\brobotics\\b/i.test(sourceL) ? 'Robotics workshop invitation' : 'Workshop invitation';
      }
      if (/\\b(invite|invitation|rsvp)\\b/i.test(sourceL)) {
        const topic = source.match(/\\b(?:to|for)\\s+(?:the\\s+)?([A-Za-z][A-Za-z0-9'&\\-]*(?:\\s+[A-Za-z][A-Za-z0-9'&\\-]*){0,3})/i);
        if (topic) {
          const label = topic[1].replace(/\\s+/g, ' ').trim().replace(/^\\w/, c => c.toUpperCase());
          if (!/invitation$/i.test(label)) return label + ' invitation';
          return label;
        }
        return 'Invitation';
      }
      if (isMeetingIntent(sourceL)) {
        if (day === 'Tomorrow') return 'Meeting tomorrow';
        if (day === 'Today') return 'Meeting today';
        if (day) return 'Meeting on ' + day;
        return 'Meeting request';
      }
      const base = (draft || original || goal.title || labelFor(peer) || 'Conversation')
        .replace(/Robotucs/gi, 'Robotics')
        .replace(/\\s+/g, ' ')
        .trim();
      if (base.length <= 42) return base;
      return base.slice(0, 39).trimEnd() + '...';
    }

    function conversationPhase(goal, reviewingFirstDraft, waitingForParticipant, hasPeer) {
      const closed = goal.status === 'closed' || goal.status === 'cancelled' || goal.result?.status === 'closed';
      const reached = ['resolved', 'completed'].includes(goal.status)
        || ['confirmed', 'resolved'].includes(goal.result?.status);
      const shared = !reviewingFirstDraft && goal.thread.length > 0;
      const inviteReady = waitingForParticipant || (shared && !hasPeer && !reached && !closed);
      if (reviewingFirstDraft) return { key: 'draft', label: 'DRAFT', detail: 'Not shared yet', className: 'draft' };
      if (closed) return { key: 'closed', label: 'CLOSED', detail: '', className: 'reached' };
      if (reached) return { key: 'reached', label: 'GOAL REACHED', detail: '', className: 'reached' };
      if (inviteReady) return { key: 'invite', label: 'INVITE READY', detail: 'Share the link to begin', className: '' };
      if (hasPeer) {
        const last = [...(goal.thread || [])].reverse().find(item => !item.deletedAt);
        const theyReplied = last && last.from !== state.profile.id;
        return {
          key: 'waiting',
          label: 'WAITING FOR RESPONSE',
          detail: theyReplied ? 'Other person has replied' : (labelFor(goal.participants.find(profile => profile.id !== state.profile.id)) || 'In conversation'),
          className: ''
        };
      }
      return { key: 'draft', label: 'DRAFT', detail: '', className: 'draft' };
    }

    function closeMenus() {
      state.moreOpen = false;
      const menu = byId('more-menu');
      const button = byId('more-button');
      if (menu) menu.classList.add('hidden');
      if (button) button.setAttribute('aria-expanded', 'false');
    }

    function renderConversation() {
      const goal = state.goal;
      if (!goal) return;
      const peer = goal.participants.find(profile => profile.id !== state.profile.id);
      const reviewingFirstDraft = Boolean(goal.pendingDraft && goal.thread.length === 0);
      const waitingForParticipant = !peer && !goal.pendingDraft && goal.thread.length > 0;
      const hasPeer = Boolean(peer);
      const phase = conversationPhase(goal, reviewingFirstDraft, waitingForParticipant, hasPeer);
      byId('conversation-title').textContent = displayTitle(goal, reviewingFirstDraft, peer);
      const showStatus = ['reached', 'closed'].includes(phase.key);
      if (!showStatus) state.progressOpen = false;
      const statusRow = byId('conversation-status')?.closest('.status-row');
      if (statusRow) statusRow.classList.toggle('hidden', !showStatus);
      const status = byId('conversation-status');
      status.replaceChildren();
      status.append(document.createTextNode(phase.label + ' '), node('span', 'chev', state.progressOpen ? '▴' : '▾'));
      status.className = 'status-chip' + (phase.className ? ' ' + phase.className : '');
      status.setAttribute('aria-expanded', String(state.progressOpen));
      const waitingBanner = byId('waiting-banner');
      if (waitingBanner) waitingBanner.classList.add('hidden');
      const showInviteCta = phase.key === 'invite' && !state.previewShared;
      const inviteCta = byId('invite-cta');
      if (inviteCta) inviteCta.classList.toggle('hidden', !showInviteCta);
      const hint = byId('status-hint');
      if (hint) {
        hint.textContent = state.progressOpen ? 'Tap status to hide progress' : 'Tap status for progress';
        hint.classList.toggle('hidden', !showStatus || reviewingFirstDraft || showInviteCta || state.progressOpen);
      }
      const peerLine = byId('conversation-peer');
      peerLine.textContent = showInviteCta || !showStatus ? '' : phase.detail;
      peerLine.classList.toggle('hidden', !showStatus || showInviteCta || !phase.detail || state.previewShared);
      const canPreview = goal.thread.some(message => message.from === state.profile.id && Boolean(message.privateOriginal));
      if (!canPreview) state.previewShared = false;
      byId('shared-preview-banner').classList.toggle('hidden', !state.previewShared);
      byId('more-button').classList.toggle('hidden', reviewingFirstDraft && !canPreview);
      const reached = phase.key === 'reached' || phase.key === 'closed';
      const showResolve = hasPeer && goal.thread.length > 0 && !goal.pendingDraft && !reached && !state.previewShared && !reviewingFirstDraft;
      const representative = goal.representativeMode !== false;
      byId('more-menu').querySelectorAll('[data-more]').forEach(item => {
        const kind = item.dataset.more;
        let show = true;
        if (kind === 'preview') show = canPreview;
        if (kind === 'resolved') show = showResolve;
        if (kind === 'delete') show = Boolean(goal.canDeleteEveryone);
        if (kind === 'remove') show = !reviewingFirstDraft;
        if (kind === 'representative') show = !reviewingFirstDraft && !goal.pendingDraft;
        if (kind === 'share' || kind === 'copy') show = phase.key === 'invite' || Boolean(goal.canInvite);
        item.classList.toggle('hidden', !show);
        if (kind === 'preview') item.textContent = state.previewShared ? 'Exit shared view' : 'View shared conversation';
        if (kind === 'representative') item.textContent = representative ? 'Relay ON' : 'Relay OFF';
      });
      if (!state.moreOpen) byId('more-menu').classList.add('hidden');
      renderProgress(goal, reviewingFirstDraft, waitingForParticipant, hasPeer, phase);
      renderIntent(goal, reviewingFirstDraft, hasPeer);
      renderResult(goal, reviewingFirstDraft, hasPeer);
      renderFeedback(goal);
      renderMessages(goal);
      byId('message-list').classList.toggle('hidden', reviewingFirstDraft);
      renderDraft(goal);
      const inviteWaiting = phase.key === 'invite' || (waitingForParticipant && !hasPeer);
      byId('composer-area').classList.toggle('hidden', state.previewShared || ['resolved','closed'].includes(goal.status) || Boolean(goal.pendingDraft) || inviteWaiting);
      const reply = byId('reply-button');
      reply.textContent = state.replySending ? 'Sending...' : 'Send';
      reply.disabled = state.replySending;
      byId('reply-input').disabled = state.replySending;
      byId('reply-input').placeholder = 'Tell Relay what you want to say...';
    }

    function renderIntent(goal, reviewingFirstDraft, hasPeer) {
      const panel = byId('intent-panel');
      const rows = byId('intent-rows');
      const topic = byId('conversation-goal');
      const main = topic.querySelector('.convo-goal-main');
      const meta = topic.querySelector('.convo-goal-meta');
      rows.replaceChildren();
      panel.classList.add('hidden');
      const isOwner = goal.creatorId === state.profile.id;
      const hideTopic = !isOwner || state.previewShared
        || (goal.pendingDraft && goal.thread.length === 0 && !reviewingFirstDraft)
        || !(reviewingFirstDraft || goal.thread.length > 0);
      if (hideTopic) {
        topic.classList.add('hidden');
        if (main) main.textContent = '';
        if (meta) meta.textContent = '';
        topic.removeAttribute('title');
        return;
      }
      const { original, draft } = intentSource(goal);
      const threadText = (goal.thread || []).filter(item => !item.deletedAt).map(item => item.text).join(' ');
      const goalText = simplifyGoalLine(summarizeGoal(original, draft));
      const metaText = formatGoalMeta(original, draft, threadText, goal);
      if (main) main.textContent = 'Goal: ' + goalText;
      if (meta) meta.textContent = metaText;
      topic.title = 'Goal: ' + goalText + '\\n' + metaText;
      topic.classList.remove('hidden');
    }

    function renderProgress(goal, reviewingFirstDraft, waitingForParticipant, hasPeer, phase) {
      const history = byId('progress-history');
      history.replaceChildren();
      if (!goal || reviewingFirstDraft) {
        state.progressOpen = false;
        history.classList.add('hidden');
        return;
      }
      const closed = phase.key === 'closed';
      const reached = phase.key === 'reached' || closed;
      const inviteReady = phase.key === 'invite' || hasPeer || reached;
      const participantJoined = hasPeer || reached;
      const waitingResponse = phase.key === 'waiting' || (hasPeer && !reached) || reached;
      const rows = [
        ['draft', 'Draft created', true],
        ['invite', 'Invite ready', inviteReady],
        ['participant', 'Waiting for participant', participantJoined],
        ['waiting', 'Waiting for response', waitingResponse && participantJoined],
        ['reached', closed ? 'Closed' : 'Goal reached', reached]
      ];
      let current = 'draft';
      if (closed || phase.key === 'reached') current = 'reached';
      else if (phase.key === 'waiting') current = 'waiting';
      else if (phase.key === 'invite') current = 'invite';
      else if (hasPeer) current = 'waiting';
      rows.forEach(([key, label, done]) => {
        const mark = reached && key !== 'reached' ? '✓' : done && key !== current ? '✓' : current === key ? '●' : '○';
        const row = node('div', 'progress-history-row' + (done && key !== current ? ' done' : '') + (current === key ? ' current' : ''));
        row.append(node('span', '', mark), node('span', '', label));
        history.append(row);
      });
      history.classList.toggle('hidden', !state.progressOpen);
    }

    function renderFeedback(goal) {
      const panel = byId('feedback-panel');
      const done = ['resolved', 'closed', 'completed'].includes(goal.status)
        || ['confirmed', 'resolved', 'closed'].includes(goal.result?.status);
      const key = 'relayFeedback:' + goal.id;
      const already = localStorage.getItem(key);
      panel.classList.toggle('hidden', !done || Boolean(already) || state.previewShared);
    }

    function renderResult(goal, reviewingFirstDraft, hasPeer) {
      const result = goal.result || {};
      const panel = byId('result-panel');
      if (reviewingFirstDraft) {
        panel.classList.add('hidden');
        return;
      }
      const reached = ['confirmed','resolved','closed'].includes(result.status) || ['resolved','closed'].includes(goal.status);
      const confirming = result.status === 'confirming' && result.requiresConfirmation && goal.participants.length === 2;
      // Hide during normal chat — Your Intent already tracks the goal. Show only for outcome/confirm.
      const show = reached || confirming;
      panel.classList.toggle('hidden', !show);
      if (!show) return;
      panel.classList.toggle('confirmed', reached);
      byId('result-panel-title').textContent = reached ? 'Outcome' : 'Confirm details';
      const badge = byId('result-state');
      badge.textContent = reached ? 'Goal reached' : 'Confirming';
      badge.className = 'badge ' + (goal.status || 'active');
      byId('result-summary').textContent = result.summary || (reached ? 'The conversation reached a clear outcome.' : 'Confirm these details with the other person.');
      const facts = byId('result-facts'); facts.replaceChildren();
      const understanding = byId('understanding-rows'); understanding.replaceChildren();
      extractUnderstandingRows(goal).forEach(item => {
        const row = node('div', 'understanding-row');
        row.append(node('span', 'understanding-mark', understandingMark(item.mark)), node('span', '', item.label + ': ' + item.value));
        understanding.append(row);
      });
      const actions = byId('result-actions'); actions.replaceChildren(); actions.classList.toggle('hidden', state.previewShared);
      if (reached) {
        actions.append(actionButton('Continue conversation', 'continue-conversation', 'secondary'));
        return;
      }
      if (confirming) {
        const confirmed = result.confirmations?.[state.profile.id] === result.version;
        const button = actionButton(confirmed ? 'Details confirmed' : 'Confirm details', 'confirm-result', confirmed ? 'secondary' : 'primary');
        button.disabled = confirmed; actions.append(button);
      }
    }

    function renderMessages(goal) {
      const list = byId('message-list'); list.replaceChildren();
      if (!goal.thread.length) list.append(node('div', 'empty', 'No messages shared yet.'));
      const visible = goal.thread.filter(message => !message.deletedAt);
      const hasPeer = (goal.participants || []).length >= 2;
      const latestMineId = [...visible].reverse().find(message => message.from === state.profile.id)?.id;
      const openingId = visible[0]?.id;
      visible.forEach(message => {
        const mine = message.from === state.profile.id;
        const item = node('article', 'message' + (mine ? ' mine' : ''));
        let who = labelFor(goal.participants.find(profile => profile.id === message.from));
        if (mine) {
          if (!hasPeer && message.id === openingId) who = 'Approved message';
          else who = 'Sent by Relay';
        }
        item.append(node('div', 'who', who), node('div', '', message.text));
        if (mine && !hasPeer && message.id === openingId && !state.previewShared) {
          const original = node('div', 'message-original');
          original.append(node('div', 'original-text', 'Not shared yet'));
          item.append(original);
        } else if (mine && !state.previewShared && message.privateOriginal && message.id === latestMineId) {
          const original = node('div', 'message-original');
          original.append(node('div', 'original-text', 'Only you can see this: "' + message.privateOriginal + '"'));
          item.append(original);
        }
        item.append(node('div', 'when', new Date(message.createdAt).toLocaleString()));
        if (mine && !state.previewShared) {
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
      byId('approve-draft-button').textContent = goal.creatorId === state.profile.id && goal.participants.length === 1 ? 'Approve and create invite' : 'Approve and send';
      byId('tone-options').querySelectorAll('[data-tone]').forEach(button => {
        button.classList.toggle('active', button.dataset.tone === selectedTone);
        button.disabled = state.toneUpdating;
      });
      card.querySelectorAll('[data-action="approve-draft"],[data-action="reject-draft"]').forEach(button => { button.disabled = state.toneUpdating; });
      byId('draft-status').textContent = state.toneUpdating
        ? 'Updating representation...'
        : (state.toneNotice || toneDescriptions[selectedTone] || '');
    }

    async function copyText(value, success) {
      try { await navigator.clipboard.writeText(value); toast(success); }
      catch { window.prompt('Copy this value:', value); }
    }

    async function shareInvite(value) {
      const text = 'Your response is needed. Join our private Relay conversation.';
      if (navigator.share) {
        try {
          await navigator.share({ title:'Response requested', text, url:value });
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
        }
      }
      return copyText(value, 'Invite link copied.');
    }

    function openCreate(contactId = '', message = '') {
      byId('target-contact').value = contactId;
      byId('new-message').value = message || '';
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
      if (action === 'use-starter') {
        openCreate('', target.dataset.starter || '');
        return;
      }
      if (action === 'feedback') {
        if (!state.goal) return;
        localStorage.setItem('relayFeedback:' + state.goal.id, target.dataset.value || 'yes');
        byId('feedback-panel').classList.add('hidden');
        toast('Thanks for the feedback.');
        return;
      }
      if (action === 'set-home-tab') { state.homeTab = target.dataset.tab; renderHome(); return; }
      if (action === 'toggle-manage') { state.managingThreads = !state.managingThreads; renderHome(); return; }
      if (action === 'message-contact') return openCreate(target.dataset.contactId);
      if (action === 'go-home') { closeMenus(); state.progressOpen = false; return goHome(); }
      if (action === 'toggle-more-menu') {
        state.moreOpen = !state.moreOpen;
        byId('more-menu').classList.toggle('hidden', !state.moreOpen);
        byId('more-button').setAttribute('aria-expanded', String(state.moreOpen));
        return;
      }
      if (action === 'toggle-progress-history') {
        state.progressOpen = !state.progressOpen;
        if (state.goal) renderConversation();
        return;
      }
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
      if (action === 'save-invite-name') {
        const name = byId('invite-name').value.trim();
        if (!name) return toast('Enter your name to join.');
        state.nameSaving = true; renderInviteEntry();
        if (!send({ type:'set-name', name })) { state.nameSaving = false; renderInviteEntry(); }
        return;
      }
      if (action === 'save-name') return send({ type:'set-name', name:byId('display-name').value });
      if (action === 'new-profile') { localStorage.removeItem('aid'); state.recovery = ''; localStorage.removeItem('relayRecovery'); createProfile(true).catch(error => toast(error.message)); return; }
      if (action === 'restore-profile') return restoreProfile();
      if (action === 'create-goal') {
        const message = byId('new-message').value.trim(); if (!message) return toast('Write what you want the other person to understand.');
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
      if (action === 'toggle-shared-preview') { closeMenus(); state.previewShared = !state.previewShared; renderConversation(); return; }
      if (action === 'mark-resolved') { closeMenus(); return send({ type:'mark-resolved', goalId:state.goal.id }); }
      if (action === 'close-conversation') { closeMenus(); if (confirm('Close this conversation for both participants?')) send({ type:'close-conversation', goalId:state.goal.id }); return; }
      if (action === 'remove-conversation') { closeMenus(); if (confirm('Remove this conversation from your list?')) send({ type:'remove-conversation', goalId:state.goal.id }); return; }
      if (action === 'delete-everyone') { closeMenus(); if (confirm('Permanently delete this conversation for both participants?')) send({ type:'delete-conversation-everyone', goalId:state.goal.id }); return; }
      if (action === 'draft-reply') {
        const text = byId('reply-input').value.trim(); if (!text || state.replySending) return;
        state.replySending = true; renderConversation();
        if (!send({ type:'draft-reply', goalId:state.goal.id, text })) { state.replySending = false; renderConversation(); }
        return;
      }
      if (action === 'toggle-representative') { closeMenus(); return send({ type:'toggle-representative', goalId:state.goal.id }); }
      if (action === 'set-draft-tone') {
        if (!state.goal.pendingDraft || target.dataset.tone === state.goal.pendingDraft.tone) return;
        state.toneUpdating = true; state.toneNotice = ''; renderDraft(state.goal);
        if (!send({ type:'redraft', goalId:state.goal.id, tone:target.dataset.tone })) { state.toneUpdating = false; renderDraft(state.goal); }
        return;
      }
      if (action === 'approve-draft') return send({ type:'approve-outbound', goalId:state.goal.id });
      if (action === 'reject-draft') {
        const original = state.goal?.pendingDraft?.original || '';
        const opening = Boolean(state.goal && state.goal.thread.length === 0 && state.goal.creatorId === state.profile.id);
        if (opening && original) state.editDraftText = original;
        return send({ type:'reject-outbound', goalId:state.goal.id });
      }
      if (action === 'delete-message') { if (confirm('Delete this message for both participants?')) send({ type:'delete-message', goalId:state.goal.id, messageId:target.dataset.messageId }); return; }
      if (action === 'open-share') {
        closeMenus();
        const dialog = byId('share-dialog');
        if (dialog && !dialog.open) dialog.showModal();
        return;
      }
      if (action === 'copy-invite') {
        closeMenus();
        if (state.shareUrl) return copyText(state.shareUrl, 'Invite link copied.');
        return send({ type:'rotate-invite', goalId:state.goal.id });
      }
      if (action === 'share-invite') {
        closeMenus();
        const dialog = byId('share-dialog');
        if (dialog?.open) dialog.close();
        if (state.shareUrl) return shareInvite(state.shareUrl);
        return send({ type:'rotate-invite', goalId:state.goal.id });
      }
      if (action === 'confirm-result') return send({ type:'confirm-result', goalId:state.goal.id, version:state.goal.result.version });
      if (action === 'continue-conversation') return send({ type:'continue-conversation', goalId:state.goal.id });
    });

    document.addEventListener('click', event => {
      if (!state.moreOpen) return;
      const wrap = event.target.closest?.('.more-wrap');
      if (!wrap) closeMenus();
    });

    byId('reply-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); document.querySelector('[data-action="draft-reply"]').click(); } });
    byId('new-message').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); byId('create-button').click(); } });
    byId('onboarding-name').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); byId('save-onboarding-name').click(); } });
    byId('invite-name').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); byId('join-conversation-button').click(); } });
    byId('invite-name-dialog').addEventListener('cancel', event => event.preventDefault());
    byId('profile-button').addEventListener('click', () => document.querySelector('[data-action="open-profile"]').click());
    start();
  })();
  </script>
</body>
</html>`;
