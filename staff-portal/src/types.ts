// ---------------------------------------------------------------------------
// Staff / Auth
// ---------------------------------------------------------------------------

export type Agency = 'lhdb' | 'marine' | 'metro' | 'lhs' | 'admin';
export type StaffRole = 'staff' | 'manager' | 'admin';

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  agency: Agency;
  role: StaffRole;
  department: string;
  lastLogin?: string;
}

// ---------------------------------------------------------------------------
// LHDB — Housing
// ---------------------------------------------------------------------------

export type HousingApplicationStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'viewing_scheduled';
export type HousingStockStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';

export interface HousingApplication {
  id: string;
  uid: string;                // citizen's MyLennox UID
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  bedrooms: 1 | 2 | 3 | 4;
  preferredArea: string;
  monthlyIncome: number;      // used for affordability indexing
  householdSize: number;
  currentSituation: string;
  notes?: string;
  status: HousingApplicationStatus;
  assignedUnitId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HousingUnit {
  id: string;
  blockName: string;
  floor: number;
  unitNumber: string;
  bedrooms: 1 | 2 | 3 | 4;
  bathrooms: number;
  sqm: number;
  area: string;
  status: HousingStockStatus;
  baseRent: number;           // full market rent in L$
  currentTenantId?: string;
  lastVacatedAt?: string;
  createdAt: string;
}

export interface ViewingSchedule {
  id: string;
  applicationId: string;
  unitId: string;
  staffId: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Marine
// ---------------------------------------------------------------------------

export type VesselStatus = 'active' | 'docked' | 'maintenance' | 'decommissioned';

export interface MarineVessel {
  id: string;
  name: string;
  registration: string;
  type: 'patrol' | 'ferry' | 'cargo' | 'research' | 'maintenance';
  status: VesselStatus;
  currentPort: string;
  nextPort?: string;
  nextDeparture?: string;
  captain: string;
  crewCount: number;
  lastInspection?: string;
  notes?: string;
}

export interface MarineLicense {
  id: string;
  applicantName: string;
  applicantId: string;      // citizen UID
  licenseType: 'recreational' | 'commercial' | 'professional' | 'fishing';
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  vessel?: string;
  notes?: string;
}

export interface MarineSchedule {
  id: string;
  vesselId: string;
  vesselName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  cargoType?: string;
  passengerCount?: number;
  status: 'scheduled' | 'departed' | 'arrived' | 'delayed' | 'cancelled';
}

// ---------------------------------------------------------------------------
// Metro
// ---------------------------------------------------------------------------

export type VehicleStatus = 'operational' | 'in_service' | 'depot' | 'maintenance' | 'retired';

export interface MetroVehicle {
  id: string;
  vehicleId: string;
  type: 'carriage' | 'bus' | 'ferry_shuttle';
  line: string;
  status: VehicleStatus;
  capacity: number;
  lastMaintenance: string;
  nextMaintenance: string;
  mileage: number;
  notes?: string;
}

export interface MetroRoute {
  id: string;
  routeId: string;
  name: string;
  stops: string[];
  frequency: number;        // minutes between services
  status: 'active' | 'suspended' | 'diverted' | 'reduced';
  divertedVia?: string;
  activeVehicles: number;
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'deferred';

export interface MaintenanceRequest {
  id: string;
  vehicleId: string;
  vehicleName: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo?: string;
  reportedAt: string;
  resolvedAt?: string;
  estimatedHours?: number;
}

// ---------------------------------------------------------------------------
// LHS — Health
// ---------------------------------------------------------------------------

export type ResourceType = 'bed' | 'icu_bed' | 'ventilator' | 'staff' | 'supply';

export interface HealthResource {
  id: string;
  facilityName: string;
  resourceType: ResourceType;
  label: string;
  available: number;
  total: number;
  unit: string;
  updatedAt: string;
  alertThreshold?: number;   // alert when available falls below this
}

export type BulletinSeverity = 'info' | 'advisory' | 'warning' | 'critical';

export interface HealthBulletin {
  id: string;
  title: string;
  content: string;
  severity: BulletinSeverity;
  agencies: Agency[];         // which agencies should see this
  publishedBy: string;
  publishedAt: string;
  expiresAt?: string;
  pinned: boolean;
}
