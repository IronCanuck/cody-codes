import { createContext, useContext } from 'react';
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  Vehicle,
  VehicleHistorySettings,
  VehicleHistorySnapshot,
  VehiclePhoto,
} from './types';

export type NewVehicleInput = Partial<
  Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'records' | 'schedules' | 'photos'>
> & {
  records?: MaintenanceRecord[];
  schedules?: MaintenanceSchedule[];
  photos?: VehiclePhoto[];
};

export type VehicleHistoryContextValue = {
  data: VehicleHistorySnapshot;
  hydrated: boolean;
  createVehicle: (input?: NewVehicleInput) => string;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  attachPhoto: (vehicleId: string, photo: VehiclePhoto) => void;
  detachPhoto: (vehicleId: string, photoId: string) => void;
  addRecord: (vehicleId: string, record: MaintenanceRecord) => void;
  updateRecord: (vehicleId: string, recordId: string, patch: Partial<MaintenanceRecord>) => void;
  removeRecord: (vehicleId: string, recordId: string) => void;
  addSchedule: (vehicleId: string, schedule: MaintenanceSchedule) => void;
  updateSchedule: (vehicleId: string, scheduleId: string, patch: Partial<MaintenanceSchedule>) => void;
  removeSchedule: (vehicleId: string, scheduleId: string) => void;
  updateSettings: (patch: Partial<VehicleHistorySettings>) => void;
  clearAll: () => void;
};

export const VehicleHistoryContext = createContext<VehicleHistoryContextValue | null>(null);

export function useVehicleHistory(): VehicleHistoryContextValue {
  const ctx = useContext(VehicleHistoryContext);
  if (!ctx) throw new Error('useVehicleHistory must be used inside <VehicleHistoryApp>');
  return ctx;
}
