import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { EmployeesService } from './employees.service';
import {
  UpdateEmployeeDto,
  ChangeEmployeeStatusDto,
  CreateContractDto,
  UploadEmployeeDocumentDto,
} from './dto/phase4h-employees.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ---------------------------------------------------------------------------
  // Phase 2 Legacy Endpoints
  // ---------------------------------------------------------------------------

  @Get()
  @RequirePermissions('employees:read')
  @ApiOperation({ summary: 'List employees directory' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.employeesService.findAll(user.organizationId, user.campusId ?? undefined);
  }

  @Get('self/profile')
  @RequirePermissions('employees:view')
  @ApiOperation({ summary: 'Get current employee self-service profile' })
  async getSelfServiceProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.employeesService.getSelfServiceProfile(user.id);
  }

  @Get('me/profile')
  @RequirePermissions('employees:view')
  @ApiOperation({ summary: 'Get current employee self-service profile' })
  async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.employeesService.getSelfServiceProfile(user.id);
  }

  @Get('contracts/expiring')
  @RequirePermissions('hr:contracts:manage')
  @ApiOperation({ summary: 'List expiring employment contracts' })
  @ApiQuery({ name: 'daysAhead', required: false })
  async getExpiringContracts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return this.employeesService.getExpiringContracts(user.organizationId, Number(daysAhead) || 30);
  }

  @Get(':id')
  @RequirePermissions('employees:read')
  @ApiOperation({ summary: 'Get employee details' })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @RequirePermissions('employees:create')
  @ApiOperation({ summary: 'Register new employee' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.employeesService.create(user.organizationId, dto, user.id);
  }

  // ---------------------------------------------------------------------------
  // Phase 4H Extended Endpoints
  // ---------------------------------------------------------------------------

  @Put(':id')
  @RequirePermissions('employees:update')
  @ApiOperation({ summary: 'Update employee profile details' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.employeesService.updateEmployee(id, dto, user);
  }

  @Post(':id/status')
  @RequirePermissions('employees:status')
  @ApiOperation({ summary: 'Transition employee lifecycle status with history log' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeEmployeeStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.employeesService.changeStatus(id, dto, user);
  }

  @Get(':id/history')
  @RequirePermissions('employees:read')
  @ApiOperation({ summary: 'Get employee status transition history' })
  async getStatusHistory(@Param('id') id: string) {
    return this.employeesService.getStatusHistory(id);
  }

  @Post(':id/contracts')
  @RequirePermissions('hr:contracts:manage')
  @ApiOperation({ summary: 'Create employment contract for an employee' })
  async createContract(
    @Param('id') id: string,
    @Body() dto: CreateContractDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.employeesService.createContract(id, dto, user);
  }

  @Get(':id/contracts')
  @RequirePermissions('employees:read')
  @ApiOperation({ summary: 'List contracts for an employee' })
  async getContracts(@Param('id') id: string) {
    return this.employeesService.getContracts(id);
  }

  @Post(':id/documents')
  @RequirePermissions('employees:documents:manage')
  @ApiOperation({ summary: 'Upload an HR document record for an employee' })
  async uploadDocument(
    @Param('id') id: string,
    @Body() dto: UploadEmployeeDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.employeesService.uploadDocument(id, dto, user);
  }

  @Get(':id/documents')
  @RequirePermissions('employees:documents:view')
  @ApiOperation({ summary: 'List documents for an employee' })
  async getDocuments(@Param('id') id: string) {
    return this.employeesService.getDocuments(id);
  }
}
