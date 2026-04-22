import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';

@ApiTags('realtime')
@Controller('families/:familyId/stream')
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @Sse()
  stream(
    @Param('familyId') familyId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    // Auth via query param (EventSource can't send headers)
    const token = (req.query.token as string) ?? '';
    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Keep-alive: prevent proxy timeouts
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // for Nginx/Railway

    return this.realtimeService.streamForFamily(familyId).pipe(
      map((event) => ({ data: { type: event.type } }) as MessageEvent),
    );
  }
}
