import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { API_BASE } from './api-config';
import type {
  CreateUserRequest,
  PageResponse,
  Role,
  UpdateUserRequest,
  UserAdmin,
  UserLookup,
} from './models';

export interface UserListQuery {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly active?: boolean;
  readonly role?: Role;
  readonly search?: string;
}

/** Sin repetidos y por orden alfabético. */
export function mergeSorted(...lists: readonly (readonly UserLookup[])[]): UserLookup[] {
  const byId = new Map<string, UserLookup>();
  for (const list of lists) {
    for (const user of list) {
      byId.set(user.id, user);
    }
  }
  return [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
}

@Service()
export class UsersApi {
  private readonly http = inject(HttpClient);

  // Selectores (ADMIN, ASSET_MANAGER y AGENT)

  /** Usuarios activos con ese rol (hasta 100: el máximo del backend). */
  lookup(role: Role, search = ''): Observable<UserLookup[]> {
    let params = new HttpParams().set('role', role).set('size', 100);
    if (search) {
      params = params.set('search', search);
    }
    return this.http
      .get<PageResponse<UserLookup>>(`${API_BASE}/users/lookup`, { params })
      .pipe(map((page) => page.content));
  }

  /** Quienes pueden recibir un ticket: agentes y administradores. */
  assignableAgents(): Observable<UserLookup[]> {
    return forkJoin([this.lookup('AGENT'), this.lookup('ADMIN')]).pipe(
      map(([agents, admins]) => mergeSorted(agents, admins)),
    );
  }

  /** Cualquier persona activa, por nombre o correo, sin filtrar por rol. Hasta `size` resultados. */
  searchPeople(search: string, size = 20): Observable<PageResponse<UserLookup>> {
    let params = new HttpParams().set('size', size);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PageResponse<UserLookup>>(`${API_BASE}/users/lookup`, { params });
  }

  // Administración (solo ADMIN)

  list(query: UserListQuery): Observable<PageResponse<UserAdmin>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort);
    if (query.active !== undefined) params = params.set('active', query.active);
    if (query.role) params = params.set('role', query.role);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PageResponse<UserAdmin>>(`${API_BASE}/users`, { params });
  }

  get(id: string): Observable<UserAdmin> {
    return this.http.get<UserAdmin>(`${API_BASE}/users/${id}`);
  }

  create(request: CreateUserRequest): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${API_BASE}/users`, request);
  }

  update(id: string, request: UpdateUserRequest): Observable<UserAdmin> {
    return this.http.patch<UserAdmin>(`${API_BASE}/users/${id}`, request);
  }

  changeRoles(id: string, roles: readonly Role[]): Observable<UserAdmin> {
    return this.http.put<UserAdmin>(`${API_BASE}/users/${id}/roles`, { roles });
  }

  deactivate(id: string): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${API_BASE}/users/${id}/deactivate`, {});
  }

  activate(id: string): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${API_BASE}/users/${id}/activate`, {});
  }

  /** Cierra todas las sesiones de esa persona (otra). */
  resetPassword(id: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/users/${id}/password`, { newPassword });
  }
}
