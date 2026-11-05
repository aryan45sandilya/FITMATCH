import { config } from "../config.js";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * Console transport. FitMatch ships without a bundled email provider; plug a
 * transactional provider in here (Resend, Postmark, SES…) for production delivery.
 * Until then, links are logged on the server and — outside production only —
 * returned to the client so the flow can be completed locally.
 */
export const consoleMailer: Mailer = {
  async send(mail) {
    if (!config.isTest) console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
  },
};

export let mailer: Mailer = consoleMailer;
export function setMailer(m: Mailer) {
  mailer = m;
}

/** Only expose links in API responses when no real mail transport exists and we're not in production. */
export const exposeDevLinks = () => !config.isProd && mailer === consoleMailer;
