import { Controller, Get } from '@nestjs/common';

import { Faq as FaqModel } from '@prisma/client';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  getAll(): Promise<{ message: string; faqs: FaqModel[] }> {
    return this.faqService.all();
  }
}
