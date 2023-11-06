import { Injectable } from '@nestjs/common';

import { Faq as FaqModel } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma.service';
@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  all(): Promise<FaqModel[]> {
    return this.prisma.faq.findMany();
  }
}
