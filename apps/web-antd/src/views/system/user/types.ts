export interface SystemUser {
  id: string;
  username: string;
  realName: string;
  deptId: string;
  deptName?: string;
  positionId?: string;
  positionName?: string;
  status: 0 | 1;
  phone?: string;
  email?: string;
  remark?: string;
  createdAt?: string;
  lastLoginAt?: string;
  roles?: string[];
}

export interface UserFormValues extends Record<string, unknown> {
  username?: string;
  realName?: string;
  deptId?: string;
  positionId?: string;
  roleCode?: string;
  locked?: boolean;
  createdAt?: string[];
  lastLoginAt?: string[];
  status?: 0 | 1;
  phone?: string;
  email?: string;
  remark?: string;
}
