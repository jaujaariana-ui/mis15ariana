export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUniqueSlug(baseSlug: string, suffix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  const unique = `${timestamp}-${random}`;
  
  if (suffix) {
    return `${baseSlug}-${suffix}-${unique}`;
  }
  return `${baseSlug}-${unique}`;
}
