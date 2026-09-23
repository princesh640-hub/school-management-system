// =============================================================================
// Phase 4J: Transport Management Controller
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
import { TransportFacilityService, VehicleService } from './transport-vehicles.service';
import { TransportPersonnelService } from './transport-personnel.service';
import { TransportRoutesService } from './transport-routes.service';
import { TransportScheduleService } from './transport-schedule.service';
import { TransportMaintenanceService } from './transport-maintenance.service';
import { TransportReportsService } from './transport-reports.service';

@ApiTags('Transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transport')
export class TransportController {
  constructor(
    private readonly facilityService: TransportFacilityService,
    private readonly vehicleService: VehicleService,
    private readonly personnelService: TransportPersonnelService,
    private readonly routesService: TransportRoutesService,
    private readonly scheduleService: TransportScheduleService,
    private readonly maintenanceService: TransportMaintenanceService,
    private readonly reportsService: TransportReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Transport Facilities
  // ---------------------------------------------------------------------------

  @Post('facilities')
  @RequirePermissions('transport:manage')
  @ApiOperation({ summary: 'Create a transport facility/depot' })
  async createFacility(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.facilityService.createFacility(user, dto);
  }

  @Get('facilities')
  @RequirePermissions('transport:view')
  @ApiOperation({ summary: 'List transport facilities' })
  async listFacilities(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.facilityService.listFacilities(user, campusId);
  }

  @Get('facilities/:id')
  @RequirePermissions('transport:view')
  @ApiOperation({ summary: 'Get transport facility detail' })
  async getFacility(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.facilityService.getFacility(user, id);
  }

  @Put('facilities/:id')
  @RequirePermissions('transport:manage')
  @ApiOperation({ summary: 'Update transport facility' })
  async updateFacility(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.facilityService.updateFacility(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 2. Vehicles
  // ---------------------------------------------------------------------------

  @Post('vehicles')
  @RequirePermissions('transport:vehicles:manage')
  @ApiOperation({ summary: 'Register a vehicle' })
  async registerVehicle(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.vehicleService.registerVehicle(user, dto);
  }

  @Get('vehicles')
  @RequirePermissions('transport:vehicles:view')
  @ApiOperation({ summary: 'List vehicles' })
  async listVehicles(
    @CurrentUser() user: CurrentUserPayload,
    @Query('facilityId') facilityId?: string,
    @Query('status') status?: string,
  ) {
    return this.vehicleService.listVehicles(user, facilityId, status);
  }

  @Get('vehicles/alerts/expiry')
  @RequirePermissions('transport:vehicles:view')
  @ApiOperation({ summary: 'Get vehicle document expiry alerts (within 30 days)' })
  async getVehicleExpiryAlerts(@CurrentUser() user: CurrentUserPayload) {
    return this.vehicleService.getExpiryAlerts(user);
  }

  @Get('vehicles/:id')
  @RequirePermissions('transport:vehicles:view')
  @ApiOperation({ summary: 'Get vehicle detail' })
  async getVehicle(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.vehicleService.getVehicle(user, id);
  }

  @Put('vehicles/:id')
  @RequirePermissions('transport:vehicles:manage')
  @ApiOperation({ summary: 'Update vehicle details' })
  async updateVehicle(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.vehicleService.updateVehicle(user, id, dto);
  }

  @Patch('vehicles/:id/status')
  @RequirePermissions('transport:vehicles:manage')
  @ApiOperation({ summary: 'Update vehicle status' })
  async updateVehicleStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.vehicleService.updateVehicleStatus(user, id, dto);
  }

  @Post('vehicles/:id/documents')
  @RequirePermissions('transport:vehicles:manage')
  @ApiOperation({ summary: 'Add vehicle document' })
  async addVehicleDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') vehicleId: string,
    @Body() dto: any,
  ) {
    return this.vehicleService.addVehicleDocument(user, vehicleId, dto);
  }

  @Get('vehicles/:id/documents')
  @RequirePermissions('transport:vehicles:view')
  @ApiOperation({ summary: 'List vehicle documents' })
  async listVehicleDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') vehicleId: string,
  ) {
    return this.vehicleService.listVehicleDocuments(user, vehicleId);
  }

  // ---------------------------------------------------------------------------
  // 3. Drivers
  // ---------------------------------------------------------------------------

  @Post('drivers')
  @RequirePermissions('transport:drivers:manage')
  @ApiOperation({ summary: 'Register a driver' })
  async createDriver(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.personnelService.createDriver(user, dto);
  }

  @Get('drivers')
  @RequirePermissions('transport:drivers:view')
  @ApiOperation({ summary: 'List drivers' })
  async listDrivers(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.personnelService.listDrivers(user, status);
  }

  @Get('drivers/alerts/license')
  @RequirePermissions('transport:drivers:view')
  @ApiOperation({ summary: 'Get driver license expiry alerts (within 60 days)' })
  async getDriverLicenseAlerts(@CurrentUser() user: CurrentUserPayload) {
    return this.personnelService.getDriverLicenseAlerts(user);
  }

  @Get('drivers/:id')
  @RequirePermissions('transport:drivers:view')
  @ApiOperation({ summary: 'Get driver detail' })
  async getDriver(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.personnelService.getDriver(user, id);
  }

  @Put('drivers/:id')
  @RequirePermissions('transport:drivers:manage')
  @ApiOperation({ summary: 'Update driver' })
  async updateDriver(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.personnelService.updateDriver(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 4. Attendants
  // ---------------------------------------------------------------------------

  @Post('attendants')
  @RequirePermissions('transport:drivers:manage')
  @ApiOperation({ summary: 'Register a transport attendant' })
  async createAttendant(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.personnelService.createAttendant(user, dto);
  }

  @Get('attendants')
  @RequirePermissions('transport:drivers:view')
  @ApiOperation({ summary: 'List attendants' })
  async listAttendants(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.personnelService.listAttendants(user, status);
  }

  @Put('attendants/:id')
  @RequirePermissions('transport:drivers:manage')
  @ApiOperation({ summary: 'Update attendant' })
  async updateAttendant(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.personnelService.updateAttendant(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 5. Routes
  // ---------------------------------------------------------------------------

  @Post('routes')
  @RequirePermissions('transport:routes:manage')
  @ApiOperation({ summary: 'Create a transport route' })
  async createRoute(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.routesService.createRoute(user, dto);
  }

  @Get('routes')
  @RequirePermissions('transport:routes:view')
  @ApiOperation({ summary: 'List routes' })
  async listRoutes(
    @CurrentUser() user: CurrentUserPayload,
    @Query('facilityId') facilityId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.routesService.listRoutes(user, facilityId, isActive);
  }

  @Get('routes/occupancy')
  @RequirePermissions('transport:routes:view')
  @ApiOperation({ summary: 'Get route occupancy summary' })
  async getRouteOccupancy(@CurrentUser() user: CurrentUserPayload) {
    return this.routesService.getRouteOccupancy(user);
  }

  @Get('routes/:id')
  @RequirePermissions('transport:routes:view')
  @ApiOperation({ summary: 'Get route detail with stops and assignments' })
  async getRoute(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.routesService.getRoute(user, id);
  }

  @Put('routes/:id')
  @RequirePermissions('transport:routes:manage')
  @ApiOperation({ summary: 'Update route' })
  async updateRoute(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.routesService.updateRoute(user, id, dto);
  }

  @Post('routes/:id/stops')
  @RequirePermissions('transport:routes:manage')
  @ApiOperation({ summary: 'Add a stop to a route' })
  async addRouteStop(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') routeId: string,
    @Body() dto: any,
  ) {
    return this.routesService.addStop(user, routeId, dto);
  }

  @Get('routes/:id/stops')
  @RequirePermissions('transport:routes:view')
  @ApiOperation({ summary: 'List stops for a route' })
  async listRouteStops(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') routeId: string,
  ) {
    return this.routesService.listStops(user, routeId);
  }

  @Put('routes/:routeId/stops/:stopId')
  @RequirePermissions('transport:routes:manage')
  @ApiOperation({ summary: 'Update a route stop' })
  async updateRouteStop(
    @CurrentUser() user: CurrentUserPayload,
    @Param('routeId') routeId: string,
    @Param('stopId') stopId: string,
    @Body() dto: any,
  ) {
    return this.routesService.updateStop(user, routeId, stopId, dto);
  }

  // ---------------------------------------------------------------------------
  // 6. Student Assignments
  // ---------------------------------------------------------------------------

  @Post('assignments')
  @RequirePermissions('transport:assignments:manage')
  @ApiOperation({ summary: 'Assign student to a transport route' })
  async assignStudentToRoute(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.routesService.assignStudentToRoute(user, dto);
  }

  @Get('assignments')
  @RequirePermissions('transport:assignments:view')
  @ApiOperation({ summary: 'List student transport assignments' })
  async listAssignments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('routeId') routeId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.routesService.listStudentAssignments(user, routeId, studentId);
  }

  @Patch('assignments/:id/deactivate')
  @RequirePermissions('transport:assignments:manage')
  @ApiOperation({ summary: 'Deactivate a student transport assignment' })
  async deactivateAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.routesService.deactivateAssignment(user, id, dto?.reason);
  }

  // ---------------------------------------------------------------------------
  // 7. Schedules
  // ---------------------------------------------------------------------------

  @Post('schedules')
  @RequirePermissions('transport:schedules:manage')
  @ApiOperation({ summary: 'Create a transport schedule' })
  async createSchedule(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.scheduleService.createSchedule(user, dto);
  }

  @Get('schedules')
  @RequirePermissions('transport:schedules:view')
  @ApiOperation({ summary: 'List schedules' })
  async listSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Query('routeId') routeId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.scheduleService.listSchedules(user, routeId, vehicleId, date, status);
  }

  @Get('schedules/today-summary')
  @RequirePermissions('transport:schedules:view')
  @ApiOperation({ summary: 'Get today boarding summary' })
  async getTodaySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.scheduleService.getTodayBoardingSummary(user);
  }

  @Get('schedules/:id')
  @RequirePermissions('transport:schedules:view')
  @ApiOperation({ summary: 'Get schedule detail with boarding events' })
  async getSchedule(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.scheduleService.getSchedule(user, id);
  }

  @Patch('schedules/:id/status')
  @RequirePermissions('transport:schedules:manage')
  @ApiOperation({ summary: 'Update schedule status' })
  async updateScheduleStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.scheduleService.updateScheduleStatus(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 8. Boarding Events
  // ---------------------------------------------------------------------------

  @Post('boarding')
  @RequirePermissions('transport:boarding:record')
  @ApiOperation({ summary: 'Record a boarding event (boarding/drop-off/no-show)' })
  async recordBoardingEvent(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.scheduleService.recordBoardingEvent(user, dto);
  }

  @Get('boarding')
  @RequirePermissions('transport:boarding:view')
  @ApiOperation({ summary: 'List boarding events' })
  async listBoardingEvents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('scheduleId') scheduleId?: string,
    @Query('studentId') studentId?: string,
    @Query('date') date?: string,
  ) {
    return this.scheduleService.listBoardingEvents(user, scheduleId, studentId, date);
  }

  // ---------------------------------------------------------------------------
  // 9. Maintenance
  // ---------------------------------------------------------------------------

  @Post('maintenance')
  @RequirePermissions('transport:maintenance:manage')
  @ApiOperation({ summary: 'Schedule vehicle maintenance' })
  async createMaintenance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.maintenanceService.createMaintenance(user, dto);
  }

  @Get('maintenance')
  @RequirePermissions('transport:maintenance:view')
  @ApiOperation({ summary: 'List maintenance records' })
  async listMaintenances(
    @CurrentUser() user: CurrentUserPayload,
    @Query('vehicleId') vehicleId?: string,
    @Query('isCompleted') isCompleted?: string,
  ) {
    return this.maintenanceService.listMaintenances(user, vehicleId, isCompleted);
  }

  @Get('maintenance/:id')
  @RequirePermissions('transport:maintenance:view')
  @ApiOperation({ summary: 'Get maintenance record detail' })
  async getMaintenance(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.maintenanceService.getMaintenance(user, id);
  }

  @Patch('maintenance/:id/complete')
  @RequirePermissions('transport:maintenance:manage')
  @ApiOperation({ summary: 'Mark maintenance as completed' })
  async completeMaintenance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.maintenanceService.completeMaintenance(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 10. Fuel Records
  // ---------------------------------------------------------------------------

  @Post('fuel')
  @RequirePermissions('transport:maintenance:manage')
  @ApiOperation({ summary: 'Record vehicle fuel fill-up' })
  async recordFuel(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.maintenanceService.recordFuel(user, dto);
  }

  @Get('fuel')
  @RequirePermissions('transport:maintenance:view')
  @ApiOperation({ summary: 'List fuel records' })
  async listFuelRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.maintenanceService.listFuelRecords(user, vehicleId, startDate, endDate);
  }

  // ---------------------------------------------------------------------------
  // 11. Incidents
  // ---------------------------------------------------------------------------

  @Post('incidents')
  @RequirePermissions('transport:incidents:manage')
  @ApiOperation({ summary: 'Report a transport incident' })
  async reportIncident(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.maintenanceService.reportIncident(user, dto);
  }

  @Get('incidents')
  @RequirePermissions('transport:incidents:view')
  @ApiOperation({ summary: 'List incidents' })
  async listIncidents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('vehicleId') vehicleId?: string,
    @Query('isResolved') isResolved?: string,
  ) {
    return this.maintenanceService.listIncidents(user, vehicleId, isResolved);
  }

  @Get('incidents/:id')
  @RequirePermissions('transport:incidents:view')
  @ApiOperation({ summary: 'Get incident detail' })
  async getIncident(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.maintenanceService.getIncident(user, id);
  }

  @Patch('incidents/:id/resolve')
  @RequirePermissions('transport:incidents:manage')
  @ApiOperation({ summary: 'Resolve a transport incident' })
  async resolveIncident(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.maintenanceService.resolveIncident(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 12. Reports & Analytics
  // ---------------------------------------------------------------------------

  @Get('reports/fleet-summary')
  @RequirePermissions('transport:reports')
  @ApiOperation({ summary: 'Get fleet summary analytics' })
  async getFleetSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getFleetSummary(user);
  }

  @Get('reports/maintenance-cost')
  @RequirePermissions('transport:reports')
  @ApiOperation({ summary: 'Get maintenance cost report' })
  async getMaintenanceCostReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getMaintenanceCostReport(user, startDate, endDate);
  }

  @Get('reports/fuel-consumption')
  @RequirePermissions('transport:reports')
  @ApiOperation({ summary: 'Get fuel consumption report' })
  async getFuelConsumptionReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFuelConsumptionReport(user, vehicleId, startDate, endDate);
  }

  @Get('reports/incidents')
  @RequirePermissions('transport:reports')
  @ApiOperation({ summary: 'Get incident report' })
  async getIncidentReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getIncidentReport(user, startDate, endDate);
  }

  @Get('reports/defaulters')
  @RequirePermissions('transport:reports')
  @ApiOperation({ summary: 'Get students not boarding in last 3 days' })
  async getDefaultersReport(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getDefaultersReport(user);
  }
}
