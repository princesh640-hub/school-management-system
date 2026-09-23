// =============================================================================
// Phase 4P: Mobile Teacher Portal Screen (Flutter)
// Complete primary digital workspace for educators with strict assignment scope
// =============================================================================
import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class TeacherPortalScreen extends StatefulWidget {
  final MobileApiClient apiClient;

  const TeacherPortalScreen({super.key, required this.apiClient});

  @override
  State<TeacherPortalScreen> createState() => _TeacherPortalScreenState();
}

class _TeacherPortalScreenState extends State<TeacherPortalScreen> {
  int _selectedTabIndex = 0;
  bool _isLoading = true;
  String? _errorMessage;

  // Cached Domain Data
  Map<String, dynamic>? _dashboardData;
  Map<String, dynamic>? _profileData;
  List<dynamic> _classesData = [];
  Map<String, dynamic>? _timetableData;
  List<dynamic> _examsData = [];
  Map<String, dynamic>? _leaveData;
  List<dynamic> _noticesData = [];

  // Fast Attendance State
  String? _selectedAttendanceSectionId;
  DateTime _selectedAttendanceDate = DateTime.now();
  Map<String, dynamic>? _attendanceRoster;
  bool _isMarkingAttendance = false;
  final Map<String, String> _attendanceStatusMap = {}; // studentId -> status

  // Marks Entry State
  String? _selectedExamScheduleId;
  Map<String, dynamic>? _marksRoster;
  bool _isSavingMarks = false;
  final Map<String, TextEditingController> _marksControllers = {};

  @override
  void initState() {
    super.initState();
    _fetchTeacherDashboard();
  }

  @override
  void dispose() {
    for (final c in _marksControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchTeacherDashboard() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dashRes = await widget.apiClient.dio.get(ApiEndpoints.teacherDashboard);
      if (dashRes.statusCode == 200) {
        _dashboardData = dashRes.data;
      }

      // Pre-load classes
      final classesRes = await widget.apiClient.dio.get(ApiEndpoints.teacherClasses);
      if (classesRes.statusCode == 200 && classesRes.data is List) {
        _classesData = classesRes.data;
        if (_classesData.isNotEmpty && _selectedAttendanceSectionId == null) {
          _selectedAttendanceSectionId = _classesData[0]['id'];
        }
      }

      // Pre-load timetable
      final ttRes = await widget.apiClient.dio.get(ApiEndpoints.teacherTimetable);
      if (ttRes.statusCode == 200) {
        _timetableData = ttRes.data;
      }

      // Pre-load exams
      final examRes = await widget.apiClient.dio.get(ApiEndpoints.teacherExams);
      if (examRes.statusCode == 200 && examRes.data is List) {
        _examsData = examRes.data;
        if (_examsData.isNotEmpty && _selectedExamScheduleId == null) {
          _selectedExamScheduleId = _examsData[0]['examScheduleId'];
        }
      }

      // Pre-load notices
      final notRes = await widget.apiClient.dio.get(ApiEndpoints.teacherNotices);
      if (notRes.statusCode == 200 && notRes.data is List) {
        _noticesData = notRes.data;
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to connect to academic system. Please verify your connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadAttendanceRoster() async {
    if (_selectedAttendanceSectionId == null) return;
    setState(() => _isMarkingAttendance = true);

    try {
      final dateStr = _selectedAttendanceDate.toIso8601String().split('T')[0];
      final res = await widget.apiClient.dio.get(
        ApiEndpoints.teacherAttendance,
        queryParameters: {
          'sectionId': _selectedAttendanceSectionId,
          'date': dateStr,
        },
      );

      if (res.statusCode == 200) {
        final data = res.data as Map<String, dynamic>;
        setState(() {
          _attendanceRoster = data;
          _attendanceStatusMap.clear();
          final students = (data['students'] as List<dynamic>?) ?? [];
          for (final s in students) {
            _attendanceStatusMap[s['studentId']] = s['status'] ?? 'PRESENT';
          }
        });
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load class attendance roster.')),
      );
    } finally {
      setState(() => _isMarkingAttendance = false);
    }
  }

  Future<void> _submitAttendance() async {
    if (_selectedAttendanceSectionId == null || _attendanceStatusMap.isEmpty) return;
    setState(() => _isMarkingAttendance = true);

    try {
      final dateStr = _selectedAttendanceDate.toIso8601String().split('T')[0];
      final records = _attendanceStatusMap.entries.map((e) => {
        'studentId': e.key,
        'status': e.value,
      }).toList();

      final res = await widget.apiClient.dio.post(
        ApiEndpoints.teacherAttendance,
        data: {
          'sectionId': _selectedAttendanceSectionId,
          'date': dateStr,
          'records': records,
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Daily attendance submitted and locked successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        _loadAttendanceRoster();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to record attendance. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isMarkingAttendance = false);
    }
  }

  void _markAllAttendance(String status) {
    setState(() {
      for (final key in _attendanceStatusMap.keys) {
        _attendanceStatusMap[key] = status;
      }
    });
  }

  Future<void> _loadMarksRoster() async {
    if (_selectedExamScheduleId == null) return;
    setState(() => _isSavingMarks = true);

    try {
      final res = await widget.apiClient.dio.get(
        '${ApiEndpoints.teacherMarks}/$_selectedExamScheduleId',
      );

      if (res.statusCode == 200) {
        final data = res.data as Map<String, dynamic>;
        setState(() {
          _marksRoster = data;
          _marksControllers.clear();
          final students = (data['students'] as List<dynamic>?) ?? [];
          for (final s in students) {
            final marks = s['marksObtained'] != null ? s['marksObtained'].toString() : '';
            _marksControllers[s['studentId']] = TextEditingController(text: marks);
          }
        });
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load exam marks roster.')),
      );
    } finally {
      setState(() => _isSavingMarks = false);
    }
  }

  Future<void> _saveMarks({required bool isDraft}) async {
    if (_selectedExamScheduleId == null || _marksRoster == null) return;
    setState(() => _isSavingMarks = true);

    try {
      final maxMarks = (_marksRoster!['maxMarks'] as num?)?.toDouble() ?? 100.0;
      final marks = <Map<String, dynamic>>[];

      for (final entry in _marksControllers.entries) {
        final valStr = entry.value.text.trim();
        if (valStr.isNotEmpty) {
          final val = double.tryParse(valStr);
          if (val == null || val < 0 || val > maxMarks) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Invalid mark: $valStr. Must be between 0 and $maxMarks.'),
                backgroundColor: Colors.orange,
              ),
            );
            setState(() => _isSavingMarks = false);
            return;
          }
          marks.add({
            'studentId': entry.key,
            'marksObtained': val,
            'isAbsent': false,
          });
        }
      }

      final res = await widget.apiClient.dio.post(
        ApiEndpoints.teacherMarks,
        data: {
          'examScheduleId': _selectedExamScheduleId,
          'isDraft': isDraft,
          'marks': marks,
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isDraft ? 'Marks draft saved.' : 'Marks submitted to examination authority!'),
            backgroundColor: isDraft ? Colors.blue : Colors.green,
          ),
        );
        _loadMarksRoster();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to save marks. Check assignment authorization.'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isSavingMarks = false);
    }
  }

  Future<void> _fetchLeaveData() async {
    try {
      final res = await widget.apiClient.dio.get(ApiEndpoints.teacherLeave);
      if (res.statusCode == 200) {
        setState(() {
          _leaveData = res.data;
        });
      }
    } catch (_) {}
  }

  void _onTabChanged(int index) {
    setState(() => _selectedTabIndex = index);
    if (index == 1 && _attendanceRoster == null && _selectedAttendanceSectionId != null) {
      _loadAttendanceRoster();
    } else if (index == 2 && _marksRoster == null && _selectedExamScheduleId != null) {
      _loadMarksRoster();
    } else if (index == 4 && _leaveData == null) {
      _fetchLeaveData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Faculty Command Center'),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTeacherDashboard,
            tooltip: 'Refresh Workspace',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _buildErrorView()
              : RefreshIndicator(
                  onRefresh: _fetchTeacherDashboard,
                  child: _buildBody(),
                ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTabIndex,
        onTap: _onTabChanged,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).primaryColor,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Today'),
          BottomNavigationBarItem(icon: Icon(Icons.fact_check_outlined), activeIcon: Icon(Icons.fact_check), label: 'Attendance'),
          BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: 'Marks'),
          BottomNavigationBarItem(icon: Icon(Icons.groups_outlined), activeIcon: Icon(Icons.groups), label: 'Classes'),
          BottomNavigationBarItem(icon: Icon(Icons.person_pin_outlined), activeIcon: Icon(Icons.person_pin), label: 'Self-Service'),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'Network error',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchTeacherDashboard,
              child: const Text('Retry Connection'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_selectedTabIndex) {
      case 0:
        return _buildTodayTab();
      case 1:
        return _buildAttendanceTab();
      case 2:
        return _buildMarksTab();
      case 3:
        return _buildClassesTab();
      case 4:
        return _buildSelfServiceTab();
      default:
        return _buildTodayTab();
    }
  }

  // ---------------------------------------------------------------------------
  // TAB 1: TODAY & SCHEDULE
  // ---------------------------------------------------------------------------
  Widget _buildTodayTab() {
    final d = _dashboardData;
    if (d == null) return const Center(child: Text('No dashboard data available'));

    final teacher = d['teacher'] as Map<String, dynamic>? ?? {};
    final pendingAttendance = (d['pendingAttendanceSections'] as List<dynamic>?) ?? [];
    final pendingMarks = (d['pendingMarksExams'] as List<dynamic>?) ?? [];
    final todaySchedule = (d['todaySchedule'] as List<dynamic>?) ?? [];
    final upcomingExams = (d['upcomingExams'] as List<dynamic>?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Welcome Card
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.blue.shade100,
                  child: Text(
                    (teacher['fullName'] ?? 'T').substring(0, 1),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        teacher['fullName'] ?? 'Faculty Member',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'ID: ${teacher['employeeNumber'] ?? 'N/A'} • ${teacher['designation'] ?? 'Teacher'}',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Department: ${teacher['department'] ?? 'Academics'}',
                        style: const TextStyle(fontSize: 12, color: Colors.indigo, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Urgent Action Alerts
        if (pendingAttendance.isNotEmpty || pendingMarks.isNotEmpty) ...[
          const Text('Action Required', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...pendingAttendance.map((sec) => Card(
                color: Colors.amber.shade50,
                child: ListTile(
                  leading: const Icon(Icons.warning_amber, color: Colors.orange),
                  title: Text('Pending Attendance: ${sec['className']} - ${sec['sectionName']}'),
                  subtitle: Text('${sec['studentCount']} students awaiting daily roll call'),
                  trailing: TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedAttendanceSectionId = sec['sectionId'];
                        _selectedTabIndex = 1;
                      });
                      _loadAttendanceRoster();
                    },
                    child: const Text('Mark Now'),
                  ),
                ),
              )),
          ...pendingMarks.map((ex) => Card(
                color: Colors.blue.shade50,
                child: ListTile(
                  leading: const Icon(Icons.edit_note, color: Colors.blue),
                  title: Text('Pending Marks: ${ex['examName']} - ${ex['subjectName']}'),
                  subtitle: Text('${ex['className']} (${ex['sectionName']})'),
                  trailing: TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedExamScheduleId = ex['examScheduleId'];
                        _selectedTabIndex = 2;
                      });
                      _loadMarksRoster();
                    },
                    child: const Text('Enter Marks'),
                  ),
                ),
              )),
          const SizedBox(height: 16),
        ],

        // Today's Teaching Periods
        const Text("Today's Timetable", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (todaySchedule.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Center(
                child: Text('No classes scheduled for today.', style: TextStyle(color: Colors.grey.shade600)),
              ),
            ),
          )
        else
          ...todaySchedule.map((slot) => Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.blue.shade50,
                    child: Text(
                      'P${slot['periodNumber'] ?? '1'}',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
                    ),
                  ),
                  title: Text('${slot['subjectName']} (${slot['subjectCode'] ?? ''})'),
                  subtitle: Text('${slot['className']} - ${slot['sectionName']} • Room: ${slot['roomNumber'] ?? 'TBD'}'),
                  trailing: Text(
                    '${slot['startTime']} - ${slot['endTime']}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              )),
        const SizedBox(height: 16),

        // Upcoming Exam Duties
        if (upcomingExams.isNotEmpty) ...[
          const Text('Upcoming Examinations', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...upcomingExams.map((ex) => Card(
                child: ListTile(
                  leading: const Icon(Icons.school, color: Colors.indigo),
                  title: Text('${ex['examName']} - ${ex['subjectName']}'),
                  subtitle: Text('Date: ${ex['date']} • Time: ${ex['startTime']} - ${ex['endTime']}'),
                  trailing: Chip(
                    label: Text(ex['role'] ?? 'Evaluator', style: const TextStyle(fontSize: 11)),
                  ),
                ),
              )),
        ],
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 2: FAST ATTENDANCE
  // ---------------------------------------------------------------------------
  Widget _buildAttendanceTab() {
    return Column(
      children: [
        // Filter & Quick Controls Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          color: Colors.grey.shade100,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedAttendanceSectionId,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Assigned Class Section',
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(),
                      ),
                      items: _classesData.map<DropdownMenuItem<String>>((c) {
                        return DropdownMenuItem<String>(
                          value: c['id'],
                          child: Text('${c['className']} - ${c['name']}'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedAttendanceSectionId = val;
                          _attendanceRoster = null;
                        });
                        _loadAttendanceRoster();
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton(
                    icon: const Icon(Icons.calendar_month),
                    tooltip: 'Change Date',
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedAttendanceDate,
                        firstDate: DateTime.now().subtract(const Duration(days: 30)),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) {
                        setState(() {
                          _selectedAttendanceDate = picked;
                          _attendanceRoster = null;
                        });
                        _loadAttendanceRoster();
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Date: ${_selectedAttendanceDate.toIso8601String().split('T')[0]}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: () => _markAllAttendance('PRESENT'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: const Text('All Present'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => _markAllAttendance('ABSENT'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: const Text('All Absent'),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),

        // Roster Body
        Expanded(
          child: _isMarkingAttendance
              ? const Center(child: CircularProgressIndicator())
              : _attendanceRoster == null
                  ? const Center(child: Text('Select an assigned section to mark attendance'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: (_attendanceRoster!['students'] as List<dynamic>?)?.length ?? 0,
                      itemBuilder: (context, idx) {
                        final s = _attendanceRoster!['students'][idx];
                        final studentId = s['studentId'];
                        final currentStatus = _attendanceStatusMap[studentId] ?? 'PRESENT';

                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          child: Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 18,
                                  backgroundColor: Colors.grey.shade200,
                                  child: Text(
                                    s['rollNumber'] != null ? '${s['rollNumber']}' : '${idx + 1}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s['fullName'] ?? 'Student',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      Text(
                                        'Adm: ${s['admissionNumber'] ?? 'N/A'}',
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                      ),
                                    ],
                                  ),
                                ),
                                // Toggle status segmented control
                                Wrap(
                                  spacing: 4,
                                  children: [
                                    _buildStatusChip(studentId, 'PRESENT', 'P', Colors.green, currentStatus),
                                    _buildStatusChip(studentId, 'LATE', 'L', Colors.orange, currentStatus),
                                    _buildStatusChip(studentId, 'ABSENT', 'A', Colors.red, currentStatus),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),

        // Bottom Submission Bar
        if (_attendanceRoster != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, -2))
              ],
            ),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle),
                label: const Text('Lock & Submit Attendance', style: TextStyle(fontSize: 16)),
                onPressed: _submitAttendance,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildStatusChip(String studentId, String status, String label, MaterialColor color, String activeStatus) {
    final isSelected = activeStatus == status;
    return InkWell(
      onTap: () {
        setState(() {
          _attendanceStatusMap[studentId] = status;
        });
      },
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? color : color.shade50,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color, width: isSelected ? 2 : 1),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : color.shade900,
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 3: MARKS ENTRY
  // ---------------------------------------------------------------------------
  Widget _buildMarksTab() {
    return Column(
      children: [
        // Exam Selector Bar
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.grey.shade100,
          child: DropdownButtonFormField<String>(
            value: _selectedExamScheduleId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Select Scheduled Exam',
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(),
            ),
            items: _examsData.map<DropdownMenuItem<String>>((ex) {
              return DropdownMenuItem<String>(
                value: ex['examScheduleId'],
                child: Text('${ex['examName']} - ${ex['subjectName']} (${ex['className']})'),
              );
            }).toList(),
            onChanged: (val) {
              setState(() {
                _selectedExamScheduleId = val;
                _marksRoster = null;
              });
              _loadMarksRoster();
            },
          ),
        ),

        // Marks Table
        Expanded(
          child: _isSavingMarks
              ? const Center(child: CircularProgressIndicator())
              : _marksRoster == null
                  ? const Center(child: Text('Select an authorized exam to enter marks'))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Max Marks: ${_marksRoster!['maxMarks']} • Pass: ${_marksRoster!['passMarks']}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Chip(
                                label: Text(
                                  _marksRoster!['status'] ?? 'DRAFT',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            itemCount: (_marksRoster!['students'] as List<dynamic>?)?.length ?? 0,
                            itemBuilder: (context, idx) {
                              final s = _marksRoster!['students'][idx];
                              final studentId = s['studentId'];
                              final controller = _marksControllers[studentId];

                              return Card(
                                margin: const EdgeInsets.symmetric(vertical: 4),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              s['fullName'] ?? 'Student',
                                              style: const TextStyle(fontWeight: FontWeight.bold),
                                            ),
                                            Text(
                                              'Roll: ${s['rollNumber'] ?? 'N/A'} • Adm: ${s['admissionNumber'] ?? 'N/A'}',
                                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                            ),
                                          ],
                                        ),
                                      ),
                                      SizedBox(
                                        width: 90,
                                        child: TextField(
                                          controller: controller,
                                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                          decoration: InputDecoration(
                                            hintText: 'Marks',
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                            border: const OutlineInputBorder(),
                                            suffixText: '/${_marksRoster!['maxMarks']}',
                                            suffixStyle: const TextStyle(fontSize: 10),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
        ),

        // Action Buttons
        if (_marksRoster != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, -2))
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _saveMarks(isDraft: true),
                    child: const Text('Save Draft'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _saveMarks(isDraft: false),
                    child: const Text('Final Submit'),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 4: ASSIGNED CLASSES & SECTIONS
  // ---------------------------------------------------------------------------
  Widget _buildClassesTab() {
    if (_classesData.isEmpty) {
      return const Center(child: Text('No assigned teaching sections found.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _classesData.length,
      itemBuilder: (context, idx) {
        final sec = _classesData[idx];
        final isClassTeacher = sec['isClassTeacher'] == true;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${sec['className']} - Section ${sec['name']}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    if (isClassTeacher)
                      const Chip(
                        label: Text('Class Teacher', style: TextStyle(fontSize: 10, color: Colors.white)),
                        backgroundColor: Colors.indigo,
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Enrolled Students: ${sec['studentCount'] ?? 0}'),
                if (sec['room'] != null) Text('Assigned Room: ${sec['room']}'),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      icon: const Icon(Icons.fact_check, size: 16),
                      label: const Text('Take Attendance'),
                      onPressed: () {
                        setState(() {
                          _selectedAttendanceSectionId = sec['id'];
                          _selectedTabIndex = 1;
                        });
                        _loadAttendanceRoster();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 5: SELF-SERVICE & LEAVE
  // ---------------------------------------------------------------------------
  Widget _buildSelfServiceTab() {
    final l = _leaveData;
    final balances = (l?['balances'] as List<dynamic>?) ?? [];
    final applications = (l?['applications'] as List<dynamic>?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Leave Balances Card
        const Text('My Leave Entitlements', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (balances.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                'Leave balances are synchronized with HR Timesheets.',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ),
          )
        else
          Row(
            children: balances.map((b) {
              return Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Text(
                          '${b['remaining'] ?? 0}',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.blue),
                        ),
                        Text(
                          b['leaveType'] ?? 'Leave',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          'of ${b['totalAllocated'] ?? 0} days',
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        const SizedBox(height: 16),

        // Notices & Announcements
        const Text('School Notices & Bulletins', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (_noticesData.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text('No announcements at this time.', style: TextStyle(color: Colors.grey.shade600)),
            ),
          )
        else
          ..._noticesData.map((not) => Card(
                child: ListTile(
                  leading: const Icon(Icons.campaign, color: Colors.blue),
                  title: Text(not['title'] ?? 'Notice'),
                  subtitle: Text(not['content'] ?? ''),
                  trailing: Text(
                    not['publishedAt'] != null ? not['publishedAt'].toString().split('T')[0] : '',
                    style: const TextStyle(fontSize: 10),
                  ),
                ),
              )),
        const SizedBox(height: 16),

        // Recent Leave Requests
        const Text('Recent Leave Applications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (applications.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text('No recent leave applications submitted.', style: TextStyle(color: Colors.grey.shade600)),
            ),
          )
        else
          ...applications.map((app) => Card(
                child: ListTile(
                  leading: Icon(
                    app['status'] == 'APPROVED' ? Icons.check_circle : Icons.pending,
                    color: app['status'] == 'APPROVED' ? Colors.green : Colors.orange,
                  ),
                  title: Text('${app['leaveType']} (${app['daysCount']} days)'),
                  subtitle: Text('${app['startDate']} to ${app['endDate']} • Reason: ${app['reason']}'),
                  trailing: Chip(
                    label: Text(app['status'] ?? 'PENDING', style: const TextStyle(fontSize: 10)),
                  ),
                ),
              )),
      ],
    );
  }
}
