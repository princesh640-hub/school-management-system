import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class DesktopAuthService {
  final DesktopApiClient apiClient;

  DesktopAuthService({required this.apiClient});

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await apiClient.dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    if (data.containsKey('accessToken')) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', data['accessToken']);
    }
    return data;
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await apiClient.dio.get('/auth/me');
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await apiClient.dio.post('/auth/logout');
    } catch (_) {
      // Best-effort
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
  }
}
