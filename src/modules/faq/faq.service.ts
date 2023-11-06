import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/modules/prisma/prisma.service';
@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  async all() {
    const faqs = await this.prisma.faq.findMany();
    return { message: 'Successfully done.', faqs };
  }
}
