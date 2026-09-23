// =============================================================================
// Phase 4K: Hostel Management Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { HostelStructureService } from './hostel-structure.service';
import { HostelAllocationService } from './hostel-allocation.service';
import { HostelAttendanceService } from './hostel-attendance.service';
import { HostelMovementService } from './hostel-movement.service';
import { HostelOperationsService } from './hostel-operations.service';
import { HostelReportsService } from './hostel-reports.service';

@ApiTags('Hostel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hostel')
export class HostelController {
  constructor(
    private readonly structureService: HostelStructureService,
    private readonly allocationService: HostelAllocationService,
    private readonly attendanceService: HostelAttendanceService,
    private readonly movementService: HostelMovementService,
    private readonly operationsService: HostelOperationsService,
    private readonly reportsService: HostelReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Hostels
  // ---------------------------------------------------------------------------

  @Post('hostels')
  @RequirePermissions('hostel:manage')
  @ApiOperation({ summary: 'Create a hostel facility' })
  async createHostel(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.structureService.createHostel(user, dto);
  }

  @Get('hostels')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'List hostels' })
  async listHostels(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('status') status?: string,
  ) {
    return this.structureService.listHostels(user, campusId, status);
  }

  @Get('hostels/:id')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'Get hostel details' })
  async getHostel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.structureService.getHostel(user, id);
  }

  @Put('hostels/:id')
  @RequirePermissions('hostel:manage')
  @ApiOperation({ summary: 'Update hostel' })
  async updateHostel(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.structureService.updateHostel(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 2. Buildings / Blocks
  // ---------------------------------------------------------------------------

  @Post('buildings')
  @RequirePermissions('hostel:structure:manage')
  @ApiOperation({ summary: 'Create a hostel building/block' })
  async createBuilding(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.structureService.createBuilding(user, dto);
  }

  @Get('buildings')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'List hostel buildings' })
  async listBuildings(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
  ) {
    return this.structureService.listBuildings(user, hostelId);
  }

  @Get('buildings/:id')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'Get building details' })
  async getBuilding(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.structureService.getBuilding(user, id);
  }

  @Put('buildings/:id')
  @RequirePermissions('hostel:structure:manage')
  @ApiOperation({ summary: 'Update building' })
  async updateBuilding(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.structureService.updateBuilding(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 3. Floors
  // ---------------------------------------------------------------------------

  @Post('floors')
  @RequirePermissions('hostel:structure:manage')
  @ApiOperation({ summary: 'Create a hostel floor' })
  async createFloor(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.structureService.createFloor(user, dto);
  }

  @Get('floors')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'List floors' })
  async listFloors(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.structureService.listFloors(user, hostelId, buildingId);
  }

  // ---------------------------------------------------------------------------
  // 4. Rooms
  // ---------------------------------------------------------------------------

  @Post('rooms')
  @RequirePermissions('hostel:rooms:manage')
  @ApiOperation({ summary: 'Create a hostel room' })
  async createRoom(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.structureService.createRoom(user, dto);
  }

  @Get('rooms')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'List rooms' })
  async listRooms(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('floorId') floorId?: string,
    @Query('status') status?: string,
  ) {
    return this.structureService.listRooms(user, hostelId, buildingId, floorId, status);
  }

  @Get('rooms/:id')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'Get room details' })
  async getRoom(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.structureService.getRoom(user, id);
  }

  @Put('rooms/:id')
  @RequirePermissions('hostel:rooms:manage')
  @ApiOperation({ summary: 'Update room' })
  async updateRoom(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.structureService.updateRoom(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 5. Beds
  // ---------------------------------------------------------------------------

  @Post('beds')
  @RequirePermissions('hostel:beds:manage')
  @ApiOperation({ summary: 'Add a bed to a room' })
  async createBed(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.structureService.createBed(user, dto);
  }

  @Get('beds')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'List beds' })
  async listBeds(
    @CurrentUser() user: CurrentUserPayload,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string,
  ) {
    return this.structureService.listBeds(user, roomId, status);
  }

  @Patch('beds/:id/status')
  @RequirePermissions('hostel:beds:manage')
  @ApiOperation({ summary: 'Update bed status and condition' })
  async updateBedStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.structureService.updateBedStatus(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 6. Allocations & Residence Lifecycle
  // ---------------------------------------------------------------------------

  @Post('allocations')
  @RequirePermissions('hostel:allocation:manage')
  @ApiOperation({ summary: 'Allocate a student to a room and bed' })
  async allocateStudent(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.allocationService.allocateStudent(user, dto);
  }

  @Post('allocations/bulk')
  @RequirePermissions('hostel:allocation:manage')
  @ApiOperation({ summary: 'Bulk allocate students to a room' })
  async bulkAllocate(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.allocationService.bulkAllocate(user, dto);
  }

  @Get('allocations')
  @RequirePermissions('hostel:residents:view')
  @ApiOperation({ summary: 'List hostel allocations' })
  async listAllocations(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('roomId') roomId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.allocationService.listAllocations(user, hostelId, roomId, studentId, status);
  }

  @Get('allocations/:id')
  @RequirePermissions('hostel:residents:view')
  @ApiOperation({ summary: 'Get allocation details' })
  async getAllocation(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.allocationService.getAllocation(user, id);
  }

  @Patch('allocations/:id/check-in')
  @RequirePermissions('hostel:checkin')
  @ApiOperation({ summary: 'Check in a resident' })
  async checkIn(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.allocationService.checkIn(user, id, dto);
  }

  @Patch('allocations/:id/check-out')
  @RequirePermissions('hostel:checkout')
  @ApiOperation({ summary: 'Check out a resident and free the bed' })
  async checkOut(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.allocationService.checkOut(user, id, dto);
  }

  @Post('allocations/:id/transfer')
  @RequirePermissions('hostel:transfer')
  @ApiOperation({ summary: 'Transfer resident to another room/bed' })
  async transferAllocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.allocationService.transferAllocation(user, id, dto);
  }

  @Get('residents/:studentId/history')
  @RequirePermissions('hostel:residents:view')
  @ApiOperation({ summary: 'Get complete hostel history for a student' })
  async getStudentHostelHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.allocationService.getStudentHostelHistory(user, studentId);
  }

  // ---------------------------------------------------------------------------
  // 7. Attendance
  // ---------------------------------------------------------------------------

  @Post('attendance/mark')
  @RequirePermissions('hostel:attendance:mark')
  @ApiOperation({ summary: 'Mark hostel attendance for a student' })
  async markAttendance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.attendanceService.markAttendance(user, dto);
  }

  @Post('attendance/bulk')
  @RequirePermissions('hostel:attendance:mark')
  @ApiOperation({ summary: 'Bulk mark hostel attendance' })
  async bulkMarkAttendance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.attendanceService.bulkMarkAttendance(user, dto);
  }

  @Get('attendance')
  @RequirePermissions('hostel:attendance:view')
  @ApiOperation({ summary: 'List hostel attendance records' })
  async listAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('studentId') studentId?: string,
    @Query('date') date?: string,
    @Query('session') session?: string,
  ) {
    return this.attendanceService.listAttendance(user, hostelId, studentId, date, session);
  }

  @Get('attendance/roster')
  @RequirePermissions('hostel:attendance:view')
  @ApiOperation({ summary: 'Get hostel attendance roll-call roster' })
  async getAttendanceRoster(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId: string,
    @Query('date') date?: string,
    @Query('session') session?: string,
  ) {
    return this.attendanceService.getRoster(user, hostelId, date, session);
  }

  @Get('attendance/today-summary')
  @RequirePermissions('hostel:attendance:view')
  @ApiOperation({ summary: "Get today's attendance summary counts" })
  async getTodayAttendanceSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceService.getTodayAttendanceSummary(user);
  }

  // ---------------------------------------------------------------------------
  // 8. Outings & Curfew Movement
  // ---------------------------------------------------------------------------

  @Post('outings')
  @RequirePermissions('hostel:outings:create')
  @ApiOperation({ summary: 'Create an outing/leave request' })
  async createOuting(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.movementService.createOuting(user, dto);
  }

  @Get('outings')
  @RequirePermissions('hostel:outings:view')
  @ApiOperation({ summary: 'List outing requests' })
  async listOutings(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.movementService.listOutings(user, hostelId, studentId, status);
  }

  @Get('outings/:id')
  @RequirePermissions('hostel:outings:view')
  @ApiOperation({ summary: 'Get outing request details' })
  async getOuting(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.movementService.getOuting(user, id);
  }

  @Patch('outings/:id/approve')
  @RequirePermissions('hostel:outings:approve')
  @ApiOperation({ summary: 'Approve or reject outing request' })
  async approveOuting(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.movementService.approveOuting(user, id, dto);
  }

  @Patch('outings/:id/depart')
  @RequirePermissions('hostel:outings:approve')
  @ApiOperation({ summary: 'Record resident departure on outing' })
  async recordOutingDeparture(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.movementService.recordOutingDeparture(user, id);
  }

  @Patch('outings/:id/return')
  @RequirePermissions('hostel:outings:approve')
  @ApiOperation({ summary: 'Record resident return from outing (checks curfew)' })
  async recordOutingReturn(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.movementService.recordOutingReturn(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 9. Visitors
  // ---------------------------------------------------------------------------

  @Post('visitors')
  @RequirePermissions('hostel:visitors:manage')
  @ApiOperation({ summary: 'Register a visitor' })
  async createVisitor(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.movementService.createVisitor(user, dto);
  }

  @Get('visitors')
  @RequirePermissions('hostel:visitors:view')
  @ApiOperation({ summary: 'List visitors' })
  async listVisitors(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.movementService.listVisitors(user, hostelId, studentId, status);
  }

  @Patch('visitors/:id/status')
  @RequirePermissions('hostel:visitors:manage')
  @ApiOperation({ summary: 'Update visitor status (check-in / check-out)' })
  async updateVisitorStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.movementService.updateVisitorStatus(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 10. Wardens & Staff
  // ---------------------------------------------------------------------------

  @Post('wardens')
  @RequirePermissions('hostel:manage')
  @ApiOperation({ summary: 'Assign a warden or staff to a hostel' })
  async assignWarden(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.operationsService.assignWarden(user, dto);
  }

  @Get('wardens')
  @RequirePermissions('hostel:view')
  @ApiOperation({ summary: 'List wardens and staff' })
  async listWardens(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('status') status?: string,
  ) {
    return this.operationsService.listWardens(user, hostelId, status);
  }

  @Put('wardens/:id')
  @RequirePermissions('hostel:manage')
  @ApiOperation({ summary: 'Update warden assignment' })
  async updateWarden(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.operationsService.updateWarden(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 11. Incidents
  // ---------------------------------------------------------------------------

  @Post('incidents')
  @RequirePermissions('hostel:incidents:manage')
  @ApiOperation({ summary: 'Report a hostel incident' })
  async reportIncident(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.operationsService.reportIncident(user, dto);
  }

  @Get('incidents')
  @RequirePermissions('hostel:incidents:view')
  @ApiOperation({ summary: 'List hostel incidents' })
  async listIncidents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('status') status?: string,
  ) {
    return this.operationsService.listIncidents(user, hostelId, status);
  }

  @Get('incidents/:id')
  @RequirePermissions('hostel:incidents:view')
  @ApiOperation({ summary: 'Get incident details' })
  async getIncident(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.operationsService.getIncident(user, id);
  }

  @Patch('incidents/:id/resolve')
  @RequirePermissions('hostel:incidents:manage')
  @ApiOperation({ summary: 'Resolve an incident' })
  async resolveIncident(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.operationsService.resolveIncident(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 12. Maintenance
  // ---------------------------------------------------------------------------

  @Post('maintenance')
  @RequirePermissions('hostel:maintenance:manage')
  @ApiOperation({ summary: 'Create a maintenance request' })
  async createMaintenance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.operationsService.createMaintenance(user, dto);
  }

  @Get('maintenance')
  @RequirePermissions('hostel:maintenance:view')
  @ApiOperation({ summary: 'List maintenance requests' })
  async listMaintenance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
    @Query('status') status?: string,
  ) {
    return this.operationsService.listMaintenance(user, hostelId, status);
  }

  @Get('maintenance/:id')
  @RequirePermissions('hostel:maintenance:view')
  @ApiOperation({ summary: 'Get maintenance request details' })
  async getMaintenance(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.operationsService.getMaintenance(user, id);
  }

  @Patch('maintenance/:id/status')
  @RequirePermissions('hostel:maintenance:manage')
  @ApiOperation({ summary: 'Update maintenance request status and resolution' })
  async updateMaintenanceStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.operationsService.updateMaintenanceStatus(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 13. Reports & Analytics
  // ---------------------------------------------------------------------------

  @Get('reports/dashboard')
  @RequirePermissions('hostel:reports')
  @ApiOperation({ summary: 'Get hostel dashboard KPI summary' })
  async getDashboardSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getDashboardSummary(user);
  }

  @Get('reports/occupancy')
  @RequirePermissions('hostel:reports')
  @ApiOperation({ summary: 'Get detailed room occupancy and vacancy report' })
  async getOccupancyReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('hostelId') hostelId?: string,
  ) {
    return this.reportsService.getOccupancyReport(user, hostelId);
  }

  @Get('reports/maintenance-cost')
  @RequirePermissions('hostel:reports')
  @ApiOperation({ summary: 'Get maintenance costs report' })
  async getMaintenanceCostReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getMaintenanceCostReport(user, startDate, endDate);
  }

  @Get('reports/incidents')
  @RequirePermissions('hostel:reports')
  @ApiOperation({ summary: 'Get incident summary report' })
  async getIncidentSummaryReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getIncidentSummaryReport(user, startDate, endDate);
  }

  @Get('reports/defaulters')
  @RequirePermissions('hostel:reports')
  @ApiOperation({ summary: 'Get non-attendance / defaulter residents' })
  async getDefaultersReport(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getDefaultersReport(user);
  }
}
