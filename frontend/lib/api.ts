export type ApiHealth = {
  app: string;
  status: string;
  database: string;
};

export function getServerApiUrl() {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
}

export async function getApiHealth(): Promise<ApiHealth | null> {
  try {
    const response = await fetch(`${getServerApiUrl()}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}