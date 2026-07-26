# Relay extension privacy

Relay runs on HTTP and HTTPS pages so it can place a small control beside eligible writing fields. It excludes password, payment, identity, contact, address, search, and short factual fields.

Relay reads the active draft and focused nearby context only after the user opens Relay and chooses Improve, Create draft, or Suggest replies. Focused context can include text the user deliberately selected, the field label or placeholder, and a limited number of recent visible messages near the focused composer. Relay has focused context readers for Gmail, Outlook, WhatsApp Web, Slack, LinkedIn messages, Facebook posts and comments, Reddit threads, and Quora questions and discussions; it does not read conversations continuously. This content is sent to Relay's writing endpoint and an AI model to generate a preview. Relay does not automatically insert, send, or submit the result.

Quick-message content is not saved by Relay. The extension stores one random anonymous installation ID in the browser for rate limiting. It does not collect browsing history or continuously monitor pages for incoming messages.

Relay records message-free product events such as panel opened, goal selected, draft generated, inserted, copied, tone retried, and errors. These events can include a broad page category, selected goal, tone, extension version, result status, and a server-hashed anonymous installation ID. They never include message text, selected text, nearby context, domain, URL, page title, recipient, or account identity.

Public privacy page: https://relay.durgaai.com/privacy
Support: https://relay.durgaai.com/support

Users should avoid including secrets or highly sensitive information in any AI-assisted message.
