export type RenderTemplateInput = {
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  context: Record<string, any>;
};