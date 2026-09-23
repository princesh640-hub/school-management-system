import 'package:flutter/material.dart';
import 'core/config/desktop_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SchoolDesktopApp());
}

class SchoolDesktopApp extends StatelessWidget {
  const SchoolDesktopApp({super.key});

  static const Color primary = Color(0xFF0284C7);
  static const Color surfaceCanvas = Color(0xFFF8FAFC);
  static const Color surfaceCard = Color(0xFFFFFFFF);
  static const Color borderSubtle = Color(0xFFE2E8F0);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: DesktopConfig.appName,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          primary: primary,
          surface: surfaceCard,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: surfaceCanvas,
        cardTheme: CardTheme(
          color: surfaceCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: borderSubtle),
          ),
        ),
      ),
      debugShowCheckedModeBanner: false,
      home: const DesktopStationScaffold(),
    );
  }
}

class DesktopStationScaffold extends StatefulWidget {
  const DesktopStationScaffold({super.key});

  @override
  State<DesktopStationScaffold> createState() => _DesktopStationScaffoldState();
}

class _DesktopStationScaffoldState extends State<DesktopStationScaffold> {
  int _selectedIndex = 0;

  final List<Map<String, dynamic>> _navItems = [
    {'title': 'Executive Dashboard', 'icon': Icons.dashboard_outlined},
    {'title': 'Students & Admissions', 'icon': Icons.school_outlined},
    {'title': 'Faculty & Staff', 'icon': Icons.badge_outlined},
    {'title': 'Daily Attendance', 'icon': Icons.calendar_today_outlined},
    {'title': 'Fees & Invoicing', 'icon': Icons.receipt_long_outlined},
    {'title': 'System Settings', 'icon': Icons.settings_outlined},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          // Desktop Navigation Sidebar (Multi-Pane)
          Container(
            width: 260,
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(right: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Brand Header
                Container(
                  padding: const EdgeInsets.all(20),
                  border: const Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Text(
                            'SMS',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Academix Pro',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              'Desktop Station',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Navigation Items
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                    itemCount: _navItems.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final item = _navItems[index];
                      final isSelected = _selectedIndex == index;
                      return ListTile(
                        dense: true,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        tileColor: isSelected ? const Color(0xFFF0F9FF) : Colors.transparent,
                        leading: Icon(
                          item['icon'] as IconData,
                          size: 20,
                          color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF64748B),
                        ),
                        title: Text(
                          item['title'] as String,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF334155),
                          ),
                        ),
                        onTap: () => setState(() => _selectedIndex = index),
                      );
                    },
                  ),
                ),

                // Institutional Context Footer
                Container(
                  padding: const EdgeInsets.all(16),
                  border: const Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                  child: const Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: Color(0xFF0284C7),
                        child: Text('AD', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('System Admin', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                            Text('Downtown Campus', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Main Workspace Body
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top App Bar
                Container(
                  height: 64,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _navItems[_selectedIndex]['title'] as String,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Academic Year: 2026–2027',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF475569)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Icon(Icons.notifications_none, size: 22, color: Color(0xFF64748B)),
                        ],
                      ),
                    ],
                  ),
                ),

                // Workspace Content View
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF0F9FF),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    _navItems[_selectedIndex]['icon'] as IconData,
                                    color: const Color(0xFF0284C7),
                                    size: 28,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${_navItems[_selectedIndex]['title']} Management Pane',
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Enterprise multi-pane workstation layout connected to centralized design tokens.',
                                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const Spacer(),
                            const Center(
                              child: Text(
                                'Phase 3 Multi-Pane Desktop Interface Synchronized ✅',
                                style: TextStyle(
                                  color: Color(0xFF0284C7),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            const Spacer(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
