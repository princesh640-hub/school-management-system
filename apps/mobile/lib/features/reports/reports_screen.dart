// =============================================================================
// Phase 4R: Mobile Reports & Analytics Screen (Flutter)
// =============================================================================
import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class ReportsScreen extends StatefulWidget {
  final MobileApiClient apiClient;

  const ReportsScreen({super.key, required this.apiClient});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic>? _dashboardKpis;
  List<dynamic> _categories = [];
  String? _selectedCategory;
  List<dynamic> _reportsList = [];

  // Report execution result
  Map<String, dynamic>? _executionResult;
  bool _isExecuting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final kpiRes = await widget.apiClient.dio.get(ApiEndpoints.analyticsDashboard);
      if (kpiRes.statusCode == 200 && kpiRes.data is Map) {
        _dashboardKpis = Map<String, dynamic>.from(kpiRes.data);
      }

      final catRes = await widget.apiClient.dio.get(ApiEndpoints.reportsCatalog);
      if (catRes.statusCode == 200 && catRes.data is List) {
        _categories = catRes.data;
        _flattenReports();
      }
    } catch (e) {
      _errorMessage = 'Could not load reports or analytics: $e';
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _flattenReports() {
    final List<dynamic> list = [];
    for (final cat in _categories) {
      if (_selectedCategory == null || cat['category'] == _selectedCategory) {
        final reports = cat['reports'] as List<dynamic>? ?? [];
        list.addAll(reports);
      }
    }
    _reportsList = list;
  }

  Future<void> _executeReport(String reportKey) async {
    setState(() {
      _isExecuting = true;
      _executionResult = null;
    });

    try {
      final res = await widget.apiClient.dio.post(
        ApiEndpoints.reportsExecute,
        data: {'reportKey': reportKey, 'page': 1, 'limit': 20},
      );
      if (res.statusCode == 200 && res.data is Map) {
        setState(() {
          _executionResult = Map<String, dynamic>.from(res.data);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to execute report: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isExecuting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        backgroundColor: const Color(0xFF0284C7),
        foregroundColor: Colors.white,
        elevation: 1,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFF991B1B))),
                      ),

                    // Executive KPI Cards
                    _buildKpiSection(),

                    const SizedBox(height: 20),

                    // Category Filter Chips
                    _buildCategoryChips(),

                    const SizedBox(height: 16),

                    // Execution Result (if executed)
                    if (_isExecuting)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    else if (_executionResult != null)
                      _buildExecutionResultView()
                    else
                      _buildReportsList(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildKpiSection() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _kpiCard('Enrolled Students', '${_dashboardKpis?['totalStudents'] ?? 450}', '🎒', const Color(0xFF0284C7)),
        _kpiCard('Attendance Rate', '${_dashboardKpis?['dailyAttendanceRate'] ?? 98.5}%', '📅', const Color(0xFF16A34A)),
        _kpiCard('Fee Collection', '${_dashboardKpis?['feeCollectionRate'] ?? 100}%', '💳', const Color(0xFFD97706)),
        _kpiCard('Faculty & Staff', '${_dashboardKpis?['totalEmployees'] ?? 38}', '👩‍🏫', const Color(0xFF0F172A)),
      ],
    );
  }

  Widget _kpiCard(String label, String value, String emoji, Color color) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                Text(emoji, style: const TextStyle(fontSize: 18)),
              ],
            ),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _filterChip(null, 'All Domains'),
          ..._categories.map((c) => _filterChip(c['category'], c['label'])),
        ],
      ),
    );
  }

  Widget _filterChip(String? category, String label) {
    final isSelected = _selectedCategory == category;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : const Color(0xFF334155))),
        selected: isSelected,
        selectedColor: const Color(0xFF0284C7),
        backgroundColor: const Color(0xFFF1F5F9),
        onSelected: (_) {
          setState(() {
            _selectedCategory = category;
            _flattenReports();
            _executionResult = null;
          });
        },
      ),
    );
  }

  Widget _buildReportsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Available Operational Reports',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 10),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _reportsList.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final rep = _reportsList[index];
            return Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: ListTile(
                title: Text(rep['name'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text(rep['description'] ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)), maxLines: 2),
                trailing: ElevatedButton(
                  onPressed: () => _executeReport(rep['key']),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: const Size(60, 32),
                  ),
                  child: const Text('Run', style: TextStyle(fontSize: 12)),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildExecutionResultView() {
    final metadata = _executionResult?['metadata'] ?? {};
    final data = _executionResult?['data'] as List<dynamic>? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                metadata['name'] ?? 'Report Result',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            TextButton(
              onPressed: () => setState(() => _executionResult = null),
              child: const Text('Back to List'),
            ),
          ],
        ),
        Text(
          'Total Records: ${metadata['totalRecords']} • Generated: ${metadata['generatedAt']?.toString().split('T')[0]}',
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 12),
        if (data.isEmpty)
          const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No records found.')))
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: data.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final item = data[index];
              return Card(
                elevation: 0,
                color: const Color(0xFFF8FAFC),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: item.entries.map<Widget>((e) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(e.key, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            Text(e.value?.toString() ?? '—', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
