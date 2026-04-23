export function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

export function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  for (const m of matches) vars.add(m[1]);
  return Array.from(vars);
}

export function buildVariablesFromCard(
  cardFields: Record<string, string>,
  fieldMapping: Record<string, string>,
  extra?: Record<string, string>,
): Record<string, string> {
  const vars: Record<string, string> = {};

  // fieldMapping: { "nome": "field_abc", "telefone": "field_xyz", ... }
  for (const [varName, fieldId] of Object.entries(fieldMapping)) {
    vars[varName] = cardFields[fieldId] ?? '';
  }

  if (extra) {
    Object.assign(vars, extra);
  }

  return vars;
}
