export interface UrlResponse {
  success: boolean;
  error: string | undefined;
  challenge: Challenge | undefined;
}

export interface Challenge {
  vault: string[];
  targets: number[];
  hint: string;
  bookTitle: string;
}
