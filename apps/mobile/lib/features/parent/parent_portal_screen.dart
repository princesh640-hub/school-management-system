// =============================================================================
// Phase 4N: Mobile Parent Portal Screen (Flutter)
// =============================================================================
import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class ParentPortalScreen extends StatefulWidget {
  final MobileApiClient apiClient;

  const ParentPortalScreen({super.key, required this.apiClient});

  @override
  State<ParentPortalScreen> createState() => _ParentPortalScreenState();
}

class _ParentPortalScreenState extends State<ParentPortalScreen> {
  int _selectedTabIndex = 0;
  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _children = [];
  String? _selectedStudentId;
  Map<String, dynamic>? _overviewData;
  Map<String, dynamic>? _attendanceData;
  List<dynamic> _resultsData = [];
  Map<String, dynamic>? _feesData;
  List<dynamic> _noticesData = [];

  @override
  void initState() {
    super.initState();
    _fetchChildren();
  }

  Future<void> _fetchChildren() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await widget.apiClient.dio.get(ApiEndpoints.parentChildren);
      if (res.statusCode == 200 && res.data is List) {
        final list = res.data as List<dynamic>;
        setState(() {
          _children = list;
          if (list.isNotEmpty && _selectedStudentId == null) {
            _selectedStudentId = list[0]['studentId'];
          }
        });

        if (_selectedStudentId != null) {
          await _fetchChildData(_selectedStudentId!);
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to connect to school servers. Please check your network connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchChildData(String studentId) async {
    setState(() {
      _overviewData = null;
      _attendanceData = null;
      _resultsData = [];
      _feesData = null;
    });

    try {
      final ovRes = await widget.apiClient.dio.get(
        '${ApiEndpoints.parent}/children/$studentId/overview',
      );
      if (ovRes.statusCode == 200) {
        setState(() {
          _overviewData = ovRes.data;
        });
      }

      final attRes = await widget.apiClient.dio.get(
        '${ApiEndpoints.parent}/children/$studentId/attendance',
      );
      if (attRes.statusCode == 200) {
        setState(() {
          _attendanceData = attRes.data;
        });
      }

      final resRes = await widget.apiClient.dio.get(
        '${ApiEndpoints.parent}/children/$studentId/results',
      );
      if (resRes.statusCode == 200 && resRes.data is List) {
        setState(() {
          _resultsData = resRes.data;
        });
      }

      final feeRes = await widget.apiClient.dio.get(
        '${ApiEndpoints.parent}/children/$studentId/fees',
      );
      if (feeRes.statusCode == 200) {
        setState(() {
          _feesData = feeRes.data;
        });
      }
    } catch (_) {
      // Graceful offline fallback
    }
  }

  void _onSelectChild(String studentId) {
    if (_selectedStudentId == studentId) return;
    setState(() {
      _selectedStudentId = studentId;
    });
    _fetchChildData(studentId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent & Guardian Portal'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (_selectedStudentId != null) {
                _fetchChildData(_selectedStudentId!);
              } else {
                _fetchChildren();
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 14),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchChildren,
                          child: const Text('Retry Connection'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    if (_selectedStudentId != null) {
                      await _fetchChildData(_selectedStudentId!);
                    }
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Child Selector Row
                      if (_children.isNotEmpty) ...[
                        const Text(
                          'YOUR CHILDREN',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 48,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _children.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemBuilder: (context, index) {
                              final child = _children[index];
                              final isSelected = child['studentId'] == _selectedStudentId;
                              return ChoiceChip(
                                label: Text(child['fullName'] ?? 'Student'),
                                selected: isSelected,
                                onSelected: (_) => _onSelectChild(child['studentId']),
                                avatar: CircleAvatar(
                                  backgroundColor: isSelected ? Colors.white : Colors.grey.shade300,
                                  child: Text(
                                    (child['firstName'] ?? 'S')[0],
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isSelected ? const Color(0xFF1E3A8A) : Colors.black87,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Active View based on Bottom Nav
                      if (_selectedTabIndex == 0) _buildOverviewTab(),
                      if (_selectedTabIndex == 1) _buildAttendanceTab(),
                      if (_selectedTabIndex == 2) _buildResultsTab(),
                      if (_selectedTabIndex == 3) _buildFeesTab(),
                    ],
                  ),
                ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTabIndex,
        type: BottomNavigationBarType.fixed,
        onTap: (index) => setState(() => _selectedTabIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Attendance'),
          BottomNavigationBarItem(icon: Icon(Icons.grade), label: 'Results'),
          BottomNavigationBarItem(icon: Icon(Icons.payment), label: 'Fees'),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    final attendance = _overviewData?['attendance'];
    final fees = _overviewData?['fees'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Attendance Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                const Icon(Icons.school, size: 40, color: Color(0xFF1E3A8A)),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Attendance Rate', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text(
                      attendance != null ? '${attendance['monthPercentage']}%' : '—',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const Spacer(),
                if (attendance != null && attendance['todayStatus'] != null)
                  Chip(
                    label: Text(attendance['todayStatus']),
                    backgroundColor: attendance['todayStatus'] == 'PRESENT'
                        ? Colors.green.shade100
                        : Colors.red.shade100,
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Fee Summary Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                const Icon(Icons.account_balance_wallet, size: 40, color: Color(0xFF1E3A8A)),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Outstanding Fees', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text(
                      fees != null ? '\$${fees['balanceOutstanding']}' : '—',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: (fees?['balanceOutstanding'] ?? 0) > 0 ? Colors.red : Colors.green,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceTab() {
    final records = (_attendanceData?['records'] as List<dynamic>?) ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Attendance History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (records.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: Text('No attendance records logged.')),
          )
        else
          ...records.map(
            (r) => ListTile(
              title: Text(r['date'] ?? ''),
              trailing: Chip(
                label: Text(r['status'] ?? ''),
                backgroundColor: r['status'] == 'PRESENT' ? Colors.green.shade100 : Colors.red.shade100,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildResultsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Published Examination Results', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (_resultsData.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: Text('No published exam results available.')),
          )
        else
          ..._resultsData.map(
            (r) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(r['subjectName'] ?? ''),
                subtitle: Text('${r['examSessionName']} • Grade: ${r['grade'] ?? '—'}'),
                trailing: Text(
                  '${r['percentage']}%',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildFeesTab() {
    final invoices = (_feesData?['invoices'] as List<dynamic>?) ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Fee Invoices', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (invoices.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: Text('No fee invoices found.')),
          )
        else
          ...invoices.map(
            (inv) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(inv['feeStructureName'] ?? ''),
                subtitle: Text('Due: ${inv['dueDate']} • #${inv['invoiceNumber']}'),
                trailing: Text(
                  '\$${inv['amount']}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
