export interface Advertisement {
  channel: string;
  userId: number | undefined;
  dateAndTime: string;
  sheetId: string;
}

export interface PollAnswer {
  question: string;
  userId: number;
  userName?: string;
  options: string[];
  dateAndTime: string;
}
