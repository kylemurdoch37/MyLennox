export enum UserTier {
  CITIZEN = 1,
  PR = 2,
  WORKER = 3,
  TOURIST = 4,
}

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string;
  dob?: string;
  tier: UserTier;
  workplace?: string;
  nearestHub?: string;
  commuteType?: string[];
  workStartDate?: string; // ISO date for PR eligibility
  lennoxPassId?: string;
  placeOfBirth?: string;
  occupation?: string;
  lhdbUnit?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  uid: string;
  accountNumber: string;
  sortCode: string;
  balance: number;
  currency: 'L$' | 'GBP';
  type: 'current' | 'savings';
  createdAt: string;
  status?: 'active' | 'pending';
}

export interface BankTransaction {
  id: string;
  accountId: string;
  uid: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  category: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface HousingApplication {
  id: string;
  uid: string;
  status: 'pending' | 'approved' | 'denied';
  propertyType: string;
  preferredHub: string;
  submissionDate: string;
}

export interface PRApplication {
  id: string;
  uid: string;
  status: 'pending' | 'review' | 'approved' | 'denied';
  yearsOfWork: number;
  employerReference: string;
  submissionDate: string;
}

export interface Vehicle {
  id: string;
  uid: string;
  plate: string;
  make?: string;
  model?: string;
  color?: string;
  registeredCountry?: string;
  autoPayEnabled: boolean;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  uid: string;
  vehicleId?: string;
  amount: number;
  type: 'congestion' | 'road-tax' | 'metro' | 'fine';
  status: 'paid' | 'unpaid' | 'pcn';
  timestamp: string;
  entryTime?: string;
}

export interface Hub {
  id: string;
  name: string;
  location: string;
  description?: string;
  shops?: any[];
  restaurants?: any[];
  events?: any[];
}
