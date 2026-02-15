export async function loadHtml(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load fragment: ${url}`);
  }

  return response.text();
}
