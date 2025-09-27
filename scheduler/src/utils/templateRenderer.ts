import Handlebars from 'handlebars';
import type { RenderTemplateInput } from '../../types/renderTemplateInput.js';
import type { RenderedTemplate } from '../../types/renderedTemplate.js';

export function renderTemplate(input: RenderTemplateInput): RenderedTemplate {
  const compile = (tpl?: string | null) => {
    if (!tpl) return null;
    return Handlebars.compile(tpl)(input.context);
  };

  return {
    subject: compile(input.subject ?? undefined),
    bodyText: compile(input.bodyText),
    bodyHtml: compile(input.bodyHtml ?? undefined),
  };
}