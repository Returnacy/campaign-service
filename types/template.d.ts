import { Channel } from "./channel.js";

export type Template = {
  id: string;
  channel: Channel;
  subject: string | null;
  bodyText: string;
  bodyHtml: string | null;
  createdAt: Date;
  updatedAt: Date;
}