import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LibraryController } from './library.controller';
import { LibraryCatalogService } from './library-catalog.service';
import { BookCopiesService } from './book-copies.service';
import { LibraryMembersService } from './library-members.service';
import { CirculationService } from './circulation.service';
import { ReservationsService } from './reservations.service';
import { LibraryFinesService } from './library-fines.service';
import { LibraryReportsService } from './library-reports.service';

@Module({
  imports: [AuditModule],
  controllers: [LibraryController],
  providers: [
    LibraryCatalogService,
    BookCopiesService,
    LibraryMembersService,
    CirculationService,
    ReservationsService,
    LibraryFinesService,
    LibraryReportsService,
  ],
  exports: [
    LibraryCatalogService,
    BookCopiesService,
    LibraryMembersService,
    CirculationService,
    ReservationsService,
    LibraryFinesService,
    LibraryReportsService,
  ],
})
export class LibraryModule {}
