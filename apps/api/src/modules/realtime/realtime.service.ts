import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';

export interface RealtimeEvent {
  familyId: string;
  type: string; // e.g. 'pages', 'calendar', 'activity'
}

@Injectable()
export class RealtimeService {
  private events$ = new Subject<RealtimeEvent>();

  emit(familyId: string, type: string): void {
    this.events$.next({ familyId, type });
  }

  streamForFamily(familyId: string): Observable<RealtimeEvent> {
    return this.events$.pipe(filter((e) => e.familyId === familyId));
  }
}
