// =============================================================================
// Phase 4O: Mobile Student Portal Screen (Flutter)
// =============================================================================
import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class StudentPortalScreen extends StatefulWidget {
  final MobileApiClient apiClient;

  const StudentPortalScreen({super.key, required this.apiClient});

  @override
  State<StudentPortalScreen> createState() => _StudentPortalScreenState();
}

class _StudentPortalScreenState extends State<StudentPortalScreen> {
  int _selectedTabIndex = 0;
  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic>? _dashboardData;
  Map<String, dynamic>? _timetableData;
  Map<String, dynamic>? _attendanceData;
  List<dynamic> _resultsData = [];
  Map<String, dynamic>? _feesData;
  List<dynamic> _noticesData = [];

  String _selectedDay = 'MONDAY';

  @override
  void initState() {
    super.initState();
    _fetchStudentDashboard();
  }

  Future<void> _fetchStudentDashboard() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await widget.apiClient.dio.get(ApiEndpoints.studentDashboard);
      if (res.statusCode == 200) {
        setState(() {
          _dashboardData = res.data;
        });
      }

      // Pre-fetch timetable
      final ttRes = await widget.apiClient.dio.get(ApiEndpoints.studentTimetable);
      if (ttRes.statusCode == 200) {
        setState(() {
          _timetableData = ttRes.data;
        });
      }

      // Pre-fetch notices
      final notRes = await widget.apiClient.dio.get(ApiEndpoints.studentNotices);
      if (notRes.statusCode == 200 && notRes.data is List) {
        setState(() {
          _noticesData = notRes.data;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to connect to school server. Please verify your connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchAttendance() async {
    try {
      final res = await widget.apiClient.dio.get(ApiEndpoints.studentAttendance);
      if (res.statusCode == 200) {
        setState(() {
          _attendanceData = res.data;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchResults() async {
    try {
      final res = await widget.apiClient.dio.get(ApiEndpoints.studentResults);
      if (res.statusCode == 200 && res.data is List) {
        setState(() {
          _resultsData = res.data;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchFees() async {
    try {
      final res = await widget.apiClient.dio.get(ApiEndpoints.studentFees);
      if (res.statusCode == 200) {
        setState(() {
          _feesData = res.data;
        });
      }
    } catch (_) {}
  }

  void _onTabChanged(int index) {
    setState(() {
      _selectedTabIndex = index;
    });

    if (index == 2 && _attendanceData == null) {
      _fetchAttendance();
    } else if (index == 3 && _resultsData.isEmpty) {
      _fetchResults();
    } else if (index == 4 && _feesData == null) {
      _fetchFees();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Workspace'),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchStudentDashboard,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _buildErrorView()
              : RefreshIndicator(
                  onRefresh: _fetchStudentDashboard,
                  child: _buildBody(),
                ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTabIndex,
        onTap: _onTabChanged,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).primaryColor,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Today'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Timetable'),
          BottomNavigationBarItem(icon: Icon(Icons.check_circle_outline), label: 'Attendance'),
          BottomNavigationBarItem(icon: Icon(Icons.grade), label: 'Results'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet), label: 'Fees'),
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
              onPressed: _fetchStudentDashboard,
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
        return _buildTimetableTab();
      case 2:
        return _buildAttendanceTab();
      case 3:
        return _buildResultsTab();
      case 4:
        return _buildFeesTab();
      default:
        return _buildTodayTab();
    }
  }

  Widget _buildTodayTab() {
    final d = _dashboardData;
    if (d == null) {
      return const Center(child: Text('No dashboard data available'));
    }

    final attentionItems = (d['attentionItems'] as List<dynamic>?) ?? [];
    final nextExam = d['nextExam'] as Map<String, dynamic>?;
    final latestResult = d['latestResult'] as Map<String, dynamic>?;

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Welcome Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.indigo.shade100,
                  child: Text(
                    (d['fullName'] ?? 'S').substring(0, 1),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.indigo),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        d['fullName'] ?? 'Student',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Class: ${d['className']} • Sec: ${d['sectionName']}',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                      Text(
                        'Admission #${d['admissionNumber']}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Attention Banner if present
        if (attentionItems.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.amber),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    attentionItems[0]['message'] ?? '',
                    style: TextStyle(fontSize: 13, color: Colors.amber.shade900),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Quick Stats Row
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                'Today Classes',
                '${d['todayClassesCount'] ?? 0}',
                Colors.indigo,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildMetricCard(
                'Attendance',
                '${d['attendancePercentage'] ?? 100}%',
                Colors.emerald,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildMetricCard(
                'Due Balance',
                '\$${(d['feeBalanceOutstanding'] ?? 0).toString()}',
                Colors.rose,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Next Exam Card
        if (nextExam != null) ...[
          const Text('Next Examination', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Card(
            color: Colors.blue.shade50,
            child: ListTile(
              leading: const Icon(Icons.assignment, color: Colors.blue),
              title: Text(nextExam['subjectName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Date: ${nextExam['examDate']} at ${nextExam['startTime']}'),
              trailing: nextExam['roomName'] != null
                  ? Chip(label: Text('Room ${nextExam['roomName']}'))
                  : null,
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Latest Result Card
        if (latestResult != null) ...[
          const Text('Latest Result', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.star, color: Colors.amber),
              title: Text(latestResult['subjectName'] ?? ''),
              subtitle: Text('Score: ${latestResult['marksObtained']} / ${latestResult['maxMarks']}'),
              trailing: Chip(
                backgroundColor: Colors.green.shade100,
                label: Text('Grade ${latestResult['grade'] ?? 'PASS'}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Recent Notices
        if (_noticesData.isNotEmpty) ...[
          const Text('Important Notices', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          ..._noticesData.take(3).map((n) => Card(
                child: ListTile(
                  title: Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(n['content'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: Chip(label: Text(n['priority'] ?? 'NORMAL', style: const TextStyle(fontSize: 10))),
                ),
              )),
        ],
      ],
    );
  }

  Widget _buildMetricCard(String title, String value, MaterialColor color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14.0, horizontal: 8.0),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color.shade700)),
            const SizedBox(height: 4),
            Text(title, style: TextStyle(fontSize: 11, color: Colors.grey.shade600), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildTimetableTab() {
    final weekly = _timetableData?['weeklyEntries'] as Map<String, dynamic>?;
    final dayEntries = (weekly?[_selectedDay] as List<dynamic>?) ?? [];

    return Column(
      children: [
        // Day selector chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((day) {
              final isSelected = _selectedDay == day;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ChoiceChip(
                  label: Text(day.substring(0, 3)),
                  selected: isSelected,
                  onSelected: (val) {
                    if (val) setState(() => _selectedDay = day);
                  },
                ),
              );
            }).toList(),
          ),
        ),
        Expanded(
          child: dayEntries.isEmpty
              ? const Center(child: Text('No classes scheduled for this day.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: dayEntries.length,
                  itemBuilder: (ctx, idx) {
                    final e = dayEntries[idx];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Text('${e['periodNumber'] ?? (idx + 1)}'),
                        ),
                        title: Text(e['subjectName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${e['startTime']} – ${e['endTime']} • ${e['teacherName'] ?? 'TBA'}'),
                        trailing: e['roomNumber'] != null ? Chip(label: Text('Rm ${e['roomNumber']}')) : null,
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildAttendanceTab() {
    final att = _attendanceData;
    if (att == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final records = (att['recentRecords'] as List<dynamic>?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: Colors.emerald.shade50,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    Text('${att['attendancePercentage']}%', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.emerald.shade800)),
                    const Text('Attendance Rate', style: TextStyle(fontSize: 12)),
                  ],
                ),
                Column(
                  children: [
                    Text('${att['presentDays']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const Text('Present', style: TextStyle(fontSize: 12)),
                  ],
                ),
                Column(
                  children: [
                    Text('${att['absentDays']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.red)),
                    const Text('Absent', style: TextStyle(fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text('Attendance Log', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 8),
        ...records.map((r) => Card(
              child: ListTile(
                title: Text(r['date'] ?? ''),
                subtitle: Text(r['remarks'] ?? 'Normal attendance'),
                trailing: Chip(
                  label: Text(r['status'] ?? 'PRESENT'),
                  backgroundColor: r['status'] == 'PRESENT' ? Colors.green.shade100 : Colors.red.shade100,
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildResultsTab() {
    if (_resultsData.isEmpty) {
      return const Center(child: Text('No published examination results yet.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _resultsData.length,
      itemBuilder: (ctx, idx) {
        final r = _resultsData[idx];
        return Card(
          child: ListTile(
            title: Text(r['subjectName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Exam: ${r['examSessionName']} • Score: ${r['marksObtained']}/${r['maxMarks']} (${r['percentage']}%)'),
            trailing: Chip(
              label: Text('Grade ${r['grade'] ?? 'PASS'}'),
              backgroundColor: r['isPassed'] == true ? Colors.green.shade100 : Colors.red.shade100,
            ),
          ),
        );
      },
    );
  }

  Widget _buildFeesTab() {
    final fees = _feesData;
    if (fees == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final invoices = (fees['invoices'] as List<dynamic>?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Outstanding Dues:', style: TextStyle(fontSize: 16)),
                Text(
                  '\$${(fees['balanceOutstanding'] ?? 0).toString()}',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.red.shade700),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text('Invoices', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 8),
        ...invoices.map((inv) => Card(
              child: ListTile(
                title: Text('Invoice #${inv['invoiceNumber']}'),
                subtitle: Text('Due: ${inv['dueDate']} • Total: \$${inv['totalAmount']}'),
                trailing: Chip(
                  label: Text(inv['status'] ?? 'UNPAID'),
                  backgroundColor: inv['remainingBalance'] == 0 ? Colors.green.shade100 : Colors.amber.shade100,
                ),
              ),
            )),
      ],
    );
  }
}
