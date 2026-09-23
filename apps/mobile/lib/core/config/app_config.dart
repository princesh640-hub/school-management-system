class AppConfig {
  static const String appName = 'School Management System';
  static const String defaultBaseUrl = 'http://10.0.2.2:4000'; // Android emulator host alias
  
  final String apiBaseUrl;
  
  const AppConfig({
    this.apiBaseUrl = defaultBaseUrl,
  });
}
