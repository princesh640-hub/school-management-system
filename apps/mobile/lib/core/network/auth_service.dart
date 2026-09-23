import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_client.dart';

class MobileAuthService {
  final MobileApiClient apiClient;
  final FlutterSecureStorage secureStorage = const FlutterSecureStorage();

  MobileAuthService({required this.apiClient});

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await apiClient.dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    if (data.containsKey('accessToken')) {
      await secureStorage.write(key: 'access_token', value: data['accessToken']);
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
      // Best-effort logout
    }
    await secureStorage.delete(key: 'access_token');
  }
}
