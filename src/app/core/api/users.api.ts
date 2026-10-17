import { HttpClient, HttpParams } from '@angular/common/http';
import { PageResponse, Role, UserLookup } from './models';
import { inject, Service } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { API_BASE } from '@core/api/api-config';

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
}
