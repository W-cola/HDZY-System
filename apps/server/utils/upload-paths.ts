import path from 'node:path';

/**
 * Every business module owns an isolated attachment directory.
 * Do not reuse these folders across modules.
 */
export const UPLOAD_DIRS = {
  contracts: 'data/uploads/contracts',
  employeeContracts: 'data/uploads/employee-contracts',
  employeeDocuments: 'data/uploads/employee-documents',
  invoices: 'data/uploads/invoices',
} as const;

export function workspaceRoot() {
  return path.basename(process.cwd()) === 'server'
    ? path.resolve(process.cwd(), '../..')
    : process.cwd();
}

export function uploadDir(kind: keyof typeof UPLOAD_DIRS) {
  return path.resolve(workspaceRoot(), UPLOAD_DIRS[kind]);
}
