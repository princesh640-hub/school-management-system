// =============================================================================
// Phase 4Q: Mobile Documents & Certificates Screen (Flutter)
// =============================================================================
import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class DocumentsScreen extends StatefulWidget {
  final MobileApiClient apiClient;

  const DocumentsScreen({super.key, required this.apiClient});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  int _selectedTab = 0;
  bool _isLoading = false;
  String? _errorMessage;

  List<dynamic> _documents = [];
  List<dynamic> _certificates = [];

  // Certificate Verifier state
  final TextEditingController _refController = TextEditingController();
  Map<String, dynamic>? _verificationResult;
  bool _isVerifying = false;
  String? _verifyError;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _refController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final docRes = await widget.apiClient.dio.get(ApiEndpoints.documents);
      if (docRes.statusCode == 200 && docRes.data is Map) {
        _documents = docRes.data['documents'] ?? [];
      }

      final certRes = await widget.apiClient.dio.get(ApiEndpoints.issuedCertificates);
      if (certRes.statusCode == 200 && certRes.data is Map) {
        _certificates = certRes.data['certificates'] ?? [];
      }
    } catch (e) {
      _errorMessage = 'Could not load documents or certificates: $e';
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _verifyToken() async {
    final ref = _refController.text.trim();
    if (ref.isEmpty) return;

    setState(() {
      _isVerifying = true;
      _verifyError = null;
      _verificationResult = null;
    });

    try {
      final res = await widget.apiClient.dio.get('${ApiEndpoints.verifyCertificate}/$ref');
      if (res.statusCode == 200 && res.data is Map) {
        setState(() {
          _verificationResult = Map<String, dynamic>.from(res.data);
        });
      } else {
        setState(() {
          _verifyError = 'Certificate not found or reference invalid.';
        });
      }
    } catch (e) {
      setState(() {
        _verifyError = 'Invalid certificate token or network error.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents & Certificates'),
        backgroundColor: const Color(0xFF0284C7),
        foregroundColor: Colors.white,
        elevation: 1,
      ),
      body: Column(
        children: [
          _buildTabBar(),
          if (_errorMessage != null)
            Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13),
              ),
            ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _selectedTab == 0
                    ? _buildDocumentsList()
                    : _selectedTab == 1
                        ? _buildCertificatesList()
                        : _buildVerificationTab(),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          _tabButton(0, 'Documents', Icons.folder_outlined),
          const SizedBox(width: 8),
          _tabButton(1, 'Certificates', Icons.school_outlined),
          const SizedBox(width: 8),
          _tabButton(2, 'Verify QR', Icons.qr_code_scanner),
        ],
      ),
    );
  }

  Widget _tabButton(int index, String label, IconData icon) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTab = index),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: isSelected ? Colors.white : const Color(0xFF475569)),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF475569),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentsList() {
    if (_documents.isEmpty) {
      return const Center(
        child: Text(
          'No institutional documents available.',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _documents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final doc = _documents[index];
        final docNumber = doc['documentNumber'] ?? 'DOC';
        final title = doc['title'] ?? 'Document';
        final category = doc['categoryName'] ?? 'General';
        final version = doc['currentVersion'] ?? 1;
        final status = doc['status'] ?? 'ACTIVE';

        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F9FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.insert_drive_file, color: Color(0xFF0284C7), size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$docNumber • $category • v$version',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: status == 'ACTIVE' ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: status == 'ACTIVE' ? const Color(0xFF15803D) : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCertificatesList() {
    if (_certificates.isEmpty) {
      return const Center(
        child: Text(
          'No certificates issued yet.',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _certificates.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final cert = _certificates[index];
        final certNumber = cert['certificateNumber'] ?? 'CERT';
        final recipient = cert['recipientName'] ?? 'Recipient';
        final certType = cert['certificateType'] != null ? cert['certificateType']['name'] : 'Certificate';
        final status = cert['status'] ?? 'ISSUED';
        final issueDate = cert['issueDate'] != null ? cert['issueDate'].toString().split('T')[0] : '';

        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.workspace_premium, color: Color(0xFFD97706), size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        recipient,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$certNumber • $certType',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      if (issueDate.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Issued: $issueDate',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: status == 'ISSUED' ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: status == 'ISSUED' ? const Color(0xFF15803D) : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVerificationTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Cryptographic Certificate Validator',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          const Text(
            'Enter the alphanumeric reference token from any official certificate or scan its QR code to verify authenticity.',
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _refController,
            decoration: InputDecoration(
              hintText: 'e.g. 7f8b9a12c3...',
              prefixIcon: const Icon(Icons.verified_outlined, color: Color(0xFF0284C7)),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _isVerifying ? null : _verifyToken,
            icon: const Icon(Icons.check_circle_outline),
            label: Text(_isVerifying ? 'Verifying...' : 'Verify Authenticity'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          if (_verifyError != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                _verifyError!,
                style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13),
              ),
            ),
          ],
          if (_verificationResult != null) ...[
            const SizedBox(height: 20),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(
                  color: _verificationResult!['isValid'] == true
                      ? const Color(0xFF86EFAC)
                      : const Color(0xFFFCA5A5),
                ),
              ),
              color: _verificationResult!['isValid'] == true
                  ? const Color(0xFFF0FDF4)
                  : const Color(0xFFFEF2F2),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _verificationResult!['isValid'] == true ? Icons.verified : Icons.cancel,
                          color: _verificationResult!['isValid'] == true
                              ? const Color(0xFF16A34A)
                              : const Color(0xFFDC2626),
                          size: 24,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _verificationResult!['isValid'] == true
                              ? 'Authentic & Valid'
                              : 'Invalid / Revoked',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _verificationResult!['isValid'] == true
                              ? const Color(0xFF15803D)
                              : const Color(0xFFB91C1C),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    _resultRow('Certificate #', _verificationResult!['certificateNumber'] ?? '—'),
                    _resultRow('Type', _verificationResult!['certificateType'] ?? '—'),
                    _resultRow('Recipient', _verificationResult!['recipientName'] ?? '—'),
                    _resultRow('Issued Date', _verificationResult!['issuedDate'] != null ? _verificationResult!['issuedDate'].toString().split('T')[0] : '—'),
                    _resultRow('Institution', _verificationResult!['issuingInstitution'] ?? '—'),
                    _resultRow('Status', _verificationResult!['status'] ?? '—'),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _resultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}
