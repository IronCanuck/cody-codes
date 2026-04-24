const KEY = 'consalty-employee-full-name';

export function getStoredEmployeeFullName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(KEY) ?? '';
}

export function setStoredEmployeeFullName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, name);
}
