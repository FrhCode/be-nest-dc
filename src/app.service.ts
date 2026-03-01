import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    const text = this.configService.get<number>('port');
    console.log(text);

    return 'Hello World!';
  }
}
