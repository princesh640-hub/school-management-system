import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AdmissionsService } from './admissions.service';
import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto';
import { ReviewAdmissionApplicationDto, ConvertAdmissionApplicationDto } from './dto/review-admission-application.dto';
import { ApplicationStatus } from '@prisma/client';

@ApiTags('Admissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Get()
  @RequirePermissions('admissions:read')
  @ApiOperation({ summary: 'List admission applications with filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'ADMITTED'] })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: ApplicationStatus,
    @Query('classId') classId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.admissionsService.findAll(user.organizationId, user.campusId ?? undefined, {
      status,
      classId,
      academicYearId,
      search,
      page,
      limit,
    });
  }

  @Post('check-duplicate')
  @RequirePermissions('admissions:create')
  @ApiOperation({ summary: 'Check potential duplicate applications or existing students' })
  async checkDuplicate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { firstName: string; lastName: string; dateOfBirth: string; guardianPhone?: string; email?: string },
  ) {
    return this.admissionsService.checkDuplicates(user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions('admissions:read')
  @ApiOperation({ summary: 'Get admission application details' })
  async findOne(@Param('id') id: string) {
    return this.admissionsService.findOne(id);
  }

  @Post()
  @RequirePermissions('admissions:create')
  @ApiOperation({ summary: 'Submit new admission application' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateAdmissionApplicationDto) {
    return this.admissionsService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id/review')
  @RequirePermissions('admissions:review')
  @ApiOperation({ summary: 'Update application review status and notes' })
  async review(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReviewAdmissionApplicationDto,
  ) {
    return this.admissionsService.review(id, dto, user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('admissions:approve')
  @ApiOperation({ summary: 'Approve application for admission' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('reason') reason?: string,
  ) {
    return this.admissionsService.approve(id, user.id, reason);
  }

  @Post(':id/reject')
  @RequirePermissions('admissions:reject')
  @ApiOperation({ summary: 'Reject application' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('reason') reason: string,
  ) {
    return this.admissionsService.reject(id, user.id, reason);
  }

  @Post(':id/convert')
  @RequirePermissions('admissions:approve')
  @ApiOperation({ summary: 'Transactionally convert approved application to active student' })
  async convert(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConvertAdmissionApplicationDto,
  ) {
    return this.admissionsService.convertToStudent(id, dto, user.id);
  }

  @Post(':id/documents')
  @RequirePermissions('admissions:create')
  @ApiOperation({ summary: 'Attach supporting document to application' })
  async attachDocument(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { documentType: string; fileKey: string; fileName: string; mimeType: string; sizeInBytes?: number; notes?: string },
  ) {
    return this.admissionsService.attachDocument(id, dto, user.id);
  }
}
