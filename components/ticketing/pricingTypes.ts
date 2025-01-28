// import { Day } from "date-fns";

export type Ticket = {
  cost: number;
  studentCost: number;
  isAvailable: boolean;
  priceId?: string;
  studentPriceId?: string;
};

export type DayTickets = {
  Prebook: Ticket;
  Advanced: Ticket;
};
export type IndividualTickets = {
  Feb: DayTickets;
};

export type PartialDayOption = { Prebook: boolean; }
export type PartialSelectedOptions = {
  Feb?: PartialDayOption;
};

export type Pass = {
  cost: number;
  studentCost: number;
  isAvailable: boolean;
  saving: number;
  studentSaving?: number;
  combination: string[];
  description?: string;
  included?: string[];
  priceId?: string
  studentPriceId?: string
};
export type Passes = { [key: string]: Pass };