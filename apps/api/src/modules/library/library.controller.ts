import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { LibraryCatalogService } from './library-catalog.service';
import { BookCopiesService } from './book-copies.service';
import { LibraryMembersService } from './library-members.service';
import { CirculationService } from './circulation.service';
import { ReservationsService } from './reservations.service';
import { LibraryFinesService } from './library-fines.service';
import { LibraryReportsService } from './library-reports.service';
import {
  CreateLibraryDto,
  CreateLibraryLocationDto,
  CreateBookCategoryDto,
  CreatePublisherDto,
  CreateAuthorDto,
  CreateBookDto,
  UpdateBookDto,
  CreateBookCopyDto,
  UpdateBookCopyStatusDto,
  RegisterLibraryMemberDto,
  IssueBookDto,
  ReturnBookDto,
  RenewLoanDto,
  CreateReservationDto,
  AssessFineDto,
  WaiveFineDto,
} from './dto/library.dto';

@ApiTags('Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('library')
export class LibraryController {
  constructor(
    private readonly catalogService: LibraryCatalogService,
    private readonly copiesService: BookCopiesService,
    private readonly membersService: LibraryMembersService,
    private readonly circulationService: CirculationService,
    private readonly reservationsService: ReservationsService,
    private readonly finesService: LibraryFinesService,
    private readonly reportsService: LibraryReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Bibliographic Catalog & Metadata Endpoints
  // ---------------------------------------------------------------------------

  @Post('branches')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create a library branch' })
  async createLibraryBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLibraryDto,
  ) {
    return this.catalogService.createLibrary(user, dto);
  }

  @Get('branches')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List library branches' })
  async listLibraryBranches(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.catalogService.listLibraries(user, campusId);
  }

  @Post('locations')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create a library location/shelf' })
  async createLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLibraryLocationDto,
  ) {
    return this.catalogService.createLocation(user, dto);
  }

  @Get('locations')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List shelf locations' })
  async listLocations(
    @CurrentUser() user: CurrentUserPayload,
    @Query('libraryId') libraryId?: string,
  ) {
    return this.catalogService.listLocations(user, libraryId);
  }

  @Post('categories')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create a book category' })
  async createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBookCategoryDto,
  ) {
    return this.catalogService.createCategory(user, dto);
  }

  @Get('categories')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List book categories' })
  async listCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.catalogService.listCategories(user);
  }

  @Post('publishers')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create a publisher' })
  async createPublisher(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePublisherDto,
  ) {
    return this.catalogService.createPublisher(user, dto);
  }

  @Get('publishers')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List publishers' })
  async listPublishers(@CurrentUser() user: CurrentUserPayload) {
    return this.catalogService.listPublishers(user);
  }

  @Post('authors')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create an author' })
  async createAuthor(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAuthorDto,
  ) {
    return this.catalogService.createAuthor(user, dto);
  }

  @Get('authors')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List authors' })
  async listAuthors(@CurrentUser() user: CurrentUserPayload) {
    return this.catalogService.listAuthors(user);
  }

  @Post('books')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create a book title' })
  async createBook(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBookDto,
  ) {
    return this.catalogService.createBook(user, dto);
  }

  @Get('books')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List books with search & filtering' })
  async listBooks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('authorId') authorId?: string,
    @Query('publisherId') publisherId?: string,
    @Query('status') status?: string,
  ) {
    return this.catalogService.listBooks(user, {
      search,
      categoryId,
      authorId,
      publisherId,
      status,
    });
  }

  @Get('books/:id')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Get book title details with copies and authors' })
  async getBookById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.catalogService.getBookById(user, id);
  }

  @Put('books/:id')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Update a book title' })
  async updateBook(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.catalogService.updateBook(user, id, dto);
  }

  @Delete('books/:id')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Delete a book title' })
  async deleteBook(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.catalogService.deleteBook(user, id);
  }

  // ---------------------------------------------------------------------------
  // 2. Physical Book Copies Endpoints
  // ---------------------------------------------------------------------------

  @Post('copies')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Register a physical book copy' })
  async createBookCopy(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBookCopyDto,
  ) {
    return this.copiesService.createCopy(user, dto);
  }

  @Get('copies')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List physical book copies' })
  async listBookCopies(
    @CurrentUser() user: CurrentUserPayload,
    @Query('bookId') bookId?: string,
    @Query('libraryId') libraryId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('condition') condition?: string,
    @Query('barcode') barcode?: string,
    @Query('accessionNumber') accessionNumber?: string,
  ) {
    return this.copiesService.listCopies(user, {
      bookId,
      libraryId,
      locationId,
      status,
      condition,
      barcode,
      accessionNumber,
    });
  }

  @Get('copies/:id')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Get physical book copy details' })
  async getBookCopyById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.copiesService.getCopyById(user, id);
  }

  @Patch('copies/:id/status')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Update physical book copy status/condition' })
  async updateBookCopyStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookCopyStatusDto,
  ) {
    return this.copiesService.updateCopyStatus(user, id, dto);
  }

  @Post('copies/:id/mark-lost')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Mark a book copy as lost' })
  async markCopyLost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.copiesService.markCopyLost(user, id, notes);
  }

  @Post('copies/:id/replace')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Record replacement copy for lost/damaged copy' })
  async recordReplacementCopy(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateBookCopyDto,
  ) {
    return this.copiesService.replaceCopy(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 3. Library Members Endpoints
  // ---------------------------------------------------------------------------

  @Post('members')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Register a library member' })
  async registerMember(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RegisterLibraryMemberDto,
  ) {
    return this.membersService.registerMember(user, dto);
  }

  @Get('members')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List library members' })
  async listMembers(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('memberType') memberType?: string,
    @Query('search') search?: string,
  ) {
    return this.membersService.listMembers(user, { status, memberType, search });
  }

  @Get('members/:id')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Get library member details' })
  async getMemberById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.membersService.getMemberById(user, id);
  }

  @Get('members/:id/statement')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Get library member account statement' })
  async getMemberStatement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.membersService.getMemberStatement(user, id);
  }

  @Get('members/:id/eligibility')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Check member borrowing eligibility' })
  async checkBorrowingEligibility(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.membersService.validateEligibility(user, id);
  }

  // ---------------------------------------------------------------------------
  // 4. Circulation Desk Endpoints
  // ---------------------------------------------------------------------------

  @Post('circulation/issue')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Issue a book copy' })
  async issueBook(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IssueBookDto,
  ) {
    return this.circulationService.issueBook(user, dto);
  }

  @Post('circulation/return')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Return a book copy' })
  async returnBook(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReturnBookDto,
  ) {
    return this.circulationService.returnBook(user, dto);
  }

  @Post('circulation/renew')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Renew an active loan' })
  async renewLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RenewLoanDto,
  ) {
    return this.circulationService.renewLoan(user, dto);
  }

  @Get('circulation/loans')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List active or overdue loans' })
  async getActiveLoans(
    @CurrentUser() user: CurrentUserPayload,
    @Query('memberId') memberId?: string,
    @Query('copyId') copyId?: string,
    @Query('isOverdue') isOverdue?: string,
  ) {
    return this.circulationService.getActiveLoans(user, {
      memberId,
      copyId,
      isOverdue: isOverdue === 'true',
    });
  }

  @Get('circulation/loans/:id')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Get loan details' })
  async getLoanById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.circulationService.getLoanById(user, id);
  }

  @Get('circulation/loans/:id/issue-slip')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Generate printable issue slip' })
  async getIssueSlip(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.circulationService.generateIssueSlip(user, id);
  }

  @Get('circulation/loans/:id/return-slip')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Generate printable return slip' })
  async getReturnSlip(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.circulationService.generateReturnSlip(user, id);
  }

  // ---------------------------------------------------------------------------
  // 5. Reservations / Holds Endpoints
  // ---------------------------------------------------------------------------

  @Post('reservations')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Create a title hold reservation' })
  async createReservation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(user, dto);
  }

  @Get('reservations')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List reservations' })
  async listReservations(
    @CurrentUser() user: CurrentUserPayload,
    @Query('bookId') bookId?: string,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.listReservations(user, {
      bookId,
      memberId,
      status,
    });
  }

  @Get('reservations/:id')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Get reservation details' })
  async getReservationById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.reservationsService.getReservationById(user, id);
  }

  @Patch('reservations/:id/cancel')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancelReservation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.reservationsService.cancelReservation(user, id, reason);
  }

  // ---------------------------------------------------------------------------
  // 6. Overdue Fines Endpoints
  // ---------------------------------------------------------------------------

  @Post('fines')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Assess manual fine' })
  async assessFine(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssessFineDto,
  ) {
    return this.finesService.assessFine(user, dto);
  }

  @Get('fines')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'List fines' })
  async listFines(
    @CurrentUser() user: CurrentUserPayload,
    @Query('memberId') memberId?: string,
    @Query('loanId') loanId?: string,
    @Query('status') status?: string,
  ) {
    return this.finesService.listFines(user, { memberId, loanId, status });
  }

  @Patch('fines/:id/waive')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Waive a fine with audit rationale' })
  async waiveFine(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: WaiveFineDto,
  ) {
    return this.finesService.waiveFine(user, id, dto);
  }

  @Patch('fines/:id/pay')
  @RequirePermissions('library:write')
  @ApiOperation({ summary: 'Mark fine as paid and link finance transaction' })
  async payFine(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('financeTransactionId') financeTransactionId?: string,
  ) {
    return this.finesService.markFinePaid(user, id, financeTransactionId);
  }

  // ---------------------------------------------------------------------------
  // 7. Reports & Analytics Endpoints
  // ---------------------------------------------------------------------------

  @Get('reports/inventory')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Catalog inventory and condition summary' })
  async getInventorySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getCatalogInventorySummary(user);
  }

  @Get('reports/circulation')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Circulation metrics and analytics' })
  async getCirculationAnalytics(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getCirculationAnalytics(user);
  }

  @Get('reports/overdue')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Overdue items and patrons register' })
  async getOverdueReport(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getOverdueReport(user);
  }

  @Get('reports/lost-damaged')
  @RequirePermissions('library:read')
  @ApiOperation({ summary: 'Lost and damaged book register' })
  async getLostDamagedReport(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getLostDamagedReport(user);
  }
}
