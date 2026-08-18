export type Batch =
  | "morning"
  | "lunch"
  | "afternoon"
  | "evening";

export type Track = {
  id: string;
  title: string;
  artist: string;
  film: string;
  year: number;
  duration: number;
  videoId: string;
  batch: Batch;
};

export const tracks: Track[] = [
  {
    id: "track-1",
    title: "Wo Purane Din",
    artist: "Piyush Mishra",
    film: "Piyush Mishra",
    year: 1990,
    duration: 0,
    videoId: "AVO3gVHW5l0",
    batch: "evening",
  },
  {
    id: "track-2",
    title: "Aryans - Dekha Hai Teri Aankhon Ko",
    artist: "Aryans",
    film: "Dekha Hai Teri Aankhon Ko",
    year: 1990,
    duration: 0,
    videoId: "C8WCeSEj_kE",
    batch: "morning",
  },
];