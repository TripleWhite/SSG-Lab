import type { Agent, Project, SourcingResult, Match, HeartbeatRun, Employee, DashboardStats } from "./types";

const API_URL = process.env.PAPERCLIP_API_URL || "http://localhost:3000";
const API_KEY = process.env.PAPERCLIP_API_KEY || "";
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || "";

async function fetchPaperclip<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Paperclip API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getAgents(): Promise<Agent[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/agents`);
}

export async function getProjects(): Promise<Project[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/issues?type=project`);
}

export async function getSourcingResults(): Promise<SourcingResult[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/issues?type=sourcing`);
}

export async function getMatches(): Promise<Match[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/issues?type=match`);
}

export async function getHeartbeatRuns(): Promise<HeartbeatRun[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/dashboard`);
}

export async function getEmployees(): Promise<Employee[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/agents?role=employee`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/dashboard`);
}
