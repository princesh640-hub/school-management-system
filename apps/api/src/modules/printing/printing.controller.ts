// =============================================================================
// Phase 4Q: Printing & Document Generation Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrintingService } from './printing.service';
import { IBulkGenerationDto } from '@school/shared-types';

@ApiTags('Printing & PDF Subsystem')
@Controller('printing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Bulk Document Generation Jobs
  // ---------------------------------------------------------------------------

  @Post('jobs')
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Queue a bulk document generation job' })
  async createBulkJob(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IBulkGenerationDto,
  ) {
    return this.printingService.createBulkJob(
      user.organizationId,
      user.campusId || null,
      this.getUserId(user),
      dto,
    );
  }

  @Get('jobs')
  @RequirePermissions('documents:view')
  @ApiOperation({ summary: 'List recent document generation jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.printingService.listJobs(
      user.organizationId,
      user.campusId || undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('jobs/:id')
  @RequirePermissions('documents:view')
  @ApiOperation({ summary: 'Get status and summary of a document generation job' })
  async getJobStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.printingService.getJobStatus(user.organizationId, id);
  }

  // ---------------------------------------------------------------------------
  // 2. Document Rendering for Printing / PDF Preview
  // ---------------------------------------------------------------------------

  @Get('render/:docType/:entityId')
  @RequirePermissions('documents:view')
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Render a printer-ready HTML document for printing' })
  async renderPrintable(
    @CurrentUser() user: CurrentUserPayload,
    @Param('docType') docType: string,
    @Param('entityId') entityId: string,
  ) {
    const result = await this.printingService.renderPrintableDocument(
      user.organizationId,
      docType,
      entityId,
    );
    return result.html;
  }
}
