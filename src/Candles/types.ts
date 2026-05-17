export type BirthdayEntry = {
  id: string;
  name: string;
  birthDate: string;
  relationship: string;
  favoriteCake: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CandlesSnapshot = {
  version: 1;
  birthdays: BirthdayEntry[];
};
