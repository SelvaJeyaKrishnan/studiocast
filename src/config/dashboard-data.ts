export interface RecordingItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: "Completed" | "Processing" | "Archived";
  participants: number;
}

export interface ProjectItem {
  id: string;
  name: string;
  lastModified: string;
  recordingsCount: number;
  description: string;
}

export const sampleRecordings: RecordingItem[] = [
  {
    id: "rec-1",
    title: "Episode 42: The Future of Remote Audio",
    date: "Nov 3, 2026",
    duration: "48m 12s",
    status: "Completed",
    participants: 3,
  },
  {
    id: "rec-2",
    title: "Founder Stories #12 - Scaling Studio Platforms",
    date: "Oct 28, 2026",
    duration: "34m 05s",
    status: "Completed",
    participants: 2,
  },
  {
    id: "rec-3",
    title: "Product Teardown with Sarah Jenkins",
    date: "Oct 19, 2026",
    duration: "1h 02m",
    status: "Completed",
    participants: 4,
  },
];

export const sampleProjects: ProjectItem[] = [
  {
    id: "proj-1",
    name: "Tech Unfiltered Podcast",
    lastModified: "2 hours ago",
    recordingsCount: 18,
    description: "Weekly conversations on software architecture and design.",
  },
  {
    id: "proj-2",
    name: "Founder Interviews Q4",
    lastModified: "Yesterday",
    recordingsCount: 6,
    description: "In-depth video interviews with seed-stage creators.",
  },
  {
    id: "proj-3",
    name: "Internal Product Syncs",
    lastModified: "3 days ago",
    recordingsCount: 9,
    description: "Team brainstorms and milestone recordings.",
  },
];
