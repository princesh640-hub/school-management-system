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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'List student profiles' })
  @ApiQuery({ name: 'lifecycleStatus', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto,
    @Query('lifecycleStatus') lifecycleStatus?: string,
  ) {
    return this.studentsService.findAll(user.organizationId, user.campusId ?? undefined, {
      ...query,
      lifecycleStatus,
    });
  }

  @Post('promote-preview')
  @RequirePermissions('students:promote')
  @ApiOperation({ summary: 'Dry-run preview and conflict check for class promotion' })
  async promotePreview(
    @Body() dto: { sourceSectionId: string; targetAcademicYearId: string; targetClassId: string; targetSectionId: string },
  ) {
    return this.studentsService.promotePreview(dto);
  }

  @Post('bulk-promote')
  @RequirePermissions('students:promote')
  @ApiOperation({ summary: 'Bulk promote students between academic years and sections' })
  async bulkPromote(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { sourceSectionId: string; targetAcademicYearId: string; targetClassId: string; targetSectionId: string; studentIds: string[] },
  ) {
    return this.studentsService.bulkPromote(dto, user.id);
  }

  @Get(':id')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get student profile details' })
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @RequirePermissions('students:create')
  @ApiOperation({ summary: 'Admit new student' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.studentsService.create(user.organizationId, dto, user.id);
  }

  @Post('admit')
  @RequirePermissions('students:create')
  @ApiOperation({ summary: 'Admit new student (alias)' })
  async admit(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.studentsService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('students:update')
  @ApiOperation({ summary: 'Update student record' })
  async update(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.studentsService.update(id, dto, user.id);
  }

  @Get(':id/lifecycle-history')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get append-only student status lifecycle history' })
  async getLifecycleHistory(@Param('id') id: string) {
    return this.studentsService.getLifecycleHistory(id);
  }

  @Post(':id/transfer-section')
  @RequirePermissions('students:transfer')
  @ApiOperation({ summary: 'Transfer student to another section' })
  async transferSection(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { toSectionId: string; reason: string; effectiveDate?: string },
  ) {
    return this.studentsService.transferSection(id, dto, user.id);
  }

  @Post(':id/transfer-campus')
  @RequirePermissions('students:transfer')
  @ApiOperation({ summary: 'Transfer student to another campus' })
  async transferCampus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { toCampusId: string; toSectionId?: string; reason: string },
  ) {
    return this.studentsService.transferCampus(id, dto, user.id);
  }

  @Post(':id/withdraw')
  @RequirePermissions('students:withdraw')
  @ApiOperation({ summary: 'Formal student withdrawal workflow' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { withdrawalDate: string; reason: string; exitNotes?: string },
  ) {
    return this.studentsService.withdrawStudent(id, dto, user.id);
  }

  @Post(':id/graduate')
  @RequirePermissions('students:graduate')
  @ApiOperation({ summary: 'Formal student graduation and alumni creation' })
  async graduate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { graduationYear: number; graduationClass?: string; finalGrade?: string; notes?: string },
  ) {
    return this.studentsService.graduateStudent(id, dto, user.id);
  }

  @Post(':id/readmit')
  @RequirePermissions('students:create')
  @ApiOperation({ summary: 'Re-admit previously withdrawn student' })
  async readmit(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { academicYearId: string; sectionId: string; rollNumber?: string; reason: string },
  ) {
    return this.studentsService.readmitStudent(id, dto, user.id);
  }

  @Get(':id/emergency-contacts')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'List student emergency contacts' })
  async getEmergencyContacts(@Param('id') id: string) {
    return this.studentsService.getEmergencyContacts(id);
  }

  @Post(':id/emergency-contacts')
  @RequirePermissions('students:update')
  @ApiOperation({ summary: 'Add student emergency contact' })
  async addEmergencyContact(
    @Param('id') id: string,
    @Body() dto: { name: string; relationship: string; phone: string; altPhone?: string; priority?: number },
  ) {
    return this.studentsService.addEmergencyContact(id, dto);
  }

  @Get(':id/documents')
  @RequirePermissions('students:documents:view')
  @ApiOperation({ summary: 'List student documents' })
  async getDocuments(@Param('id') id: string) {
    return this.studentsService.getDocuments(id);
  }

  @Post(':id/documents')
  @RequirePermissions('students:documents:manage')
  @ApiOperation({ summary: 'Attach verified document to student profile' })
  async attachDocument(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { documentType: string; fileKey: string; fileName: string; mimeType: string; sizeInBytes?: number; notes?: string },
  ) {
    return this.studentsService.attachDocument(id, dto, user.id);
  }
}
